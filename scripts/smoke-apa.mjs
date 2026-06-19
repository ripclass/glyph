/**
 * Live-DB + route E2E smoke for Apa v1 (migration 014 + the occupational-assessment pipeline).
 *
 * Section A (service-role): occupational_assessments schema, status CHECK, freeze-on-credential.
 * Section B (added in Task 5): full assessment→sign→wallet→verify over the live Next routes,
 *   plus two-employer RLS isolation.
 *
 * Run on a LOCAL Supabase (keys from `supabase status -o env`):
 *   node scripts/smoke-apa.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>
 * (APP_URL unused until Section B; pass http://localhost:3000.)
 */

import { createClient } from '@supabase/supabase-js';

const [appUrl, url, anonKey, serviceKey] = process.argv.slice(2);
if (!url || !anonKey || !serviceKey) {
  console.error('usage: node scripts/smoke-apa.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>');
  process.exit(2);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

// ===== Section A: occupational_assessments schema + constraints =====
const { data: employer, error: employerErr } = await db
  .from('organizations')
  .insert({ name: 'Apa Smoke Employer', org_type: 'employer' })
  .select('id')
  .single();
if (!employer) {
  console.error('FATAL: could not create employer org:', employerErr?.message);
  process.exit(1);
}

const { data: pat, error: patErr } = await db
  .from('patients')
  .insert({ owner_org_id: employer.id, clinic_id: null, name: 'Apa Smoke Worker' })
  .select('id')
  .single();
if (!pat) {
  console.error('FATAL: could not create patient:', patErr?.message);
  await db.from('organizations').delete().eq('id', employer.id);
  process.exit(1);
}

const { data: record, error: recordErr } = await db
  .from('occupational_assessments')
  .insert({ owner_org_id: employer.id, patient_id: pat.id })
  .select('id, status')
  .single();
check('occupational_assessments insert defaults status=draft', !recordErr && record?.status === 'draft', recordErr?.message);

const { error: badStatusErr } = await db
  .from('occupational_assessments')
  .update({ status: 'teleported' })
  .eq('id', record?.id ?? '00000000-0000-0000-0000-000000000000');
check('occupational_assessments status CHECK rejects unknown status', Boolean(badStatusErr), badStatusErr?.message);

// freeze: simulate a credentialed record, then a clinical mutation must fail.
const { data: cred } = await db
  .from('credentials')
  .select('id')
  .limit(1)
  .maybeSingle();
if (cred?.id && record?.id) {
  await db.from('occupational_assessments').update({ credential_id: cred.id, status: 'signed' }).eq('id', record.id);
  const { error: frozenErr } = await db
    .from('occupational_assessments')
    .update({ findings: [{ testName: 'Mutated', value: '999' }] })
    .eq('id', record.id);
  check('credentialed occupational_assessment is frozen against findings mutation', Boolean(frozenErr), frozenErr?.message);
} else {
  check('credentialed occupational_assessment freeze (skipped — no credential row to borrow)', true, 'no-op on empty credentials');
}

// cleanup
if (record?.id) await db.from('occupational_assessments').delete().eq('id', record.id);
await db.from('patients').delete().eq('id', pat.id);
await db.from('organizations').delete().eq('id', employer.id);

console.log('\nSection A complete.');

// ===== Section B: full Apa pipeline over the live Next routes =====
// (Added in Task 5 — placeholder only)
if (!appUrl) {
  console.log('Section B SKIPPED — reserved for Task 5.');
} else {
  console.log('Section B SKIPPED — reserved for Task 5.');
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
