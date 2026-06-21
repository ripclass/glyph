/**
 * @fileoverview Emergency Access service — the opt-in emergency profile, the
 * separate scannable emergency token, and (Task 5) the stranger-scan
 * orchestrator. Service-role only; token mechanics mirror wallet-link, the
 * consent insert mirrors the whatsapp_followup standing-consent pattern.
 *
 * @module lib/services/emergency
 */

import type { AdminClient } from "@/lib/supabase/admin";
import { generateEmergencyToken } from "./emergency-logic";

type Admin = AdminClient;

export interface EmergencyProfileInput {
  bloodGroup?: string | null;
  allergies?: string[];
  conditions?: string[];
  medications?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
}

async function findOrCreateToken(admin: Admin, patientId: string): Promise<string> {
  const { data } = await admin
    .from("emergency_tokens")
    .select("token")
    .eq("patient_id", patientId)
    .eq("revoked", false)
    .maybeSingle();
  if (data?.token) return data.token;
  const token = generateEmergencyToken();
  await admin.from("emergency_tokens").insert({ patient_id: patientId, token });
  return token;
}

/**
 * Enables or disables emergency access for a patient: writes the profile
 * fields, records (enable) or withdraws (disable) the standing emergency_access
 * consent, and find-or-creates / revokes the emergency token. Returns the active
 * token, or null when disabled.
 */
export async function setEmergencyAccess(
  admin: Admin,
  patientId: string,
  enabled: boolean,
  profile: EmergencyProfileInput,
  grantedBy: "patient" | "guardian",
): Promise<{ token: string | null }> {
  await admin
    .from("patients")
    .update({
      emergency_access_enabled: enabled,
      blood_group: profile.bloodGroup ?? null,
      known_allergies: profile.allergies ?? [],
      chronic_conditions: profile.conditions ?? [],
      emergency_medications: profile.medications ?? null,
      emergency_contact_name: profile.contactName ?? null,
      emergency_contact_phone: profile.contactPhone ?? null,
    })
    .eq("id", patientId);

  if (enabled) {
    // record standing consent (find-or-create, like the whatsapp_followup pattern)
    const { data: existing } = await admin
      .from("consent_records")
      .select("id")
      .eq("patient_id", patientId)
      .eq("consent_type", "emergency_access")
      .eq("granted", true)
      .is("withdrawn_at", null)
      .limit(1)
      .maybeSingle();
    if (!existing) {
      await admin.from("consent_records").insert({
        patient_id: patientId,
        consent_type: "emergency_access",
        granted: true,
        granted_by: grantedBy,
        device_info: "emergency_profile",
      });
    }
    return { token: await findOrCreateToken(admin, patientId) };
  }

  // disable: withdraw consent + revoke token
  await admin
    .from("consent_records")
    .update({ withdrawn_at: new Date().toISOString() })
    .eq("patient_id", patientId)
    .eq("consent_type", "emergency_access")
    .is("withdrawn_at", null);
  await admin
    .from("emergency_tokens")
    .update({ revoked: true })
    .eq("patient_id", patientId)
    .eq("revoked", false);
  return { token: null };
}

/** Revokes the current emergency token and issues a fresh one. */
export async function rotateEmergencyToken(admin: Admin, patientId: string): Promise<string> {
  await admin
    .from("emergency_tokens")
    .update({ revoked: true })
    .eq("patient_id", patientId)
    .eq("revoked", false);
  const token = generateEmergencyToken();
  await admin.from("emergency_tokens").insert({ patient_id: patientId, token });
  return token;
}

/**
 * Resolves an emergency token to its patient iff the token exists, is not
 * revoked, and the patient still has emergency_access_enabled. Two selects
 * (token row, then patient flag) to stay clear of generated-join typing.
 */
export async function resolveEmergencyToken(
  admin: Admin,
  token: string,
): Promise<{ patientId: string } | null> {
  const { data: row } = await admin
    .from("emergency_tokens")
    .select("patient_id, revoked")
    .eq("token", token)
    .maybeSingle();
  if (!row || row.revoked) return null;

  const { data: patient } = await admin
    .from("patients")
    .select("emergency_access_enabled")
    .eq("id", row.patient_id)
    .maybeSingle();
  return patient?.emergency_access_enabled ? { patientId: row.patient_id } : null;
}
