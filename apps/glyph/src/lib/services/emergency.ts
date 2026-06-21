/**
 * @fileoverview Emergency Access service — the opt-in emergency profile, the
 * separate scannable emergency token, and (Task 5) the stranger-scan
 * orchestrator. Service-role only; token mechanics mirror wallet-link, the
 * consent insert mirrors the whatsapp_followup standing-consent pattern.
 *
 * @module lib/services/emergency
 */

import type { AdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import {
  generateEmergencyToken,
  nearbyHospitals,
  buildMinimalSnapshot,
  mapsLinkNearestHospital,
  type HospitalGeo,
} from "./emergency-logic";
import { sendTemplate } from "@/lib/whatsapp/send";
import {
  EMERGENCY_FAMILY_TEMPLATE,
  EMERGENCY_HOSPITAL_TEMPLATE,
  TEMPLATE_LANG,
  familyAlertParams,
  hospitalAlertParams,
} from "@/lib/whatsapp/templates";

type Admin = AdminClient;

/** Locked v1 constants (from the spec). */
const BROADCAST_RADIUS_KM = 10;
const ALERT_TTL_HOURS = 4;
const RATE_LIMIT_BROADCASTS_PER_HOUR = 3;

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

/** What the public stranger page renders. NEVER carries any PHI field. */
export interface StrangerView {
  state: "ok" | "inactive";
  mapsUrl?: string;
  nearestHospitalName?: string | null;
  alertedHospitals?: number;
  familyNotified?: boolean;
}

/**
 * The stranger-scan orchestrator. Resolves the token; if inactive returns
 * { state: "inactive" }. Otherwise: enforces the 3-broadcasts/token/hour rate
 * limit (over-limit still routes + pings family, only the hospital broadcast is
 * skipped), writes an audit row, and — when scan coords are present — inserts a
 * time-boxed emergency_alert per nearby registered hospital and immediately
 * sends the hospital + family WhatsApp templates (each send degrades
 * gracefully). Returns a StrangerView with routing + counts and NO PHI.
 */
export async function runEmergencyScan(
  admin: Admin,
  token: string,
  scan: { lat: number; lon: number } | null,
): Promise<StrangerView> {
  const resolved = await resolveEmergencyToken(admin, token);
  if (!resolved) return { state: "inactive" };
  const patientId = resolved.patientId;

  // Patient snapshot (used for the hospital minimal dataset + family ping; never
  // returned to the stranger).
  const { data: patient } = await admin
    .from("patients")
    .select("name, blood_group, known_allergies, chronic_conditions, emergency_medications, emergency_contact_phone, phone")
    .eq("id", patientId)
    .maybeSingle();
  const snapshot = buildMinimalSnapshot({
    name: patient?.name ?? "রোগী",
    blood_group: patient?.blood_group ?? null,
    known_allergies: patient?.known_allergies ?? [],
    chronic_conditions: patient?.chronic_conditions ?? [],
    emergency_medications: patient?.emergency_medications ?? null,
  });

  // Rate limit: count this token's scans in the last hour.
  const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentScans } = await admin
    .from("emergency_scans")
    .select("id", { count: "exact", head: true })
    .eq("token", token)
    .gte("scanned_at", sinceIso);
  const skipBroadcast = (recentScans ?? 0) >= RATE_LIMIT_BROADCASTS_PER_HOUR;

  // Audit row first — every scan is logged even if everything downstream fails.
  const { data: scanRow } = await admin
    .from("emergency_scans")
    .insert({
      patient_id: patientId,
      token,
      scan_lat: scan?.lat ?? null,
      scan_lon: scan?.lon ?? null,
    })
    .select("id")
    .single();
  const scanId = scanRow?.id;

  // Touch the token's last-scanned timestamp (best-effort).
  await admin.from("emergency_tokens").update({ last_scanned_at: new Date().toISOString() }).eq("token", token);

  let nearestHospitalName: string | null = null;
  let mapsUrl: string | undefined;
  let alertedHospitals = 0;
  const timeText = "এইমাত্র";

  if (scan) {
    mapsUrl = mapsLinkNearestHospital(scan.lat, scan.lon);

    // Registered hospitals with geo, within radius, nearest first.
    const { data: orgs } = await admin
      .from("organizations")
      .select("id, name, latitude, longitude, phone")
      .eq("org_type", "hospital")
      .not("latitude", "is", null)
      .not("longitude", "is", null);
    const hospitals: HospitalGeo[] = (orgs ?? []).map((o) => ({
      id: o.id,
      name: o.name,
      latitude: Number(o.latitude),
      longitude: Number(o.longitude),
      phone: o.phone,
    }));
    const near = nearbyHospitals({ lat: scan.lat, lon: scan.lon }, hospitals, BROADCAST_RADIUS_KM);
    nearestHospitalName = near[0]?.name ?? null;
    const area = nearestHospitalName ?? "অজানা এলাকা";

    if (!skipBroadcast && scanId) {
      const expiresAt = new Date(Date.now() + ALERT_TTL_HOURS * 60 * 60 * 1000).toISOString();
      for (const h of near) {
        const { data: alertRow } = await admin
          .from("emergency_alerts")
          .insert({
            scan_id: scanId,
            patient_id: patientId,
            hospital_org_id: h.id,
            minimal_dataset: snapshot as unknown as Json,
            expires_at: expiresAt,
          })
          .select("id")
          .single();
        let delivered = false;
        if (h.phone) {
          try {
            await sendTemplate({
              to: h.phone,
              name: EMERGENCY_HOSPITAL_TEMPLATE,
              languageCode: TEMPLATE_LANG,
              bodyParams: hospitalAlertParams(area, String(snapshot.bloodGroup ?? ""), timeText),
            });
            delivered = true;
          } catch (err) {
            console.error("emergency hospital ping failed", { hospital: h.id, err: String(err) });
          }
        }
        if (alertRow?.id) {
          await admin
            .from("emergency_alerts")
            .update({ delivery_status: delivered ? "sent" : "failed" })
            .eq("id", alertRow.id);
        }
        alertedHospitals += 1;
      }
    }
  }

  // Family ping — immediate, best-effort. Reused for a patient self-notify.
  let familyNotified = false;
  const familyParams = familyAlertParams(
    patient?.name ?? "রোগী",
    nearestHospitalName ?? "অজানা এলাকা",
    nearestHospitalName ?? "নিকটস্থ হাসপাতাল",
    timeText,
  );
  if (patient?.emergency_contact_phone) {
    try {
      await sendTemplate({
        to: patient.emergency_contact_phone,
        name: EMERGENCY_FAMILY_TEMPLATE,
        languageCode: TEMPLATE_LANG,
        bodyParams: familyParams,
      });
      familyNotified = true;
    } catch (err) {
      console.error("emergency family ping failed", { patient: patientId, err: String(err) });
    }
  }
  // Patient self-notify (your code was scanned) — best-effort, never blocks.
  if (patient?.phone && patient.phone !== patient.emergency_contact_phone) {
    try {
      await sendTemplate({
        to: patient.phone,
        name: EMERGENCY_FAMILY_TEMPLATE,
        languageCode: TEMPLATE_LANG,
        bodyParams: familyParams,
      });
    } catch (err) {
      console.error("emergency patient self-notify failed", { patient: patientId, err: String(err) });
    }
  }

  // Finalize the audit row.
  if (scanId) {
    await admin
      .from("emergency_scans")
      .update({ routed: !!scan, broadcast_count: alertedHospitals, family_notified: familyNotified })
      .eq("id", scanId);
  }

  return {
    state: "ok",
    mapsUrl,
    nearestHospitalName,
    alertedHospitals,
    familyNotified,
  };
}
