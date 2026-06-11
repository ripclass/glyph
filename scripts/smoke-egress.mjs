/**
 * Egress-gate verification (M4 hard constraint) — adversarial where it
 * matters: consent withdrawal must BLOCK the call, and the evidence log
 * must be immutable.
 *
 *   1. Tier A round-trip: intake-start greeting still carries the real
 *      patient name (scrub → egress → re-identify), and the evidence row
 *      records deidentified=true with scrubbed-identifier count.
 *   2. Tier B with consent: intake-turn streams; evidence row carries the
 *      consent_id.
 *   3. Tier B WITHOUT consent (withdrawn): intake-turn is REJECTED (403
 *      EGRESS_DENIED) and the denial is itself evidence (allowed=false).
 *   4. The evidence log rejects tampering (append-only trigger).
 *
 * Usage:
 *   node scripts/smoke-egress.mjs <FUNCTIONS_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_KEY>
 */

import { createClient } from '@supabase/supabase-js';

const [fnUrl, supaUrl, anonKey, serviceKey] = process.argv.slice(2);
if (!fnUrl || !supaUrl || !anonKey || !serviceKey) {
  console.error('usage: node scripts/smoke-egress.mjs <FUNCTIONS_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_KEY>');
  process.exit(2);
}

const admin = createClient(supaUrl, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${String(detail).slice(0, 140)}` : ''}`);
  if (!ok) failures++;
}

// ── Provision ───────────────────────────────────────────────────────────────
const { data: clinic } = await admin.from('clinics').insert({ name: 'Egress Smoke Clinic' }).select().single();
const email = `egress-${Date.now()}@glyph.local`;
const password = `egress-${Math.random().toString(36).slice(2)}-Aa1!`;
const { data: authUser } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
const doctorId = authUser.user.id;
await admin.from('doctors').insert({
  id: doctorId, clinic_id: clinic.id, name: 'Dr. Egress Test',
  phone: `015${String(Date.now()).slice(-8)}`,
});
const { data: patient } = await admin
  .from('patients')
  .insert({ clinic_id: clinic.id, name: 'Salma Akter', name_bn: 'সালমা আক্তার', phone: '01911222333', age: 39, gender: 'female' })
  .select()
  .single();
const { data: visit } = await admin
  .from('visits')
  .insert({ patient_id: patient.id, doctor_id: doctorId, clinic_id: clinic.id, status: 'intake' })
  .select()
  .single();

const userClient = createClient(supaUrl, anonKey, { auth: { persistSession: false } });
const { data: session } = await userClient.auth.signInWithPassword({ email, password });
const jwt = session.session.access_token;

function callFn(name, body) {
  return fetch(`${fnUrl}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}`, apikey: anonKey },
    body: JSON.stringify(body),
  });
}

// ── 1. Tier A: scrub → egress → re-identify round-trip ──────────────────────
const startRes = await callFn('intake-start', { visitId: visit.id, isAttendant: false, language: 'bn' });
const startBody = await startRes.json();
check('Tier A call succeeds through the gate', startRes.ok && startBody.success, startBody.error);
check(
  'greeting still carries the REAL name (re-identified after scrubbed egress)',
  String(startBody.data?.greeting ?? '').includes('সালমা'),
  startBody.data?.greeting?.slice(0, 90)
);

const { data: aLogs } = await admin
  .from('egress_log')
  .select('tier, processor, allowed, deidentified, identifiers_scrubbed')
  .eq('edge_function', 'intake-start')
  .order('called_at', { ascending: false })
  .limit(1);
const aLog = aLogs?.[0];
check(
  'Tier A evidence row: allowed + deidentified + identifiers scrubbed',
  aLog?.tier === 'A' && aLog.allowed === true && aLog.deidentified === true && aLog.identifiers_scrubbed > 0,
  JSON.stringify(aLog)
);

// ── 2. Tier B with consent (rows created by intake-start) ───────────────────
const turnRes = await callFn('intake-turn', {
  visitId: visit.id,
  message: 'কয়েকদিন ধরে বুক ধড়ফড় করছে।',
  messageSource: 'patient',
});
await turnRes.text(); // drain the stream
check('Tier B with consent passes the gate', turnRes.ok, turnRes.status);

const { data: bLogs } = await admin
  .from('egress_log')
  .select('tier, allowed, consent_id, visit_id')
  .eq('edge_function', 'intake-turn')
  .eq('visit_id', visit.id)
  .order('called_at', { ascending: false })
  .limit(1);
const bLog = bLogs?.[0];
check('Tier B evidence row carries the consent reference', bLog?.tier === 'B' && bLog.allowed === true && Boolean(bLog.consent_id), JSON.stringify(bLog));

// ── 3. Tier B with consent WITHDRAWN: must be rejected ──────────────────────
await admin
  .from('consent_records')
  .update({ withdrawn_at: new Date().toISOString() })
  .eq('visit_id', visit.id)
  .eq('consent_type', 'ai_processing');

const deniedRes = await callFn('intake-turn', {
  visitId: visit.id,
  message: 'আরেকটা কথা বলতে চাই।',
  messageSource: 'patient',
});
const deniedBody = await deniedRes.json().catch(() => ({}));
check(
  'consent withdrawn → Tier B call REJECTED (fail closed)',
  deniedRes.status === 403 && deniedBody.code === 'EGRESS_DENIED',
  `HTTP ${deniedRes.status} ${deniedBody.code ?? ''}`
);

const { data: denyLogs } = await admin
  .from('egress_log')
  .select('allowed, reject_reason')
  .eq('edge_function', 'intake-turn')
  .eq('visit_id', visit.id)
  .eq('allowed', false)
  .limit(1);
check('the denial is itself evidence (allowed=false row)', denyLogs?.length === 1, denyLogs?.[0]?.reject_reason);

// ── 4. Evidence log is append-only ──────────────────────────────────────────
const { error: tamperErr } = await admin
  .from('egress_log')
  .update({ allowed: true })
  .eq('edge_function', 'intake-turn')
  .eq('allowed', false);
check('evidence log rejects tampering', Boolean(tamperErr), tamperErr?.message);

// ── Cleanup (egress_log + consent stay — evidence) ──────────────────────────
await admin.from('visits').delete().eq('id', visit.id).then(async (r) => {
  // visits with egress_log FK refs can't be deleted? egress_log.visit_id FK has no CASCADE —
  // delete order: egress_log rows are append-only (cannot delete). Leave visit in place, anonymized.
  if (r.error) {
    await admin.from('visits').update({ status: 'completed' }).eq('id', visit.id);
  }
});
console.log('\ncleanup: evidence rows retained by design');

console.log(failures === 0 ? '\nALL CHECKS PASSED — the gate fails closed' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
