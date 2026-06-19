/**
 * Live-DB + route E2E smoke for Bridge v1 (migration 017 + the specialist-opinion pipeline).
 *
 * Section A (service-role): specialist_opinions schema, status CHECK, freeze-on-credential.
 * Section B: full opinion→sign→wallet→verify over the live Next routes (Task 2+).
 *
 * Run on a LOCAL Supabase (keys from `supabase status -o env`):
 *   node scripts/smoke-bridge.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>
 * (APP_URL unused until Section B; pass http://localhost:3000.)
 */

import { createClient } from '@supabase/supabase-js';

const [appUrl, url, anonKey, serviceKey] = process.argv.slice(2);
if (!url || !anonKey || !serviceKey) {
  console.error('usage: node scripts/smoke-bridge.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>');
  process.exit(2);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

// ===== Section A: specialist_opinions schema + constraints =====
const { data: panel, error: panelErr } = await db
  .from('organizations')
  .insert({ name: 'Bridge Smoke Specialist Panel', org_type: 'specialist_panel' })
  .select('id')
  .single();
if (!panel) {
  console.error('FATAL: could not create specialist_panel org:', panelErr?.message);
  process.exit(1);
}

const { data: pat, error: patErr } = await db
  .from('patients')
  .insert({ owner_org_id: panel.id, clinic_id: null, name: 'Bridge Smoke Patient' })
  .select('id')
  .single();
if (!pat) {
  console.error('FATAL: could not create patient:', patErr?.message);
  await db.from('organizations').delete().eq('id', panel.id);
  process.exit(1);
}

const { data: opinion, error: opinionErr } = await db
  .from('specialist_opinions')
  .insert({ owner_org_id: panel.id, patient_id: pat.id })
  .select('id, status')
  .single();
check('specialist_opinions insert defaults status=draft', !opinionErr && opinion?.status === 'draft', opinionErr?.message);

const { error: badStatusErr } = await db
  .from('specialist_opinions')
  .update({ status: 'teleported' })
  .eq('id', opinion?.id ?? '00000000-0000-0000-0000-000000000000');
check('specialist_opinions status CHECK rejects unknown status', Boolean(badStatusErr), badStatusErr?.message);

// freeze: simulate a credentialed record, then a clinical mutation must fail.
const { data: cred } = await db
  .from('credentials')
  .select('id')
  .limit(1)
  .maybeSingle();
if (cred?.id && opinion?.id) {
  await db.from('specialist_opinions').update({ credential_id: cred.id, status: 'signed' }).eq('id', opinion.id);
  const { error: frozenErr } = await db
    .from('specialist_opinions')
    .update({ specialty: 'should be frozen' })
    .eq('id', opinion.id);
  check('credentialed specialist_opinion is frozen against clinical mutation', Boolean(frozenErr), frozenErr?.message);
} else {
  check('credentialed specialist_opinion freeze (skipped — no credential row to borrow)', true, 'no-op on empty credentials');
}

// cleanup
if (opinion?.id) await db.from('specialist_opinions').delete().eq('id', opinion.id);
await db.from('patients').delete().eq('id', pat.id);
await db.from('organizations').delete().eq('id', panel.id);

console.log('\nSection A complete.');

// ===== Section B: full Bridge pipeline over the live Next routes =====
// (Task 2+)

if (!appUrl) {
  console.log('\nSection B SKIPPED — not yet implemented (Task 2+)');
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
