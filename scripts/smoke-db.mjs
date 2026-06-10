/**
 * Live-DB smoke test for the reconciled schema + registration flow (M3-pre).
 *
 * Verifies, against a REAL local Supabase (not types), that:
 *  1. The columns the client services read/write actually exist
 *     (visits attendant + consultation columns, patients lookup, relations).
 *  2. The set_visit_number() trigger assigns per-patient visit numbers.
 *  3. The update_timestamp() trigger maintains updated_at.
 *  4. Registration semantics: find-by-phone returns family members sharing a
 *     phone; a second visit for the same patient increments visit_number.
 *
 * Uses the service-role key (bypasses RLS — this validates schema/trigger
 * correctness; RLS-scoped client behavior is exercised in M4's browser run).
 *
 * Usage:
 *   supabase status -o env   # then:
 *   node scripts/smoke-db.mjs <SUPABASE_URL> <SERVICE_ROLE_KEY>
 */

import { createClient } from '@supabase/supabase-js';

const [url, serviceKey] = process.argv.slice(2);
if (!url || !serviceKey) {
  console.error('usage: node scripts/smoke-db.mjs <SUPABASE_URL> <SERVICE_ROLE_KEY>');
  process.exit(2);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

const CLINIC_ID = 'c0000000-0000-0000-0000-000000000001'; // from seed.sql

// --- 0. Auth user + doctor row (doctors.id references auth.users) ---------
const { data: authUser, error: authErr } = await db.auth.admin.createUser({
  email: `smoke-doctor-${Date.now()}@glyph.local`,
  password: 'smoke-test-only-1234',
  email_confirm: true,
});
check('auth.admin.createUser', !authErr, authErr?.message);

const doctorId = authUser.user.id;
const { error: docErr } = await db.from('doctors').insert({
  id: doctorId,
  clinic_id: CLINIC_ID,
  name: 'Dr. Smoke Test',
  phone: `017${String(Date.now()).slice(-8)}`,
  speciality: 'Medicine',
  bmdc_reg_no: 'A-00000',
});
check('doctors insert (id = auth user id, speciality column)', !docErr, docErr?.message);

// --- 1. Registration: find-or-create patient ------------------------------
// Same columns registration.ts writes.
const sharedPhone = '01711999888';
const { data: p1, error: p1Err } = await db
  .from('patients')
  .insert({ clinic_id: CLINIC_ID, name: 'আব্দুল রহমান', phone: sharedPhone, age: 60, gender: 'male' })
  .select()
  .single();
check('patients insert (registration columns)', !p1Err, p1Err?.message);

const { data: p2, error: p2Err } = await db
  .from('patients')
  .insert({ clinic_id: CLINIC_ID, name: 'ফাতেমা বেগম', phone: sharedPhone, age: 52, gender: 'female' })
  .select()
  .single();
check('second family member, same phone', !p2Err, p2Err?.message);

// getPatientsByPhone semantics: exact phone within clinic → both family members
const { data: byPhone, error: byPhoneErr } = await db
  .from('patients')
  .select('*')
  .eq('clinic_id', CLINIC_ID)
  .eq('phone', sharedPhone);
check(
  'getPatientsByPhone returns the whole family (no phone-only merge possible)',
  !byPhoneErr && byPhone.length === 2,
  byPhoneErr?.message ?? `got ${byPhone?.length}`
);

// --- 2. createVisit with attendant fields + visit_number trigger ----------
const { data: v1, error: v1Err } = await db
  .from('visits')
  .insert({
    patient_id: p1.id,
    doctor_id: doctorId,
    clinic_id: CLINIC_ID,
    status: 'intake',
    attendant_present: true,
    attendant_name: 'করিম মিয়া',
    attendant_relation: 'ছেলে',
  })
  .select()
  .single();
check('createVisit insert (attendant_* columns)', !v1Err, v1Err?.message);
check('set_visit_number trigger → visit_number = 1', v1?.visit_number === 1, `got ${v1?.visit_number}`);
check('visit_date defaulted server-side', Boolean(v1?.visit_date), String(v1?.visit_date));

const { data: v2 } = await db
  .from('visits')
  .insert({ patient_id: p1.id, doctor_id: doctorId, clinic_id: CLINIC_ID, status: 'intake' })
  .select()
  .single();
check('second visit → visit_number = 2 (per-patient counter)', v2?.visit_number === 2, `got ${v2?.visit_number}`);

// --- 3. updateVisitStatus columns + update_timestamp trigger ---------------
const beforeUpdatedAt = v1.updated_at;
await new Promise((r) => setTimeout(r, 1100)); // ensure now() differs
const { data: v1b, error: updErr } = await db
  .from('visits')
  .update({ status: 'in_consultation', consultation_started_at: new Date().toISOString() })
  .eq('id', v1.id)
  .select()
  .single();
check('updateVisitStatus (consultation_started_at column)', !updErr, updErr?.message);
check(
  'update_timestamp trigger bumped updated_at',
  Boolean(v1b) && v1b.updated_at !== beforeUpdatedAt,
  `${beforeUpdatedAt} → ${v1b?.updated_at}`
);

// --- 4. getTodayQueue: relations select + visit_date filter + order --------
const today = new Date();
const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const { data: queue, error: qErr } = await db
  .from('visits')
  .select(`
    *,
    patients (id, name, name_bn, phone, age, gender, blood_group),
    prescriptions (id, source, image_path, medications, extraction_confidence, created_at),
    lab_reports (id, source, image_path, test_category, results, created_at),
    consent_records (id, consent_type, granted, granted_by, granted_at)
  `)
  .eq('clinic_id', CLINIC_ID)
  .eq('visit_date', localDate)
  .order('created_at', { ascending: true });
check('getTodayQueue select (nested relations, real columns)', !qErr, qErr?.message);
check('queue contains the visits in arrival order', queue?.length >= 2 && queue[0].id === v1.id, `got ${queue?.length}`);

// --- 5. Seeded data sanity (lab_reports.test_category / results) -----------
const { data: labs, error: labErr } = await db
  .from('lab_reports')
  .select('test_category, results, image_path')
  .eq('patient_id', 'a0000000-0000-0000-0000-000000000001');
check('seeded lab_reports readable via real columns', !labErr && labs.length === 3, labErr?.message ?? `got ${labs?.length}`);

// --- cleanup ---------------------------------------------------------------
await db.from('visits').delete().in('id', [v1.id, v2.id]);
await db.from('patients').delete().in('id', [p1.id, p2.id]);
await db.from('doctors').delete().eq('id', doctorId);
await db.auth.admin.deleteUser(doctorId);
console.log('\ncleanup done');

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
