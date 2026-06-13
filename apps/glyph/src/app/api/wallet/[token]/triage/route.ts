/**
 * @fileoverview Pocket v2 symptom triage, gated by the same wallet bearer token
 * as the read route.
 *
 * POST /api/wallet/<token>/triage
 *   { messages: [{role:"patient"|"glyph", content}], pin?, consentAccepted? }
 *
 * The trusted server-to-server hop: validates the wallet token (service-role —
 * patients never touch PostgREST), runs the DETERMINISTIC red-flag pre-screen
 * (defense in depth, no LLM in the loop), resolves the patient's wallet-triage
 * ai_processing consent (the Tier B gate fails closed without it), calls the
 * egress-gated `triage` edge function, clamps the reply with the tested
 * triage-logic, and persists the session on a final answer so the next doctor
 * sees it.
 *
 * @module app/api/wallet/[token]/triage/route
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { validateAccess } from "@/lib/services/wallet-logic";
import {
  screenRedFlags,
  urgentOutcome,
  validateOutcome,
  type TriageOutcome,
} from "@/lib/services/triage-logic";

export const runtime = "nodejs";

const MAX_QUESTIONS = 3;
/** Tags the wallet-triage consent apart from the visit-time ai_processing grant. */
const TRIAGE_CONSENT_TAG = "pocket_triage";

interface Msg {
  role: "patient" | "glyph";
  content: string;
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  const body = await req.json().catch(() => ({}));
  const pin = typeof body.pin === "string" ? body.pin : null;
  const consentAccepted = body.consentAccepted === true;

  const rawMessages: Msg[] = Array.isArray(body.messages)
    ? body.messages
        .filter(
          (m: unknown): m is Msg =>
            !!m &&
            typeof (m as Msg).content === "string" &&
            ((m as Msg).role === "patient" || (m as Msg).role === "glyph"),
        )
        .map((m: Msg) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    : [];

  if (rawMessages.length === 0 || rawMessages[rawMessages.length - 1].role !== "patient") {
    return NextResponse.json({ state: "invalid", error: "messages must end with a patient turn" }, { status: 400 });
  }

  const admin = createAdminClient();

  // ── Gate on the same bearer token as the wallet read ──────────
  const { data: tokenRow } = await admin
    .from("wallet_access_tokens")
    .select("id, patient_id, pin_hash, revoked")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow) {
    return NextResponse.json({ state: "invalid" }, { status: 404 });
  }

  const decision = validateAccess(tokenRow, pin);
  if (decision === "revoked") {
    return NextResponse.json({ state: "invalid" }, { status: 404 });
  }
  if (decision === "pin_required") {
    return NextResponse.json({ state: "pin_required" });
  }
  if (decision === "invalid_pin") {
    return NextResponse.json({ state: "invalid_pin" }, { status: 401 });
  }

  const patientId = tokenRow.patient_id as string;

  // ── Deterministic red-flag pre-screen (defense in depth) ──────
  // Screen ALL patient text, not just the latest turn — a danger sign in an
  // earlier message must still force urgent. The LLM is never the sole arbiter.
  const patientText = rawMessages
    .filter((m) => m.role === "patient")
    .map((m) => m.content)
    .join("\n");
  const redFlag = screenRedFlags(patientText);
  if (redFlag) {
    const outcome = urgentOutcome(redFlag.message);
    await persistSession(admin, patientId, tokenRow.id as string, rawMessages, outcome, true);
    return NextResponse.json({ state: "ok", outcome });
  }

  // ── Resolve the wallet-triage ai_processing consent ───────────
  // Tier B fails closed without a granted, non-withdrawn consent record. This
  // is a wallet-specific grant (tagged in device_info), distinct from the
  // visit-time consent, and patient-granted in the wallet itself.
  let consentId: string | null = null;
  const { data: existingConsent } = await admin
    .from("consent_records")
    .select("id")
    .eq("patient_id", patientId)
    .eq("consent_type", "ai_processing")
    .eq("granted", true)
    .is("withdrawn_at", null)
    .eq("device_info", TRIAGE_CONSENT_TAG)
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingConsent) {
    consentId = existingConsent.id as string;
  } else if (consentAccepted) {
    const { data: inserted, error: consentErr } = await admin
      .from("consent_records")
      .insert({
        patient_id: patientId,
        consent_type: "ai_processing",
        granted: true,
        granted_by: "patient",
        device_info: TRIAGE_CONSENT_TAG,
      })
      .select("id")
      .maybeSingle();
    if (consentErr || !inserted) {
      console.error("[wallet/triage] consent insert failed:", consentErr?.code, consentErr?.message);
      return NextResponse.json({ state: "error", error: "Could not record consent" }, { status: 500 });
    }
    consentId = inserted.id as string;
  } else {
    // No consent yet and the patient hasn't accepted the notice — ask for it.
    return NextResponse.json({ state: "consent_required" });
  }

  // ── Minimal context (escalate-only; never reassure) ───────────
  const { data: patient } = await admin
    .from("patients")
    .select("age, gender, chronic_conditions")
    .eq("id", patientId)
    .maybeSingle();

  const conditions = Array.isArray(patient?.chronic_conditions)
    ? (patient!.chronic_conditions as unknown[]).filter((c): c is string => typeof c === "string")
    : [];
  const patientContext = {
    age: patient?.age ?? null,
    gender: patient?.gender ?? null,
    conditions,
  };

  // The model has asked one question per prior glyph turn; cap the exchange.
  const questionCount = rawMessages.filter((m) => m.role === "glyph").length;
  const maxQuestionsReached = questionCount >= MAX_QUESTIONS;

  // ── Call the egress-gated triage edge function ────────────────
  let outcome: TriageOutcome;
  try {
    const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/triage`;
    const resp = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Shared secret only this server holds — the function authenticates
        // on it (a dedicated secret, not the service-role key, so it doesn't
        // depend on Vercel's and the function's injected keys matching).
        Authorization: `Bearer ${process.env.TRIAGE_SHARED_SECRET}`,
      },
      body: JSON.stringify({ messages: rawMessages, patientContext, questionCount, consentId }),
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json?.success) {
      // Fail to the safe side rather than surfacing an error to an anxious patient.
      console.error("[wallet/triage] edge function error:", resp.status, json?.error);
      outcome = validateOutcome(null); // safe "see a doctor" fallback
    } else {
      outcome = validateOutcome(json.data?.raw, maxQuestionsReached);
    }
  } catch (err) {
    console.error("[wallet/triage] edge call threw:", err instanceof Error ? err.message : err);
    outcome = validateOutcome(null);
  }

  // Persist only completed exchanges (a final answer), per the design.
  if (outcome.mode === "answer") {
    const withReply: Msg[] = [...rawMessages, { role: "glyph", content: outcome.text }];
    await persistSession(admin, patientId, tokenRow.id as string, withReply, outcome, false);
  }

  return NextResponse.json({ state: "ok", outcome });
}

/** Best-effort session persistence — never blocks the patient's reply. */
async function persistSession(
  admin: ReturnType<typeof createAdminClient>,
  patientId: string,
  walletTokenId: string,
  messages: Msg[],
  outcome: TriageOutcome,
  redFlagScreened: boolean,
): Promise<void> {
  // jsonb columns: cast through Json (structural interfaces don't satisfy the
  // generated index-signature Json type — the columns themselves exist).
  const { error } = await admin.from("triage_sessions").insert({
    patient_id: patientId,
    wallet_token_id: walletTokenId,
    messages: messages as unknown as Json,
    outcome: outcome as unknown as Json,
    red_flag_screened: redFlagScreened,
  });
  if (error) {
    console.error("[wallet/triage] session insert failed:", error.code, error.message);
  }
}
