import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { TEMPLATE_NAMES, TEMPLATE_LANG, type ScheduledKind } from "./templates";

type Admin = ReturnType<typeof createAdminClient>;

/** The patient's bound WhatsApp number (verified, non-revoked), or null. */
export async function resolveWaIdForPatient(admin: Admin, patientId: string): Promise<string | null> {
  const { data } = await admin
    .from("whatsapp_links")
    .select("wa_id")
    .eq("patient_id", patientId)
    .not("verified_at", "is", null)
    .eq("revoked", false)
    .limit(1)
    .maybeSingle();
  return data?.wa_id ? (data.wa_id as string) : null;
}

export interface EnqueueRow {
  kind: ScheduledKind;
  patientId?: string | null;
  doctorId?: string | null;
  visitId?: string | null;
  toWaId: string;
  bodyParams: string[];
  fireAt: Date;
}

/**
 * Insert a pending scheduled_messages row. Idempotent on (visit_id, kind) via
 * the partial unique index — a duplicate enqueue for the same visit+kind is a
 * no-op (23505 swallowed). Returns true if a row was created.
 */
export async function enqueue(admin: Admin, row: EnqueueRow): Promise<boolean> {
  const { error } = await admin.from("scheduled_messages").insert({
    kind: row.kind,
    patient_id: row.patientId ?? null,
    doctor_id: row.doctorId ?? null,
    visit_id: row.visitId ?? null,
    to_wa_id: row.toWaId,
    template_name: TEMPLATE_NAMES[row.kind],
    template_lang: TEMPLATE_LANG,
    template_vars: row.bodyParams as unknown as Json,
    fire_at: row.fireAt.toISOString(),
  });
  if (error) {
    if (error.code === "23505") return false; // already scheduled for this visit+kind
    console.error("[wa/schedule] enqueue failed:", error.code, error.message);
    return false;
  }
  return true;
}
