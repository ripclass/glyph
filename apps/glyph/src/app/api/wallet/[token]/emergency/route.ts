/**
 * @fileoverview The patient's own Emergency Access profile, authorized by the
 * WALLET bearer token (not the emergency token). Because the caller proved they
 * hold the wallet token, this IS the patient — PHI is allowed here, unlike the
 * public /e/<token> stranger route.
 *
 * GET  /api/wallet/<token>/emergency?pin=NNNN  → editable profile + emergency token
 * POST /api/wallet/<token>/emergency           → { action:"save"|"rotate", enabled?, profile?, pin? }
 *
 * @module app/api/wallet/[token]/emergency/route
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateAccess } from "@/lib/services/wallet-logic";
import { setEmergencyAccess, rotateEmergencyToken, type EmergencyProfileInput } from "@/lib/services/emergency";

export const runtime = "nodejs";

type WalletTokenRow = { id: string; patient_id: string; pin_hash: string | null; revoked: boolean };

/** Validate the wallet token + PIN; returns the patient_id or an error response. */
async function authorize(
  admin: ReturnType<typeof createAdminClient>,
  token: string,
  pin: string | null,
): Promise<{ patientId: string } | { error: NextResponse }> {
  const { data: row } = await admin
    .from("wallet_access_tokens")
    .select("id, patient_id, pin_hash, revoked")
    .eq("token", token)
    .maybeSingle<WalletTokenRow>();
  if (!row) return { error: NextResponse.json({ state: "invalid" }, { status: 404 }) };
  const decision = validateAccess(row, pin);
  if (decision === "revoked") return { error: NextResponse.json({ state: "invalid" }, { status: 404 }) };
  if (decision === "pin_required") return { error: NextResponse.json({ state: "pin_required" }, { status: 200 }) };
  if (decision === "invalid_pin") return { error: NextResponse.json({ state: "invalid_pin" }, { status: 401 }) };
  return { patientId: row.patient_id };
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const pin = new URL(req.url).searchParams.get("pin");
  const auth = await authorize(admin, params.token, pin);
  if ("error" in auth) return auth.error;

  const { data: patient } = await admin
    .from("patients")
    .select("emergency_access_enabled, blood_group, known_allergies, chronic_conditions, emergency_medications, emergency_contact_name, emergency_contact_phone")
    .eq("id", auth.patientId)
    .maybeSingle();
  const { data: tokenRow } = await admin
    .from("emergency_tokens")
    .select("token")
    .eq("patient_id", auth.patientId)
    .eq("revoked", false)
    .maybeSingle();

  return NextResponse.json({
    state: "ok",
    enabled: patient?.emergency_access_enabled ?? false,
    profile: {
      bloodGroup: patient?.blood_group ?? null,
      allergies: Array.isArray(patient?.known_allergies) ? patient?.known_allergies : [],
      conditions: Array.isArray(patient?.chronic_conditions) ? patient?.chronic_conditions : [],
      medications: patient?.emergency_medications ?? null,
      contactName: patient?.emergency_contact_name ?? null,
      contactPhone: patient?.emergency_contact_phone ?? null,
    },
    emergencyToken: tokenRow?.token ?? null,
  });
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const body = (await req.json().catch(() => ({}))) as {
    action?: "save" | "rotate";
    enabled?: boolean;
    profile?: EmergencyProfileInput;
    pin?: string | null;
  };
  const auth = await authorize(admin, params.token, body.pin ?? null);
  if ("error" in auth) return auth.error;

  if (body.action === "rotate") {
    const emergencyToken = await rotateEmergencyToken(admin, auth.patientId);
    return NextResponse.json({ state: "ok", emergencyToken });
  }

  const { token: emergencyToken } = await setEmergencyAccess(
    admin,
    auth.patientId,
    body.enabled ?? false,
    body.profile ?? {},
    "patient",
  );
  return NextResponse.json({ state: "ok", emergencyToken });
}
