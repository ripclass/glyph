/**
 * @fileoverview The shared symptom-triage turn — the tested core lifted out of
 * the wallet triage route so the WhatsApp bridge runs the SAME engine. No LLM
 * lives here: it runs the deterministic red-flag pre-screen, resolves/creates
 * the patient's ai_processing consent (Tier B fails closed without it), calls
 * the egress-gated `triage` edge function with TRIAGE_SHARED_SECRET, clamps the
 * reply with triage-logic, and persists the session on a final answer.
 *
 * @module lib/services/triage-runner
 */
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import {
  screenRedFlags,
  urgentOutcome,
  validateOutcome,
  type TriageOutcome,
} from "@/lib/services/triage-logic";

type Admin = ReturnType<typeof createAdminClient>;

export interface TriageMsg {
  role: "patient" | "glyph";
  content: string;
}

export interface TriageTurnInput {
  patientId: string;
  /** For triage_sessions.wallet_token_id; null for non-wallet sources (WhatsApp). */
  walletTokenId: string | null;
  /** Full exchange so far; MUST end with a patient turn. */
  messages: TriageMsg[];
  /** True once the patient has accepted the one-time consent notice. */
  consentAccepted: boolean;
  /** Distinguishes the consent grant, e.g. 'pocket_triage' | 'whatsapp_triage'. */
  deviceTag: string;
}

export type TriageTurnResult =
  | { state: "ok"; outcome: TriageOutcome }
  | { state: "consent_required" }
  | { state: "error"; error: string };

const MAX_QUESTIONS = 3;

export async function runTriageTurn(admin: Admin, input: TriageTurnInput): Promise<TriageTurnResult> {
  const { patientId, walletTokenId, messages, consentAccepted, deviceTag } = input;

  if (messages.length === 0 || messages[messages.length - 1].role !== "patient") {
    return { state: "error", error: "messages must end with a patient turn" };
  }

  // ── Deterministic red-flag pre-screen (defense in depth) ──────
  const patientText = messages.filter((m) => m.role === "patient").map((m) => m.content).join("\n");
  const redFlag = screenRedFlags(patientText);
  if (redFlag) {
    const outcome = urgentOutcome(redFlag.message);
    await persistSession(admin, patientId, walletTokenId, messages, outcome, true);
    return { state: "ok", outcome };
  }

  // ── Resolve/create the ai_processing consent (Tier B gate) ────
  let consentId: string | null = null;
  const { data: existingConsent } = await admin
    .from("consent_records")
    .select("id")
    .eq("patient_id", patientId)
    .eq("consent_type", "ai_processing")
    .eq("granted", true)
    .is("withdrawn_at", null)
    .eq("device_info", deviceTag)
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingConsent) {
    consentId = existingConsent.id as string;
  } else if (consentAccepted) {
    const { data: inserted, error: consentErr } = await admin
      .from("consent_records")
      .insert({ patient_id: patientId, consent_type: "ai_processing", granted: true, granted_by: "patient", device_info: deviceTag })
      .select("id")
      .maybeSingle();
    if (consentErr || !inserted) {
      console.error("[triage-runner] consent insert failed:", consentErr?.code, consentErr?.message);
      return { state: "error", error: "Could not record consent" };
    }
    consentId = inserted.id as string;
  } else {
    return { state: "consent_required" };
  }

  // ── Minimal context (escalate-only) ───────────────────────────
  const { data: patient } = await admin
    .from("patients")
    .select("age, gender, chronic_conditions")
    .eq("id", patientId)
    .maybeSingle();
  const conditions = Array.isArray(patient?.chronic_conditions)
    ? (patient!.chronic_conditions as unknown[]).filter((c): c is string => typeof c === "string")
    : [];
  const patientContext = { age: patient?.age ?? null, gender: patient?.gender ?? null, conditions };

  const questionCount = messages.filter((m) => m.role === "glyph").length;
  const maxQuestionsReached = questionCount >= MAX_QUESTIONS;

  // ── Call the egress-gated triage edge function ────────────────
  let outcome: TriageOutcome;
  try {
    const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/triage`;
    const resp = await fetch(fnUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TRIAGE_SHARED_SECRET}` },
      body: JSON.stringify({ messages, patientContext, questionCount, consentId }),
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json?.success) {
      console.error("[triage-runner] edge function error:", resp.status, json?.error);
      outcome = validateOutcome(null);
    } else {
      outcome = validateOutcome(json.data?.raw, maxQuestionsReached);
    }
  } catch (err) {
    console.error("[triage-runner] edge call threw:", err instanceof Error ? err.message : err);
    outcome = validateOutcome(null);
  }

  if (outcome.mode === "answer") {
    await persistSession(admin, patientId, walletTokenId, [...messages, { role: "glyph", content: outcome.text }], outcome, false);
  }
  return { state: "ok", outcome };
}

async function persistSession(
  admin: Admin,
  patientId: string,
  walletTokenId: string | null,
  messages: TriageMsg[],
  outcome: TriageOutcome,
  redFlagScreened: boolean,
): Promise<void> {
  const { error } = await admin.from("triage_sessions").insert({
    patient_id: patientId,
    wallet_token_id: walletTokenId,
    messages: messages as unknown as Json,
    outcome: outcome as unknown as Json,
    red_flag_screened: redFlagScreened,
  });
  if (error) console.error("[triage-runner] session insert failed:", error.code, error.message);
}
