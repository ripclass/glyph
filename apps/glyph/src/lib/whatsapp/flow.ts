import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import type { TriageMsg } from "@/lib/services/triage-runner";

type Admin = ReturnType<typeof createAdminClient>;

export type ActiveFlow = "idle" | "triage" | "awaiting_triage_consent";

export interface WaFlowState {
  /** The triage exchange so far (patient + glyph turns). */
  triageMessages?: TriageMsg[];
  /** The first symptom, stashed while awaiting the consent reply. */
  pendingSymptom?: string;
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

/** Persist the conversation's flow (the row is created by the Leg A upsert path). */
export async function writeFlow(admin: Admin, waId: string, activeFlow: ActiveFlow, state: WaFlowState): Promise<void> {
  const { error } = await admin
    .from("wa_conversations")
    .update({ active_flow: activeFlow, flow_state: state as unknown as Json, updated_at: new Date().toISOString() })
    .eq("wa_id", waId);
  if (error) console.error("[wa/flow] writeFlow failed:", error.code, error.message);
}
