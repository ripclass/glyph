# Owner/Scope Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a general *owner* abstraction (`organizations` + `memberships` + `patients.owner_org_id`) alongside the live clinic-scoped Chamber path, so the first non-clinic owner (a diagnostic centre, for Lens) and provisional/walk-in patients have a home — with **zero change to Chamber's behaviour**.

**Architecture:** Purely additive migration. `clinics` each gain a 1:1 `organizations` satellite (backfilled, `org_type='clinic'`); `memberships` generalize "who may act for an owner" beyond `doctors.clinic_id`; `patients` gain a nullable `owner_org_id` and `clinic_id` relaxes to nullable. New owner-scoped RLS policies sit *beside* the untouched `doctors_own_clinic` policies — PERMISSIVE policies OR together, and cross-leak is impossible because clinic patients have `owner_org_id NULL` while owner-scoped patients have `clinic_id NULL`. The DID stays the record anchor (R1); the org becomes a new DID-bearing principal via the existing generic `ensureEntityIdentity` (R2: clinic is one owner *type*).

**Tech Stack:** Supabase Postgres (migration SQL + RLS), `@supabase/supabase-js` (smoke), TypeScript identity layer (`lib/identity`, `lib/services`), Vitest.

**Foundation rules this obeys** (`docs/superpowers/specs/2026-06-17-glyph-foundation-audit.md`):
- **R1 — anchor to the DID, never `patient_id`.** Owner-scoped patients mint a per-row DID exactly like Chamber patients; the owner is only a scope.
- **R2 — owner is an abstraction; clinic is one instance.** `organizations.org_type` carries the taxonomy; `clinic` is backfilled as the first type.

**Standing gate:** NO prod deploy in this plan. It ends at local-green + docs. Deploy happens only on the founder's explicit "ship it."

**Out of scope (reserved/deferred, do NOT build here):**
- Credential-type *shapes* (DischargeSummary, MedicalClearance, OccupationalHealth, AntenatalRecord, SpecialistOpinion) — separate small `@kham/schemas-clinical` plan.
- R1 build (`persons` table + reconciliation + doctor-side ingest) — lands with Bridge/Continuity.
- Migrating Chamber patients off `clinic_id` onto `owner_org_id` — deferred, additive, managed later.
- The Lens surface itself (center onboarding route, order/result entry, normalize, sign→LabResult, delivery) — the **next** plan, `2026-06-17-glyph-lens-v1.md`, built on this foundation.
- Wiring `scripts/create-doctor.mjs` to also write a `memberships` row — Chamber doesn't need it; revisit when a clinic becomes an owner.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/011_owner_scope.sql` | **Create:** the entire additive schema — `organizations`, `memberships`, `clinics.organization_id` + backfill, `patients.owner_org_id` + `clinic_id` relax, `kham_holding` seed, indexes, new RLS. |
| `scripts/smoke-owner-scope.mjs` | **Create:** live-DB proof — schema/backfill/singleton (Section A) + nullable `clinic_id`, `owner_org_id`, two-way RLS isolation (Section B). |
| `apps/glyph/src/lib/identity/config.ts` | **Modify:** extend `EntityKind` + `ENTITY_TABLE` with `organization` → `organizations`, so org DIDs mint through the existing generic seam. |
| `apps/glyph/src/lib/identity/config.test.ts` | **Create:** unit-test the `organization` wiring. |
| `apps/glyph/src/lib/identity/ensure-identity.ts` | **Modify:** doc-only — note organizations are now a supported principal. |
| `apps/glyph/src/lib/services/organizations-logic.ts` | **Create:** pure row-shaping for an org-owned patient (`owner_org_id` set, `clinic_id` NULL) + the holding-org name constant. |
| `apps/glyph/src/lib/services/organizations-logic.test.ts` | **Create:** unit tests for the pure builder. |
| `apps/glyph/src/lib/services/organizations.ts` | **Create:** orchestration — `ensureKhamHoldingOrg`, `createOwnedPatient` (insert + mint DID). |
| `apps/glyph/src/lib/supabase/types.ts` | **Regenerate** after the migration so app code sees the new tables/columns. |

---

### Task 1: Migration 011 — `organizations` + `memberships` tables, clinic backfill, holding org

**Files:**
- Create: `supabase/migrations/011_owner_scope.sql`
- Create: `scripts/smoke-owner-scope.mjs`

- [ ] **Step 1: Write the failing smoke (Section A)**

Create `scripts/smoke-owner-scope.mjs`:

```js
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
```

- [ ] **Step 2: Run the smoke to verify it fails**

```bash
supabase status -o env   # copy API_URL, ANON_KEY, SERVICE_ROLE_KEY
node scripts/smoke-owner-scope.mjs <API_URL> <ANON_KEY> <SERVICE_ROLE_KEY>
```
Expected: FAIL — the very first query errors (`relation "organizations" does not exist` / `column clinics.organization_id does not exist`).

- [ ] **Step 3: Write the migration (tables + backfill + holding + RLS)**

Create `supabase/migrations/011_owner_scope.sql`:

```sql
-- ============================================================
-- GLYPH — Owner/Scope Foundation (migration 011)
-- Foundation audit Decision #2: "clinic is ONE owner type."
--
-- ADDITIVE + Chamber-safe: every existing clinic_id column, policy and index
-- is left byte-for-byte unchanged. New owner surfaces ride ALONGSIDE the live
-- clinic path. R1 (anchor to DID) + R2 (owner is an abstraction).
-- See docs/superpowers/specs/2026-06-17-glyph-foundation-audit.md
-- ============================================================

-- ---------- ORGANIZATIONS: the general owner ----------
-- clinic is one org_type; diagnostic_centre/hospital/employer/recruiter are the
-- incoming owner types; kham_holding owns provisional/unaffiliated patients.
-- Same DID/key columns the other principals carry (migration 002); minted
-- lazily app-side via ensureEntityIdentity.
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_type TEXT NOT NULL CHECK (org_type IN (
    'clinic', 'diagnostic_centre', 'hospital', 'employer', 'recruiter', 'kham_holding'
  )),
  district TEXT,
  phone TEXT,
  did TEXT UNIQUE,
  public_key_jwk JSONB,
  encrypted_private_key TEXT,
  key_nonce TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- MEMBERSHIPS: who may act for an owner ----------
-- Generalizes the scalar doctors.clinic_id: a user (auth.users) belongs to an
-- organization in a role. This is what lets NON-doctor centre/hospital staff
-- log in and act for their owner.
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  role TEXT NOT NULL CHECK (role IN (
    'owner', 'admin', 'doctor', 'technologist', 'signatory', 'staff'
  )),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

-- ---------- A clinic is a 1:1 satellite of its organization ----------
ALTER TABLE clinics ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Backfill: one clinic-type org per existing clinic, then link the clinic to it.
DO $$
DECLARE c RECORD; new_org_id UUID;
BEGIN
  FOR c IN SELECT id, name, district, phone, created_at FROM clinics LOOP
    INSERT INTO organizations (name, org_type, district, phone, created_at)
    VALUES (c.name, 'clinic', c.district, c.phone, c.created_at)
    RETURNING id INTO new_org_id;
    UPDATE clinics SET organization_id = new_org_id WHERE id = c.id;
  END LOOP;
END $$;

-- ---------- The provisional-holding singleton ----------
-- Exactly one kham_holding org (the front-door / walk-in owner of last resort).
CREATE UNIQUE INDEX uq_one_kham_holding ON organizations(org_type)
  WHERE org_type = 'kham_holding';
INSERT INTO organizations (name, org_type)
  VALUES ('KhaM Holding (Provisional Patients)', 'kham_holding');

-- ---------- INDEXES ----------
CREATE INDEX idx_organizations_type ON organizations(org_type);
CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_org ON memberships(organization_id);

-- ---------- RLS (new tables only — Chamber's policies untouched) ----------
-- Writes go through the service-role onboarding/issuance seam (bypasses RLS),
-- same pattern as the credential issuance seam.
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Members see their own organization(s).
CREATE POLICY "org_member_read" ON organizations FOR SELECT USING (
  id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid())
);

-- A user sees their own membership rows.
CREATE POLICY "membership_self_read" ON memberships FOR SELECT USING (
  user_id = auth.uid()
);
```

- [ ] **Step 4: Apply + run the smoke to verify Section A passes**

```bash
supabase db reset
node scripts/smoke-owner-scope.mjs <API_URL> <ANON_KEY> <SERVICE_ROLE_KEY>
```
Expected: every Section A line prints `PASS`; final line `ALL CHECKS PASSED`. (`supabase db reset` must apply migrations 001–011 + seed cleanly with no error.)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/011_owner_scope.sql scripts/smoke-owner-scope.mjs
git commit -m "feat(foundation): organizations + memberships, clinic backfill, holding org (migration 011)"
```

---

### Task 2: Migration 011 — `patients.owner_org_id`, relax `clinic_id`, owner RLS, types regen

**Files:**
- Modify: `supabase/migrations/011_owner_scope.sql` (append patients section)
- Modify: `scripts/smoke-owner-scope.mjs` (insert Section B before the summary)
- Regenerate: `apps/glyph/src/lib/supabase/types.ts`

- [ ] **Step 1: Write the failing smoke (Section B)**

In `scripts/smoke-owner-scope.mjs`, replace the line:

```js
// ===== Section B added in Task 2 (before this summary) =====
```

with this block:

```js
// ===== Section B: owner_org_id, nullable clinic_id, RLS isolation =====
const SEED_CLINIC_ID = 'c0000000-0000-0000-0000-000000000001'; // from seed.sql
const { data: seedClinic } = await db
  .from('clinics')
  .select('organization_id')
  .eq('id', SEED_CLINIC_ID)
  .single();
const clinicOrgId = seedClinic.organization_id;

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

// --- cleanup ---
await db.from('patients').delete().in('id', [clinicPatient.id, centerPatient.id]);
await db.from('memberships').delete().in('user_id', [docUser.user.id, staffUser.user.id]);
await db.from('doctors').delete().eq('id', docUser.user.id);
await db.from('organizations').delete().eq('id', centerOrg.id);
await db.auth.admin.deleteUser(docUser.user.id);
await db.auth.admin.deleteUser(staffUser.user.id);
console.log('\ncleanup done');
```

- [ ] **Step 2: Run the smoke to verify Section B fails**

```bash
node scripts/smoke-owner-scope.mjs <API_URL> <ANON_KEY> <SERVICE_ROLE_KEY>
```
Expected: FAIL — `patient inserts with owner_org_id and NULL clinic_id` errors (`column patients.owner_org_id does not exist`, and `clinic_id` is still NOT NULL).

- [ ] **Step 3: Append the patients section to the migration**

At the END of `supabase/migrations/011_owner_scope.sql`, append:

```sql
-- ---------- PATIENTS: generalize ownership ----------
-- owner_org_id = the new owner pointer (any org_type). clinic_id relaxes to
-- nullable so a centre/provisional patient needs no clinic. Existing Chamber
-- patients keep clinic_id with a NULL owner_org_id — their RLS is untouched.
ALTER TABLE patients ADD COLUMN owner_org_id UUID REFERENCES organizations(id);
ALTER TABLE patients ALTER COLUMN clinic_id DROP NOT NULL;
CREATE INDEX idx_patients_owner_org ON patients(owner_org_id);

-- Backfill a membership for every existing doctor → their clinic's org. Lets a
-- clinic become an owner later with no retrofit; dormant for Chamber today
-- (Chamber reads via clinic_id, not memberships).
DO $$
DECLARE d RECORD; org UUID;
BEGIN
  FOR d IN SELECT id, clinic_id FROM doctors WHERE clinic_id IS NOT NULL LOOP
    SELECT organization_id INTO org FROM clinics WHERE id = d.clinic_id;
    IF org IS NOT NULL THEN
      INSERT INTO memberships (user_id, organization_id, role)
      VALUES (d.id, org, 'doctor')
      ON CONFLICT (user_id, organization_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- New owner-scoped access to patients, ALONGSIDE the untouched clinic policy.
-- PERMISSIVE policies OR together: a clinic doctor still reaches clinic patients
-- via "doctors_own_clinic"; org members reach owner_org patients here. No leak:
-- clinic patients have owner_org_id NULL, owner-scoped patients have clinic_id NULL.
CREATE POLICY "patients_owner_org" ON patients FOR ALL
  USING (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()))
  WITH CHECK (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()));
```

- [ ] **Step 4: Apply + run the full smoke**

```bash
supabase db reset
node scripts/smoke-owner-scope.mjs <API_URL> <ANON_KEY> <SERVICE_ROLE_KEY>
```
Expected: `ALL CHECKS PASSED` (Sections A + B), `cleanup done`.

- [ ] **Step 5: Regenerate the Supabase types**

```bash
supabase gen types typescript --local > apps/glyph/src/lib/supabase/types.ts
```
Expected: `types.ts` now contains `organizations`, `memberships`, `patients.owner_org_id`, and `patients.clinic_id` as nullable. Confirm:

```bash
grep -n "organizations:" apps/glyph/src/lib/supabase/types.ts | head -1
grep -n "owner_org_id" apps/glyph/src/lib/supabase/types.ts | head -1
```
Expected: both grep lines return a match.

- [ ] **Step 6: Verify Chamber is unbroken (regression gate, must stay green)**

```bash
node scripts/smoke-path.mjs <API_URL> <ANON_KEY> <SERVICE_ROLE_KEY>
```
Expected: `19/19` (the register→intake→summary→note→credential path). If anything regresses here, STOP — the additive promise is broken.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/011_owner_scope.sql scripts/smoke-owner-scope.mjs apps/glyph/src/lib/supabase/types.ts
git commit -m "feat(foundation): patients.owner_org_id + nullable clinic_id + owner RLS; regen types"
```

---

### Task 3: Identity config — register `organization` as a DID-bearing principal

**Files:**
- Create: `apps/glyph/src/lib/identity/config.test.ts`
- Modify: `apps/glyph/src/lib/identity/config.ts`
- Modify: `apps/glyph/src/lib/identity/ensure-identity.ts` (doc only)

- [ ] **Step 1: Write the failing test**

Create `apps/glyph/src/lib/identity/config.test.ts`:

```ts
/**
 * @fileoverview Unit tests for the identity-config entity-kind map. Guards the
 * org wiring so an organization DID mints through the same generic
 * ensureEntityIdentity seam as patients/doctors/clinics (R2).
 */

import { describe, it, expect } from 'vitest';
import { ENTITY_TABLE, entitySlug } from './config';

describe('identity config — entity kinds', () => {
  it('maps organization to the organizations table', () => {
    expect(ENTITY_TABLE.organization).toBe('organizations');
  });

  it('keeps the existing principal tables unchanged', () => {
    expect(ENTITY_TABLE.patient).toBe('patients');
    expect(ENTITY_TABLE.doctor).toBe('doctors');
    expect(ENTITY_TABLE.clinic).toBe('clinics');
  });

  it('slugs an organization DID as organization-<id>', () => {
    expect(entitySlug('organization', 'abc-123')).toBe('organization-abc-123');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace glyph-web -- config.test`
Expected: FAIL — `ENTITY_TABLE.organization` is `undefined`, so `expect(undefined).toBe('organizations')` fails.

- [ ] **Step 3: Extend the config**

In `apps/glyph/src/lib/identity/config.ts`, replace the `EntityKind` type and `ENTITY_TABLE` const (lines 10–18):

```ts
/** Entity kinds that hold DIDs (maps 1:1 to principal tables) */
export type EntityKind = 'patient' | 'doctor' | 'clinic' | 'organization';

/** Principal table per entity kind */
export const ENTITY_TABLE = {
  patient: 'patients',
  doctor: 'doctors',
  clinic: 'clinics',
  organization: 'organizations',
} as const satisfies Record<EntityKind, string>;
```

- [ ] **Step 4: Note organizations in the ensure-identity docs**

In `apps/glyph/src/lib/identity/ensure-identity.ts`, update the file header (line 2) and the `@param kind` line (line 39):

- Line 2: change
  `* @fileoverview DID provisioning for principals (patients/doctors/clinics).`
  to
  `* @fileoverview DID provisioning for principals (patients/doctors/clinics/organizations).`
- Line 39 (`@param kind - patient | doctor | clinic`): change to
  `* @param kind - patient | doctor | clinic | organization`

(No logic change — `ensureEntityIdentity` is already generic over `ENTITY_TABLE`/`EntityKind`; the `organizations` table has the four identity columns it reads/writes.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test --workspace glyph-web -- config.test`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/glyph/src/lib/identity/config.ts apps/glyph/src/lib/identity/config.test.ts apps/glyph/src/lib/identity/ensure-identity.ts
git commit -m "feat(identity): register organization as a DID-bearing principal"
```

---

### Task 4: Owner/provisional patient service

**Files:**
- Create: `apps/glyph/src/lib/services/organizations-logic.ts`
- Create: `apps/glyph/src/lib/services/organizations-logic.test.ts`
- Create: `apps/glyph/src/lib/services/organizations.ts`

- [ ] **Step 1: Write the failing test (pure builder)**

Create `apps/glyph/src/lib/services/organizations-logic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildOwnedPatientRow, KHAM_HOLDING_ORG_NAME } from './organizations-logic';

describe('buildOwnedPatientRow', () => {
  it('sets owner_org_id and forces clinic_id NULL (R2: owner is not a clinic)', () => {
    const row = buildOwnedPatientRow({ ownerOrgId: 'org-1', name: 'Walk-in' });
    expect(row.owner_org_id).toBe('org-1');
    expect(row.clinic_id).toBeNull();
  });

  it('normalizes the name and defaults optional fields to null', () => {
    const row = buildOwnedPatientRow({ ownerOrgId: 'org-1', name: '  রহিম   উদ্দিন ' });
    expect(row.name).toBe('রহিম উদ্দিন');
    expect(row.phone).toBeNull();
    expect(row.age).toBeNull();
    expect(row.gender).toBeNull();
  });

  it('passes through provided optional fields', () => {
    const row = buildOwnedPatientRow({
      ownerOrgId: 'o',
      name: 'X',
      phone: '01711999888',
      age: 40,
      gender: 'female',
    });
    expect(row.phone).toBe('01711999888');
    expect(row.age).toBe(40);
    expect(row.gender).toBe('female');
  });

  it('rejects an empty / whitespace-only name', () => {
    expect(() => buildOwnedPatientRow({ ownerOrgId: 'o', name: '   ' })).toThrow();
  });

  it('exposes the seeded holding-org name (matches migration 011)', () => {
    expect(KHAM_HOLDING_ORG_NAME).toBe('KhaM Holding (Provisional Patients)');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace glyph-web -- organizations-logic`
Expected: FAIL — module `./organizations-logic` not found.

- [ ] **Step 3: Write the pure builder**

Create `apps/glyph/src/lib/services/organizations-logic.ts`:

```ts
/**
 * @fileoverview Pure row-shaping for organization-owned (non-clinic) patients.
 * No Supabase/network — keep it unit-testable. Orchestration lives in
 * organizations.ts.
 *
 * R2: a patient's owner is an abstraction (an organization), not necessarily a
 * clinic. An owner-scoped patient carries owner_org_id and a NULL clinic_id —
 * the inverse of a Chamber patient (clinic_id set, owner_org_id NULL). The DID
 * minted on the row stays the record anchor (R1).
 *
 * @module lib/services/organizations-logic
 */

/** Well-known name of the singleton provisional-holding org (seeded in migration 011). */
export const KHAM_HOLDING_ORG_NAME = 'KhaM Holding (Provisional Patients)';

/** What a caller provides to create an org-owned patient. */
export interface OwnedPatientInput {
  ownerOrgId: string;
  name: string;
  phone?: string | null;
  age?: number | null;
  gender?: 'male' | 'female' | 'other' | null;
}

/** The patients-row shape for an org-owned patient: owner set, clinic NULL. */
export interface OwnedPatientRow {
  owner_org_id: string;
  clinic_id: null;
  name: string;
  phone: string | null;
  age: number | null;
  gender: 'male' | 'female' | 'other' | null;
}

/**
 * Builds the patients-row payload for an org-owned patient. Mirrors
 * registration-logic's name normalization (trim + collapse whitespace).
 *
 * @throws {Error} when the name is empty after normalization
 */
export function buildOwnedPatientRow(input: OwnedPatientInput): OwnedPatientRow {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (!name) throw new Error('Patient name is required');
  return {
    owner_org_id: input.ownerOrgId,
    clinic_id: null,
    name,
    phone: input.phone ?? null,
    age: input.age ?? null,
    gender: input.gender ?? null,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --workspace glyph-web -- organizations-logic`
Expected: PASS (5 tests).

- [ ] **Step 5: Write the orchestration service**

Create `apps/glyph/src/lib/services/organizations.ts`:

```ts
/**
 * @fileoverview Owner/scope orchestration: resolve the provisional-holding org
 * and mint org-owned (non-clinic) patients. Server-only (service-role client +
 * encrypted keys). Pure row-shaping is in organizations-logic.ts.
 *
 * The DID minted here is the portable record anchor (R1); the owner is only a
 * scope (R2). End-to-end coverage lands with the Lens centre-onboarding route;
 * the schema acceptance is proven by scripts/smoke-owner-scope.mjs and the row
 * shape by organizations-logic.test.ts.
 *
 * @module lib/services/organizations
 */

import type { AdminClient } from '@/lib/supabase/admin';
import { ensureEntityIdentity } from '@/lib/identity/ensure-identity';
import {
  buildOwnedPatientRow,
  KHAM_HOLDING_ORG_NAME,
  type OwnedPatientInput,
} from './organizations-logic';

/**
 * Returns the singleton provisional-holding org id (seeded in migration 011).
 * The insert is a defensive fallback only — the partial unique index guarantees
 * a single winner under concurrency.
 */
export async function ensureKhamHoldingOrg(admin: AdminClient): Promise<string> {
  const { data: existing } = await admin
    .from('organizations')
    .select('id')
    .eq('org_type', 'kham_holding')
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await admin
    .from('organizations')
    .insert({ name: KHAM_HOLDING_ORG_NAME, org_type: 'kham_holding' })
    .select('id')
    .single();
  if (data?.id) return data.id;

  // Lost the race against the partial-unique index — read the winner.
  const { data: winner } = await admin
    .from('organizations')
    .select('id')
    .eq('org_type', 'kham_holding')
    .single();
  if (winner?.id) return winner.id;
  throw new Error(`ensureKhamHoldingOrg failed: ${error?.message ?? 'no holding org'}`);
}

/**
 * Creates an organization-owned patient (clinic_id NULL) and mints its DID.
 * Used for diagnostic-centre walk-ins (ownerOrgId = the centre) and the Pocket
 * front-door (ownerOrgId = the holding org).
 *
 * @returns the new patient id and its minted DID (the record anchor — R1)
 */
export async function createOwnedPatient(
  admin: AdminClient,
  input: OwnedPatientInput
): Promise<{ id: string; did: string }> {
  const row = buildOwnedPatientRow(input);
  const { data, error } = await admin
    .from('patients')
    .insert(row)
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`createOwnedPatient failed: ${error?.message ?? 'no row'}`);
  }
  const identity = await ensureEntityIdentity(admin, 'patient', data.id);
  return { id: data.id, did: identity.did };
}
```

- [ ] **Step 6: Type-check the new app code**

Run: `npm run type-check --workspace glyph-web`
Expected: PASS — `admin.from('organizations')`, the `owner_org_id` insert, and `clinic_id: null` all type-check against the regenerated `types.ts` from Task 2.

- [ ] **Step 7: Commit**

```bash
git add apps/glyph/src/lib/services/organizations-logic.ts apps/glyph/src/lib/services/organizations-logic.test.ts apps/glyph/src/lib/services/organizations.ts
git commit -m "feat(foundation): owner/provisional patient service (ensureKhamHoldingOrg, createOwnedPatient)"
```

---

### Task 5: Full regression gate + docs

**Files:**
- Modify: `CLAUDE.md` (migrations list, tables summary, lib inventory)
- Modify: `C:\Users\User\.claude\projects\J--KhaM-Health-Glyph\memory\lens-foundation-build.md`

- [ ] **Step 1: Clean apply from scratch**

```bash
supabase db reset
```
Expected: migrations 001–011 + seed apply with no error.

- [ ] **Step 2: Run the full local verification suite**

```bash
node scripts/smoke-owner-scope.mjs <API_URL> <ANON_KEY> <SERVICE_ROLE_KEY>   # ALL CHECKS PASSED
node scripts/smoke-path.mjs        <API_URL> <ANON_KEY> <SERVICE_ROLE_KEY>   # 19/19 (Chamber unbroken)
node scripts/smoke-credentials.mjs <API_URL> <SERVICE_ROLE_KEY>             # identity layer intact (LOCAL ONLY)
npm run type-check                                                          # all workspaces clean
npm run lint                                                                # glyph-web clean
npm run test                                                                # packages (7+11) + app (incl. config/organizations-logic)
```
Expected: every command green. The two gates that prove the additive promise: **smoke-path 19/19** (Chamber) and **smoke-credentials** (identity). If either regresses, STOP and fix before proceeding.

- [ ] **Step 3: Update CLAUDE.md**

Make three edits in `CLAUDE.md`:

1. In the `supabase/migrations/` block (§3), after the `010_prescription_safety.sql` line, add:
```
        │   └── 011_owner_scope.sql      # organizations + memberships + clinics.organization_id (backfilled), patients.owner_org_id + clinic_id RELAXED to nullable, kham_holding provisional-owner singleton; NEW owner-scoped RLS ALONGSIDE the untouched clinic RLS. The audit's R2 "clinic is one owner type" foundation (Lens is first consumer). Chamber path byte-for-byte unchanged.
```

2. In the §5 Tables table, add two rows after `waitlist_signups`:
```
| `organizations` | `id`, `name`, `org_type` (clinic/diagnostic_centre/hospital/employer/recruiter/kham_holding), DID/key cols | Migration 011. The general owner (R2). Each clinic has a 1:1 backfilled org. RLS: members read their own org. |
| `memberships` | `user_id → auth.users`, `organization_id → organizations`, `role` | Migration 011. Who may act for an owner (generalizes `doctors.clinic_id`). UNIQUE(user_id, org). RLS: self-read. |
```
Also append to the `patients` row note: ` Migration 011 added nullable owner_org_id (org-scoped patients) and relaxed clinic_id to nullable; existing clinic patients keep clinic_id with owner_org_id NULL.`

3. In §3 under `lib/services/`, add `organizations(+logic+test)` to the list, and under `lib/identity/` note `config(+test)`.

- [ ] **Step 4: Update the active-thread memory**

In `C:\Users\User\.claude\projects\J--KhaM-Health-Glyph\memory\lens-foundation-build.md`, update the **Status / next** paragraph to record: migration 011 + identity-config + owner/provisional service shipped to **local**, verified (smoke-owner-scope green, smoke-path 19/19, smoke-credentials intact, type-check/lint/tests green); awaiting founder **"ship it"** before prod deploy; next is the **Lens v1 plan** (`docs/superpowers/plans/2026-06-17-glyph-lens-v1.md`).

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(foundation): record migration 011 owner/scope foundation in CLAUDE.md"
```

(Memory file lives outside the repo — no git add needed.)

- [ ] **Step 6: Report status + hold at the ship-it gate**

Summarize for the founder: what shipped to local, the green verification evidence, and that **no prod deploy happened** (standing gate). Offer the Lens v1 plan as the next step, and the prod deploy (migration 011 → `supabase db push` + types) only on explicit "ship it."

---

## Self-Review

**Spec coverage (against the foundation audit Decision #2 + lens-spec "two foundation builds"):**
- ✅ `organizations` + `org_type` owner abstraction (R2) — Task 1.
- ✅ `diagnostic_centre` as the first non-clinic owner type — Task 1 (CHECK list) + Task 2 smoke.
- ✅ Provisional/unaffiliated patient scope (`kham_holding` singleton + `createOwnedPatient`) — Tasks 1, 4.
- ✅ R1 discipline (anchor to DID, never patient_id) — `createOwnedPatient` mints a per-row DID; org DIDs mint via the generic seam — Tasks 3, 4.
- ✅ Chamber untouched + provable — clinic RLS/columns unchanged; smoke-path 19/19 gate — Tasks 2, 5.
- ✅ Non-doctor staff can act for an owner (`memberships`) — Task 1 + Task 2 RLS isolation.

**Placeholder scan:** no TBD/TODO/"add error handling"/"similar to" — every SQL block, test, and source file is complete. ✅

**Type consistency:** `EntityKind`/`ENTITY_TABLE` add `organization`→`organizations` (Task 3) and `ensureEntityIdentity(admin,'organization',id)` resolves through it; `OwnedPatientInput`/`OwnedPatientRow`/`buildOwnedPatientRow`/`KHAM_HOLDING_ORG_NAME` are defined in `organizations-logic.ts` (Task 4 Step 3) and consumed identically in `organizations.ts` (Step 5) and the test (Step 1). Migration column names (`organization_id`, `owner_org_id`, `org_type`, `role`) match the smoke and the services. ✅

**Deferred-but-reserved confirmed out of scope:** credential shapes, R1 persons/reconciliation, Chamber `owner_org_id` migration, the Lens surface, `create-doctor.mjs` membership wiring — all listed, none built. ✅
