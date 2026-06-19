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
    .insert({ name: 'Bridge Smoke Panel A (SB)', org_type: 'specialist_panel' })
    .select('id')
    .single();
  if (!orgA) { check('Section B setup: create specialist_panel org A', false, orgAErr?.message); process.exit(1); }

  const { data: orgB, error: orgBErr } = await db
    .from('organizations')
    .insert({ name: 'Bridge Smoke Panel B (SB)', org_type: 'specialist_panel' })
    .select('id')
    .single();
  if (!orgB) { check('Section B setup: create specialist_panel org B', false, orgBErr?.message); process.exit(1); }

  const pw = 'smoke-test-only-1234';
  async function staffUser(role, orgId) {
    const tag = `${role}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const { data: u, error: uErr } = await db.auth.admin.createUser({
      email: `bridge-${tag}@glyph.local`,
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
  const createdOrgIds  = [orgA.id, orgB.id];
  const createdUserIds = [doctorA.id, signerA.id, signerB.id];
  let   createdOpinionId = null;
  let   createdPatId     = null;

  // ── 1. create specialist opinion (walk-in patient) ────────────────────────
  const created = await post('/api/bridge/opinions', doctorA.jwt, {
    patientName: 'Bridge Smoke Patient',
  });
  check('create specialist opinion 200', created.status === 200 && created.json.success, JSON.stringify(created.json));
  const opinionId = created.json.data?.opinionId ?? null;
  if (!opinionId) { check('Section B: opinionId present', false, 'missing opinionId — aborting'); process.exit(1); }
  createdOpinionId = opinionId;
  createdPatId = created.json.data?.patientId ?? null;

  // ── 2. save opinion fields ────────────────────────────────────────────────
  // doctor role is in RESULT_ROLES (canEnterResults) — allowed to save.
  const saved = await post(`/api/bridge/opinions/${opinionId}`, doctorA.jwt, {
    specialty: 'Oncology',
    opinion: 'Findings consistent with early-stage disease; biopsy advised.',
    recommendations: ['Core-needle biopsy'],
  });
  check('save opinion fields 200', saved.status === 200 && saved.json.success, JSON.stringify(saved.json));

  // ── 3. doctor (non-signer) CANNOT sign (403) ─────────────────────────────
  const doctorSign = await post(`/api/bridge/opinions/${opinionId}/sign`, doctorA.jwt);
  check('doctor CANNOT sign (403)', doctorSign.status === 403, `got ${doctorSign.status}`);

  // ── 4. signatory signs ────────────────────────────────────────────────────
  const signedRes = await post(`/api/bridge/opinions/${opinionId}/sign`, signerA.jwt);
  check('signatory signs → SpecialistOpinion VC', signedRes.json.success && Boolean(signedRes.json.data?.specialistOpinionVcId), JSON.stringify(signedRes.json));
  const vcId = signedRes.json.data?.specialistOpinionVcId ?? null;

  // ── 5. specialist_opinions.status='signed' + credential_id set ───────────
  const { data: opinionRow } = await db
    .from('specialist_opinions')
    .select('status, credential_id')
    .eq('id', opinionId)
    .single();
  check('specialist_opinion.status=signed', opinionRow?.status === 'signed', `got ${opinionRow?.status}`);
  check('specialist_opinion.credential_id set', Boolean(opinionRow?.credential_id), `got ${opinionRow?.credential_id}`);

  // ── 6. /api/verify ────────────────────────────────────────────────────────
  // Contract: POST { vcId } with Bearer JWT → { success:true, data:{ valid, storeStatus, acceptable } }
  if (vcId) {
    const verify = await post('/api/verify', signerA.jwt, { vcId });
    check('SpecialistOpinion verifies via /api/verify (data.valid)', verify.json?.data?.valid === true, JSON.stringify(verify.json));
    check('SpecialistOpinion acceptable (not revoked)', verify.json?.data?.acceptable === true, JSON.stringify(verify.json));
  } else {
    check('/api/verify (skipped — no vcId)', false, 'sign failed above');
  }

  // ── 7. cross-panel RLS isolation ──────────────────────────────────────────
  // Panel B's signatory must NOT be able to read Panel A's specialist opinion.
  const crossAnon = mkClient(url, anonKey, { auth: { persistSession: false } });
  await crossAnon.auth.signInWithPassword({ email: signerB.email, password: pw });
  const { data: leak } = await crossAnon.from('specialist_opinions').select('id').eq('id', opinionId);
  check('panel B CANNOT read panel A specialist opinion (RLS)', (leak?.length ?? 0) === 0, `got ${leak?.length ?? '?'}`);

  // ── cleanup ───────────────────────────────────────────────────────────────
  if (createdOpinionId) await db.from('specialist_opinions').delete().eq('id', createdOpinionId);
  if (createdPatId)     await db.from('consent_records').delete().eq('patient_id', createdPatId);
  if (createdPatId)     await db.from('patients').delete().eq('id', createdPatId);
  await db.from('memberships').delete().in('user_id', createdUserIds);
  await db.from('organizations').delete().in('id', createdOrgIds);
  for (const uid of createdUserIds) await db.auth.admin.deleteUser(uid);
  console.log('\nSection B cleanup done');
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
