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

// ===== Section B added in Task 2 (before this summary) =====

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
