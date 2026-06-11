/**
 * M3-pre closure test — THE full live clinical path, end to end, against
 * production:
 *
 *   register (clinic/doctor/patient) → create visit → intake-start (greeting)
 *   → intake-turn ×2 (STREAMING — exercises the OpenRouter→Gemini-SSE
 *   normalization as a real client) → intake-complete (structured summary)
 *   → generate-note (BD-format clinical note persisted)
 *
 * Provisions everything itself, asserts each leg + persistence, cleans up.
 *
 * Usage:
 *   node scripts/smoke-path.mjs <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>
 */

import { createClient } from '@supabase/supabase-js';

const [url, anonKey, serviceKey] = process.argv.slice(2);
if (!url || !anonKey || !serviceKey) {
  console.error('usage: node scripts/smoke-path.mjs <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>');
  process.exit(2);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${String(detail).slice(0, 160)}` : ''}`);
  if (!ok) failures++;
}

/** Poll until fn() returns truthy or timeout (capture branches are async) */
async function waitFor(fn, timeoutMs = 15000, intervalMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

/**
 * Consume an SSE stream the way the client hooks do: collect raw bytes,
 * parse Gemini-shaped events, return { rawLen, sseEvents, text }.
 * Plain-text streams (the MedGemma fall-through wrapper) yield sseEvents=0
 * and text = raw.
 */
async function consumeStream(res) {
  const raw = await res.text();
  let text = '';
  let sseEvents = 0;
  for (const line of raw.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    try {
      const json = JSON.parse(line.slice(6));
      const part = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (part) {
        text += part;
        sseEvents++;
      }
    } catch {
      /* [DONE] / keepalives */
    }
  }
  return { rawLen: raw.length, sseEvents, text: text || raw };
}

function callFn(name, jwt, body) {
  return fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
      apikey: anonKey,
    },
    body: JSON.stringify(body),
  });
}

// ── Provision ───────────────────────────────────────────────────────────────
const { data: clinic } = await admin
  .from('clinics')
  .insert({ name: 'Smoke Path Clinic', district: 'Dhaka' })
  .select()
  .single();

const email = `smoke-path-${Date.now()}@glyph.local`;
const password = `smoke-${Math.random().toString(36).slice(2)}-Aa1!`;
const { data: authUser } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
const doctorId = authUser.user.id;

await admin.from('doctors').insert({
  id: doctorId,
  clinic_id: clinic.id,
  name: 'Dr. Path Test',
  phone: `019${String(Date.now()).slice(-8)}`,
  speciality: 'Medicine',
});

const { data: patient } = await admin
  .from('patients')
  .insert({
    clinic_id: clinic.id,
    name: 'Rahima Khatun',
    name_bn: 'রহিমা খাতুন',
    phone: '01811999666',
    age: 48,
    gender: 'female',
    chronic_conditions: ['Type 2 Diabetes'],
  })
  .select()
  .single();

const { data: visit } = await admin
  .from('visits')
  .insert({ patient_id: patient.id, doctor_id: doctorId, clinic_id: clinic.id, status: 'intake' })
  .select()
  .single();
check('provisioned clinic/doctor/patient/visit', Boolean(visit?.id));

const userClient = createClient(url, anonKey, { auth: { persistSession: false } });
const { data: session } = await userClient.auth.signInWithPassword({ email, password });
const jwt = session.session.access_token;
check('doctor JWT issued', Boolean(jwt));

// ── Leg 1: intake-start ─────────────────────────────────────────────────────
const startRes = await callFn('intake-start', jwt, { visitId: visit.id, isAttendant: false, language: 'bn' });
const startBody = await startRes.json();
check('intake-start: greeting returned', startRes.ok && startBody.success && /[ঀ-৿]/.test(startBody.data.greeting), startBody.data?.greeting ?? startBody.error);

// ── Leg 2: intake-turn #1 (STREAMING) ───────────────────────────────────────
const turn1Res = await callFn('intake-turn', jwt, {
  visitId: visit.id,
  message: 'তিন দিন ধরে জ্বর আর মাথা ব্যথা। রাতে জ্বর বেশি হয়।',
  messageSource: 'patient',
});
check('intake-turn #1: HTTP 200 + SSE content type', turn1Res.ok && (turn1Res.headers.get('content-type') ?? '').includes('text/event-stream'), turn1Res.status);

const turn1 = await consumeStream(turn1Res);
check('intake-turn #1: real SSE events in Gemini shape (OpenRouter normalization)', turn1.sseEvents > 0, `${turn1.sseEvents} events, ${turn1.rawLen} bytes`);
check('intake-turn #1: streamed reply is Bangla', /[ঀ-৿]/.test(turn1.text), turn1.text.slice(0, 80));
console.log(`\n  ASSISTANT: ${turn1.text.slice(0, 200)}\n`);

// Capture branch persists asynchronously — wait for transcript ≥ 3 entries
const transcript1 = await waitFor(async () => {
  const { data } = await admin.from('visits').select('intake_transcript').eq('id', visit.id).single();
  const t = data?.intake_transcript;
  return Array.isArray(t) && t.length >= 3 ? t : null;
});
check('intake-turn #1: transcript persisted (greeting + patient + assistant)', Boolean(transcript1), `entries=${transcript1?.length}`);
check(
  'intake-turn #1: persisted assistant text is CLEAN (no raw SSE leakage)',
  Boolean(transcript1) && !String(transcript1.at(-1).content).includes('data: {'),
  String(transcript1?.at(-1)?.content ?? '').slice(0, 60)
);

// ── Leg 3: intake-turn #2 (multi-turn context) ──────────────────────────────
const turn2Res = await callFn('intake-turn', jwt, {
  visitId: visit.id,
  message: 'জ্বর ১০২ ডিগ্রি পর্যন্ত উঠে। প্যারাসিটামল খেলে কিছুক্ষণ কমে। সাথে শরীর ব্যথাও আছে।',
  messageSource: 'patient',
});
const turn2 = await consumeStream(turn2Res);
check('intake-turn #2: multi-turn reply streamed', turn2Res.ok && turn2.text.length > 0, turn2.text.slice(0, 80));

const transcript2 = await waitFor(async () => {
  const { data } = await admin.from('visits').select('intake_transcript').eq('id', visit.id).single();
  const t = data?.intake_transcript;
  return Array.isArray(t) && t.length >= 5 ? t : null;
});
check('intake-turn #2: transcript now has 5 entries', Boolean(transcript2), `entries=${transcript2?.length}`);

// ── Leg 4: intake-complete (structured summary) ─────────────────────────────
const completeRes = await callFn('intake-complete', jwt, { visitId: visit.id });
const completeBody = await completeRes.json();
check('intake-complete: HTTP 200 success', completeRes.ok && completeBody.success, completeBody.error);

const summarized = await waitFor(async () => {
  const { data } = await admin.from('visits').select('intake_summary, status').eq('id', visit.id).single();
  return data?.intake_summary ? data : null;
});
check('intake-complete: intake_summary persisted + status advanced', Boolean(summarized) && summarized.status === 'intake_complete', `status=${summarized?.status}`);
const cc = summarized?.intake_summary?.chiefComplaint;
check('intake-complete: summary has chiefComplaint', Boolean(cc), cc);

// ── Leg 5: generate-note (BD format) ────────────────────────────────────────
// Primary is MedGemma (no Vertex key, no OpenRouter mapping) → router
// falls through to non-streaming Claude-via-OpenRouter wrapped as a plain
// text stream. The function's parser handles both shapes.
const noteRes = await callFn('generate-note', jwt, { visitId: visit.id, format: 'bd' });
check('generate-note: HTTP 200', noteRes.ok, noteRes.status);
const noteStream = await consumeStream(noteRes);
check('generate-note: stream carried the note', noteStream.text.length > 100, `${noteStream.rawLen} bytes`);

const noted = await waitFor(async () => {
  const { data } = await admin.from('visits').select('generated_note, note_format, status').eq('id', visit.id).single();
  return data?.generated_note ? data : null;
}, 30000);
check('generate-note: generated_note persisted', Boolean(noted));
check('generate-note: BD format (CC present, NOT soap)', noted?.note_format === 'bd' && Boolean(noted?.generated_note?.chiefComplaint) && noted?.generated_note?.format !== 'soap', `format=${noted?.note_format}`);
check('generate-note: prescription block present', Array.isArray(noted?.generated_note?.prescription?.medications), `${noted?.generated_note?.prescription?.medications?.length ?? 0} medications`);
check('generate-note: status advanced to note_review', noted?.status === 'note_review', noted?.status);

if (noted?.generated_note) {
  const n = noted.generated_note;
  console.log(`\n  NOTE  CC: ${n.chiefComplaint}`);
  console.log(`  NOTE  Dx: ${n.diagnosis}`);
  console.log(`  NOTE  Rx: ${(n.prescription?.medications ?? []).map((m) => `${m.name} ${m.dose} ${m.frequency}`).join('; ')}\n`);
}

// ── Cost accounting view ─────────────────────────────────────────────────────
const { data: usage } = await admin
  .from('api_usage_log')
  .select('edge_function, model_used, was_fallback, input_tokens, output_tokens')
  .eq('visit_id', visit.id)
  .order('created_at');
console.log('  USAGE LOG:');
for (const u of usage ?? []) {
  console.log(`    ${u.edge_function}: ${u.model_used}${u.was_fallback ? ' (fallback)' : ''} in=${u.input_tokens} out=${u.output_tokens}`);
}

// ── Cleanup ──────────────────────────────────────────────────────────────────
await admin.from('api_usage_log').delete().eq('visit_id', visit.id);
await admin.from('consent_records').delete().eq('visit_id', visit.id);
await admin.from('visits').delete().eq('id', visit.id);
await admin.from('patients').delete().eq('id', patient.id);
await admin.from('doctors').delete().eq('id', doctorId);
await admin.from('clinics').delete().eq('id', clinic.id);
await admin.auth.admin.deleteUser(doctorId);
console.log('\ncleanup done');

console.log(failures === 0 ? '\nALL CHECKS PASSED — M3-pre live path complete' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
