/**
 * Real diagnostic-centre onboarding (service-role). Creates a diagnostic_centre
 * organization + a technologist + a signatory auth user, each with a membership.
 * No self-signup exists by design (mirrors create-doctor.mjs).
 *
 *   node scripts/create-center.mjs <SUPABASE_URL> <SERVICE_KEY> \
 *     --name "Popular Diagnostics, Dhanmondi" [--district Dhaka] [--phone 02...] \
 *     --tech-email t@centre.bd --tech-password .. --tech-name "Tech Name" \
 *     --signer-email s@centre.bd --signer-password .. --signer-name "Dr. Signatory"
 */

import { createClient } from '@supabase/supabase-js';

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const url = process.argv[2];
const serviceKey = process.argv[3];
const name = arg('--name');
if (!url || !serviceKey || !name) {
  console.error('usage: node scripts/create-center.mjs <SUPABASE_URL> <SERVICE_KEY> --name ".." [--district ..] [--phone ..] --tech-email .. --tech-password .. --tech-name .. --signer-email .. --signer-password .. --signer-name ..');
  process.exit(2);
}
if (/\.supabase\.co/.test(url) && !process.argv.includes('--prod')) {
  console.error('Refusing a non-local URL without --prod (safety rail).');
  process.exit(2);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: org, error: orgErr } = await db
  .from('organizations')
  .insert({ name, org_type: 'diagnostic_centre', district: arg('--district') ?? null, phone: arg('--phone') ?? null })
  .select('id')
  .single();
if (orgErr) { console.error('org insert failed:', orgErr.message); process.exit(1); }
console.log('centre org:', org.id);

async function addStaff(emailFlag, pwFlag, nameFlag, role) {
  const email = arg(emailFlag), password = arg(pwFlag);
  if (!email || !password) return;
  const { data: u, error: uErr } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (uErr) { console.error(`${role} user failed:`, uErr.message); process.exit(1); }
  const { error: mErr } = await db.from('memberships').insert({ user_id: u.user.id, organization_id: org.id, role });
  if (mErr) { console.error(`${role} membership failed:`, mErr.message); process.exit(1); }
  console.log(`${role}:`, email, '→', u.user.id, `(${arg(nameFlag) ?? ''})`);
}

await addStaff('--tech-email', '--tech-password', '--tech-name', 'technologist');
await addStaff('--signer-email', '--signer-password', '--signer-name', 'signatory');
console.log('DONE');
