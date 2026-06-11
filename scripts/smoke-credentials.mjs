/**
 * Migration 002 verification — adversarial test of the credential-canonical
 * immutability rules. Every "frozen" claim is tested by ATTEMPTING the
 * forbidden mutation and asserting the DB rejects it.
 *
 *   credentials:           INSERT ok; UPDATE of any fact rejected; DELETE
 *                          rejected; pure status transition allowed ONCE.
 *   did_documents:         INSERT-only; rotation = new version row.
 *   credential_status_log: INSERT-only.
 *   projections:           clinical facts freeze when *_credential_id set;
 *                          operational columns stay mutable.
 *
 * Usage:
 *   node scripts/smoke-credentials.mjs <SUPABASE_URL> <SERVICE_ROLE_KEY>
 */

import { createClient } from '@supabase/supabase-js';

const [url, serviceKey] = process.argv.slice(2);
if (!url || !serviceKey) {
  console.error('usage: node scripts/smoke-credentials.mjs <SUPABASE_URL> <SERVICE_ROLE_KEY>');
  process.exit(2);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${String(detail).slice(0, 120)}` : ''}`);
  if (!ok) failures++;
}

const DID_ISSUER = 'did:web:khamhealth.com:doctor:smoke-issuer';
const DID_SUBJECT = 'did:web:khamhealth.com:patient:smoke-subject';

// ── credentials: insert ─────────────────────────────────────────────────────
const { data: cred, error: insErr } = await db
  .from('credentials')
  .insert({
    vc_id: `urn:glyph:vc:smoke-${Date.now()}`,
    types: ['VerifiableCredential', 'PrescriptionCredential'],
    issuer_did: DID_ISSUER,
    subject_did: DID_SUBJECT,
    issued_at: new Date().toISOString(),
    credential_json: { test: true, claim: 'original' },
    proof_value: 'zSMOKEPROOF',
  })
  .select()
  .single();
check('credential INSERT allowed', !insErr, insErr?.message);

// ── credentials: fact mutation rejected ─────────────────────────────────────
const { error: mutErr } = await db
  .from('credentials')
  .update({ credential_json: { test: true, claim: 'TAMPERED' } })
  .eq('id', cred.id);
check('credential fact UPDATE rejected', Boolean(mutErr), mutErr?.message);

const { data: afterMut } = await db.from('credentials').select('credential_json').eq('id', cred.id).single();
check('credential content unchanged after rejected update', afterMut.credential_json.claim === 'original');

// ── credentials: DELETE rejected ────────────────────────────────────────────
const { error: delErr } = await db.from('credentials').delete().eq('id', cred.id);
check('credential DELETE rejected', Boolean(delErr), delErr?.message);

// ── credentials: pure status transition allowed once ────────────────────────
const { error: revokeErr } = await db
  .from('credentials')
  .update({ status: 'revoked', revoked_at: new Date().toISOString() })
  .eq('id', cred.id);
check('pure status transition (active→revoked) allowed', !revokeErr, revokeErr?.message);

const { error: logErr } = await db.from('credential_status_log').insert({
  credential_id: cred.id,
  previous_status: 'active',
  new_status: 'revoked',
  reason: 'smoke test',
  actor_did: DID_ISSUER,
});
check('status log INSERT allowed', !logErr, logErr?.message);

const { error: unRevokeErr } = await db
  .from('credentials')
  .update({ status: 'active', revoked_at: null })
  .eq('id', cred.id);
check('status is terminal (revoked→active rejected)', Boolean(unRevokeErr), unRevokeErr?.message);

// ── status log: append-only ─────────────────────────────────────────────────
const { error: logMutErr } = await db
  .from('credential_status_log')
  .update({ reason: 'tampered' })
  .eq('credential_id', cred.id);
check('status log UPDATE rejected', Boolean(logMutErr), logMutErr?.message);

// ── did_documents: insert-only + versioning ─────────────────────────────────
const did = `did:web:khamhealth.com:patient:smoke-${Date.now()}`;
const { error: didInsErr } = await db
  .from('did_documents')
  .insert({ did, version: 1, document: { id: did, verificationMethod: [] } });
check('did_document v1 INSERT allowed', !didInsErr, didInsErr?.message);

const { error: didMutErr } = await db
  .from('did_documents')
  .update({ document: { id: did, tampered: true } })
  .eq('did', did);
check('did_document UPDATE rejected (rotate = new version)', Boolean(didMutErr), didMutErr?.message);

const { error: didV2Err } = await db
  .from('did_documents')
  .insert({ did, version: 2, document: { id: did, rotated: true } });
check('did_document v2 INSERT allowed (key rotation path)', !didV2Err, didV2Err?.message);

const { error: didDupErr } = await db
  .from('did_documents')
  .insert({ did, version: 2, document: { id: did } });
check('duplicate (did, version) rejected', Boolean(didDupErr), didDupErr?.message);

// ── projection freeze: prescriptions ────────────────────────────────────────
const { data: clinic } = await db.from('clinics').insert({ name: 'Cred Smoke Clinic' }).select().single();
const { data: patient } = await db
  .from('patients')
  .insert({ clinic_id: clinic.id, name: 'Freeze Test', phone: '01999888777' })
  .select()
  .single();

const { data: rx } = await db
  .from('prescriptions')
  .insert({
    patient_id: patient.id,
    source: 'generated',
    medications: [{ name: 'Napa', dose: '500mg', frequency: '1+0+1' }],
    credential_id: cred.id,
  })
  .select()
  .single();
check('credentialed prescription INSERT allowed', Boolean(rx?.id));

const { error: rxFreezeErr } = await db
  .from('prescriptions')
  .update({ medications: [{ name: 'TAMPERED' }] })
  .eq('id', rx.id);
check('credentialed prescription medications UPDATE rejected', Boolean(rxFreezeErr), rxFreezeErr?.message);

const { error: rxOpErr } = await db
  .from('prescriptions')
  .update({ verified_by_doctor: true })
  .eq('id', rx.id);
check('operational column still mutable on credentialed prescription', !rxOpErr, rxOpErr?.message);

const { data: rxFree } = await db
  .from('prescriptions')
  .insert({ patient_id: patient.id, source: 'generated', medications: [{ name: 'Seclo' }] })
  .select()
  .single();
const { error: rxFreeErr } = await db
  .from('prescriptions')
  .update({ medications: [{ name: 'Seclo', dose: '20mg' }] })
  .eq('id', rxFree.id);
check('UNcredentialed prescription stays fully mutable', !rxFreeErr, rxFreeErr?.message);

// ── projection freeze: visits note ──────────────────────────────────────────
const { data: doctorUser } = await db.auth.admin.createUser({
  email: `cred-smoke-${Date.now()}@glyph.local`,
  password: 'smoke-cred-1234!',
  email_confirm: true,
});
await db.from('doctors').insert({
  id: doctorUser.user.id,
  clinic_id: clinic.id,
  name: 'Dr. Freeze',
  phone: `018${String(Date.now()).slice(-8)}`,
});
const { data: visit } = await db
  .from('visits')
  .insert({
    patient_id: patient.id,
    doctor_id: doctorUser.user.id,
    clinic_id: clinic.id,
    approved_note: { cc: 'original note' },
    note_credential_id: cred.id,
  })
  .select()
  .single();

const { error: noteFreezeErr } = await db
  .from('visits')
  .update({ approved_note: { cc: 'TAMPERED' } })
  .eq('id', visit.id);
check('credentialed visit note UPDATE rejected', Boolean(noteFreezeErr), noteFreezeErr?.message);

const { error: statusOkErr } = await db
  .from('visits')
  .update({ status: 'completed' })
  .eq('id', visit.id);
check('visit operational status still mutable', !statusOkErr, statusOkErr?.message);

// ── cleanup (only mutable/deletable rows — credentials stay, by design) ─────
await db.from('visits').delete().eq('id', visit.id);
await db.from('prescriptions').delete().in('id', [rx.id, rxFree.id]);
await db.from('patients').delete().eq('id', patient.id);
await db.from('doctors').delete().eq('id', doctorUser.user.id);
await db.from('clinics').delete().eq('id', clinic.id);
await db.auth.admin.deleteUser(doctorUser.user.id);
console.log('\ncleanup done (credential + log rows remain — they are append-only, as designed)');

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
