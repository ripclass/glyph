/**
 * Pocket v2 triage verification — exercises the live, deployed path end to end
 * against the real Next route (which calls the egress-gated `triage` edge
 * function with the service role). Adversarial where it matters:
 *
 *   1. Tier B fails closed at the app layer: a benign symptom with NO consent
 *      and consentAccepted=false → state "consent_required" (never reaches the
 *      model).
 *   2. The deterministic red-flag screen forces urgent INDEPENDENT of the LLM:
 *      a danger phrase → outcome.route="urgent" with a go-now line, and the
 *      session is persisted with red_flag_screened=true.
 *   3. The real guided exchange: a benign symptom with consent → a valid
 *      routed outcome (question, or an answer routed pharmacy/doctor), proving
 *      the LLM round-trips through the egress gate and validateOutcome clamp.
 *   4. Consent is recorded once, patient-granted, tagged device_info=
 *      'pocket_triage' (a distinct, auditable wallet grant).
 *
 * Creates a throwaway clinic + patient + wallet token, then cleans them up.
 *
 * Usage:
 *   node scripts/smoke-triage.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>
 *   (APP_URL e.g. https://khamhealth.com — the Next app, not the functions URL)
 */

import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const [appUrl, supaUrl, serviceKey] = process.argv.slice(2);
if (!appUrl || !supaUrl || !serviceKey) {
  console.error('usage: node scripts/smoke-triage.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>');
  process.exit(2);
}
const base = appUrl.replace(/\/$/, '');
const admin = createClient(supaUrl, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${String(detail).slice(0, 200)}` : ''}`);
  if (!ok) failures++;
}

async function triage(token, body) {
  const res = await fetch(`${base}/api/wallet/${token}/triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({ state: 'parse_error' }));
  return { status: res.status, json };
}

// ── Provision a throwaway clinic + patient + wallet token ───────────────────
const { data: clinic } = await admin.from('clinics').insert({ name: 'Triage Smoke Clinic' }).select().single();
const { data: patient } = await admin
  .from('patients')
  .insert({
    clinic_id: clinic.id,
    name: 'Triage Test',
    name_bn: 'ট্রায়াজ টেস্ট',
    phone: `017${String(Date.now()).slice(-8)}`,
    age: 58,
    gender: 'male',
    chronic_conditions: ['diabetes'],
  })
  .select()
  .single();
const token = randomBytes(24).toString('base64url');
await admin.from('wallet_access_tokens').insert({ token, patient_id: patient.id });

console.log(`\nprovisioned: patient ${patient.id}, token ${token.slice(0, 8)}…\n`);

try {
  // ── 1. Tier B fails closed: benign, no consent, not accepted ──────────────
  const r1 = await triage(token, {
    messages: [{ role: 'patient', content: 'গত দুই দিন ধরে হালকা সর্দি আর গলা ব্যথা' }],
    consentAccepted: false,
  });
  check('benign + no consent → consent_required (Tier B fails closed)', r1.json.state === 'consent_required', JSON.stringify(r1.json));

  // ── 2. Deterministic red-flag screen forces urgent (no LLM needed) ────────
  const r2 = await triage(token, {
    messages: [{ role: 'patient', content: 'আমার বুকে প্রচণ্ড ব্যথা আর শ্বাসকষ্ট হচ্ছে' }],
    consentAccepted: true,
  });
  check('red-flag phrase → state ok', r2.json.state === 'ok', JSON.stringify(r2.json).slice(0, 120));
  check('red-flag → route "urgent" (forced by screen)', r2.json.outcome?.route === 'urgent', r2.json.outcome?.route);
  check('red-flag → carries a go-now redFlag line', !!r2.json.outcome?.redFlag, r2.json.outcome?.redFlag);
  console.log(`     urgent text: ${r2.json.outcome?.text}\n`);

  // ── 3. Real guided exchange through the egress gate ───────────────────────
  const r3 = await triage(token, {
    messages: [{ role: 'patient', content: 'গত দুই দিন ধরে হালকা সর্দি আর গলা ব্যথা, জ্বর নেই' }],
    consentAccepted: true,
  });
  const o3 = r3.json.outcome;
  const validShape =
    r3.json.state === 'ok' &&
    o3 &&
    (o3.mode === 'question'
      ? typeof o3.text === 'string' && o3.text.length > 0
      : ['pharmacy', 'doctor', 'urgent'].includes(o3.route));
  check('benign + consent → valid routed outcome (LLM round-trips egress gate)', !!validShape, JSON.stringify(o3)?.slice(0, 200));
  console.log(`     model ${o3?.mode}: ${o3?.text}\n`);

  // ── 4. Consent recorded once, patient-granted, tagged ─────────────────────
  const { data: consents } = await admin
    .from('consent_records')
    .select('consent_type, granted, granted_by, device_info, withdrawn_at')
    .eq('patient_id', patient.id);
  const aiRows = (consents ?? []).filter((c) => c.consent_type === 'ai_processing' && c.device_info === 'pocket_triage');
  check('exactly one wallet-triage ai_processing consent', aiRows.length === 1, `rows=${aiRows.length}`);
  check('consent granted, patient-granted, not withdrawn', !!aiRows[0]?.granted && aiRows[0]?.granted_by === 'patient' && !aiRows[0]?.withdrawn_at, JSON.stringify(aiRows[0]));

  // ── 5. Sessions persisted; the urgent one flagged as code-forced ──────────
  const { data: sessions } = await admin
    .from('triage_sessions')
    .select('outcome, red_flag_screened')
    .eq('patient_id', patient.id);
  check('triage_sessions persisted on final answers', (sessions ?? []).length >= 1, `rows=${(sessions ?? []).length}`);
  const urgentSession = (sessions ?? []).find((s) => s.outcome?.route === 'urgent');
  check('urgent session flagged red_flag_screened=true', urgentSession?.red_flag_screened === true, JSON.stringify(urgentSession?.red_flag_screened));
} finally {
  // ── Cleanup (explicit, FK-safe order) ───────────────────────────────────
  await admin.from('triage_sessions').delete().eq('patient_id', patient.id);
  await admin.from('consent_records').delete().eq('patient_id', patient.id);
  await admin.from('wallet_access_tokens').delete().eq('patient_id', patient.id);
  await admin.from('patients').delete().eq('id', patient.id);
  await admin.from('clinics').delete().eq('id', clinic.id);
  console.log('cleanup: smoke clinic/patient/token/consent/sessions removed');
}

console.log(failures === 0 ? '\nALL CHECKS PASSED — Pocket triage is live' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
