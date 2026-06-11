/**
 * (Re)creates the local dev doctor after `supabase db reset` — seed.sql
 * intentionally ships no doctors because doctors.id must be a real
 * auth.users id. Idempotent: safe to run repeatedly.
 *
 *   login: doctor@glyph.dev / glyph-dev-2026  (LOCAL STACK ONLY)
 *
 * Usage:
 *   node scripts/dev-doctor.mjs <SUPABASE_URL> <SERVICE_KEY>
 */

import { createClient } from '@supabase/supabase-js';

const [supaUrl, serviceKey] = process.argv.slice(2);
if (!supaUrl || !serviceKey) {
  console.error('usage: node scripts/dev-doctor.mjs <SUPABASE_URL> <SERVICE_KEY>');
  process.exit(2);
}
if (!/127\.0\.0\.1|localhost/.test(supaUrl)) {
  console.error('refusing: dev-doctor is for the LOCAL stack only (use auth.admin for prod accounts)');
  process.exit(2);
}

const admin = createClient(supaUrl, serviceKey, { auth: { persistSession: false } });

const { data: clinic, error: clinicErr } = await admin
  .from('clinics')
  .select('id, name')
  .limit(1)
  .single();
if (clinicErr || !clinic) {
  console.error('no clinic found — run `supabase db reset` so seed.sql applies first');
  process.exit(1);
}

const email = 'doctor@glyph.dev';
const password = 'glyph-dev-2026';

let userId;
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (createErr) {
  // Already exists → look it up
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === email);
  if (!existing) {
    console.error(`createUser failed and no existing user: ${createErr.message}`);
    process.exit(1);
  }
  userId = existing.id;
} else {
  userId = created.user.id;
}

const { error: upsertErr } = await admin.from('doctors').upsert({
  id: userId,
  clinic_id: clinic.id,
  name: 'Dr. Dev Doctor',
  name_bn: 'ডা. ডেভ',
  speciality: 'Medicine',
  bmdc_reg_no: 'A-00000',
  phone: '01700000001',
  email,
});
if (upsertErr) {
  console.error(`doctors upsert failed: ${upsertErr.message}`);
  process.exit(1);
}

console.log(`dev doctor ready: ${email} / ${password} → clinic "${clinic.name}" (${clinic.id})`);
