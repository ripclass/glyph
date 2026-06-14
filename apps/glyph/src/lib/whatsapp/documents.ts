import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { downloadMedia } from "./media";
import type { DocType } from "./doc-type";

type Admin = ReturnType<typeof createAdminClient>;

/** Tags the WhatsApp document-upload consent apart from the triage/visit grants. */
const DOC_CONSENT_TAG = "whatsapp_document";

/** The patient's active WhatsApp-document ai_processing consent, or null. */
export async function resolveDocConsent(admin: Admin, patientId: string): Promise<string | null> {
  const { data } = await admin
    .from("consent_records")
    .select("id")
    .eq("patient_id", patientId)
    .eq("consent_type", "ai_processing")
    .eq("granted", true)
    .is("withdrawn_at", null)
    .eq("device_info", DOC_CONSENT_TAG)
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? (data.id as string) : null;
}

/** Record the one-time WhatsApp-document consent (patient-granted). */
export async function createDocConsent(admin: Admin, patientId: string): Promise<string | null> {
  const { data, error } = await admin
    .from("consent_records")
    .insert({ patient_id: patientId, consent_type: "ai_processing", granted: true, granted_by: "patient", device_info: DOC_CONSENT_TAG })
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("[wa/documents] consent insert failed:", error?.code, error?.message);
    return null;
  }
  return data.id as string;
}

export interface CaptureInput {
  patientId: string;
  mediaId: string;
  mimeType: string;
  type: DocType;
  consentId: string;
}

/**
 * Download the WhatsApp photo, store it in the private `documents` bucket
 * (service-role; path keyed on patientId so the clinic's doctor can read it),
 * then call the egress-gated `extract-document` edge function with the bridge
 * secret + consentId + no visitId. The extraction writes the prescription/lab
 * row that surfaces in the next briefing.
 */
export async function captureDocument(admin: Admin, input: CaptureInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const media = await downloadMedia(input.mediaId);
    const ext = media.mimeType.includes("png") ? "png" : media.mimeType.includes("pdf") ? "pdf" : "jpg";
    const path = `${input.patientId}/whatsapp/${input.type}-${randomUUID()}.${ext}`;

    const blob = new Blob([media.bytes.buffer as ArrayBuffer], { type: media.mimeType });
    const { error: upErr } = await admin.storage.from("documents").upload(path, blob, { contentType: media.mimeType, upsert: false });
    if (upErr) return { ok: false, error: `upload: ${upErr.message}` };

    const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/extract-document`;
    const resp = await fetch(fnUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.WHATSAPP_BRIDGE_SECRET}` },
      body: JSON.stringify({ imageUrl: path, type: input.type, patientId: input.patientId, consentId: input.consentId }),
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json?.success) return { ok: false, error: `extract: ${resp.status} ${json?.error ?? ""}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
