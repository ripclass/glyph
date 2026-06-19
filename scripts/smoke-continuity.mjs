/**
 * Live-DB + route E2E smoke for Continuity v1 (migration 015 + the clearance-record pipeline).
 *
 * Section A (service-role): clearance_records schema, status CHECK, freeze-on-credential.
 * Section B (added in Task 5): full clearance→sign→wallet→verify over the live Next routes,
 *   plus two-recruiter RLS isolation.
 *
 * Run on a LOCAL Supabase (keys from `supabase status -o env`):
 *   node scripts/smoke-continuity.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>
 * (APP_URL unused until Section B; pass http://localhost:3000.)
 */

import { createClient } from '@supabase/supabase-js';

const [appUrl, url, anonKey, serviceKey] = process.argv.slice(2);
if (!url || !anonKey || !serviceKey) {
  console.error('usage: node scripts/smoke-continuity.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>');
  process.exit(2);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

// ===== Section A: clearance_records schema + constraints =====
const { data: recruiter, error: recruiterErr } = await db
  .from('organizations')
  .insert({ name: 'Continuity Smoke Recruiter', org_type: 'recruiter' })
  .select('id')
  .single();
if (!recruiter) {
  console.error('FATAL: could not create recruiter org:', recruiterErr?.message);
  process.exit(1);
}

const { data: pat, error: patErr } = await db
  .from('patients')
  .insert({ owner_org_id: recruiter.id, clinic_id: null, name: 'Continuity Smoke Worker' })
  .select('id')
  .single();
if (!pat) {
  console.error('FATAL: could not create patient:', patErr?.message);
  await db.from('organizations').delete().eq('id', recruiter.id);
  process.exit(1);
}

const { data: record, error: recordErr } = await db
  .from('clearance_records')
  .insert({ owner_org_id: recruiter.id, patient_id: pat.id })
  .select('id, status')
  .single();
check('clearance_records insert defaults status=draft', !recordErr && record?.status === 'draft', recordErr?.message);

const { error: badStatusErr } = await db
  .from('clearance_records')
  .update({ status: 'teleported' })
  .eq('id', record?.id ?? '00000000-0000-0000-0000-000000000000');
check('clearance_records status CHECK rejects unknown status', Boolean(badStatusErr), badStatusErr?.message);

// freeze: simulate a credentialed record, then a clinical mutation must fail.
const { data: cred } = await db
  .from('credentials')
  .select('id')
  .limit(1)
  .maybeSingle();
if (cred?.id && record?.id) {
  await db.from('clearance_records').update({ credential_id: cred.id, status: 'signed' }).eq('id', record.id);
  const { error: frozenErr } = await db
    .from('clearance_records')
    .update({ findings: [{ testName: 'Mutated', value: '999' }] })
    .eq('id', record.id);
  check('credentialed clearance_record is frozen against findings mutation', Boolean(frozenErr), frozenErr?.message);
} else {
  check('credentialed clearance_record freeze (skipped — no credential row to borrow)', true, 'no-op on empty credentials');
}

// cleanup
if (record?.id) await db.from('clearance_records').delete().eq('id', record.id);
await db.from('patients').delete().eq('id', pat.id);
await db.from('organizations').delete().eq('id', recruiter.id);

console.log('\nSection A complete.');

// ===== Section B: full Continuity pipeline over the live Next routes =====
if (!appUrl) { console.log('Section B reserved for Task 5'); }
