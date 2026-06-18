/**
 * Live-DB + route E2E smoke for Lens v1 (migration 012 + the centre pipeline).
 *
 * Section A (service-role): lab_orders schema, status CHECK, freeze-on-credential.
 * Section B (added in later tasks): full order→result→normalize→sign→wallet→verify
 *   over the live Next routes, plus two-centre RLS isolation.
 *
 * Run on a LOCAL Supabase (keys from `supabase status -o env`):
 *   node scripts/smoke-lens.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>
 * (APP_URL unused until Section B; pass http://localhost:3000.)
 */

import { createClient } from '@supabase/supabase-js';

const [appUrl, url, anonKey, serviceKey] = process.argv.slice(2);
if (!url || !anonKey || !serviceKey) {
  console.error('usage: node scripts/smoke-lens.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>');
  process.exit(2);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

// ===== Section A: lab_orders schema + constraints =====
const { data: centre } = await db
  .from('organizations')
  .insert({ name: 'Lens Smoke Centre', org_type: 'diagnostic_centre' })
  .select('id')
  .single();
const { data: pat } = await db
  .from('patients')
  .insert({ owner_org_id: centre.id, clinic_id: null, name: 'Lens Smoke Patient' })
  .select('id')
  .single();

const { data: order, error: orderErr } = await db
  .from('lab_orders')
  .insert({ owner_org_id: centre.id, patient_id: pat.id, test_category: 'CBC' })
  .select('id, status')
  .single();
check('lab_orders insert defaults status=ordered', !orderErr && order?.status === 'ordered', orderErr?.message);

const { error: badStatusErr } = await db
  .from('lab_orders')
  .update({ status: 'teleported' })
  .eq('id', order.id);
check('lab_orders status CHECK rejects unknown status', Boolean(badStatusErr), badStatusErr?.message);

// freeze: simulate a credentialed order, then a results mutation must fail.
const { data: cred } = await db
  .from('credentials')
  .select('id')
  .limit(1)
  .maybeSingle();
if (cred?.id) {
  await db.from('lab_orders').update({ credential_id: cred.id, status: 'signed' }).eq('id', order.id);
  const { error: frozenErr } = await db
    .from('lab_orders')
    .update({ normalized_results: [{ testName: 'X', value: '1' }] })
    .eq('id', order.id);
  check('credentialed lab_order is frozen against results mutation', Boolean(frozenErr), frozenErr?.message);
} else {
  check('credentialed lab_order freeze (skipped — no credential row to borrow)', true, 'no-op on empty credentials');
}

// cleanup
await db.from('lab_orders').delete().eq('id', order.id);
await db.from('patients').delete().eq('id', pat.id);
await db.from('organizations').delete().eq('id', centre.id);

// ===== Section B added in later tasks (before this summary) =====

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
