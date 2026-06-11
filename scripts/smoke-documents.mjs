/**
 * Document-capture pipeline verification (the "plastic bag" feature) —
 * adversarial where it matters: storage isolation between clinics, the
 * Tier B egress gate refusing extraction without consent, and withdrawal
 * staying withdrawn even after later system calls.
 *
 *   1. Storage RLS: a doctor can upload only under their own clinic's
 *      patients; a foreign clinic's doctor can neither write nor read.
 *   2. extract-document WITHOUT consent → 403 EGRESS_DENIED, and the
 *      denial is itself evidence (allowed=false row).
 *   3. Consent recorded through the SAME RLS path the intake UI uses
 *      (doctor-session client insert) → extraction succeeds end to end:
 *      real medications parsed from the fixture image, prescriptions row
 *      written, Tier B evidence row carries consent_id +
 *      contains_unredactable.
 *   4. Consent withdrawn → extraction REJECTED again.
 *   5. intake-start after withdrawal must NOT resurrect the withdrawn
 *      consent (no duplicate rows, no silent re-grant).
 *
 * Usage:
 *   node scripts/smoke-documents.mjs <FUNCTIONS_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_KEY>
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const [fnUrl, supaUrl, anonKey, serviceKey] = process.argv.slice(2);
if (!fnUrl || !supaUrl || !anonKey || !serviceKey) {
  console.error('usage: node scripts/smoke-documents.mjs <FUNCTIONS_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_KEY>');
  process.exit(2);
}

const admin = createClient(supaUrl, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${String(detail).slice(0, 160)}` : ''}`);
  if (!ok) failures++;
}

async function provisionDoctor(clinicName, suffix) {
  const { data: clinic } = await admin.from('clinics').insert({ name: clinicName }).select().single();
  const email = `docs-${suffix}-${Date.now()}@glyph.local`;
  const password = `docs-${Math.random().toString(36).slice(2)}-Aa1!`;
  const { data: authUser } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  await admin.from('doctors').insert({
    id: authUser.user.id,
    clinic_id: clinic.id,
    name: `Dr. Docs ${suffix}`,
    phone: `016${String(Date.now() + Math.floor(Math.random() * 1e4)).slice(-8)}`,
  });
  const client = createClient(supaUrl, anonKey, { auth: { persistSession: false } });
  const { data: session } = await client.auth.signInWithPassword({ email, password });
  return { clinic, doctorId: authUser.user.id, client, jwt: session.session.access_token };
}

// ── Provision: clinic A (the actor) + clinic B (the outsider) ───────────────
const a = await provisionDoctor('Docs Smoke Clinic A', 'a');
const b = await provisionDoctor('Docs Smoke Clinic B', 'b');

const { data: patient } = await admin
  .from('patients')
  .insert({ clinic_id: a.clinic.id, name: 'Karim Mia', name_bn: 'করিম মিয়া', phone: '01811333444', age: 47, gender: 'male' })
  .select()
  .single();
const { data: visit } = await admin
  .from('visits')
  .insert({ patient_id: patient.id, doctor_id: a.doctorId, clinic_id: a.clinic.id, status: 'intake' })
  .select()
  .single();

const fixture = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'rx-napa.jpg'));
const docId = crypto.randomUUID();
const path = `${patient.id}/${visit.id}/prescription-${docId}.jpg`;

function callFn(name, body, jwt) {
  return fetch(`${fnUrl}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}`, apikey: anonKey },
    body: JSON.stringify(body),
  });
}

// ── 1. Storage RLS ───────────────────────────────────────────────────────────
const { error: foreignUp } = await b.client.storage
  .from('documents')
  .upload(path, fixture, { contentType: 'image/jpeg' });
check('foreign clinic doctor CANNOT upload under our patient', Boolean(foreignUp), foreignUp?.message);

const { error: ownUp } = await a.client.storage
  .from('documents')
  .upload(path, fixture, { contentType: 'image/jpeg' });
check('own doctor CAN upload under own patient path', !ownUp, ownUp?.message);

const { data: ownDl, error: ownDlErr } = await a.client.storage.from('documents').download(path);
check('own doctor can read the object back', Boolean(ownDl) && !ownDlErr, ownDlErr?.message);

const { data: foreignDl } = await b.client.storage.from('documents').download(path);
check('foreign clinic doctor CANNOT read the object', !foreignDl);

// ── 2. Extraction without consent: the gate must refuse ─────────────────────
const noConsentRes = await callFn(
  'extract-document',
  { imageUrl: path, type: 'prescription', patientId: patient.id, visitId: visit.id },
  a.jwt,
);
const noConsentBody = await noConsentRes.json().catch(() => ({}));
check(
  'extract-document WITHOUT consent → 403 EGRESS_DENIED (fail closed)',
  noConsentRes.status === 403 && noConsentBody.code === 'EGRESS_DENIED',
  `HTTP ${noConsentRes.status} ${noConsentBody.code ?? JSON.stringify(noConsentBody).slice(0, 80)}`,
);

const { data: denyRows } = await admin
  .from('egress_log')
  .select('allowed, reject_reason, tier')
  .eq('edge_function', 'extract-document')
  .eq('visit_id', visit.id)
  .eq('allowed', false);
check('the denial is itself evidence (allowed=false, tier B)', denyRows?.length === 1 && denyRows[0].tier === 'B', JSON.stringify(denyRows?.[0]));

// ── 3. Consent through the doctor-session RLS path, then real extraction ────
const consentTypes = ['image_capture', 'data_storage', 'ai_processing', 'recording'];
const { error: consentErr } = await a.client.from('consent_records').insert(
  consentTypes.map((type) => ({
    patient_id: patient.id,
    visit_id: visit.id,
    consent_type: type,
    granted: true,
    granted_by: 'patient',
    device_info: 'smoke-documents.mjs',
  })),
);
check('consent rows insert under doctor-session RLS (the intake UI path)', !consentErr, consentErr?.message);

const extractRes = await callFn(
  'extract-document',
  { imageUrl: path, type: 'prescription', patientId: patient.id, visitId: visit.id },
  a.jwt,
);
const extractBody = await extractRes.json().catch(() => ({}));
check('extract-document succeeds with consent', extractRes.ok && extractBody.success, extractBody.error);

const meds = extractBody.data?.data?.medications;
const medNames = Array.isArray(meds) ? meds.map((m) => `${m?.name ?? ''} ${m?.generic_name ?? ''}`.toLowerCase()) : [];
check(
  'the model actually READ the prescription (Napa extracted from the image)',
  medNames.some((n) => n.includes('napa') || n.includes('paracetamol')),
  JSON.stringify(medNames),
);

const { data: rxRows } = await admin
  .from('prescriptions')
  .select('image_path, medications, source, extraction_confidence')
  .eq('patient_id', patient.id)
  .eq('visit_id', visit.id);
check(
  'prescriptions projection row written with the storage path',
  rxRows?.length === 1 && rxRows[0].image_path === path && Array.isArray(rxRows[0].medications) && rxRows[0].medications.length > 0,
  JSON.stringify(rxRows?.[0])?.slice(0, 160),
);

const { data: allowRows } = await admin
  .from('egress_log')
  .select('tier, allowed, consent_id, contains_unredactable')
  .eq('edge_function', 'extract-document')
  .eq('visit_id', visit.id)
  .eq('allowed', true)
  .order('called_at', { ascending: false })
  .limit(1);
const ev = allowRows?.[0];
check(
  'Tier B evidence row: consent referenced + contains_unredactable honest',
  ev?.tier === 'B' && Boolean(ev.consent_id) && ev.contains_unredactable === true,
  JSON.stringify(ev),
);

// ── 4. Withdrawal blocks the next extraction ────────────────────────────────
const { error: withdrawErr } = await a.client
  .from('consent_records')
  .update({ withdrawn_at: new Date().toISOString() })
  .eq('visit_id', visit.id)
  .eq('consent_type', 'ai_processing');
check('withdrawal works under doctor-session RLS', !withdrawErr, withdrawErr?.message);

const afterWithdrawRes = await callFn(
  'extract-document',
  { imageUrl: path, type: 'prescription', patientId: patient.id, visitId: visit.id },
  a.jwt,
);
const afterWithdrawBody = await afterWithdrawRes.json().catch(() => ({}));
check(
  'consent withdrawn → extraction REJECTED (fail closed)',
  afterWithdrawRes.status === 403 && afterWithdrawBody.code === 'EGRESS_DENIED',
  `HTTP ${afterWithdrawRes.status} ${afterWithdrawBody.code ?? ''}`,
);

// ── 5. intake-start must not resurrect withdrawn consent ────────────────────
const startRes = await callFn('intake-start', { visitId: visit.id, isAttendant: false, language: 'bn' }, a.jwt);
const startBody = await startRes.json().catch(() => ({}));
check('intake-start still succeeds (Tier A needs no consent)', startRes.ok && startBody.success, startBody.error);

const { data: consentState } = await admin
  .from('consent_records')
  .select('consent_type, granted, withdrawn_at')
  .eq('visit_id', visit.id);
const aiRows = (consentState ?? []).filter((r) => r.consent_type === 'ai_processing');
const activeAi = aiRows.filter((r) => r.granted && !r.withdrawn_at);
check(
  'withdrawn ai_processing consent NOT resurrected by intake-start',
  aiRows.length === 1 && activeAi.length === 0,
  `rows=${aiRows.length} active=${activeAi.length}`,
);
const perType = new Map();
for (const r of consentState ?? []) perType.set(r.consent_type, (perType.get(r.consent_type) ?? 0) + 1);
check(
  'no duplicate consent rows per type (idempotent intake-start)',
  [...perType.values()].every((n) => n === 1),
  JSON.stringify([...perType.entries()]),
);

// ── Cleanup (egress_log + consent stay — evidence) ──────────────────────────
await a.client.storage.from('documents').remove([path]);
await admin.from('prescriptions').delete().eq('visit_id', visit.id);
console.log('\ncleanup: storage object + projection removed; evidence rows retained by design');

console.log(failures === 0 ? '\nALL CHECKS PASSED — the plastic bag opens' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
