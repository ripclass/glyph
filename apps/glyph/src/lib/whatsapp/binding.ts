import { randomInt } from "node:crypto";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** A pending bind code is valid for 30 minutes — long enough to scan at the desk. */
export const BIND_CODE_TTL_MS = 30 * 60 * 1000;

/** 6-digit numeric one-time code. */
export function generateBindCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** First standalone 6-digit group in arbitrary text, or null. */
export function extractBindCode(text: string): string | null {
  const m = text.match(/(?<!\d)(\d{6})(?!\d)/);
  return m ? m[1] : null;
}

/** Issue a pending link row carrying a fresh code. Returns the code. */
export async function createBindCode(
  admin: Admin,
  patientId: string,
  doctorId: string,
  nowMs: number,
): Promise<{ code: string }> {
  const code = generateBindCode();
  const { error } = await admin.from("whatsapp_links").insert({
    patient_id: patientId,
    bind_code: code,
    bind_code_expires_at: new Date(nowMs + BIND_CODE_TTL_MS).toISOString(),
    created_by_doctor_id: doctorId,
  });
  if (error) throw new Error(`createBindCode failed: ${error.message}`);
  return { code };
}

/** Redeem a code: match a pending, unexpired row → bind wa_id + verify. */
export async function redeemBindCode(
  admin: Admin,
  waId: string,
  code: string,
  nowIso: string,
): Promise<{ patientId: string } | null> {
  const { data: pending } = await admin
    .from("whatsapp_links")
    .select("id, patient_id, bind_code_expires_at")
    .eq("bind_code", code)
    .is("verified_at", null)
    .eq("revoked", false)
    .maybeSingle();
  if (
    !pending ||
    !pending.bind_code_expires_at ||
    new Date(pending.bind_code_expires_at).getTime() < new Date(nowIso).getTime()
  ) {
    return null;
  }

  // Revoke any prior active link for this wa_id (re-bind to a new patient).
  await admin.from("whatsapp_links").update({ revoked: true }).eq("wa_id", waId).eq("revoked", false);

  const { error } = await admin
    .from("whatsapp_links")
    .update({ wa_id: waId, verified_at: nowIso, bind_code: null })
    .eq("id", pending.id);
  if (error) throw new Error(`redeemBindCode failed: ${error.message}`);
  return { patientId: pending.patient_id as string };
}

/** The active verified patient for a wa_id, or null. */
export async function resolveLinkByWaId(admin: Admin, waId: string): Promise<{ patientId: string } | null> {
  const { data } = await admin
    .from("whatsapp_links")
    .select("patient_id")
    .eq("wa_id", waId)
    .not("verified_at", "is", null)
    .eq("revoked", false)
    .maybeSingle();
  return data ? { patientId: data.patient_id as string } : null;
}
