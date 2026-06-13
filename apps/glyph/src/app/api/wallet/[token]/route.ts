/**
 * @fileoverview Public read of a patient's wallet by bearer token.
 *
 * GET /api/wallet/<token>?pin=NNNN
 *
 * The ONE public, unauthenticated read in the app. It trusts only the token:
 * validates it (service-role — patients never touch PostgREST), enforces the
 * optional PIN, and returns ONLY that one patient's record, read-only. A
 * revoked or unknown token reveals nothing.
 *
 * @module app/api/wallet/[token]/route
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateAccess } from "@/lib/services/wallet-logic";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  const pin = new URL(req.url).searchParams.get("pin");
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("wallet_access_tokens")
    .select("id, patient_id, pin_hash, revoked")
    .eq("token", token)
    .maybeSingle();

  // Unknown and revoked are indistinguishable to the caller on purpose.
  if (!row) {
    return NextResponse.json({ state: "invalid" }, { status: 404 });
  }

  const decision = validateAccess(row, pin);
  if (decision === "revoked") {
    // Revoked is indistinguishable from unknown to the caller, on purpose.
    return NextResponse.json({ state: "invalid" }, { status: 404 });
  }
  if (decision === "pin_required") {
    return NextResponse.json({ state: "pin_required" });
  }
  if (decision === "invalid_pin") {
    return NextResponse.json({ state: "invalid_pin" }, { status: 401 });
  }

  // ── Build the read-only patient bundle ────────────────────────
  const patientId = row.patient_id;

  const [{ data: patient }, { data: visits }, { data: prescriptions }, { data: labs }] =
    await Promise.all([
      admin.from("patients").select("name, name_bn, age, gender").eq("id", patientId).maybeSingle(),
      admin
        .from("visits")
        .select("id, visit_date, visit_number, approved_note, intake_summary, note_credential_id, doctors(name, name_bn)")
        .eq("patient_id", patientId)
        .not("approved_note", "is", null)
        .order("visit_date", { ascending: false }),
      admin
        .from("prescriptions")
        .select("id, visit_id, source, medications, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
      admin
        .from("lab_reports")
        .select("id, test_category, results, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
    ]);

  if (!patient) {
    return NextResponse.json({ state: "invalid" }, { status: 404 });
  }

  // Touch last_accessed_at (best-effort; never blocks the read).
  void admin
    .from("wallet_access_tokens")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("id", row.id);

  return NextResponse.json({
    state: "ok",
    patient,
    visits: visits ?? [],
    prescriptions: prescriptions ?? [],
    labs: labs ?? [],
  });
}
