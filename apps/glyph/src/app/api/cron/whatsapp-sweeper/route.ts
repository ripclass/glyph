/**
 * Sweeper — retries inbound rows stuck in 'received' for > 2 minutes (a webhook
 * crash before processing finished). Idempotent: claims 'received' →
 * 'processing' before re-running. Cron auth via CRON_SECRET (Vercel sets the
 * header).
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processInbound } from "@/lib/whatsapp/process";
import type { NormalizedInbound } from "@/lib/whatsapp/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: stuck } = await admin
    .from("wa_messages")
    .select("provider_message_id, wa_id, kind, payload")
    .eq("direction", "inbound")
    .eq("status", "received")
    .lt("created_at", cutoff)
    .limit(50);

  let retried = 0;
  for (const row of stuck ?? []) {
    // provider_message_id is nullable in the schema; inbound rows always have it,
    // but skip defensively to keep the type checker (and the eq filter) sound.
    if (!row.provider_message_id) continue;
    const msgId = row.provider_message_id;
    const claim = await admin
      .from("wa_messages")
      .update({ status: "processing" })
      .eq("provider_message_id", msgId)
      .eq("status", "received")
      .select("provider_message_id")
      .maybeSingle();
    if (!claim.data) continue; // lost the race
    const inbound = row.payload as unknown as NormalizedInbound;
    const normalized: NormalizedInbound = {
      channel: "whatsapp",
      providerMessageId: msgId,
      fromWaId: row.wa_id,
      receivedAt: new Date(),
      kind: row.kind as NormalizedInbound["kind"],
      text: (inbound as { text?: { body?: string } })?.text?.body ?? "",
      raw: row.payload,
    };
    try {
      await processInbound(admin, normalized, new Date());
      retried++;
    } catch (err) {
      await admin.from("wa_messages").update({ status: "failed", error: err instanceof Error ? err.message : String(err) }).eq("provider_message_id", msgId);
    }
  }
  return NextResponse.json({ ok: true, retried });
}
