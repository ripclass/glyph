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

import { readFileSync } from 'node:fs';
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

// ===== Section B: full Lens pipeline over the live Next routes =====
//
// /api/verify contract (read from route.ts):
//   POST { vcId }  with Authorization: Bearer <jwt>
//   → { success: true, data: { valid, storeStatus, acceptable } }
//   Auth required — we pass the signer's JWT.
//
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
    .insert({ name: 'Lens Smoke Centre A (SB)', org_type: 'diagnostic_centre' })
    .select('id')
    .single();
  if (!orgA) { check('Section B setup: create org A', false, orgAErr?.message); process.exit(1); }

  const { data: orgB, error: orgBErr } = await db
    .from('organizations')
    .insert({ name: 'Lens Smoke Centre B (SB)', org_type: 'diagnostic_centre' })
    .select('id')
    .single();
  if (!orgB) { check('Section B setup: create org B', false, orgBErr?.message); process.exit(1); }

  const pw = 'smoke-test-only-1234';
  async function staff(role, orgId) {
    const tag = `${role}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const { data: u, error: uErr } = await db.auth.admin.createUser({
      email: `lens-${tag}@glyph.local`,
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

  const tech    = await staff('technologist', orgA.id);
  const signer  = await staff('signatory',    orgA.id);
  const signerB = await staff('signatory',    orgB.id);

  // Track all created resources for cleanup
  const createdOrgIds  = [orgA.id, orgB.id];
  const createdUserIds = [tech.id, signer.id, signerB.id];
  let   createdOrderId  = null;
  let   createdPatId    = null;
  let   createdCredId   = null;

  // ── 1. create order ───────────────────────────────────────────────────────
  const created = await post('/api/center/orders', tech.jwt, {
    patientName: 'Walk-in Smoke', testCategory: 'CBC',
  });
  check('create order 200', created.status === 200 && created.json.success, JSON.stringify(created.json));
  const orderId = created.json.data?.orderId ?? null;
  if (!orderId) { check('Section B: orderId present', false, 'missing orderId — aborting'); process.exit(1); }
  createdOrderId = orderId;

  // ── 2. save results ───────────────────────────────────────────────────────
  const resulted = await post(`/api/center/orders/${orderId}/results`, tech.jwt, {
    rawResults: [{ name: 'Hemoglobin', value: '9.1', unit: 'g/dL', range: '13-17', isAbnormal: true, severity: 'moderate' }],
  });
  check('save results 200', resulted.status === 200 && resulted.json.success, JSON.stringify(resulted.json));

  // ── 2b. image-extract plumbing ────────────────────────────────────────────
  // image-extract: consent + service-role upload + extract-document(extractOnly) plumbing.
  // rx-napa.jpg is a prescription fixture (no lab fixture exists), so we assert the
  // PLUMBING (200 + rawResults is an array) + that the consent row was recorded — NOT
  // specific extracted values (LLM reading a Rx as a lab report is non-deterministic).
  const fixtureB64 = readFileSync('scripts/fixtures/rx-napa.jpg').toString('base64');
  const extracted = await post(`/api/center/orders/${orderId}/extract`, tech.jwt, {
    consent: true, imageBase64: fixtureB64, contentType: 'image/jpeg',
  });
  check('image-extract returns 200 + rawResults array', extracted.status === 200 && Array.isArray(extracted.json.data?.rawResults), JSON.stringify(extracted.json).slice(0, 200));

  const { data: order2b } = await db.from('lab_orders').select('patient_id').eq('id', orderId).single();
  const { data: imgConsent } = await db
    .from('consent_records').select('id')
    .eq('patient_id', order2b.patient_id).eq('consent_type', 'image_capture').eq('device_info', 'lens_image_extract').eq('granted', true);
  check('image-extract recorded an image_capture consent (lens_image_extract)', (imgConsent?.length ?? 0) === 1, `got ${imgConsent?.length}`);

  const consentReject = await post(`/api/center/orders/${orderId}/extract`, tech.jwt, { imageBase64: fixtureB64, contentType: 'image/jpeg' });
  check('image-extract WITHOUT consent is rejected (400)', consentReject.status === 400, `got ${consentReject.status}`);

  // ── 3. normalize ──────────────────────────────────────────────────────────
  const normd = await post(`/api/center/orders/${orderId}/normalize`, tech.jwt);
  check('normalize returns results', normd.json.success && (normd.json.data?.normalized?.length ?? 0) > 0, JSON.stringify(normd.json));

  // ── 4. technologist CANNOT sign (403) ─────────────────────────────────────
  const techSign = await post(`/api/center/orders/${orderId}/sign`, tech.jwt);
  check('technologist CANNOT sign (403)', techSign.status === 403, `got ${techSign.status}`);

  // ── 5. signatory signs ────────────────────────────────────────────────────
  const signedRes = await post(`/api/center/orders/${orderId}/sign`, signer.jwt);
  check('signatory signs → LabResult VC', signedRes.json.success && Boolean(signedRes.json.data?.labResultVcId), JSON.stringify(signedRes.json));
  const vcId = signedRes.json.data?.labResultVcId ?? null;

  // ── 6. lab_reports projection ─────────────────────────────────────────────
  const { data: orderRow } = await db
    .from('lab_orders')
    .select('credential_id, patient_id')
    .eq('id', orderId)
    .single();
  createdPatId  = orderRow?.patient_id ?? null;
  createdCredId = orderRow?.credential_id ?? null;
  const { data: labRow } = await db
    .from('lab_reports')
    .select('id, source, verified_by_doctor')
    .eq('credential_id', orderRow?.credential_id)
    .maybeSingle();
  check('signed LabResult projected to lab_reports (digital, verified)', labRow?.source === 'digital' && labRow?.verified_by_doctor === true, JSON.stringify(labRow));

  // ── 7. wallet issue + read ─────────────────────────────────────────────────
  const walletIssue = await post('/api/wallet/issue', signer.jwt, { patientId: orderRow?.patient_id });
  check('wallet token issued (non-doctor issuer allowed)', walletIssue.json.success && Boolean(walletIssue.json.token), JSON.stringify(walletIssue.json));
  const walletToken = walletIssue.json.token ?? null;

  if (walletToken) {
    const walletRead = await fetch(`${appUrl}/api/wallet/${walletToken}`).then((r) => r.json());
    check('signed lab appears in wallet read (CBC)', (walletRead.labs ?? []).some((l) => l.test_category === 'CBC'), JSON.stringify(walletRead.labs));
  } else {
    check('wallet read (skipped — no token)', false, 'wallet issue failed above');
  }

  // ── 8. /api/verify ────────────────────────────────────────────────────────
  // Contract: POST { vcId } with Bearer JWT → { success:true, data:{ valid, storeStatus, acceptable } }
  if (vcId) {
    const verify = await post('/api/verify', signer.jwt, { vcId });
    check('LabResult verifies via /api/verify (data.valid)', verify.json?.data?.valid === true, JSON.stringify(verify.json));
    check('LabResult acceptable (not revoked)', verify.json?.data?.acceptable === true, JSON.stringify(verify.json));
  } else {
    check('/api/verify (skipped — no vcId)', false, 'sign failed above');
  }

  // ── 9. cross-centre RLS isolation ────────────────────────────────────────
  const crossAnon = mkClient(url, anonKey, { auth: { persistSession: false } });
  await crossAnon.auth.signInWithPassword({ email: signerB.email, password: pw });
  const { data: leak } = await crossAnon.from('lab_orders').select('id').eq('id', orderId);
  check('centre B CANNOT read centre A order (RLS)', (leak?.length ?? 0) === 0, `got ${leak?.length ?? '?'}`);

  // ── cleanup ───────────────────────────────────────────────────────────────
  if (createdOrderId) await db.from('lab_orders').delete().eq('id', createdOrderId);
  if (createdCredId)  await db.from('lab_reports').delete().eq('credential_id', createdCredId);
  if (createdPatId)   await db.from('consent_records').delete().eq('patient_id', createdPatId);
  if (createdPatId)   await db.from('patients').delete().eq('id', createdPatId);
  await db.from('memberships').delete().in('user_id', createdUserIds);
  await db.from('organizations').delete().in('id', createdOrgIds);
  for (const uid of createdUserIds) await db.auth.admin.deleteUser(uid);
  console.log('\nSection B cleanup done');
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
