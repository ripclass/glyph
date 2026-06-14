import type { NormalizedInbound } from "./types";
import { extractBindCode } from "./binding";
import { isAffirmative, isStopWord, isRecordRequest } from "./intents";

export type RouteAction =
  | { kind: "ignore"; reason: string }
  | { kind: "onboard" }
  | { kind: "bind"; code: string }
  | { kind: "triage_start"; symptom: string }
  | { kind: "triage_continue"; answer: string }
  | { kind: "triage_consent_reply"; agreed: boolean }
  | { kind: "wallet" }
  | { kind: "revoke" }
  | { kind: "help" };

export interface RouteContext {
  bound: boolean;
  /** wa_conversations.active_flow: "idle" | "triage" | "awaiting_triage_consent" */
  activeFlow: string;
}

/**
 * Deterministic routing (no LLM). Unbound numbers may only bind/onboard
 * (self-registration is deferred). Bound patients: mid-flow messages continue
 * that flow; an idle message is a stop word, a record request, or — by default —
 * a new symptom to triage.
 */
export function decideRoute(inbound: NormalizedInbound, ctx: RouteContext): RouteAction {
  if (inbound.kind === "unhandled") return { kind: "ignore", reason: "unhandled message type" };

  if (!ctx.bound) {
    const code = inbound.kind === "text" ? extractBindCode(inbound.text) : null;
    return code ? { kind: "bind", code } : { kind: "onboard" };
  }

  // Bound patient.
  if (ctx.activeFlow === "awaiting_triage_consent") {
    if (inbound.kind !== "text") return { kind: "help" };
    return { kind: "triage_consent_reply", agreed: isAffirmative(inbound.text) };
  }
  if (ctx.activeFlow === "triage") {
    if (inbound.kind !== "text") return { kind: "help" };
    return { kind: "triage_continue", answer: inbound.text };
  }

  // Idle.
  if (inbound.kind !== "text") return { kind: "help" };
  const text = inbound.text.trim();
  if (isStopWord(text)) return { kind: "revoke" };
  if (isRecordRequest(text)) return { kind: "wallet" };
  return { kind: "triage_start", symptom: text };
}
