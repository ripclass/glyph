// scripts/smoke-sos.mjs
// Self-SOS E2E: a bound patient texts SOS, shares location, and the existing
// emergency engine fires (audit + near-hospital broadcast), emergency access is
// auto-enabled, and the consent is tagged whatsapp_sos.
// usage: node scripts/smoke-sos.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const [APP_URL, SUPABASE_URL, SERVICE_KEY] = process.argv.slice(2);
if (!APP_URL || !SUPABASE_URL || !SERVICE_KEY) {
  console.error("usage: node scripts/smoke-sos.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>");
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const WA = "8801" + Math.floor(100000000 + Math.random() * 899999999);
const secret = process.env.DIALOG360_WEBHOOK_SECRET ?? process.env.META_APP_SECRET ?? "";
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

const SCAN = { lat: 23.8103, lon: 90.4125 };
const NEAR = { lat: 23.814, lon: 90.415 };
const FAR = { lat: 23.4, lon: 90.4125 };

function envelope(message) {
  return { entry: [{ changes: [{ value: { messages: [message] } }] }] };
}
async function post(message) {
  const body = JSON.stringify(envelope(message));
  const headers = { "content-type": "application/json" };
  if (secret) headers["x-hub-signature-256"] = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
  const r = await fetch(`${APP_URL}/api/whatsapp/webhook`, { method: "POST", headers, body });
  ok(r.ok, `webhook accepted (status ${r.status})`);
}
const textMsg = (t) => ({ id: "sos-" + crypto.randomUUID(), from: WA, timestamp: String(Math.floor(Date.now() / 1000)), type: "text", text: { body: t } });
const locMsg = (lat, lon) => ({ id: "sos-" + crypto.randomUUID(), from: WA, timestamp: String(Math.floor(Date.now() / 1000)), type: "location", location: { latitude: lat, longitude: lon } });

let patientId, nearId, farId;
try {
  console.log(`Self-SOS smoke — ${WA}`);

  const { data: owner } = await db.from("organizations").select("id").eq("org_type", "kham_holding").limit(1).maybeSingle();
  ok(!!owner?.id, "kham_holding owner org exists");

  const { data: p } = await db.from("patients").insert({ name: "SOS Smoke Patient", owner_org_id: owner.id }).select("id").single();
  patientId = p.id;
  await db.from("whatsapp_links").insert({ patient_id: patientId, wa_id: WA, verified_at: new Date().toISOString() });
  ok(!!patientId, "bound patient seeded");

  const { data: nh } = await db.from("organizations").insert({ name: "Near SOS Hospital", org_type: "hospital", latitude: NEAR.lat, longitude: NEAR.lon, phone: null }).select("id").single();
  const { data: fh } = await db.from("organizations").insert({ name: "Far SOS Hospital", org_type: "hospital", latitude: FAR.lat, longitude: FAR.lon, phone: null }).select("id").single();
  nearId = nh?.id; farId = fh?.id;
  ok(!!nearId && !!farId, "near + far hospital orgs seeded");

  await post(textMsg("SOS"));
  const { data: convo } = await db.from("wa_conversations").select("active_flow").eq("wa_id", WA).maybeSingle();
  ok(convo?.active_flow === "awaiting_sos_location", "SOS set active_flow=awaiting_sos_location");

  await post(locMsg(SCAN.lat, SCAN.lon));

  const { data: scans } = await db.from("emergency_scans").select("id").eq("patient_id", patientId);
  ok((scans?.length ?? 0) === 1, "one emergency_scans row after location share");
  const { data: alerts } = scans?.[0] ? await db.from("emergency_alerts").select("hospital_org_id").eq("scan_id", scans[0].id) : { data: [] };
  ok((alerts?.length ?? 0) === 1 && alerts[0].hospital_org_id === nearId, "broadcast targets the NEAR hospital only");
  const { data: patient } = await db.from("patients").select("emergency_access_enabled").eq("id", patientId).maybeSingle();
  ok(patient?.emergency_access_enabled === true, "emergency access auto-enabled by SOS");
  const { data: consent } = await db.from("consent_records").select("device_info").eq("patient_id", patientId).eq("consent_type", "emergency_access").maybeSingle();
  ok(consent?.device_info === "whatsapp_sos", "emergency_access consent tagged whatsapp_sos");
  const { data: backToIdle } = await db.from("wa_conversations").select("active_flow").eq("wa_id", WA).maybeSingle();
  ok(backToIdle?.active_flow === "idle", "flow cleared to idle after fire");
} catch (e) {
  fail++; console.log("  ✗ threw:", e.message);
} finally {
  if (patientId) {
    await db.from("emergency_alerts").delete().eq("patient_id", patientId);
    await db.from("emergency_scans").delete().eq("patient_id", patientId);
    await db.from("emergency_tokens").delete().eq("patient_id", patientId);
    await db.from("consent_records").delete().eq("patient_id", patientId);
    await db.from("wa_messages").delete().eq("wa_id", WA);
    await db.from("wa_conversations").delete().eq("wa_id", WA);
    await db.from("whatsapp_links").delete().eq("wa_id", WA);
    await db.from("patients").delete().eq("id", patientId);
  }
  if (nearId) await db.from("organizations").delete().eq("id", nearId);
  if (farId) await db.from("organizations").delete().eq("id", farId);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
