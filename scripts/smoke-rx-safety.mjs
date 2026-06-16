/**
 * Prescription safety check smoke test — exercises the live `check-prescription-safety`
 * edge function end to end with a real doctor JWT and real LLM call via OpenRouter.
 *
 * Fixtures:
 *   1. Cardiac   — patient with "Ischemic heart disease"; prescribe Ibuprofen → ≥1 warning
 *                  of type "interaction" or "contraindication".  Two prior Rx seeded:
 *                  a visit-linked Aspirin AND a VISITLESS (visit_id=null) Clopidogrel
 *                  (the WhatsApp pre-chamber photo path).  Asserts existingMedCount ≥ 2,
 *                  proving the .or() query now counts visitless historical Rx that a
 *                  plain neq("visit_id", …) would have silently dropped.
 *   2. Allergy   — patient with known_allergies ["Penicillin"]; prescribe Amoxicillin
 *                  → ≥1 warning of type "allergy".
 *   3. Clean     — patient with empty allergies/conditions, no prior Rx; prescribe
 *                  Paracetamol → warnings [] (length 0).
 *   4. Thin-data — patient with no allergies, no conditions, no prior Rx; assert
 *                  hasAllergies=false, hasConditions=false, existingMedCount=0.
 *   5. Auth      — POST with no Authorization header → HTTP 401.
 *
 * NOTE on Windows: do NOT call process.exit() while supabase-js sockets are open
 * — it crashes (0xC0000409).  Set process.exitCode instead and let the loop drain.
 *
 * Usage:
 *   node scripts/smoke-rx-safety.mjs <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>
 */

import { createClient } from '@supabase/supabase-js';

const [url, anonKey, serviceKey] = process.argv.slice(2);
if (!url || !anonKey || !serviceKey) {
  console.error('usage: node scripts/smoke-rx-safety.mjs <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>');
  process.exitCode = 2;
  // Let the event loop drain naturally.
  process.on('exit', () => {});
  throw new Error('bad args');
}

const FUNCTIONS_URL = `${url}/functions/v1`;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${String(detail).slice(0, 200)}` : ''}`);
  if (!ok) failures++;
}

/** POST to the edge function with an Authorization header */
function callSafety(jwt, body) {
  return fetch(`${FUNCTIONS_URL}/check-prescription-safety`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
      apikey: anonKey,
    },
    body: JSON.stringify(body),
  });
}

/** POST to the edge function WITHOUT an Authorization header (auth fixture) */
function callSafetyNoAuth(body) {
  return fetch(`${FUNCTIONS_URL}/check-prescription-safety`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify(body),
  });
}

// ── Provision shared infrastructure ─────────────────────────────────────────
// One clinic + one doctor shared across all fixtures.  ALL patients must be
// in the SAME clinic so RLS lets the doctor JWT read their rows.
console.log('\n── Provisioning shared clinic + doctor ──────────────────────────────────');

const { data: clinic, error: clinicErr } = await admin
  .from('clinics')
  .insert({ name: `Smoke Safety Clinic ${Date.now()}`, district: 'Dhaka' })
  .select()
  .single();
if (clinicErr || !clinic) {
  console.error('FATAL: could not create clinic:', clinicErr?.message);
  process.exitCode = 1;
  throw clinicErr ?? new Error('no clinic');
}

const email = `smoke-safety-${Date.now()}@glyph.local`;
const password = `Smoke!${Math.random().toString(36).slice(2)}Aa1`;
const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (authErr || !authUser?.user) {
  console.error('FATAL: could not create auth user:', authErr?.message);
  process.exitCode = 1;
  throw authErr ?? new Error('no user');
}
const doctorId = authUser.user.id;

await admin.from('doctors').insert({
  id: doctorId,
  clinic_id: clinic.id,
  name: 'Dr. Safety Smoke',
  phone: `019${String(Date.now()).slice(-8)}`,
  speciality: 'Medicine',
});

// Sign in to get a real JWT (RLS-scoped to clinic above)
const userClient = createClient(url, anonKey, { auth: { persistSession: false } });
const { data: session, error: sessionErr } = await userClient.auth.signInWithPassword({ email, password });
if (sessionErr || !session?.session?.access_token) {
  console.error('FATAL: sign-in failed:', sessionErr?.message);
  process.exitCode = 1;
  throw sessionErr ?? new Error('no session');
}
const jwt = session.session.access_token;
console.log(`  doctor ${email} → clinic ${clinic.id}`);
console.log(`  JWT: ${jwt.slice(0, 24)}…\n`);

// ── Helper: create patient + visit, optionally seed prior Rx ─────────────────
async function provisionPatient({ name, allergies = [], conditions = [], priorMeds = null }) {
  const { data: patient } = await admin
    .from('patients')
    .insert({
      clinic_id: clinic.id,
      name,
      phone: `018${String(Date.now()).slice(-8)}`,
      age: 55,
      gender: 'male',
      known_allergies: allergies,
      chronic_conditions: conditions,
    })
    .select()
    .single();

  const { data: visit } = await admin
    .from('visits')
    .insert({
      patient_id: patient.id,
      doctor_id: doctorId,
      clinic_id: clinic.id,
      status: 'note_review',
    })
    .select()
    .single();

  if (priorMeds && priorMeds.length > 0) {
    // Seed a prior prescription on a DISTINCT prior visit.  The function queries
    //   prescriptions WHERE patient_id = ? AND (visit_id IS NULL OR visit_id <> <current>)
    // i.e. all prior Rx EXCEPT the current visit's draft — visit-linked rows like
    // this one are counted.  (Visitless rows are exercised separately below.)
    const { data: priorVisit } = await admin
      .from('visits')
      .insert({
        patient_id: patient.id,
        doctor_id: doctorId,
        clinic_id: clinic.id,
        status: 'completed',
      })
      .select()
      .single();
    toClean.visits.push(priorVisit.id);

    await admin.from('prescriptions').insert({
      patient_id: patient.id,
      visit_id: priorVisit.id,
      source: 'photo_historical',
      medications: priorMeds.map((n) => ({ name: n })),
    });
  }

  return { patient, visit };
}

// ── Cleanup registry (collect IDs, clean at the end) ─────────────────────────
const toClean = { patients: [], visits: [], prescriptions: [] };

// ── Fixture 1: Cardiac ────────────────────────────────────────────────────────
console.log('── Fixture 1: Cardiac (Ibuprofen + Ischemic heart disease) ──────────────');
const { patient: p1, visit: v1 } = await provisionPatient({
  name: 'Karim Ischemic',
  conditions: ['Ischemic heart disease'],
  priorMeds: ['Aspirin 75mg'],        // visit-linked prior Rx → existingMedCount += 1
});
toClean.patients.push(p1.id);
toClean.visits.push(v1.id);

// Seed an ADDITIONAL VISITLESS prior Rx (visit_id = null) — the WhatsApp Leg C
// "pre-chamber" photo path produces exactly these.  The OLD .neq("visit_id", …)
// query silently dropped these (Postgres `<>` is UNKNOWN vs NULL); the .or()
// fix must now count it.  So existingMedCount should be ≥ 2 (Aspirin + Clopidogrel).
await admin.from('prescriptions').insert({
  patient_id: p1.id,
  visit_id: null,
  source: 'photo_historical',
  medications: [{ name: 'Clopidogrel' }],
});

const r1 = await callSafety(jwt, { visitId: v1.id, medications: [{ name: 'Ibuprofen', dose: '400mg', frequency: '1+0+1' }] });
const b1 = await r1.json();
console.log(`  HTTP ${r1.status} | success=${b1.success} | model=${b1.data?.model ?? 'N/A'}`);
console.log(`  warnings: ${JSON.stringify(b1.data?.warnings ?? b1.error).slice(0, 300)}`);
check('cardiac: HTTP 200 + success', r1.status === 200 && b1.success === true, b1.error);
const w1 = Array.isArray(b1.data?.warnings) ? b1.data.warnings : [];
check(
  'cardiac: ≥1 warning returned',
  w1.length >= 1,
  `count=${w1.length}`
);
check(
  'cardiac: at least one warning is "interaction" or "contraindication"',
  w1.some((w) => w.type === 'interaction' || w.type === 'contraindication'),
  `types=${w1.map((w) => w.type).join(',')}`
);
check('cardiac: existingMedCount ≥ 2 (visit-linked Aspirin + VISITLESS Clopidogrel both counted)', (b1.data?.existingMedCount ?? 0) >= 2, `existingMedCount=${b1.data?.existingMedCount}`);
check('cardiac: hasConditions=true', b1.data?.hasConditions === true, `hasConditions=${b1.data?.hasConditions}`);
console.log(`  model: ${b1.data?.model}\n`);

// ── Fixture 2: Allergy ────────────────────────────────────────────────────────
console.log('── Fixture 2: Allergy (Amoxicillin + Penicillin allergy) ────────────────');
const { patient: p2, visit: v2 } = await provisionPatient({
  name: 'Rina Penicillin',
  allergies: ['Penicillin'],
});
toClean.patients.push(p2.id);
toClean.visits.push(v2.id);

const r2 = await callSafety(jwt, { visitId: v2.id, medications: [{ name: 'Amoxicillin', dose: '500mg', frequency: '1+1+1' }] });
const b2 = await r2.json();
console.log(`  HTTP ${r2.status} | success=${b2.success} | model=${b2.data?.model ?? 'N/A'}`);
console.log(`  warnings: ${JSON.stringify(b2.data?.warnings ?? b2.error).slice(0, 300)}`);
check('allergy: HTTP 200 + success', r2.status === 200 && b2.success === true, b2.error);
const w2 = Array.isArray(b2.data?.warnings) ? b2.data.warnings : [];
check('allergy: ≥1 warning returned', w2.length >= 1, `count=${w2.length}`);
check(
  'allergy: at least one warning is type "allergy"',
  w2.some((w) => w.type === 'allergy'),
  `types=${w2.map((w) => w.type).join(',')}`
);
check('allergy: hasAllergies=true', b2.data?.hasAllergies === true, `hasAllergies=${b2.data?.hasAllergies}`);
console.log(`  model: ${b2.data?.model}\n`);

// ── Fixture 3: Clean ──────────────────────────────────────────────────────────
console.log('── Fixture 3: Clean (Paracetamol, no context) ───────────────────────────');
const { patient: p3, visit: v3 } = await provisionPatient({
  name: 'Hasan Clean',
  allergies: [],
  conditions: [],
});
toClean.patients.push(p3.id);
toClean.visits.push(v3.id);

const r3 = await callSafety(jwt, { visitId: v3.id, medications: [{ name: 'Paracetamol', dose: '500mg', frequency: '1+0+1' }] });
const b3 = await r3.json();
console.log(`  HTTP ${r3.status} | success=${b3.success} | model=${b3.data?.model ?? 'N/A'}`);
console.log(`  warnings: ${JSON.stringify(b3.data?.warnings ?? b3.error).slice(0, 200)}`);
check('clean: HTTP 200 + success', r3.status === 200 && b3.success === true, b3.error);
const w3 = Array.isArray(b3.data?.warnings) ? b3.data.warnings : [];
check('clean: warnings = [] (no safety concerns for plain Paracetamol with no context)', w3.length === 0, `count=${w3.length} warnings=${JSON.stringify(w3).slice(0, 120)}`);
check('clean: hasAllergies=false', b3.data?.hasAllergies === false, `hasAllergies=${b3.data?.hasAllergies}`);
check('clean: hasConditions=false', b3.data?.hasConditions === false, `hasConditions=${b3.data?.hasConditions}`);
console.log(`  model: ${b3.data?.model}\n`);

// ── Fixture 4: Thin-data ─────────────────────────────────────────────────────
console.log('── Fixture 4: Thin-data (no allergies, no conditions, no prior Rx) ──────');
const { patient: p4, visit: v4 } = await provisionPatient({
  name: 'Fatema Thindata',
  allergies: [],
  conditions: [],
});
toClean.patients.push(p4.id);
toClean.visits.push(v4.id);

const r4 = await callSafety(jwt, { visitId: v4.id, medications: [{ name: 'Metformin', dose: '500mg', frequency: '1+0+1' }] });
const b4 = await r4.json();
console.log(`  HTTP ${r4.status} | success=${b4.success} | model=${b4.data?.model ?? 'N/A'}`);
check('thin-data: HTTP 200 + success', r4.status === 200 && b4.success === true, b4.error);
check('thin-data: hasAllergies=false (maps to completeness "thin")', b4.data?.hasAllergies === false, `hasAllergies=${b4.data?.hasAllergies}`);
check('thin-data: hasConditions=false (maps to completeness "thin")', b4.data?.hasConditions === false, `hasConditions=${b4.data?.hasConditions}`);
check('thin-data: existingMedCount=0 (no prior Rx seeded)', b4.data?.existingMedCount === 0, `existingMedCount=${b4.data?.existingMedCount}`);
console.log(`  model: ${b4.data?.model}\n`);

// ── Fixture 5: Auth ───────────────────────────────────────────────────────────
console.log('── Fixture 5: Auth (no Authorization header → 401) ──────────────────────');
// Use one of the existing visit IDs; the 401 gate fires before the DB read
const r5 = await callSafetyNoAuth({ visitId: v1.id, medications: [{ name: 'Ibuprofen' }] });
const b5 = await r5.json().catch(() => ({}));
console.log(`  HTTP ${r5.status} | body=${JSON.stringify(b5).slice(0, 120)}`);
check('auth: no Authorization header → HTTP 401', r5.status === 401, `status=${r5.status}`);
// 401 may come from our function ({success:false}) OR the platform gateway
// ({code:"UNAUTHORIZED_NO_AUTH_HEADER"}, no success field) — both are correct
// rejections; the contract is "not a success envelope".
check('auth: body is a rejection, never a success envelope', b5.success !== true, `body=${JSON.stringify(b5).slice(0, 80)}`);
console.log();

// ── Usage log (diagnostic) ────────────────────────────────────────────────────
const visitIds = toClean.visits.filter(Boolean);
if (visitIds.length > 0) {
  const { data: usage } = await admin
    .from('api_usage_log')
    .select('edge_function, model_used, was_fallback, input_tokens, output_tokens')
    .in('visit_id', visitIds)
    .order('created_at');
  if (usage?.length > 0) {
    console.log('── Usage log ────────────────────────────────────────────────────────────');
    for (const u of usage) {
      console.log(`  ${u.edge_function}: ${u.model_used}${u.was_fallback ? ' (FALLBACK)' : ''} in=${u.input_tokens} out=${u.output_tokens}`);
    }
    console.log();
  }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
console.log('── Cleanup ──────────────────────────────────────────────────────────────');
try {
  // FK-safe order: log → prescriptions → visits → patients → doctors → clinic → auth user
  if (visitIds.length > 0) {
    await admin.from('api_usage_log').delete().in('visit_id', visitIds);
    await admin.from('consent_records').delete().in('visit_id', visitIds);
    await admin.from('visits').delete().in('id', visitIds);
  }
  // Prescriptions with null visit_id — clean by patient_id
  if (toClean.patients.length > 0) {
    await admin.from('prescriptions').delete().in('patient_id', toClean.patients);
    await admin.from('patients').delete().in('id', toClean.patients);
  }
  await admin.from('doctors').delete().eq('id', doctorId);
  await admin.from('clinics').delete().eq('id', clinic.id);
  await admin.auth.admin.deleteUser(doctorId);
  console.log('  cleanup done\n');
} catch (err) {
  console.warn('  cleanup warning (non-fatal):', err?.message);
}

// ── Result ────────────────────────────────────────────────────────────────────
if (failures === 0) {
  console.log('ALL CHECKS PASSED — prescription safety smoke complete');
} else {
  console.log(`${failures} CHECK(S) FAILED`);
  process.exitCode = 1;
}
