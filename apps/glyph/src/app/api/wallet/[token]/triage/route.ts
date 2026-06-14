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
import { validateAccess } from "@/lib/services/wallet-logic";
import { runTriageTurn, type TriageMsg } from "@/lib/services/triage-runner";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  const body = await req.json().catch(() => ({}));
  const pin = typeof body.pin === "string" ? body.pin : null;
  const consentAccepted = body.consentAccepted === true;

  const rawMessages: TriageMsg[] = Array.isArray(body.messages)
    ? body.messages
        .filter(
          (m: unknown): m is TriageMsg =>
            !!m &&
            typeof (m as TriageMsg).content === "string" &&
            ((m as TriageMsg).role === "patient" || (m as TriageMsg).role === "glyph"),
        )
        .map((m: TriageMsg) => ({ role: m.role, content: m.content.slice(0, 2000) }))
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

  const result = await runTriageTurn(admin, {
    patientId,
    walletTokenId: tokenRow.id as string,
    messages: rawMessages,
    consentAccepted,
    deviceTag: "pocket_triage",
  });

  if (result.state === "consent_required") return NextResponse.json({ state: "consent_required" });
  if (result.state === "error") return NextResponse.json({ state: "error", error: result.error }, { status: 500 });
  return NextResponse.json({ state: "ok", outcome: result.outcome });
}
