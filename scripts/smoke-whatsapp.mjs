/**
 * Pocket WhatsApp bridge (Leg A) smoke. Drives the webhook the way 360dialog
 * would, asserting the binding + conversation + message-log state. No real WA
 * delivery (outbound send will fail without DIALOG360_API_KEY and is logged
 * 'failed' — that is expected in this DB-only smoke; the bind/route/persist
 * path is what we assert).
 *
 * usage: node scripts/smoke-whatsapp.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>
 */
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const [appUrl, supaUrl, serviceKey] = process.argv.slice(2);
if (!appUrl || !supaUrl || !serviceKey) {
  console.error("usage: node scripts/smoke-whatsapp.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>");
  process.exit(2);
}
const base = appUrl.replace(/\/$/, "");
const admin = createClient(supaUrl, serviceKey, { auth: { persistSession: false } });
let failures = 0;
const check = (label, ok, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${String(detail).slice(0, 160)}` : ""}`); if (!ok) failures++; };

const waId = `8801${randomInt(100000000, 999999999)}`;
const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

function inboundPayload(text, id) {
  return { entry: [{ changes: [{ value: {
    contacts: [{ wa_id: waId, profile: { name: "Smoke" } }],
    messages: [{ id, from: waId, timestamp: "1700000000", type: "text", text: { body: text } }],
  } }] }] };
}
async function post(payload) {
  return fetch(`${base}/api/whatsapp/webhook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

// Provision a throwaway clinic + patient + a pending bind code.
const { data: clinic } = await admin.from("clinics").insert({ name: "WA Smoke Clinic" }).select().single();
const { data: patient } = await admin.from("patients").insert({ clinic_id: clinic.id, name: "WA Smoke", phone: `019${randomInt(10000000, 99999999)}`, age: 40, gender: "male" }).select().single();
await admin.from("whatsapp_links").insert({ patient_id: patient.id, bind_code: code, bind_code_expires_at: new Date(Date.now() + 600000).toISOString() });

try {
  // 1. Unknown number, no code → onboard (no link created).
  const r1 = await post(inboundPayload("hello", `wamid.${code}.a`));
  check("webhook 200 for onboarding message", r1.status === 200, r1.status);
  await new Promise((r) => setTimeout(r, 2500)); // let processing run
  const { data: l0 } = await admin.from("whatsapp_links").select("verified_at").eq("patient_id", patient.id).maybeSingle();
  check("no binding yet (onboard only)", !l0?.verified_at);

  // 2. Send the code → binds.
  const r2 = await post(inboundPayload(`Glyph কোড: ${code}`, `wamid.${code}.b`));
  check("webhook 200 for bind message", r2.status === 200, r2.status);
  await new Promise((r) => setTimeout(r, 2500));
  const { data: link } = await admin.from("whatsapp_links").select("wa_id, verified_at, revoked").eq("patient_id", patient.id).maybeSingle();
  check("link verified + bound to wa_id", link?.wa_id === waId && !!link?.verified_at && !link?.revoked, JSON.stringify(link));

  // 3. Conversation row + window set.
  const { data: convo } = await admin.from("wa_conversations").select("patient_id, window_expires_at").eq("wa_id", waId).maybeSingle();
  check("conversation bound + window open", convo?.patient_id === patient.id && new Date(convo.window_expires_at) > new Date(), JSON.stringify(convo));

  // 4. Idempotency: replay the bind message → no duplicate inbound row.
  await post(inboundPayload(`Glyph কোড: ${code}`, `wamid.${code}.b`));
  await new Promise((r) => setTimeout(r, 1500));
  const { count } = await admin.from("wa_messages").select("*", { count: "exact", head: true }).eq("provider_message_id", `wamid.${code}.b`);
  check("redelivery deduped (1 inbound row)", count === 1, `count=${count}`);

  // 5. Bound patient asks for their record → wallet link reply logged.
  const r5 = await post(inboundPayload("রেকর্ড", `wamid.${code}.rec`));
  check("webhook 200 for record request", r5.status === 200, r5.status);
  await new Promise((r) => setTimeout(r, 2500));
  const { data: walletOut } = await admin
    .from("wa_messages").select("status").eq("wa_id", waId).eq("direction", "outbound").order("created_at", { ascending: false }).limit(1).maybeSingle();
  check("record request produced an outbound reply", !!walletOut, JSON.stringify(walletOut));
  const { data: tok } = await admin.from("wallet_access_tokens").select("token").eq("patient_id", patient.id).maybeSingle();
  check("wallet token minted for the patient", !!tok?.token);

  // 6. Bound patient sends a RED-FLAG symptom → deterministic urgent (no LLM/consent needed).
  const r6 = await post(inboundPayload("আমার বুকে প্রচণ্ড ব্যথা আর শ্বাসকষ্ট হচ্ছে", `wamid.${code}.rf`));
  check("webhook 200 for red-flag symptom", r6.status === 200, r6.status);
  await new Promise((r) => setTimeout(r, 3000));
  const { data: triageRow } = await admin
    .from("triage_sessions").select("red_flag_screened, outcome").eq("patient_id", patient.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  check("red-flag triage session persisted as urgent", triageRow?.red_flag_screened === true && triageRow?.outcome?.route === "urgent", JSON.stringify(triageRow?.outcome?.route));

  // 7. Bound patient sends an image → one-time doc consent notice, then type question.
  const r7 = await post({ entry: [{ changes: [{ value: {
    contacts: [{ wa_id: waId, profile: { name: "Smoke" } }],
    messages: [{ id: `wamid.${code}.img`, from: waId, timestamp: "1700000000", type: "image", image: { id: "fake-media-1", mime_type: "image/jpeg" } }],
  } }] }] });
  check("webhook 200 for image", r7.status === 200, r7.status);
  await new Promise((r) => setTimeout(r, 2500));
  let { data: convo7 } = await admin.from("wa_conversations").select("active_flow").eq("wa_id", waId).maybeSingle();
  check("image → awaiting_document_consent", convo7?.active_flow === "awaiting_document_consent", convo7?.active_flow);

  const r8 = await post(inboundPayload("হ্যাঁ", `wamid.${code}.docyes`));
  check("webhook 200 for doc consent yes", r8.status === 200, r8.status);
  await new Promise((r) => setTimeout(r, 2500));
  ({ data: convo7 } = await admin.from("wa_conversations").select("active_flow").eq("wa_id", waId).maybeSingle());
  check("doc consent agreed → awaiting_document_type", convo7?.active_flow === "awaiting_document_type", convo7?.active_flow);
  const { data: docConsent } = await admin.from("consent_records").select("device_info").eq("patient_id", patient.id).eq("device_info", "whatsapp_document").maybeSingle();
  check("whatsapp_document consent recorded", !!docConsent);

  // 9. Proactive queue: enqueue a followup directly, assert it lands as pending
  // (the deterministic part — real template delivery needs an approved template + live number).
  await admin.from("scheduled_messages").insert({
    kind: "followup", patient_id: patient.id, to_wa_id: waId,
    template_name: "glyph_followup", template_lang: "bn", template_vars: ["Smoke"],
    fire_at: new Date(Date.now() - 1000).toISOString(),
  });
  const { data: sched } = await admin.from("scheduled_messages").select("state, template_name").eq("patient_id", patient.id).eq("kind", "followup").maybeSingle();
  check("followup enqueued (pending)", sched?.state === "pending" && sched?.template_name === "glyph_followup", JSON.stringify(sched));
} finally {
  await admin.from("scheduled_messages").delete().eq("patient_id", patient.id);
  await admin.from("triage_sessions").delete().eq("patient_id", patient.id);
  await admin.from("consent_records").delete().eq("patient_id", patient.id);
  await admin.from("wallet_access_tokens").delete().eq("patient_id", patient.id);
  await admin.from("wa_messages").delete().eq("wa_id", waId);
  await admin.from("wa_conversations").delete().eq("wa_id", waId);
  await admin.from("whatsapp_links").delete().eq("patient_id", patient.id);
  await admin.from("patients").delete().eq("id", patient.id);
  await admin.from("clinics").delete().eq("id", clinic.id);
  console.log("cleanup done");
}

console.log(failures === 0 ? "\nALL CHECKS PASSED — WhatsApp bridge Leg A wired" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
