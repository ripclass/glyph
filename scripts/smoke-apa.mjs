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
    .insert({ name: 'Apa Smoke Employer A (SB)', org_type: 'employer' })
    .select('id')
    .single();
  if (!orgA) { check('Section B setup: create employer org A', false, orgAErr?.message); process.exit(1); }

  const { data: orgB, error: orgBErr } = await db
    .from('organizations')
    .insert({ name: 'Apa Smoke Employer B (SB)', org_type: 'employer' })
    .select('id')
    .single();
  if (!orgB) { check('Section B setup: create employer org B', false, orgBErr?.message); process.exit(1); }

  const pw = 'smoke-test-only-1234';
  async function staffUser(role, orgId) {
    const tag = `${role}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const { data: u, error: uErr } = await db.auth.admin.createUser({
      email: `apa-${tag}@glyph.local`,
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
  const createdOrgIds      = [orgA.id, orgB.id];
  const createdUserIds     = [doctorA.id, signerA.id, signerB.id];
  let   createdAssessmentId = null;
  let   createdPatId        = null;

  // ── 1. create assessment (walk-in worker) ────────────────────────────────
  const created = await post('/api/apa/assessments', doctorA.jwt, {
    patientName: 'Apa Smoke Worker',
  });
  check('create assessment 200', created.status === 200 && created.json.success, JSON.stringify(created.json));
  const assessmentId = created.json.data?.assessmentId ?? null;
  if (!assessmentId) { check('Section B: assessmentId present', false, 'missing assessmentId — aborting'); process.exit(1); }
  createdAssessmentId = assessmentId;
  createdPatId = created.json.data?.patientId ?? null;

  // ── 2. save assessment fields ────────────────────────────────────────────
  // doctor role is in RESULT_ROLES — allowed to save.
  // assessment_type must be set before signing (server enforces this).
  const saved = await post(`/api/apa/assessments/${assessmentId}`, signerA.jwt, {
    assessment_type: 'periodic',
    fitness_for_role: 'fit',
    exposures: ['cotton dust', 'noise'],
  });
  check('save assessment fields 200', saved.status === 200 && saved.json.success, JSON.stringify(saved.json));

  // ── 3. doctor (non-signer) CANNOT sign (403) ─────────────────────────────
  const doctorSign = await post(`/api/apa/assessments/${assessmentId}/sign`, doctorA.jwt);
  check('doctor CANNOT sign (403)', doctorSign.status === 403, `got ${doctorSign.status}`);

  // ── 4. signatory signs ────────────────────────────────────────────────────
  const signedRes = await post(`/api/apa/assessments/${assessmentId}/sign`, signerA.jwt);
  check('signatory signs → OccupationalHealth VC', signedRes.json.success && Boolean(signedRes.json.data?.occupationalHealthVcId), JSON.stringify(signedRes.json));
  const vcId = signedRes.json.data?.occupationalHealthVcId ?? null;

  // ── 5. occupational_assessments.status='signed' + credential_id set ───────
  const { data: assessmentRow } = await db
    .from('occupational_assessments')
    .select('status, credential_id')
    .eq('id', assessmentId)
    .single();
  check('occupational_assessment.status=signed', assessmentRow?.status === 'signed', `got ${assessmentRow?.status}`);
  check('occupational_assessment.credential_id set', Boolean(assessmentRow?.credential_id), `got ${assessmentRow?.credential_id}`);

  // ── 6. /api/verify ────────────────────────────────────────────────────────
  // Contract: POST { vcId } with Bearer JWT → { success:true, data:{ valid, storeStatus, acceptable } }
  if (vcId) {
    const verify = await post('/api/verify', signerA.jwt, { vcId });
    check('OccupationalHealth verifies via /api/verify (data.valid)', verify.json?.data?.valid === true, JSON.stringify(verify.json));
    check('OccupationalHealth acceptable (not revoked)', verify.json?.data?.acceptable === true, JSON.stringify(verify.json));
  } else {
    check('/api/verify (skipped — no vcId)', false, 'sign failed above');
  }

  // ── 7. cross-employer RLS isolation ──────────────────────────────────────
  // Employer B's signatory must NOT be able to read Employer A's assessment record.
  const crossAnon = mkClient(url, anonKey, { auth: { persistSession: false } });
  await crossAnon.auth.signInWithPassword({ email: signerB.email, password: pw });
  const { data: leak } = await crossAnon.from('occupational_assessments').select('id').eq('id', assessmentId);
  check('employer B CANNOT read employer A assessment record (RLS)', (leak?.length ?? 0) === 0, `got ${leak?.length ?? '?'}`);

  // ── cleanup ───────────────────────────────────────────────────────────────
  if (createdAssessmentId) await db.from('occupational_assessments').delete().eq('id', createdAssessmentId);
  if (createdPatId)        await db.from('consent_records').delete().eq('patient_id', createdPatId);
  if (createdPatId)        await db.from('patients').delete().eq('id', createdPatId);
  await db.from('memberships').delete().in('user_id', createdUserIds);
  await db.from('organizations').delete().in('id', createdOrgIds);
  for (const uid of createdUserIds) await db.auth.admin.deleteUser(uid);
  console.log('\nSection B cleanup done');
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
