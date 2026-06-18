/**
 * @fileoverview Issue (or re-issue) a Pocket wallet bearer token for a patient.
 *
 * POST { patientId, pin? }  — doctor session required.
 *
 * One active token per patient: if a non-revoked token exists it is reused
 * (and its PIN updated when a new one is given); otherwise a fresh token is
 * minted. The doctor's tablet turns the returned token into a QR at visit end.
 *
 * @module app/api/wallet/issue/route
 */

import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { generateToken, hashPin, normalizePin } from "@/lib/services/wallet-logic";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // ── Auth: a signed-in doctor only ─────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ success: false, error: "Missing authorization header" }, { status: 401 });
  }
  const userClient = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
  );
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const patientId = typeof body.patientId === "string" ? body.patientId : null;
  if (!patientId) {
    return NextResponse.json({ success: false, error: "patientId is required" }, { status: 400 });
  }

  // PIN is optional; reject a malformed one rather than silently ignoring it.
  let pinHash: string | null | undefined;
  if (body.pin != null && body.pin !== "") {
    if (!normalizePin(body.pin)) {
      return NextResponse.json({ success: false, error: "PIN must be exactly 4 digits" }, { status: 400 });
    }
    pinHash = hashPin(body.pin);
  }

  const admin = createAdminClient();

  // The visit-RLS check is implicit: the patient must be reachable by the
  // caller's RLS — either clinic-scoped (doctor path) or owner-org-scoped
  // (centre-staffer path via the memberships-based owner-org RLS added in
  // migration 011). Verify the patient exists via the user-scoped client which
  // honours whichever policy applies.
  const { data: patient } = await userClient
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .maybeSingle();
  if (!patient) {
    return NextResponse.json({ success: false, error: "Patient not found in your clinic" }, { status: 404 });
  }

  // Find-or-create the active token.
  const { data: existing } = await admin
    .from("wallet_access_tokens")
    .select("id, token")
    .eq("patient_id", patientId)
    .eq("revoked", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Resolve whether the caller is a doctor — centre staffers are not in the
  // doctors table, so the FK would fail if we always passed user.id.
  // created_by_doctor_id is already nullable (migration 006 — no NOT NULL).
  const { data: doctorRow } = await admin
    .from("doctors")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  const createdByDoctorId: string | null = doctorRow ? user.id : null;

  let token: string;
  if (existing) {
    token = existing.token;
    if (pinHash !== undefined) {
      await admin.from("wallet_access_tokens").update({ pin_hash: pinHash }).eq("id", existing.id);
    }
  } else {
    token = generateToken();
    const { error } = await admin.from("wallet_access_tokens").insert({
      token,
      patient_id: patientId,
      pin_hash: pinHash ?? null,
      created_by_doctor_id: createdByDoctorId,
    });
    if (error) {
      console.error("[wallet/issue] insert failed:", error.code, error.message);
      return NextResponse.json({ success: false, error: "Could not create wallet link" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, token, walletPath: `/wallet/${token}` });
}
