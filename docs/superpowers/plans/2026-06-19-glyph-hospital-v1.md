# Glyph Hospital v1 (demo-grade) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`). This module is a near-clone of **Lens v1** (`docs/superpowers/plans/2026-06-18-glyph-lens-v1.md`) — where a step says "mirror the Lens equivalent," read that file/route and replicate the pattern with the stated deltas. Full code is given for the genuinely new parts.

**Goal:** A hospital staffer creates a discharge record for a patient and a signatory signs it → a `DischargeSummary` Verifiable Credential issued under the hospital's institutional DID (subject = patient DID), publicly verifiable. Demo-grade; discharge flow only.

**Architecture:** Additive on the shipped owner/scope foundation. `hospital` is already a valid `org_type` (no org migration). Reuses the Lens spine: org owner + memberships staff-auth (generalized to be org-type-aware) + `createOwnedPatient` + `issueCredential` (issuer = org DID) + single-scope RLS + `/api/verify`. **No LLM step** → fully local-verifiable. New: migration 013 (`discharge_records`), `/hospital/*` surface, the `discharge_summary` sign route.

**Tech Stack:** Supabase Postgres (migration + RLS), `@kham/schemas-clinical` (`dischargeSummaryData`, already reserved), `lib/identity` issuance, Next 14 App Router, Vitest.

## Global Constraints

- **Chamber + Lens untouched and provably so.** No change to doctor auth/`/doctor`/clinic RLS/migrations ≤ 012. The shared `staff-logic` change must keep `/center` (Lens) working — gate: `smoke-lens` Section A + the centre unit tests stay green, and `smoke-path` 19/19.
- **R1/R2:** the DischargeSummary anchors to the patient DID (R1); the hospital is an owner (`org_type='hospital'`), not a clinic (R2). Issuer = the hospital org's DID.
- **Demo-grade:** discharge flow only. Admission-read/break-glass/referral/follow-up/wallet-surfacing/R1-persons are reserved (see spec) — do NOT build them.
- **Single-scope + freeze invariants** mirror `lab_orders` (migration 012): member RLS, freeze-on-credential.
- No new deps; `@/` imports; `"use client"` on client components; demo UI strings may be English (i18n deferred, per the existing pattern).

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/glyph/src/lib/services/staff-logic.ts` | **Modify:** `shapeStaffSession` → picks the first non-clinic owner membership (any org_type ≠ clinic), returns its `orgType`; add `requireOrgType(staff, orgType)` predicate. |
| `apps/glyph/src/lib/services/staff-logic.test.ts` | **Modify:** centre still shapes; hospital now shapes; clinic-only → null; `requireOrgType` gates. |
| `supabase/migrations/013_discharge_records.sql` | **Create:** `discharge_records` workflow table + member RLS + freeze trigger. |
| `scripts/smoke-hospital.mjs` | **Create:** Section A (schema/CHECK/freeze) + Section B (E2E over the live Next routes). |
| `scripts/create-org.mjs` | **Create:** generalized owner onboarding (`--type hospital|diagnostic_centre`); `create-center.mjs` keeps working. |
| `apps/glyph/src/lib/services/hospital-logic.ts` (+`.test.ts`) | **Create:** pure `buildDischargeRecordRow`, `buildDischargeSummaryData`. |
| `apps/glyph/src/app/hospital/{login,layout,page}.tsx` + `discharge/new/page.tsx` + `discharge/[id]/page.tsx` | **Create:** the `/hospital` surface (mirror `/center`). |
| `apps/glyph/src/app/api/hospital/discharges/route.ts` + `[id]/route.ts` + `[id]/sign/route.ts` | **Create:** create / save / sign (mirror the Lens order routes). |
| `apps/glyph/src/lib/supabase/types.ts` | **Regenerate** after migration 013. |
| `CLAUDE.md` | **Modify:** migration 013, `/hospital`, `discharge_records`, create-org.mjs. |

---

### Task 1: Generalize the staff-auth (org-type-aware)

**Files:** Modify `apps/glyph/src/lib/services/staff-logic.ts` + `.test.ts`.

**Interfaces:**
- Produces: `shapeStaffSession(rows)` now returns a session for the first membership whose org is a **non-clinic owner** (org_type ≠ `clinic`), carrying that `orgType`; `requireOrgType(staff: StaffSession | null, orgType: string): boolean`.

- [ ] **Step 1: Update the tests (write first)**

In `staff-logic.test.ts`, the `shapeStaffSession` block: keep the existing centre case; add a **hospital** case (a membership with `organizations.org_type==='hospital'` shapes a session with `orgType:'hospital'`); keep "clinic-only membership → null" (clinic is not an owner-staff surface); keep "prefers the owner membership when a clinic one co-exists". Add a `requireOrgType` block:
```ts
import { requireOrgType } from './staff-logic';
describe('requireOrgType', () => {
  const s = { userId:'u', orgId:'o', orgName:'H', orgType:'hospital', role:'signatory' } as const;
  it('passes when orgType matches', () => expect(requireOrgType(s, 'hospital')).toBe(true));
  it('fails on mismatch', () => expect(requireOrgType(s, 'diagnostic_centre')).toBe(false));
  it('fails on null session', () => expect(requireOrgType(null, 'hospital')).toBe(false));
});
```
Run `npm run test --workspace glyph-web -- staff-logic` → the hospital + requireOrgType cases FAIL.

- [ ] **Step 2: Generalize `shapeStaffSession` + add `requireOrgType`**

Replace the `diagnostic_centre`-specific `.find` with a non-clinic-owner pick, and add the predicate:
```ts
const OWNER_ORG_TYPES = ['diagnostic_centre', 'hospital', 'employer', 'recruiter', 'kham_holding'] as const;

/** Picks the first non-clinic owner membership and shapes its session. */
export function shapeStaffSession(rows: MembershipRow[] | null | undefined): StaffSession | null {
  if (!Array.isArray(rows)) return null;
  const owner = rows.find(
    (r) => r.organizations && r.organizations.org_type !== 'clinic'
      && (OWNER_ORG_TYPES as readonly string[]).includes(r.organizations.org_type),
  );
  if (!owner || !owner.organizations) return null;
  return {
    userId: owner.user_id,
    orgId: owner.organizations.id,
    orgName: owner.organizations.name,
    orgType: owner.organizations.org_type,
    role: owner.role as StaffRole,
  };
}

/** True iff the session belongs to an org of the given type (per-surface gate). */
export function requireOrgType(staff: StaffSession | null, orgType: string): boolean {
  return Boolean(staff && staff.orgType === orgType);
}
```
Update the file header comment (centre is one owner type; the session is org-type-agnostic, each surface enforces its own type). Run the test → PASS. Run `npm run test --workspace glyph-web -- staff-logic lens-logic` (lens unaffected). Type-check.

- [ ] **Step 3: Commit** — `feat(hospital): generalize staff-auth to any non-clinic owner (org-type-aware) + requireOrgType`

---

### Task 2: Migration 013 — `discharge_records` + smoke Section A

**Files:** Create `supabase/migrations/013_discharge_records.sql`, `scripts/smoke-hospital.mjs` (Section A).

- [ ] **Step 1: Write the migration** (mirror `012_lab_orders.sql`'s structure — member RLS + freeze trigger):
```sql
-- ============================================================
-- GLYPH — Hospital v1: discharge-records workflow (migration 013)
-- Additive, owner-org-scoped (org_type='hospital'). The hospital analogue of
-- lab_orders (012): mutable workflow; the canonical record is the DischargeSummary
-- credential. Chamber/Lens untouched.
-- ============================================================
CREATE TABLE discharge_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_org_id UUID NOT NULL REFERENCES organizations(id),   -- the hospital
  patient_id UUID NOT NULL REFERENCES patients(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','signed','revoked')),
  admission_date DATE,
  discharge_date DATE,
  discharge_diagnosis JSONB,          -- [{text,icd10}]
  discharge_medications JSONB,        -- [{name,frequency,...}]
  procedures JSONB,                   -- string[]
  hospital_course TEXT,
  follow_up_instructions JSONB,       -- string[]
  discharge_condition TEXT,           -- recovered/improved/referred/lama/...
  created_by UUID REFERENCES auth.users(id),
  signatory_user_id UUID REFERENCES auth.users(id),
  signed_at TIMESTAMPTZ,
  credential_id UUID REFERENCES credentials(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_discharge_records_org_status ON discharge_records(owner_org_id, status);
CREATE INDEX idx_discharge_records_patient ON discharge_records(patient_id);

CREATE OR REPLACE FUNCTION discharge_records_frozen()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.credential_id IS NOT NULL AND (
       NEW.discharge_diagnosis   IS DISTINCT FROM OLD.discharge_diagnosis
    OR NEW.discharge_medications IS DISTINCT FROM OLD.discharge_medications
    OR NEW.credential_id         IS DISTINCT FROM OLD.credential_id
  ) THEN
    RAISE EXCEPTION 'discharge record is credentialed and frozen: amend by issuing a new credential';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_discharge_records_frozen
  BEFORE UPDATE ON discharge_records
  FOR EACH ROW EXECUTE FUNCTION discharge_records_frozen();

ALTER TABLE discharge_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "discharge_records_member_all" ON discharge_records FOR ALL
  USING (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()))
  WITH CHECK (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()));
```

- [ ] **Step 2: Write smoke-hospital.mjs Section A** — mirror `scripts/smoke-lens.mjs` Section A exactly, substituting `discharge_records` for `lab_orders` (insert defaults status=draft; status CHECK rejects unknown; freeze-on-credential borrows a credential row if present, else skips). Same arg signature `<APP_URL> <SUPABASE_URL> <ANON> <SERVICE>`, same Section B marker line.

- [ ] **Step 3: Apply + verify** — `supabase db reset` (001–013 clean), `node scripts/smoke-hospital.mjs http://localhost:3000 <API_URL> <ANON> <SERVICE>` → Section A PASS. (Windows: if Kong 502s post-reset, `docker restart supabase_kong_glyph`.)

- [ ] **Step 4: Commit** — `feat(hospital): discharge_records workflow table + member RLS + freeze (migration 013)`

---

### Task 3: Onboarding (generalize) + `/hospital` layout + login + dashboard

**Files:** Create `scripts/create-org.mjs`; create `apps/glyph/src/app/hospital/{login/page.tsx,layout.tsx,page.tsx}`. Regenerate `types.ts` first.

- [ ] **Step 1: Regenerate types** — `supabase gen types typescript --local > apps/glyph/src/lib/supabase/types.ts` (preserve the hand-written compatibility tail, as in Lens Task 2; confirm `discharge_records` present + `npm run type-check` clean).

- [ ] **Step 2: `scripts/create-org.mjs`** — copy `scripts/create-center.mjs`, parameterize the org_type via `--type` (validate ∈ {hospital, diagnostic_centre}; refuse `clinic`). Keep `create-center.mjs` unchanged (still works for centres). Verify by seeding a hospital locally: `node scripts/create-org.mjs <API_URL> <SERVICE> --type hospital --name "Dev District Hospital" --signer-email signer@hosp.dev --signer-password hosp-dev-2026 --signer-name "Dr. Signer" --staff-email staff@hosp.dev --staff-password hosp-dev-2026 --staff-name "Ward Staff"` (use the centre script's flag names; map "tech" role → a hospital "staff"/"doctor" role as appropriate).

- [ ] **Step 3: `/hospital` layout + login + dashboard** — mirror `apps/glyph/src/app/center/{layout,login,page}.tsx` exactly, with deltas: (a) the layout's guard additionally enforces `requireOrgType(staff,'hospital')` — if not a hospital member, render a "not a hospital member" state / redirect to `/hospital/login` (reuse the `usePathname()==='/hospital/login'` exemption pattern from `/center/layout.tsx`); (b) login routes to `/hospital`; (c) the dashboard reads `discharge_records` (not `lab_orders`) with `patients(name)`, links to `/hospital/discharge/[id]`, and a "New discharge" button → `/hospital/discharge/new`. Reuse `useStaffStore`/`StaffGuard` unchanged.

- [ ] **Step 4: Type-check + commit** — `feat(hospital): create-org onboarding + /hospital layout/login/dashboard`

---

### Task 4: hospital-logic builders + create-discharge route + new-discharge page

**Files:** Create `lib/services/hospital-logic.ts` (+`.test.ts`); `app/api/hospital/discharges/route.ts`; `app/hospital/discharge/new/page.tsx`.

**Interfaces:**
- Produces: `buildDischargeRecordRow({ ownerOrgId, patientId, createdBy, admissionDate?, dischargeDate? })`; `buildDischargeSummaryData({ orgDid, orgName, dischargeDate, dischargeDiagnosis, dischargeMedications?, procedures?, hospitalCourse?, followUpInstructions?, dischargeCondition?, admissionDate? })` → a `dischargeSummaryData`-valid payload.

- [ ] **Step 1: Tests first** (`hospital-logic.test.ts`):
```ts
import { describe, it, expect } from 'vitest';
import { buildDischargeRecordRow, buildDischargeSummaryData } from './hospital-logic';
import { validateClinicalCredential } from '@kham/schemas-clinical';

describe('buildDischargeRecordRow', () => {
  it('builds a draft row owned by the hospital', () => {
    expect(buildDischargeRecordRow({ ownerOrgId:'h1', patientId:'p1', createdBy:'u1' }))
      .toEqual({ owner_org_id:'h1', patient_id:'p1', created_by:'u1', status:'draft', admission_date:null, discharge_date:null });
  });
});
describe('buildDischargeSummaryData', () => {
  it('produces a payload that validates as a DischargeSummary credential', () => {
    const data = buildDischargeSummaryData({
      orgDid:'did:web:example:organization-h1', orgName:'Dev District Hospital',
      admissionDate:'2026-06-10', dischargeDate:'2026-06-14',
      dischargeDiagnosis:[{ text:'Dengue fever', icd10:'A90' }],
      dischargeMedications:[{ name:'Napa', frequency:'1+1+1' }],
      dischargeCondition:'recovered',
    });
    expect(() => validateClinicalCredential('discharge_summary', data)).not.toThrow();
    expect(data.hospital.did).toBe('did:web:example:organization-h1');
    expect(data.encounterDate).toBe('2026-06-14');
  });
  it('throws when there is no discharge diagnosis (schema min 1)', () => {
    expect(() => buildDischargeSummaryData({ orgDid:'d', orgName:'H', dischargeDate:'2026-06-14', dischargeDiagnosis:[] })).toThrow();
  });
});
```

- [ ] **Step 2: Implement `hospital-logic.ts`** (pure, no Supabase):
```ts
/** @fileoverview Pure builders for the Hospital discharge flow. Mirrors lens-logic. */
import type { DischargeSummaryData } from '@kham/schemas-clinical';

export interface BuildDischargeRecordInput { ownerOrgId: string; patientId: string; createdBy: string; admissionDate?: string | null; dischargeDate?: string | null; }
export function buildDischargeRecordRow(i: BuildDischargeRecordInput) {
  return { owner_org_id: i.ownerOrgId, patient_id: i.patientId, created_by: i.createdBy, status: 'draft' as const, admission_date: i.admissionDate ?? null, discharge_date: i.dischargeDate ?? null };
}

export interface BuildDischargeSummaryInput {
  orgDid: string; orgName: string; dischargeDate: string; admissionDate?: string;
  dischargeDiagnosis: Array<{ text: string; icd10?: string }>;
  dischargeMedications?: Array<Record<string, unknown>>;
  procedures?: string[]; hospitalCourse?: string; followUpInstructions?: string[]; dischargeCondition?: string;
}
export function buildDischargeSummaryData(i: BuildDischargeSummaryInput): DischargeSummaryData {
  if (!i.dischargeDiagnosis?.length) throw new Error('DischargeSummary requires at least one diagnosis');
  return {
    encounterDate: i.dischargeDate, locale: 'bn',
    hospital: { did: i.orgDid, name: i.orgName },
    admissionDate: i.admissionDate ?? i.dischargeDate,
    dischargeDate: i.dischargeDate,
    dischargeDiagnosis: i.dischargeDiagnosis,
    ...(i.dischargeMedications?.length ? { dischargeMedications: i.dischargeMedications } : {}),
    ...(i.procedures?.length ? { proceduresPerformed: i.procedures } : {}),
    ...(i.hospitalCourse ? { hospitalCourse: i.hospitalCourse } : {}),
    ...(i.followUpInstructions?.length ? { followUpInstructions: i.followUpInstructions } : {}),
    ...(i.dischargeCondition ? { dischargeCondition: i.dischargeCondition as DischargeSummaryData['dischargeCondition'] } : {}),
  } as DischargeSummaryData;
}
```
(Note: `dischargeSummaryData` requires `admissionDate`/`dischargeDate` `min(4)` + `dischargeDiagnosis.min(1)` — see the schema. Confirm the field names against `packages/schemas-clinical/src/discharge-summary.ts`.)

- [ ] **Step 3: Create-discharge route** — `app/api/hospital/discharges/route.ts`: mirror `app/api/center/orders/route.ts` exactly, with deltas: gate `requireOrgType(staff,'hospital')` (403 otherwise); insert via `buildDischargeRecordRow` into `discharge_records`; patient find-or-create via `createOwnedPatient` (same as Lens); response `{ dischargeId, patientId }`.

- [ ] **Step 4: New-discharge page** — `app/hospital/discharge/new/page.tsx`: mirror `app/center/orders/new/page.tsx` (patient name/phone/age/gender + admission/discharge dates instead of test-category); POST `/api/hospital/discharges`; redirect to `/hospital/discharge/[id]`.

- [ ] **Step 5: test + type-check + commit** — `feat(hospital): discharge builders + create route + new-discharge page`

---

### Task 5: Save-summary route + discharge-detail page

**Files:** Create `app/api/hospital/discharges/[id]/route.ts`; `app/hospital/discharge/[id]/page.tsx`.

- [ ] **Step 1: Save route** — mirror `app/api/center/orders/[id]/results/route.ts`: staff auth + `requireOrgType(staff,'hospital')` + scope to `staff.orgId` + 409 if `credential_id` set; save the summary fields (`discharge_diagnosis`, `discharge_medications`, `procedures`, `hospital_course`, `follow_up_instructions`, `discharge_condition`, `admission_date`, `discharge_date`) onto the `discharge_records` row.

- [ ] **Step 2: Detail page** — mirror `app/center/orders/[id]/page.tsx` (the manual-entry version): a form for the discharge summary fields (diagnoses rows, meds rows, follow-up list, condition select, dates), a Save button, and a Sign panel placeholder (Task 6 fills sign). Load the record via the staff client.

- [ ] **Step 3: type-check + commit** — `feat(hospital): save-summary route + discharge-detail page`

---

### Task 6: Sign route → DischargeSummary credential

**Files:** Create `app/api/hospital/discharges/[id]/sign/route.ts`; add the sign action to the detail page.

- [ ] **Step 1: Sign route** — mirror `app/api/center/orders/[id]/sign/route.ts` exactly, deltas: `requireOrgType(staff,'hospital')` + `canSign(staff.role)`; resolve `orgIdentity = ensureEntityIdentity(admin,'organization',staff.orgId)` + patient identity; build the payload via `buildDischargeSummaryData({ orgDid: orgIdentity.did, orgName: staff.orgName, ...the record's summary fields })`; `issueCredential(admin, { issuer:{kind:'organization',id:staff.orgId,name:staff.orgName}, subjectDid: patientIdentity.did, type:'discharge_summary', data })`; one-shot 409 if `credential_id` set; update `discharge_records` → status `signed` + `signatory_user_id` + `signed_at` + `credential_id`. **No projection** (wallet surfacing deferred — unlike Lens, do NOT call rebuildProjections for a discharge; there's no discharge projection table). Response `{ dischargeSummaryVcId, patientDid, orgDid }`.

- [ ] **Step 2: Sign panel** — add to the detail page (mirror the Lens sign panel): a Sign button (once summary entered) → POST `/sign` → show "✓ Signed · DischargeSummary issued" + the vcId.

- [ ] **Step 3: type-check + commit** — `feat(hospital): sign → DischargeSummary credential (issuer=hospital DID)`

---

### Task 7: smoke-hospital Section B (E2E) + docs + regression gates

**Files:** Modify `scripts/smoke-hospital.mjs` (Section B); `CLAUDE.md`.

- [ ] **Step 1: Section B** — mirror `smoke-lens.mjs` Section B, adapted (NO normalize step — Hospital has no LLM): seed two hospital orgs + a staff(non-signer) + a signatory each (via service-role); as staff create a discharge (`POST /api/hospital/discharges`) → save summary (`POST /[id]`) → non-signer sign → **403** → signatory sign → **DischargeSummary VC**; assert the credential exists + `discharge_records.status='signed'`; `POST /api/verify` with the vcId → `data.valid` + `data.acceptable`; cross-hospital RLS isolation (hospital B can't read hospital A's discharge); full cleanup (delete discharge_records, patients, memberships, orgs, auth users — credentials are append-only, like Lens, so a test credential persists locally only). **This E2E needs only `npm run dev` + local Supabase (no `functions serve` — Hospital has no edge fn).**

- [ ] **Step 2: Run the full local suite** — `supabase db reset`; with `npm run dev` running: `node scripts/smoke-hospital.mjs http://localhost:3000 <API_URL> <ANON> <SERVICE>` → ALL CHECKS PASSED. Then regression: `node scripts/smoke-lens.mjs ...` Section A + `npm run test` (staff-logic/lens-logic/hospital-logic + packages) + `npm run type-check` + `npm run lint` → all green. (smoke-path/smoke-lens-full = ship-time vs prod.)

- [ ] **Step 3: CLAUDE.md** — migration 013 (`discharge_records`); §3 `/hospital/*` routes + `api/hospital/discharges/*` + `hospital-logic` + `create-org.mjs`; §5 `discharge_records` table row; note the staff-auth is now org-type-generalized (centre + hospital).

- [ ] **Step 4: Commit** — `docs(hospital): record Hospital v1 (migration 013, /hospital, discharge_records) in CLAUDE.md`

---

## Self-Review

**Spec coverage:** discharge flow (Tasks 4–6), hospital owner + generalized staff-auth (Tasks 1,3), DischargeSummary VC under hospital DID (Task 6), free verify + RLS isolation (Task 7). Admission-read/break-glass/referral/follow-up/wallet-surfacing/R1 reserved (not built). ✅

**Placeholder scan:** new parts (staff-auth generalization, migration 013, hospital-logic builders, sign deltas) have complete code; "mirror Lens X" steps name the exact file to replicate + the deltas (the Lens code exists and is the proven pattern). ✅

**Type consistency:** `shapeStaffSession`/`requireOrgType`/`StaffSession.orgType` (Task 1) consumed by every `/hospital` route + layout; `buildDischargeRecordRow`/`buildDischargeSummaryData` (Task 4) consumed by the create + sign routes; `issueCredential(...type:'discharge_summary'...)` matches the registry key; `discharge_records` columns match across migration/smoke/routes. ✅

**Chamber/Lens-safety:** the only shared-code change is `shapeStaffSession` (generalized, centre path preserved + unit-tested + smoke-lens-gated); everything else is net-new files. ✅
