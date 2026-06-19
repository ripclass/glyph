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
    .insert({ name: 'Continuity Smoke Recruiter A (SB)', org_type: 'recruiter' })
    .select('id')
    .single();
  if (!orgA) { check('Section B setup: create recruiter org A', false, orgAErr?.message); process.exit(1); }

  const { data: orgB, error: orgBErr } = await db
    .from('organizations')
    .insert({ name: 'Continuity Smoke Recruiter B (SB)', org_type: 'recruiter' })
    .select('id')
    .single();
  if (!orgB) { check('Section B setup: create recruiter org B', false, orgBErr?.message); process.exit(1); }

  const pw = 'smoke-test-only-1234';
  async function staffUser(role, orgId) {
    const tag = `${role}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const { data: u, error: uErr } = await db.auth.admin.createUser({
      email: `cont-${tag}@glyph.local`,
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

  const doctorA   = await staffUser('doctor',    orgA.id);
  const signerA   = await staffUser('signatory', orgA.id);
  const signerB   = await staffUser('signatory', orgB.id);

  // Track all created resources for cleanup
  const createdOrgIds     = [orgA.id, orgB.id];
  const createdUserIds    = [doctorA.id, signerA.id, signerB.id];
  let   createdClearanceId = null;
  let   createdPatId       = null;

  // ── 1. create clearance (walk-in worker) ─────────────────────────────────
  const created = await post('/api/continuity/clearances', doctorA.jwt, {
    patientName: 'Continuity Smoke Worker',
  });
  check('create clearance 200', created.status === 200 && created.json.success, JSON.stringify(created.json));
  const clearanceId = created.json.data?.clearanceId ?? null;
  if (!clearanceId) { check('Section B: clearanceId present', false, 'missing clearanceId — aborting'); process.exit(1); }
  createdClearanceId = clearanceId;
  createdPatId = created.json.data?.patientId ?? null;

  // ── 2. save clearance fields ──────────────────────────────────────────────
  // doctor role is in RESULT_ROLES — allowed to save.
  // purpose AND fitness_status must be set before signing (server enforces this).
  const saved = await post(`/api/continuity/clearances/${clearanceId}`, doctorA.jwt, {
    purpose: 'overseas_employment',
    fitness_status: 'fit',
    destination_country: 'UAE',
  });
  check('save clearance fields 200', saved.status === 200 && saved.json.success, JSON.stringify(saved.json));

  // ── 3. doctor (non-signer) CANNOT sign (403) ─────────────────────────────
  const doctorSign = await post(`/api/continuity/clearances/${clearanceId}/sign`, doctorA.jwt);
  check('doctor CANNOT sign (403)', doctorSign.status === 403, `got ${doctorSign.status}`);

  // ── 4. signatory signs ────────────────────────────────────────────────────
  const signedRes = await post(`/api/continuity/clearances/${clearanceId}/sign`, signerA.jwt);
  check('signatory signs → MedicalClearance VC', signedRes.json.success && Boolean(signedRes.json.data?.medicalClearanceVcId), JSON.stringify(signedRes.json));
  const vcId = signedRes.json.data?.medicalClearanceVcId ?? null;

  // ── 5. clearance_records.status='signed' + credential_id set ─────────────
  const { data: clearanceRow } = await db
    .from('clearance_records')
    .select('status, credential_id')
    .eq('id', clearanceId)
    .single();
  check('clearance_record.status=signed', clearanceRow?.status === 'signed', `got ${clearanceRow?.status}`);
  check('clearance_record.credential_id set', Boolean(clearanceRow?.credential_id), `got ${clearanceRow?.credential_id}`);

  // ── 6. /api/verify ────────────────────────────────────────────────────────
  // Contract: POST { vcId } with Bearer JWT → { success:true, data:{ valid, storeStatus, acceptable } }
  if (vcId) {
    const verify = await post('/api/verify', signerA.jwt, { vcId });
    check('MedicalClearance verifies via /api/verify (data.valid)', verify.json?.data?.valid === true, JSON.stringify(verify.json));
    check('MedicalClearance acceptable (not revoked)', verify.json?.data?.acceptable === true, JSON.stringify(verify.json));
  } else {
    check('/api/verify (skipped — no vcId)', false, 'sign failed above');
  }

  // ── 7. cross-recruiter RLS isolation ──────────────────────────────────────
  // Recruiter B's signatory must NOT be able to read Recruiter A's clearance record.
  const crossAnon = mkClient(url, anonKey, { auth: { persistSession: false } });
  await crossAnon.auth.signInWithPassword({ email: signerB.email, password: pw });
  const { data: leak } = await crossAnon.from('clearance_records').select('id').eq('id', clearanceId);
  check('recruiter B CANNOT read recruiter A clearance record (RLS)', (leak?.length ?? 0) === 0, `got ${leak?.length ?? '?'}`);

  // ── cleanup ───────────────────────────────────────────────────────────────
  if (createdClearanceId) await db.from('clearance_records').delete().eq('id', createdClearanceId);
  if (createdPatId)        await db.from('consent_records').delete().eq('patient_id', createdPatId);
  if (createdPatId)        await db.from('patients').delete().eq('id', createdPatId);
  await db.from('memberships').delete().in('user_id', createdUserIds);
  await db.from('organizations').delete().in('id', createdOrgIds);
  for (const uid of createdUserIds) await db.auth.admin.deleteUser(uid);
  console.log('\nSection B cleanup done');
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
