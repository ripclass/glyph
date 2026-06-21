import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import type { TriageMsg } from "@/lib/services/triage-runner";

type Admin = ReturnType<typeof createAdminClient>;

export type ActiveFlow =
  | "idle"
  | "awaiting_onboard_consent"
  | "awaiting_onboard_subject"
  | "triage"
  | "awaiting_triage_consent"
  | "awaiting_document_consent"
  | "awaiting_document_type"
  | "awaiting_sos_location";

export interface WaFlowState {
  /** The triage exchange so far (patient + glyph turns). */
  triageMessages?: TriageMsg[];
  /** The first symptom, stashed while awaiting the consent reply. */
  pendingSymptom?: string;
  /** A WhatsApp media id stashed while awaiting photo consent / type. */
  pendingMediaId?: string;
  pendingMimeType?: string;
}

/** Read the conversation's flow for a wa_id (defaults to idle/empty). */
export async function readFlow(admin: Admin, waId: string): Promise<{ activeFlow: ActiveFlow; state: WaFlowState }> {
  const { data } = await admin
    .from("wa_conversations")
    .select("active_flow, flow_state")
    .eq("wa_id", waId)
    .maybeSingle();
  const activeFlow = (data?.active_flow as ActiveFlow) ?? "idle";
  const state = (data?.flow_state as WaFlowState) ?? {};
  return { activeFlow, state };
}

/** Persist the conversation's flow (self-sufficient upsert; window/patient are owned by the Leg A upsertConversation). */
export async function writeFlow(admin: Admin, waId: string, activeFlow: ActiveFlow, state: WaFlowState): Promise<void> {
  // Upsert (not update) so the flow write never silently no-ops when the
  // conversation row doesn't exist yet. Omits window_expires_at/patient_id, so
  // the Leg A upsertConversation that runs right after still owns those columns.
  const { error } = await admin
    .from("wa_conversations")
    .upsert(
      { wa_id: waId, active_flow: activeFlow, flow_state: state as unknown as Json, updated_at: new Date().toISOString() },
      { onConflict: "wa_id" },
    );
  if (error) console.error("[wa/flow] writeFlow failed:", error.code, error.message);
}
