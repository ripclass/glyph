/**
 * Doctor onboarding — creates a real doctor account (auth user + doctors
 * row + clinic) on ANY stack, including production. The pilot has no
 * self-serve signup by design: BMDC verification doesn't exist yet, so
 * accounts are created deliberately by the operator, one at a time.
 *
 * Safety rails:
 *   - refuses an email that already has an auth user (no silent overwrite)
 *   - refuses a phone already used by another doctor (unique column)
 *   - password must be ≥ 12 chars (this is a real clinical account)
 *   - if the doctors-row insert fails AFTER the auth user was created,
 *     the auth user is deleted again — no orphaned logins
 *   - never prints the password back
 *
 * Usage:
 *   node scripts/create-doctor.mjs <SUPABASE_URL> <SERVICE_KEY> \
 *     --email dr@clinic.bd --password "..." --name "Dr. Ayesha Rahman" \
 *     --phone 01711XXXXXX --clinic "Rahman Clinic" \
 *     [--name-bn "ডা. আয়েশা রহমান"] [--clinic-id <uuid>] [--district Dhaka] \
 *     [--bmdc A-12345] [--speciality Medicine]
 *
 * Clinic resolution: --clinic-id wins; else --clinic is matched by exact
 * name within the stack and created (with --district) when absent. One of
 * the two is required — a doctor without a clinic can see nothing (RLS).
 */

import { createClient } from '@supabase/supabase-js';

const [supaUrl, serviceKey, ...rest] = process.argv.slice(2);

function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!args[i]?.startsWith('--') || args[i + 1] === undefined) {
      return null;
    }
    flags[args[i].slice(2)] = args[i + 1];
  }
  return flags;
}

const flags = supaUrl && serviceKey ? parseFlags(rest) : null;

function usage(message) {
  if (message) console.error(`error: ${message}\n`);
  console.error(
    'usage: node scripts/create-doctor.mjs <SUPABASE_URL> <SERVICE_KEY> \\\n' +
      '  --email <email> --password <min 12 chars> --name <name> --phone <01XXXXXXXXX> \\\n' +
      '  (--clinic <name> | --clinic-id <uuid>) [--name-bn <name>] [--district <district>] \\\n' +
      '  [--bmdc <reg no>] [--speciality <speciality>]'
  );
  // No client exists yet — a hard exit is safe here.
  process.exit(2);
}

if (!flags) usage();
const { email, password, name, phone } = flags;
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) usage('a valid --email is required');
if (!password || password.length < 12) usage('--password must be at least 12 characters');
if (!name) usage('--name is required');
if (!phone) usage('--phone is required (doctors.phone is unique and NOT NULL)');
if (!flags.clinic && !flags['clinic-id']) usage('one of --clinic or --clinic-id is required');

/**
 * Past this point, never call process.exit(): the supabase client keeps
 * sockets open and a hard exit races libuv teardown on Windows (crashes
 * with 0xC0000409 instead of the intended code). Set exitCode and return
 * so the event loop drains naturally.
 */
function fail(message) {
  console.error(`error: ${message}`);
  process.exitCode = 1;
}

const admin = createClient(supaUrl, serviceKey, { auth: { persistSession: false } });

async function main() {
  // ── Refuse duplicates up front ─────────────────────────────────────────
  const { data: userList, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) {
    return fail(`cannot list users (wrong service key or URL?): ${listErr.message}`);
  }
  if (userList.users.some((u) => u.email?.toLowerCase() === email.toLowerCase())) {
    return fail(`an account for ${email} already exists — refusing to touch it`);
  }

  const { data: phoneClash } = await admin
    .from('doctors')
    .select('id, name')
    .eq('phone', phone)
    .maybeSingle();
  if (phoneClash) {
    return fail(`phone ${phone} already belongs to doctor "${phoneClash.name}"`);
  }

  // ── Resolve or create the clinic ───────────────────────────────────────
  let clinic;
  if (flags['clinic-id']) {
    const { data, error } = await admin
      .from('clinics')
      .select('id, name')
      .eq('id', flags['clinic-id'])
      .maybeSingle();
    if (error || !data) {
      return fail(`clinic ${flags['clinic-id']} not found`);
    }
    clinic = data;
  } else {
    const { data: existing } = await admin
      .from('clinics')
      .select('id, name')
      .eq('name', flags.clinic)
      .maybeSingle();
    if (existing) {
      clinic = existing;
    } else {
      const { data: created, error } = await admin
        .from('clinics')
        .insert({ name: flags.clinic, district: flags.district ?? null })
        .select('id, name')
        .single();
      if (error || !created) {
        return fail(`failed to create clinic: ${error?.message}`);
      }
      clinic = created;
      console.log(`clinic created: "${clinic.name}" (${clinic.id})`);
    }
  }

  // ── Create the auth user, then the doctors row ─────────────────────────
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr || !created?.user) {
    return fail(`auth user creation failed: ${authErr?.message}`);
  }

  const { error: doctorErr } = await admin.from('doctors').insert({
    id: created.user.id,
    clinic_id: clinic.id,
    name,
    name_bn: flags['name-bn'] ?? null,
    speciality: flags.speciality ?? null,
    bmdc_reg_no: flags.bmdc ?? null,
    phone,
    email,
  });

  if (doctorErr) {
    // No orphaned logins: an auth user without a doctors row could sign in
    // but see nothing — and would block this email forever. Roll it back.
    await admin.auth.admin.deleteUser(created.user.id);
    return fail(`doctors row failed (${doctorErr.message}) — auth user rolled back`);
  }

  console.log(`doctor created: ${name} <${email}>`);
  console.log(`  id:     ${created.user.id}`);
  console.log(`  clinic: "${clinic.name}" (${clinic.id})`);
  console.log(`  phone:  ${phone}${flags.bmdc ? `  BMDC: ${flags.bmdc}` : ''}`);
  console.log('they can sign in at /login now.');
}

await main();
