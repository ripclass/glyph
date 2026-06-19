/**
 * Real organization onboarding (service-role). Creates a hospital or
 * diagnostic_centre organization + a signatory + a staff/technologist auth
 * user, each with a membership. No self-signup exists by design (mirrors
 * create-doctor.mjs and create-center.mjs).
 *
 * Usage (hospital):
 *   node scripts/create-org.mjs <SUPABASE_URL> <SERVICE_KEY> \
 *     --type hospital \
 *     --name "Dev District Hospital" [--district Dhaka] [--phone 02...] \
 *     --signer-email s@hosp.dev --signer-password .. --signer-name "Dr. Signer" \
 *     --staff-email w@hosp.dev --staff-password .. --staff-name "Ward Staff"
 *
 * Usage (diagnostic_centre):
 *   node scripts/create-org.mjs <SUPABASE_URL> <SERVICE_KEY> \
 *     --type diagnostic_centre \
 *     --name "Popular Diagnostics, Dhanmondi" [--district Dhaka] [--phone 02...] \
 *     --signer-email s@centre.bd --signer-password .. --signer-name "Dr. Signatory" \
 *     --staff-email t@centre.bd --staff-password .. --staff-name "Tech Name"
 *
 * Note: --type clinic is refused — use create-doctor.mjs for clinic onboarding.
 */

import { createClient } from '@supabase/supabase-js';

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const url = process.argv[2];
const serviceKey = process.argv[3];
const orgType = arg('--type');
const name = arg('--name');

const ALLOWED_TYPES = ['hospital', 'diagnostic_centre'];

if (!url || !serviceKey || !orgType || !name) {
  console.error(
    'usage: node scripts/create-org.mjs <SUPABASE_URL> <SERVICE_KEY> ' +
    '--type hospital|diagnostic_centre --name ".." [--district ..] [--phone ..] ' +
    '--signer-email .. --signer-password .. --signer-name .. ' +
    '--staff-email .. --staff-password .. --staff-name ..'
  );
  process.exit(2);
}

if (orgType === 'clinic') {
  console.error('Error: --type clinic is not supported here. Use scripts/create-doctor.mjs for clinic onboarding.');
  process.exit(2);
}

if (!ALLOWED_TYPES.includes(orgType)) {
  console.error(`Error: --type must be one of: ${ALLOWED_TYPES.join(', ')}. Got: ${orgType}`);
  process.exit(2);
}

if (/\.supabase\.co/.test(url) && !process.argv.includes('--prod')) {
  console.error('Refusing a non-local URL without --prod (safety rail).');
  process.exit(2);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: org, error: orgErr } = await db
  .from('organizations')
  .insert({
    name,
    org_type: orgType,
    district: arg('--district') ?? null,
    phone: arg('--phone') ?? null,
  })
  .select('id')
  .single();
if (orgErr) { console.error('org insert failed:', orgErr.message); process.exit(1); }
console.log(`${orgType} org:`, org.id);

async function addStaff(emailFlag, pwFlag, nameFlag, role) {
  const email = arg(emailFlag), password = arg(pwFlag);
  if (!email || !password) return;
  const { data: u, error: uErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (uErr) { console.error(`${role} user failed:`, uErr.message); process.exit(1); }
  const { error: mErr } = await db.from('memberships').insert({
    user_id: u.user.id,
    organization_id: org.id,
    role,
  });
  if (mErr) { console.error(`${role} membership failed:`, mErr.message); process.exit(1); }
  console.log(`${role}:`, email, '→', u.user.id, `(${arg(nameFlag) ?? ''})`);
}

// signatory role is shared across org types
await addStaff('--signer-email', '--signer-password', '--signer-name', 'signatory');

// hospital doctors enter clinical content; technologists enter results for diagnostic centres
const staffRole = orgType === 'hospital' ? 'doctor' : 'technologist';
await addStaff('--staff-email', '--staff-password', '--staff-name', staffRole);

console.log('DONE');
