// scripts/smoke-emergency.mjs
// Emergency Access v1 E2E: a stranger scan fires the audit + a geo-targeted
// hospital broadcast (near hospital only, not the far one), and NEVER leaks PHI
// to the stranger-facing responses.
// usage: node scripts/smoke-emergency.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const [APP_URL, SUPABASE_URL, SERVICE_KEY] = process.argv.slice(2);
if (!APP_URL || !SUPABASE_URL || !SERVICE_KEY) {
  console.error("usage: node scripts/smoke-emergency.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>");
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

// Distinct PHI values we will assert never appear in any stranger-facing payload.
const PHI = { blood: "OO-SMOKE", allergy: "penicillin-smoke", condition: "htn-smoke", med: "amlo-smoke" };
const token = crypto.randomBytes(24).toString("base64url");

// Dhaka coords; near hospital ~0.5 km, far hospital ~45 km away.
const SCAN = { lat: 23.8103, lon: 90.4125 };
const NEAR = { lat: 23.814, lon: 90.415 };
const FAR = { lat: 23.4, lon: 90.4125 };

let patientId, ownerOrgId, nearId, farId;

try {
  console.log(`Emergency Access smoke — token ${token.slice(0, 8)}...`);

  // Owner org: reuse the kham_holding provisional owner (same as the front door).
  const { data: owner } = await db.from("organizations").select("id").eq("org_type", "kham_holding").limit(1).maybeSingle();
  ownerOrgId = owner?.id;
  ok(!!ownerOrgId, "kham_holding owner org exists (provisional scope)");

  // Seed an owner-scoped patient with emergency access enabled.
  const { data: p, error: pe } = await db.from("patients").insert({
    name: "Emergency Smoke Patient",
    owner_org_id: ownerOrgId,
    emergency_access_enabled: true,
    blood_group: PHI.blood,
    known_allergies: [PHI.allergy],
    chronic_conditions: [PHI.condition],
    emergency_medications: PHI.med,
    emergency_contact_phone: null, // no WA sends → deterministic smoke
  }).select("id").single();
  if (pe) throw pe;
  patientId = p.id;
  ok(!!patientId, "owner-scoped patient seeded with emergency profile");

  // Standing consent (also proves the migration-018 consent_type constraint).
  const { error: ce } = await db.from("consent_records").insert({
    patient_id: patientId, consent_type: "emergency_access", granted: true,
    granted_by: "patient", device_info: "emergency_profile",
  });
  ok(!ce, "emergency_access consent row accepted (constraint widened)");

  // Emergency token.
  const { error: te } = await db.from("emergency_tokens").insert({ patient_id: patientId, token });
  if (te) throw te;
  ok(true, "emergency token seeded");

  // Near + far hospital orgs (phone null → no outbound sends attempted).
  const { data: nh } = await db.from("organizations").insert({
    name: "Near Smoke Hospital", org_type: "hospital", latitude: NEAR.lat, longitude: NEAR.lon, phone: null,
  }).select("id").single();
  const { data: fh } = await db.from("organizations").insert({
    name: "Far Smoke Hospital", org_type: "hospital", latitude: FAR.lat, longitude: FAR.lon, phone: null,
  }).select("id").single();
  nearId = nh?.id; farId = fh?.id;
  ok(!!nearId && !!farId, "near + far hospital orgs seeded with geo");

  // ── Stranger resolve (GET) — active, NO PHI ───────────────────
  const getRes = await fetch(`${APP_URL}/api/e/${token}`);
  const getText = await getRes.text();
  ok(getRes.ok, `GET /api/e/<token> → ${getRes.status} ok`);
  ok(JSON.parse(getText).state === "ok", "resolve reports state:ok");
  ok(!Object.values(PHI).some((v) => getText.includes(v)), "resolve response contains NO PHI");

  // ── Stranger scan (POST) at the patient/near location ─────────
  const scanRes = await fetch(`${APP_URL}/api/e/${token}/scan`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(SCAN),
  });
  const scanText = await scanRes.text();
  ok(scanRes.ok, `POST /api/e/<token>/scan → ${scanRes.status} ok`);
  const view = JSON.parse(scanText);
  ok(view.state === "ok", "scan reports state:ok");
  ok(typeof view.mapsUrl === "string" && view.mapsUrl.includes("90.41"), "stranger view carries a coords-based mapsUrl");
  ok(!Object.values(PHI).some((v) => scanText.includes(v)), "scan response contains NO PHI");

  // ── DB assertions ────────────────────────────────────────────
  const { data: scans } = await db.from("emergency_scans").select("id, routed, broadcast_count").eq("token", token);
  ok((scans?.length ?? 0) === 1, "exactly one emergency_scans audit row");
  const scanId = scans?.[0]?.id;
  ok(scans?.[0]?.routed === true, "scan row marked routed (coords present)");

  const { data: alerts } = await db.from("emergency_alerts").select("hospital_org_id, expires_at, minimal_dataset").eq("scan_id", scanId);
  ok((alerts?.length ?? 0) === 1, "exactly ONE alert (near hospital only, far excluded by 10km radius)");
  ok(alerts?.[0]?.hospital_org_id === nearId, "the alert targets the NEAR hospital");
  const ttlHrs = alerts?.[0] ? (new Date(alerts[0].expires_at) - Date.now()) / 3.6e6 : 0;
  ok(ttlHrs > 3.5 && ttlHrs < 4.5, "alert expires_at is ~4 hours out");
  ok(alerts?.[0]?.minimal_dataset?.selfReported === true, "minimal_dataset is the self-reported hospital snapshot");
  ok(alerts?.[0]?.minimal_dataset?.bloodGroup === PHI.blood, "hospital snapshot DOES carry blood group (by design, to the hospital)");
} catch (e) {
  fail++; console.log("  ✗ threw:", e.message);
} finally {
  // Cleanup (FK-safe order).
  if (patientId) {
    await db.from("emergency_alerts").delete().eq("patient_id", patientId);
    await db.from("emergency_scans").delete().eq("patient_id", patientId);
    await db.from("emergency_tokens").delete().eq("patient_id", patientId);
    await db.from("consent_records").delete().eq("patient_id", patientId);
    await db.from("patients").delete().eq("id", patientId);
  }
  if (nearId) await db.from("organizations").delete().eq("id", nearId);
  if (farId) await db.from("organizations").delete().eq("id", farId);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
