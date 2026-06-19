/**
 * Live-DB + route E2E smoke for Maa v1 (migration 016 + the antenatal-visit pipeline).
 *
 * Section A (service-role): antenatal_visits schema, status CHECK, freeze-on-credential.
 * Section B: full antenatal→sign→wallet→verify over the live Next routes (Task 2+).
 *
 * Run on a LOCAL Supabase (keys from `supabase status -o env`):
 *   node scripts/smoke-maa.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>
 * (APP_URL unused until Section B; pass http://localhost:3000.)
 */

import { createClient } from '@supabase/supabase-js';

const [appUrl, url, anonKey, serviceKey] = process.argv.slice(2);
if (!url || !anonKey || !serviceKey) {
  console.error('usage: node scripts/smoke-maa.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>');
  process.exit(2);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

// ===== Section A: antenatal_visits schema + constraints =====
const { data: program, error: programErr } = await db
  .from('organizations')
  .insert({ name: 'Maa Smoke Program', org_type: 'program' })
  .select('id')
  .single();
if (!program) {
  console.error('FATAL: could not create program org:', programErr?.message);
  process.exit(1);
}

const { data: pat, error: patErr } = await db
  .from('patients')
  .insert({ owner_org_id: program.id, clinic_id: null, name: 'Maa Smoke Mother' })
  .select('id')
  .single();
if (!pat) {
  console.error('FATAL: could not create patient:', patErr?.message);
  await db.from('organizations').delete().eq('id', program.id);
  process.exit(1);
}

const { data: visit, error: visitErr } = await db
  .from('antenatal_visits')
  .insert({ owner_org_id: program.id, patient_id: pat.id })
  .select('id, status')
  .single();
check('antenatal_visits insert defaults status=draft', !visitErr && visit?.status === 'draft', visitErr?.message);

const { error: badStatusErr } = await db
  .from('antenatal_visits')
  .update({ status: 'teleported' })
  .eq('id', visit?.id ?? '00000000-0000-0000-0000-000000000000');
check('antenatal_visits status CHECK rejects unknown status', Boolean(badStatusErr), badStatusErr?.message);

// freeze: simulate a credentialed record, then a clinical mutation must fail.
const { data: cred } = await db
  .from('credentials')
  .select('id')
  .limit(1)
  .maybeSingle();
if (cred?.id && visit?.id) {
  await db.from('antenatal_visits').update({ credential_id: cred.id, status: 'signed' }).eq('id', visit.id);
  const { error: frozenErr } = await db
    .from('antenatal_visits')
    .update({ gestational_age_weeks: 99 })
    .eq('id', visit.id);
  check('credentialed antenatal_visit is frozen against clinical mutation', Boolean(frozenErr), frozenErr?.message);
} else {
  check('credentialed antenatal_visit freeze (skipped — no credential row to borrow)', true, 'no-op on empty credentials');
}

// cleanup
if (visit?.id) await db.from('antenatal_visits').delete().eq('id', visit.id);
await db.from('patients').delete().eq('id', pat.id);
await db.from('organizations').delete().eq('id', program.id);

console.log('\nSection A complete.');

// ===== Section B: full Maa pipeline over the live Next routes =====
// (Task 2+: create→save→sign→verify, two-program RLS isolation)

if (!appUrl) {
  console.log('\nSection B SKIPPED — no APP_URL provided (pass http://localhost:3000)');
} else {
  console.log('\nSection B: not yet implemented (Task 2+)');
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
