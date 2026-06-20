import type { NormalizedInbound } from "./types";
import { extractBindCode } from "./binding";
import { isAffirmative, isStopWord, isRecordRequest } from "./intents";
import { parseDocType, type DocType } from "./doc-type";
import { parseSubjectChoice } from "./front-door";

export type RouteAction =
  | { kind: "ignore"; reason: string }
  | { kind: "onboard_start"; firstMessage: string }
  | { kind: "onboard_consent_reply"; agreed: boolean }
  | { kind: "onboard_subject_reply"; choice: "self" | "family" | null }
  | { kind: "bind"; code: string }
  | { kind: "triage_start"; symptom: string }
  | { kind: "triage_continue"; answer: string }
  | { kind: "triage_consent_reply"; agreed: boolean }
  | { kind: "document_received"; mediaId: string; mimeType: string }
  | { kind: "document_consent_reply"; agreed: boolean }
  | { kind: "document_type_reply"; docType: DocType | null }
  | { kind: "wallet" }
  | { kind: "revoke" }
  | { kind: "help" };

export interface RouteContext {
  bound: boolean;
  /** wa_conversations.active_flow: idle | triage | awaiting_triage_consent | awaiting_document_consent | awaiting_document_type */
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
    // Mid-onboarding sub-states take precedence (text-only).
    if (ctx.activeFlow === "awaiting_onboard_consent") {
      if (inbound.kind !== "text") return { kind: "help" };
      return { kind: "onboard_consent_reply", agreed: isAffirmative(inbound.text) };
    }
    if (ctx.activeFlow === "awaiting_onboard_subject") {
      if (inbound.kind !== "text") return { kind: "help" };
      return { kind: "onboard_subject_reply", choice: parseSubjectChoice(inbound.text) };
    }
    // First contact. A 6-digit code is still the Chamber bind path.
    const code = inbound.kind === "text" ? extractBindCode(inbound.text) : null;
    if (code) return { kind: "bind", code };
    return { kind: "onboard_start", firstMessage: inbound.kind === "text" ? inbound.text.trim() : "" };
  }

  // Bound patient.
  if (ctx.activeFlow === "awaiting_triage_consent") {
    if (inbound.kind !== "text") return { kind: "help" };
    return { kind: "triage_consent_reply", agreed: isAffirmative(inbound.text) };
  }
  if (ctx.activeFlow === "awaiting_document_consent") {
    if (inbound.kind !== "text") return { kind: "help" };
    return { kind: "document_consent_reply", agreed: isAffirmative(inbound.text) };
  }
  if (ctx.activeFlow === "awaiting_document_type") {
    if (inbound.kind !== "text") return { kind: "help" };
    return { kind: "document_type_reply", docType: parseDocType(inbound.text) };
  }
  if (ctx.activeFlow === "triage") {
    if (inbound.kind !== "text") return { kind: "help" };
    return { kind: "triage_continue", answer: inbound.text };
  }

  // Idle.
  if (inbound.kind === "image" || inbound.kind === "document") {
    return { kind: "document_received", mediaId: inbound.mediaId ?? "", mimeType: inbound.mediaMimeType ?? "" };
  }
  if (inbound.kind !== "text") return { kind: "help" };
  const text = inbound.text.trim();
  if (!text) return { kind: "help" };
  if (isStopWord(text)) return { kind: "revoke" };
  if (isRecordRequest(text)) return { kind: "wallet" };
  return { kind: "triage_start", symptom: text };
}
