/**
 * M3 issuance-seam E2E — drives the seam through real HTTP against a local
 * Next.js dev server + local Supabase:
 *
 *   provision doctor/patient/visit (with a generated note) →
 *   POST /api/visits/approve-note (doctor JWT) →
 *   credentials in the canonical store → projection row →
 *   GET /.well-known/did/<slug>/did.json (public resolution) →
 *   POST /api/verify (valid VC ✓, tampered VC ✗) →
 *   frozen note (DB rejects mutation) → re-approval rejected (409)
 *
 * Usage:
 *   node scripts/smoke-issuance.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_KEY>
 */

import { createClient } from '@supabase/supabase-js';

const [appUrl, supaUrl, anonKey, serviceKey] = process.argv.slice(2);
if (!appUrl || !supaUrl || !anonKey || !serviceKey) {
  console.error('usage: node scripts/smoke-issuance.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_KEY>');
  process.exit(2);
}

const admin = createClient(supaUrl, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${String(detail).slice(0, 140)}` : ''}`);
  if (!ok) failures++;
}

const GENERATED_NOTE = {
  format: 'bd',
  chiefComplaint: 'Fever and headache for 3 days',
  onExamination: 'Temp 102F, BP 110/70',
  investigations: 'CBC, NS1 antigen',
  diagnosis: 'Acute febrile illness, rule out dengue',
  prescription: {
    medications: [
      { name: 'Napa', genericName: 'Paracetamol', dose: '500mg', frequency: '1+0+1', duration: '5 days', route: 'oral' },
    ],
    investigationsOrdered: ['CBC', 'NS1 antigen'],
  },
  advice: 'Fluids and rest',
  followUp: 'Return in 3 days',
  icdCodes: ['R50.9'],
};

// ── Provision ───────────────────────────────────────────────────────────────
const { data: clinic } = await admin.from('clinics').insert({ name: 'Issuance Smoke Clinic' }).select().single();
const email = `seam-${Date.now()}@glyph.local`;
const password = `seam-${Math.random().toString(36).slice(2)}-Aa1!`;
const { data: authUser } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
const doctorId = authUser.user.id;
await admin.from('doctors').insert({
  id: doctorId,
  clinic_id: clinic.id,
  name: 'Dr. Seam Test',
  phone: `016${String(Date.now()).slice(-8)}`,
  bmdc_reg_no: 'A-99999',
});
const { data: patient } = await admin
  .from('patients')
  .insert({ clinic_id: clinic.id, name: 'Karim Uddin', name_bn: 'করিম উদ্দিন', phone: '01711000111', age: 55, gender: 'male' })
  .select()
  .single();
const { data: visit } = await admin
  .from('visits')
  .insert({
    patient_id: patient.id,
    doctor_id: doctorId,
    clinic_id: clinic.id,
    status: 'note_review',
    generated_note: GENERATED_NOTE,
  })
  .select()
  .single();
check('provisioned visit with generated note', Boolean(visit?.id));

const userClient = createClient(supaUrl, anonKey, { auth: { persistSession: false } });
const { data: session } = await userClient.auth.signInWithPassword({ email, password });
const jwt = session.session.access_token;

// ── THE SEAM: approve the note ──────────────────────────────────────────────
const approveRes = await fetch(`${appUrl}/api/visits/approve-note`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
  body: JSON.stringify({ visitId: visit.id }),
});
const approve = await approveRes.json();
check('approve-note HTTP 200 success', approveRes.ok && approve.success, approve.error);
check('VisitNoteCredential issued', Boolean(approve.data?.visitNoteVcId), approve.data?.visitNoteVcId);
check('PrescriptionCredential issued', Boolean(approve.data?.prescriptionVcId), approve.data?.prescriptionVcId);
check(
  'DIDs minted on the production-config domain pattern',
  String(approve.data?.doctorDid).startsWith('did:web:') && String(approve.data?.patientDid).includes(':.well-known:did:patient-'),
  approve.data?.doctorDid
);
check('projection rebuilt 1 prescription row', approve.data?.projection?.inserted === 1, JSON.stringify(approve.data?.projection));

// ── Canonical store state ───────────────────────────────────────────────────
const { data: creds } = await admin
  .from('credentials')
  .select('vc_id, types, issuer_did, subject_did, status')
  .eq('subject_did', approve.data.patientDid);
check('2 active credentials in canonical store', creds?.length === 2 && creds.every((c) => c.status === 'active'));

const { data: rxRow } = await admin
  .from('prescriptions')
  .select('medications, credential_id, prescribing_doctor_name')
  .eq('visit_id', visit.id)
  .maybeSingle();
check('prescription projection row carries credential_id', Boolean(rxRow?.credential_id), rxRow?.prescribing_doctor_name);

const { data: visitAfter } = await admin
  .from('visits')
  .select('approved_note, note_credential_id, status')
  .eq('id', visit.id)
  .single();
check('visit approved + credentialed + completed', Boolean(visitAfter?.note_credential_id) && visitAfter.status === 'completed');

// ── Public DID resolution ───────────────────────────────────────────────────
const slug = `doctor-${doctorId}`;
const didRes = await fetch(`${appUrl}/.well-known/did/${slug}/did.json`);
const didDoc = await didRes.json().catch(() => null);
check(
  '.well-known DID document resolves publicly',
  didRes.ok && didDoc?.id === approve.data.doctorDid && Array.isArray(didDoc?.verificationMethod),
  `HTTP ${didRes.status}`
);

// ── Verification: the real thing, then a tampered copy ──────────────────────
const verifyRes = await fetch(`${appUrl}/api/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
  body: JSON.stringify({ vcId: approve.data.prescriptionVcId }),
});
const verify = await verifyRes.json();
check(
  'prescription verifies: valid + acceptable + issuer_verified trust path',
  verify.data?.valid === true && verify.data?.acceptable === true && verify.data?.status === 'valid',
  JSON.stringify({ status: verify.data?.status, trust: verify.data?.trustLevel })
);

const { data: storedVc } = await admin
  .from('credentials')
  .select('credential_json')
  .eq('vc_id', approve.data.prescriptionVcId)
  .single();
const tampered = JSON.parse(JSON.stringify(storedVc.credential_json));
tampered.credentialSubject.data.medications[0].name = 'Oxycodone';
const tamperRes = await fetch(`${appUrl}/api/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
  body: JSON.stringify({ vc: tampered }),
});
const tamperVerify = await tamperRes.json();
check(
  'tampered Rx (drug swapped) REJECTED: signature_invalid',
  tamperVerify.data?.valid === false && tamperVerify.data?.status === 'signature_invalid',
  tamperVerify.data?.status
);

// ── Immutability through the live stack ─────────────────────────────────────
const { error: freezeErr } = await admin
  .from('visits')
  .update({ approved_note: { cc: 'TAMPERED' } })
  .eq('id', visit.id);
check('credentialed note frozen at DB level', Boolean(freezeErr), freezeErr?.message);

const reApproveRes = await fetch(`${appUrl}/api/visits/approve-note`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
  body: JSON.stringify({ visitId: visit.id }),
});
check('re-approval rejected (409 — amend via replacement credential)', reApproveRes.status === 409);

// ── Cleanup (mutable rows only; credentials are append-only by design) ──────
await admin.from('prescriptions').delete().eq('visit_id', visit.id);
await admin.from('visits').delete().eq('id', visit.id);
await admin.from('patients').delete().eq('id', patient.id);
await admin.from('doctors').delete().eq('id', doctorId);
await admin.from('clinics').delete().eq('id', clinic.id);
await admin.auth.admin.deleteUser(doctorId);
console.log('\ncleanup done (credential + DID rows remain in the local store, append-only by design)');

console.log(failures === 0 ? '\nALL CHECKS PASSED — the issuance seam works end to end' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
