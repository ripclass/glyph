// scripts/smoke-front-door.mjs
// usage: node scripts/smoke-front-door.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const [APP_URL, SUPABASE_URL, SERVICE_KEY] = process.argv.slice(2);
if (!APP_URL || !SUPABASE_URL || !SERVICE_KEY) { console.error("usage: node scripts/smoke-front-door.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>"); process.exit(1); }
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const WA = "8801" + Math.floor(100000000 + Math.random() * 899999999); // throwaway number
const secret = process.env.DIALOG360_WEBHOOK_SECRET ?? "";
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

function payload(text, id) {
  return { entry: [{ changes: [{ value: { messages: [{ id, from: WA, timestamp: String(Math.floor(Date.now()/1000)), type: "text", text: { body: text } }] } }] }] };
}
async function post(text) {
  const id = "fd-" + crypto.randomUUID();
  const body = JSON.stringify(payload(text, id));
  const headers = { "content-type": "application/json" };
  if (secret) headers["x-hub-signature-256"] = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
  const r = await fetch(`${APP_URL}/api/whatsapp/webhook`, { method: "POST", headers, body });
  ok(r.ok, `webhook accepted "${text}" (status ${r.status})`);
}

console.log(`Front Door smoke — ${WA}`);
await post("আমার মাথা ব্যথা");                 // 1: first contact → consent ask
await post("হ্যাঁ");                            // 2: consent → subject ask
await post("১");                                // 3: self → create patient + DID + wallet + triage

// Assertions
const { data: link } = await db.from("whatsapp_links").select("patient_id, verified_at").eq("wa_id", WA).maybeSingle();
ok(!!link?.verified_at, "whatsapp_links row is auto-verified");
const patientId = link?.patient_id;
const { data: p } = patientId ? await db.from("patients").select("owner_org_id, clinic_id, did").eq("id", patientId).maybeSingle() : { data: null };
ok(!!p && !!p.owner_org_id && p.clinic_id === null, "patient is provisional (owner_org_id set, clinic_id null)");
ok(!!p?.did && p.did.startsWith("did:web:"), "patient DID minted");
const { data: org } = p ? await db.from("organizations").select("org_type").eq("id", p.owner_org_id).maybeSingle() : { data: null };
ok(org?.org_type === "kham_holding", "owner is the kham_holding org");
const { data: tok } = patientId ? await db.from("wallet_access_tokens").select("token").eq("patient_id", patientId).maybeSingle() : { data: null };
ok(!!tok?.token, "wallet token issued");
const { data: consent } = patientId ? await db.from("consent_records").select("granted_by, device_info").eq("patient_id", patientId).eq("consent_type", "ai_processing").maybeSingle() : { data: null };
ok(consent?.granted_by === "patient" && consent?.device_info === "whatsapp_triage", "ai_processing consent recorded (self → patient)");
const { data: doneMsgs } = await db.from("wa_messages").select("id").eq("wa_id", WA).eq("direction", "inbound").eq("status", "done");
ok((doneMsgs?.length ?? 0) === 3, "all 3 inbound messages processed to 'done' (pipeline ran end to end)");

// Cleanup (FK order)
if (patientId) {
  await db.from("triage_sessions").delete().eq("patient_id", patientId);
  await db.from("consent_records").delete().eq("patient_id", patientId);
  await db.from("wallet_access_tokens").delete().eq("patient_id", patientId);
  await db.from("wa_messages").delete().eq("wa_id", WA);
  await db.from("wa_conversations").delete().eq("wa_id", WA);
  await db.from("whatsapp_links").delete().eq("wa_id", WA);
  await db.from("patients").delete().eq("id", patientId);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
