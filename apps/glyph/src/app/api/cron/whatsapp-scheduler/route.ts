/**
 * whatsapp-scheduler — runs every few minutes. (1) Enqueues doctor nudges for
 * briefing-ready visits (the one trigger with no clean event hook). (2) Drains
 * pending scheduled_messages whose fire_at has passed, sending each as a
 * WhatsApp template. Idempotent + race-safe (claim pending→running). Mirrors
 * Juugadu's reminder-delivery cron.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTemplate } from "@/lib/whatsapp/send";
import { enqueue } from "@/lib/whatsapp/schedule";
import { doctorNudgeParams } from "@/lib/whatsapp/templates";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  const admin = createAdminClient();

  // ── 1. Enqueue doctor nudges for briefing-ready visits (last 6h) ──
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data: ready } = await admin
    .from("visits")
    .select("id, doctor_id, patient_id, updated_at, doctors(phone), patients(age, name, name_bn)")
    .eq("status", "intake_complete")
    .not("briefing_card", "is", null)
    .gte("updated_at", since)
    .limit(50);
  let enqueued = 0;
  for (const v of ready ?? []) {
    const doc = v.doctors as { phone?: string } | { phone?: string }[] | null;
    const phone = Array.isArray(doc) ? doc[0]?.phone : doc?.phone;
    if (!phone) continue;
    const pat = v.patients as { age?: number; name?: string; name_bn?: string } | { age?: number; name?: string; name_bn?: string }[] | null;
    const patObj = Array.isArray(pat) ? pat[0] : pat;
    const label = [patObj?.age ? `${patObj.age}` : null, patObj?.name_bn ?? patObj?.name].filter(Boolean).join(", ") || "নতুন রোগী";
    const created = await enqueue(admin, {
      kind: "doctor_nudge", doctorId: v.doctor_id as string, visitId: v.id as string,
      toWaId: phone, bodyParams: doctorNudgeParams(label), fireAt: new Date(),
    });
    if (created) enqueued++;
  }

  // ── 2. Drain due pending messages ──
  const nowIso = new Date().toISOString();
  const { data: due } = await admin
    .from("scheduled_messages")
    .select("id, to_wa_id, template_name, template_lang, template_vars, patient_id")
    .eq("state", "pending")
    .lte("fire_at", nowIso)
    .order("fire_at", { ascending: true })
    .limit(50);

  let sent = 0;
  for (const m of due ?? []) {
    const claim = await admin
      .from("scheduled_messages")
      .update({ state: "running", attempts: 1 })
      .eq("id", m.id)
      .eq("state", "pending")
      .select("id")
      .maybeSingle();
    if (!claim.data) continue;

    const vars = Array.isArray(m.template_vars) ? (m.template_vars as unknown[]).map(String) : [];
    try {
      const res = await sendTemplate({ to: m.to_wa_id as string, name: m.template_name as string, languageCode: (m.template_lang as string) ?? "bn", bodyParams: vars });
      await admin.from("scheduled_messages").update({ state: "completed", result: { message_id: res.messageId, sent_at: new Date().toISOString() } }).eq("id", m.id);
      await admin.from("wa_messages").insert({ direction: "outbound", wa_id: m.to_wa_id as string, patient_id: m.patient_id ?? null, kind: "template", status: "sent" });
      sent++;
    } catch (err) {
      await admin.from("scheduled_messages").update({ state: "failed", result: { error: err instanceof Error ? err.message : String(err) } }).eq("id", m.id);
    }
  }

  return NextResponse.json({ ok: true, enqueued, sent });
}
