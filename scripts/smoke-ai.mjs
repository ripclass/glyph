/**
 * Live AI smoke test — exercises the FIRST real end-to-end AI path:
 * registration-shaped DB writes → signed-in doctor JWT → intake-start edge
 * function → Gemini 2.0 Flash (via OpenRouter transport) → Bangla greeting →
 * transcript persisted → api_usage_log row.
 *
 * Provisions its own clinic/doctor/patient/visit, then deletes everything.
 *
 * Usage:
 *   node scripts/smoke-ai.mjs <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>
 */

import { createClient } from '@supabase/supabase-js';

const [url, anonKey, serviceKey] = process.argv.slice(2);
if (!url || !anonKey || !serviceKey) {
  console.error('usage: node scripts/smoke-ai.mjs <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>');
  process.exit(2);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

// ── Provision: clinic → auth user → doctor → patient → visit ──────────────
const { data: clinic } = await admin
  .from('clinics')
  .insert({ name: 'Smoke Test Clinic', district: 'Dhaka' })
  .select()
  .single();
check('clinic created', Boolean(clinic));

const password = `smoke-${Math.random().toString(36).slice(2)}-Aa1!`;
const email = `smoke-doctor-${Date.now()}@glyph.local`;
const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
check('auth user created', !authErr, authErr?.message);
const doctorId = authUser.user.id;

const { error: docErr } = await admin.from('doctors').insert({
  id: doctorId,
  clinic_id: clinic.id,
  name: 'Dr. Smoke Test',
  phone: `017${String(Date.now()).slice(-8)}`,
  speciality: 'Medicine',
});
check('doctor created', !docErr, docErr?.message);

const { data: patient, error: patErr } = await admin
  .from('patients')
  .insert({
    clinic_id: clinic.id,
    name: 'Abdul Karim',
    name_bn: 'আব্দুল করিম',
    phone: '01711999777',
    age: 62,
    gender: 'male',
  })
  .select()
  .single();
check('patient created', !patErr, patErr?.message);

const { data: visit, error: visErr } = await admin
  .from('visits')
  .insert({
    patient_id: patient.id,
    doctor_id: doctorId,
    clinic_id: clinic.id,
    status: 'intake',
  })
  .select()
  .single();
check('visit created (visit_number trigger)', !visErr && visit.visit_number === 1, visErr?.message);

// ── Sign in as the doctor (RLS-scoped JWT) ─────────────────────────────────
const userClient = createClient(url, anonKey, { auth: { persistSession: false } });
const { data: session, error: signInErr } = await userClient.auth.signInWithPassword({
  email,
  password,
});
check('doctor sign-in (JWT issued)', !signInErr, signInErr?.message);
const jwt = session.session.access_token;

// ── THE CALL: intake-start → Gemini via OpenRouter ─────────────────────────
console.log('\nCalling intake-start (Gemini 2.0 Flash via OpenRouter)...\n');
const t0 = Date.now();
const res = await fetch(`${url}/functions/v1/intake-start`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${jwt}`,
    apikey: anonKey,
  },
  body: JSON.stringify({ visitId: visit.id, isAttendant: false, language: 'bn' }),
});
const elapsed = Date.now() - t0;
const body = await res.json();

check(`intake-start HTTP ${res.status}`, res.ok, JSON.stringify(body).slice(0, 200));
check('response envelope success:true', body.success === true, body.error);
const greeting = body.data?.greeting ?? '';
check('greeting is non-empty Bangla', /[ঀ-৿]/.test(greeting), greeting.slice(0, 80));
console.log(`\n  GREETING (${elapsed}ms):\n  ${greeting}\n`);

// ── Verify persistence: transcript + cost log ──────────────────────────────
const { data: visitAfter } = await admin
  .from('visits')
  .select('intake_transcript')
  .eq('id', visit.id)
  .single();
const transcript = visitAfter?.intake_transcript;
check(
  'transcript persisted with assistant greeting',
  Array.isArray(transcript) && transcript[0]?.role === 'assistant' && transcript[0]?.content?.length > 0
);

const { data: usage } = await admin
  .from('api_usage_log')
  .select('edge_function, model_used, input_tokens, output_tokens, latency_ms')
  .eq('visit_id', visit.id);
check(
  'api_usage_log row written (cost logging through OpenRouter transport)',
  Array.isArray(usage) && usage.length >= 1,
  usage?.map((u) => `${u.model_used} in=${u.input_tokens} out=${u.output_tokens} ${u.latency_ms}ms`).join('; ')
);

// ── Cleanup (FK order) ──────────────────────────────────────────────────────
await admin.from('api_usage_log').delete().eq('visit_id', visit.id);
await admin.from('consent_records').delete().eq('visit_id', visit.id);
await admin.from('visits').delete().eq('id', visit.id);
await admin.from('patients').delete().eq('id', patient.id);
await admin.from('doctors').delete().eq('id', doctorId);
await admin.from('clinics').delete().eq('id', clinic.id);
await admin.auth.admin.deleteUser(doctorId);
console.log('cleanup done');

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
