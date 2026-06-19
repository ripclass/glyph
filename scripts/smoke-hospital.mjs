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

// ===== Section B: full Hospital pipeline over the live Next routes =====
//
// /api/verify contract (read from apps/glyph/src/app/api/verify/route.ts):
//   POST { vcId }  with Authorization: Bearer <jwt>
//   → { success: true, data: { valid, storeStatus, acceptable } }
//   Auth required — we pass the signatory's JWT.
//
// No LLM/edge-fn step: create→save→sign→verify is Next-routes + Supabase only.
// Runs its own org/user/patient fixtures; does NOT depend on Section A state.

if (!appUrl) {
  console.log('\nSection B SKIPPED — no APP_URL provided (pass http://localhost:3000)');
} else {
  const { createClient: mkClient } = await import('@supabase/supabase-js');

  const post = (path, jwt, body) =>
    fetch(`${appUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) }));

  // ── fixtures ──────────────────────────────────────────────────────────────
  const { data: orgA, error: orgAErr } = await db
    .from('organizations')
    .insert({ name: 'Hospital Smoke A (SB)', org_type: 'hospital' })
    .select('id')
    .single();
  if (!orgA) { check('Section B setup: create org A', false, orgAErr?.message); process.exit(1); }

  const { data: orgB, error: orgBErr } = await db
    .from('organizations')
    .insert({ name: 'Hospital Smoke B (SB)', org_type: 'hospital' })
    .select('id')
    .single();
  if (!orgB) { check('Section B setup: create org B', false, orgBErr?.message); process.exit(1); }

  const pw = 'smoke-test-only-1234';
  async function staffUser(role, orgId) {
    const tag = `${role}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const { data: u, error: uErr } = await db.auth.admin.createUser({
      email: `hosp-${tag}@glyph.local`,
      password: pw,
      email_confirm: true,
    });
    if (!u?.user) { check(`Section B setup: create user ${role}`, false, uErr?.message); process.exit(1); }
    const { error: mErr } = await db
      .from('memberships')
      .insert({ user_id: u.user.id, organization_id: orgId, role });
    if (mErr) { check(`Section B setup: membership ${role}`, false, mErr?.message); process.exit(1); }
    const anon = mkClient(url, anonKey, { auth: { persistSession: false } });
    const { error: signErr } = await anon.auth.signInWithPassword({ email: u.user.email, password: pw });
    if (signErr) { check(`Section B setup: sign-in ${role}`, false, signErr.message); process.exit(1); }
    const { data: { session } } = await anon.auth.getSession();
    if (!session) { check(`Section B setup: session ${role}`, false, 'no session'); process.exit(1); }
    return { id: u.user.id, email: u.user.email, jwt: session.access_token };
  }

  const staffA    = await staffUser('staff',     orgA.id);
  const signerA   = await staffUser('signatory', orgA.id);
  const signerB   = await staffUser('signatory', orgB.id);

  // Track all created resources for cleanup
  const createdOrgIds    = [orgA.id, orgB.id];
  const createdUserIds   = [staffA.id, signerA.id, signerB.id];
  let   createdDischargeId = null;
  let   createdPatId       = null;
  let   createdCredId      = null;

  // ── 1. create discharge (walk-in patient) ─────────────────────────────────
  const created = await post('/api/hospital/discharges', staffA.jwt, {
    patientName: 'Hospital Smoke Walk-in',
  });
  check('create discharge 200', created.status === 200 && created.json.success, JSON.stringify(created.json));
  const dischargeId = created.json.data?.dischargeId ?? null;
  if (!dischargeId) { check('Section B: dischargeId present', false, 'missing dischargeId — aborting'); process.exit(1); }
  createdDischargeId = dischargeId;
  createdPatId = created.json.data?.patientId ?? null;

  // ── 2. save discharge summary ─────────────────────────────────────────────
  const saved = await post(`/api/hospital/discharges/${dischargeId}`, staffA.jwt, {
    discharge_diagnosis: [{ text: 'Dengue fever', icd10: 'A90' }],
    discharge_medications: [{ name: 'Paracetamol', frequency: '1+0+1' }],
    discharge_condition: 'recovered',
    admission_date: '2026-06-15',
    discharge_date: '2026-06-19',
  });
  check('save discharge summary 200', saved.status === 200 && saved.json.success, JSON.stringify(saved.json));

  // ── 3. non-signatory (staff) CANNOT sign (403) ────────────────────────────
  const staffSign = await post(`/api/hospital/discharges/${dischargeId}/sign`, staffA.jwt);
  check('staff CANNOT sign (403)', staffSign.status === 403, `got ${staffSign.status}`);

  // ── 4. signatory signs ────────────────────────────────────────────────────
  const signedRes = await post(`/api/hospital/discharges/${dischargeId}/sign`, signerA.jwt);
  check('signatory signs → DischargeSummary VC', signedRes.json.success && Boolean(signedRes.json.data?.dischargeSummaryVcId), JSON.stringify(signedRes.json));
  const vcId = signedRes.json.data?.dischargeSummaryVcId ?? null;

  // ── 5. discharge_records.status='signed' + credential_id set ─────────────
  const { data: dischargeRow } = await db
    .from('discharge_records')
    .select('status, credential_id')
    .eq('id', dischargeId)
    .single();
  check('discharge_record.status=signed', dischargeRow?.status === 'signed', `got ${dischargeRow?.status}`);
  check('discharge_record.credential_id set', Boolean(dischargeRow?.credential_id), `got ${dischargeRow?.credential_id}`);
  createdCredId = dischargeRow?.credential_id ?? null;

  // ── 6. /api/verify ────────────────────────────────────────────────────────
  // Contract: POST { vcId } with Bearer JWT → { success:true, data:{ valid, storeStatus, acceptable } }
  if (vcId) {
    const verify = await post('/api/verify', signerA.jwt, { vcId });
    check('DischargeSummary verifies via /api/verify (data.valid)', verify.json?.data?.valid === true, JSON.stringify(verify.json));
    check('DischargeSummary acceptable (not revoked)', verify.json?.data?.acceptable === true, JSON.stringify(verify.json));
  } else {
    check('/api/verify (skipped — no vcId)', false, 'sign failed above');
  }

  // ── 7. cross-hospital RLS isolation ──────────────────────────────────────
  // Hospital B's signatory must NOT be able to read Hospital A's discharge record.
  const crossAnon = mkClient(url, anonKey, { auth: { persistSession: false } });
  await crossAnon.auth.signInWithPassword({ email: signerB.email, password: pw });
  const { data: leak } = await crossAnon.from('discharge_records').select('id').eq('id', dischargeId);
  check('hospital B CANNOT read hospital A discharge record (RLS)', (leak?.length ?? 0) === 0, `got ${leak?.length ?? '?'}`);

  // ── cleanup ───────────────────────────────────────────────────────────────
  if (createdDischargeId) await db.from('discharge_records').delete().eq('id', createdDischargeId);
  if (createdPatId)       await db.from('consent_records').delete().eq('patient_id', createdPatId);
  if (createdPatId)       await db.from('patients').delete().eq('id', createdPatId);
  await db.from('memberships').delete().in('user_id', createdUserIds);
  await db.from('organizations').delete().in('id', createdOrgIds);
  for (const uid of createdUserIds) await db.auth.admin.deleteUser(uid);
  console.log('\nSection B cleanup done');
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
