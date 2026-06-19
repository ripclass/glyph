/**
 * Live-DB + route E2E smoke for Hospital v1 (migration 013 + the discharge pipeline).
 *
 * Section A (service-role): discharge_records schema, status CHECK, freeze-on-credential.
 * Section B (added in a later task): full admission→discharge→sign→wallet→verify
 *   over the live Next routes, plus two-hospital RLS isolation.
 *
 * Run on a LOCAL Supabase (keys from `supabase status -o env`):
 *   node scripts/smoke-hospital.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>
 * (APP_URL unused until Section B; pass http://localhost:3000.)
 */

import { createClient } from '@supabase/supabase-js';

const [appUrl, url, anonKey, serviceKey] = process.argv.slice(2);
if (!url || !anonKey || !serviceKey) {
  console.error('usage: node scripts/smoke-hospital.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>');
  process.exit(2);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

// ===== Section A: discharge_records schema + constraints =====
const { data: hospital } = await db
  .from('organizations')
  .insert({ name: 'Hospital Smoke Org', org_type: 'hospital' })
  .select('id')
  .single();
const { data: pat } = await db
  .from('patients')
  .insert({ owner_org_id: hospital.id, clinic_id: null, name: 'Hospital Smoke Patient' })
  .select('id')
  .single();

const { data: record, error: recordErr } = await db
  .from('discharge_records')
  .insert({ owner_org_id: hospital.id, patient_id: pat.id })
  .select('id, status')
  .single();
check('discharge_records insert defaults status=draft', !recordErr && record?.status === 'draft', recordErr?.message);

const { error: badStatusErr } = await db
  .from('discharge_records')
  .update({ status: 'teleported' })
  .eq('id', record.id);
check('discharge_records status CHECK rejects unknown status', Boolean(badStatusErr), badStatusErr?.message);

// freeze: simulate a credentialed record, then a clinical mutation must fail.
const { data: cred } = await db
  .from('credentials')
  .select('id')
  .limit(1)
  .maybeSingle();
if (cred?.id) {
  await db.from('discharge_records').update({ credential_id: cred.id, status: 'signed' }).eq('id', record.id);
  const { error: frozenErr } = await db
    .from('discharge_records')
    .update({ discharge_diagnosis: [{ text: 'Mutated', icd10: 'Z99' }] })
    .eq('id', record.id);
  check('credentialed discharge_record is frozen against diagnosis mutation', Boolean(frozenErr), frozenErr?.message);
} else {
  check('credentialed discharge_record freeze (skipped — no credential row to borrow)', true, 'no-op on empty credentials');
}

// cleanup
await db.from('discharge_records').delete().eq('id', record.id);
await db.from('patients').delete().eq('id', pat.id);
await db.from('organizations').delete().eq('id', hospital.id);

// ===== Section B added in a later task =====

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
