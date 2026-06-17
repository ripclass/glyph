/**
 * Live-DB smoke for the owner/scope foundation (migration 011).
 *
 * Section A (service-role): organizations/memberships schema, the 1:1 clinic
 *   backfill, the kham_holding singleton, and the org_type/role CHECKs.
 * Section B (RLS, added in Task 2): nullable clinic_id, owner_org_id, and
 *   two-way isolation between a clinic doctor and a diagnostic-centre staffer.
 *
 * Run on a LOCAL Supabase (keys from `supabase status -o env`):
 *   node scripts/smoke-owner-scope.mjs <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>
 */

import { createClient } from '@supabase/supabase-js';

const [url, anonKey, serviceKey] = process.argv.slice(2);
if (!url || !anonKey || !serviceKey) {
  console.error('usage: node scripts/smoke-owner-scope.mjs <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>');
  process.exit(2);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

// ===== Section A: organizations / memberships schema + backfill =====

// A1. organizations exists; every clinic backfilled to a clinic-type org.
const { data: clinics, error: clinicsErr } = await db
  .from('clinics')
  .select('id, organization_id');
check('clinics.organization_id column exists', !clinicsErr, clinicsErr?.message);
check(
  'every clinic backfilled with an organization_id',
  Array.isArray(clinics) && clinics.length > 0 && clinics.every((c) => c.organization_id),
  `clinics=${clinics?.length}`
);

let allClinicOrgsTyped = clinics?.length > 0;
for (const c of clinics ?? []) {
  const { data: org } = await db
    .from('organizations')
    .select('org_type')
    .eq('id', c.organization_id)
    .single();
  if (org?.org_type !== 'clinic') allClinicOrgsTyped = false;
}
check('each backfilled clinic org has org_type=clinic', allClinicOrgsTyped);

// A2. kham_holding singleton exists; a duplicate is rejected.
const { data: holding } = await db
  .from('organizations')
  .select('id')
  .eq('org_type', 'kham_holding');
check('exactly one kham_holding org', holding?.length === 1, `got ${holding?.length}`);

const { error: dupErr } = await db
  .from('organizations')
  .insert({ name: 'dup holding', org_type: 'kham_holding' });
check('second kham_holding rejected by partial unique index', Boolean(dupErr), dupErr?.message);

// A3. org_type CHECK rejects an unknown owner type.
const { error: badTypeErr } = await db
  .from('organizations')
  .insert({ name: 'bad', org_type: 'spaceship' });
check('org_type CHECK rejects unknown type', Boolean(badTypeErr), badTypeErr?.message);

// A4. memberships role CHECK rejects an unknown role.
const { data: someOrg } = await db
  .from('organizations')
  .select('id')
  .eq('org_type', 'kham_holding')
  .single();
const { data: tmpUser } = await db.auth.admin.createUser({
  email: `smoke-owner-role-${Date.now()}@glyph.local`,
  password: 'smoke-test-only-1234',
  email_confirm: true,
});
const { error: badRoleErr } = await db
  .from('memberships')
  .insert({ user_id: tmpUser.user.id, organization_id: someOrg.id, role: 'wizard' });
check('memberships role CHECK rejects unknown role', Boolean(badRoleErr), badRoleErr?.message);
await db.auth.admin.deleteUser(tmpUser.user.id);

// ===== Section B: owner_org_id, nullable clinic_id, RLS isolation =====
const SEED_CLINIC_ID = 'c0000000-0000-0000-0000-000000000001'; // from seed.sql
const { data: seedClinic } = await db
  .from('clinics')
  .select('organization_id')
  .eq('id', SEED_CLINIC_ID)
  .single();
const clinicOrgId = seedClinic?.organization_id;
check('seed clinic + backfilled org present', Boolean(seedClinic?.organization_id), 'missing seed clinic org');

// Clinic side: a doctor (member) + a clinic patient (clinic_id set, owner NULL).
const pw = 'smoke-test-only-1234';
const { data: docUser } = await db.auth.admin.createUser({
  email: `smoke-owner-doc-${Date.now()}@glyph.local`,
  password: pw,
  email_confirm: true,
});
await db.from('doctors').insert({
  id: docUser.user.id,
  clinic_id: SEED_CLINIC_ID,
  name: 'Dr. Owner Scope',
  phone: `017${String(Date.now()).slice(-8)}`,
});
await db.from('memberships').insert({
  user_id: docUser.user.id,
  organization_id: clinicOrgId,
  role: 'doctor',
});
const { data: clinicPatient } = await db
  .from('patients')
  .insert({ clinic_id: SEED_CLINIC_ID, name: 'Clinic Patient' })
  .select('id')
  .single();

// Centre side: a diagnostic_centre org + staff (member, NOT a doctor) + a
// patient with clinic_id NULL (proves the relax + owner_org_id).
const { data: centerOrg } = await db
  .from('organizations')
  .insert({ name: 'Popular Diagnostics (smoke)', org_type: 'diagnostic_centre' })
  .select('id')
  .single();
const { data: staffUser } = await db.auth.admin.createUser({
  email: `smoke-owner-staff-${Date.now()}@glyph.local`,
  password: pw,
  email_confirm: true,
});
await db.from('memberships').insert({
  user_id: staffUser.user.id,
  organization_id: centerOrg.id,
  role: 'technologist',
});
const { data: centerPatient, error: centerPatErr } = await db
  .from('patients')
  .insert({ owner_org_id: centerOrg.id, clinic_id: null, name: 'Walk-in Patient' })
  .select('id')
  .single();
check('patient inserts with owner_org_id and NULL clinic_id', !centerPatErr, centerPatErr?.message);

const { data: docMems } = await db
  .from('memberships')
  .select('user_id')
  .eq('organization_id', clinicOrgId)
  .eq('user_id', docUser.user.id);
check('clinic doctor has a clinic-org membership', docMems?.length === 1);

// --- RLS: sign in as the clinic doctor (anon client + JWT) ---
const asDoctor = createClient(url, anonKey, { auth: { persistSession: false } });
await asDoctor.auth.signInWithPassword({ email: docUser.user.email, password: pw });
const { data: docSeesClinic } = await asDoctor
  .from('patients').select('id').eq('id', clinicPatient.id);
check('clinic doctor sees their clinic patient', docSeesClinic?.length === 1);
const { data: docSeesCenter } = await asDoctor
  .from('patients').select('id').eq('id', centerPatient.id);
check('clinic doctor CANNOT see the centre patient (RLS)', docSeesCenter?.length === 0, `got ${docSeesCenter?.length}`);

// --- RLS: sign in as the centre staff ---
const asStaff = createClient(url, anonKey, { auth: { persistSession: false } });
await asStaff.auth.signInWithPassword({ email: staffUser.user.email, password: pw });
const { data: staffSeesCenter } = await asStaff
  .from('patients').select('id').eq('id', centerPatient.id);
check('centre staff sees their centre patient', staffSeesCenter?.length === 1);
const { data: staffSeesClinic } = await asStaff
  .from('patients').select('id').eq('id', clinicPatient.id);
check('centre staff CANNOT see the clinic patient (RLS)', staffSeesClinic?.length === 0, `got ${staffSeesClinic?.length}`);
const { data: staffSeesOwnOrg } = await asStaff
  .from('organizations').select('id').eq('id', centerOrg.id);
check('centre staff reads its own organization', staffSeesOwnOrg?.length === 1);
const { data: staffSeesClinicOrg } = await asStaff
  .from('organizations').select('id').eq('id', clinicOrgId);
check('centre staff CANNOT read the clinic organization (RLS)', staffSeesClinicOrg?.length === 0, `got ${staffSeesClinicOrg?.length}`);

// --- WRITE boundary: the scope-exclusivity invariant (RESTRICTIVE policy) ---
// A clinic doctor must not be able to smuggle a foreign owner_org onto a row.
const { error: docSmuggleInsErr } = await asDoctor
  .from('patients')
  .insert({ clinic_id: SEED_CLINIC_ID, owner_org_id: centerOrg.id, name: 'Smuggle Insert' })
  .select('id');
check('clinic doctor CANNOT insert a patient claiming a foreign owner_org (WITH CHECK)', Boolean(docSmuggleInsErr), docSmuggleInsErr?.message ?? 'insert unexpectedly succeeded');

const { error: docSmuggleUpdErr } = await asDoctor
  .from('patients')
  .update({ owner_org_id: centerOrg.id })
  .eq('id', clinicPatient.id)
  .select('id');
check('clinic doctor CANNOT move their patient to a foreign owner_org (WITH CHECK)', Boolean(docSmuggleUpdErr), docSmuggleUpdErr?.message ?? 'update unexpectedly succeeded');

// Centre staff must not be able to attach a clinic_id to their owner-scoped patient.
const { error: staffSmuggleInsErr } = await asStaff
  .from('patients')
  .insert({ owner_org_id: centerOrg.id, clinic_id: SEED_CLINIC_ID, name: 'Staff Smuggle' })
  .select('id');
check('centre staff CANNOT insert a patient claiming a clinic_id (WITH CHECK)', Boolean(staffSmuggleInsErr), staffSmuggleInsErr?.message ?? 'insert unexpectedly succeeded');

// A well-formed single-scope write still succeeds (the invariant is not over-broad).
const { error: wellFormedErr } = await asStaff
  .from('patients')
  .insert({ owner_org_id: centerOrg.id, clinic_id: null, name: 'Well Formed Owner Patient' })
  .select('id');
check('centre staff CAN insert a well-formed owner-scoped patient', !wellFormedErr, wellFormedErr?.message);

// The table CHECK makes the single-scope invariant unconditional: even a
// service-role write (which bypasses RLS) cannot create a both-scopes row.
const { error: bothScopeErr } = await db
  .from('patients')
  .insert({ clinic_id: SEED_CLINIC_ID, owner_org_id: centerOrg.id, name: 'Both Scope (service role)' });
check('table CHECK rejects a both-scope row even via service role', Boolean(bothScopeErr), bothScopeErr?.message ?? 'service-role insert unexpectedly succeeded');

// --- cleanup ---
await db.from('patients').delete().in('name', ['Smuggle Insert', 'Staff Smuggle', 'Well Formed Owner Patient', 'Both Scope (service role)']);
await db.from('patients').delete().in('id', [clinicPatient.id, centerPatient.id]);
await db.from('memberships').delete().in('user_id', [docUser.user.id, staffUser.user.id]);
await db.from('doctors').delete().eq('id', docUser.user.id);
await db.from('organizations').delete().eq('id', centerOrg.id);
await db.auth.admin.deleteUser(docUser.user.id);
await db.auth.admin.deleteUser(staffUser.user.id);
console.log('\ncleanup done');

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
