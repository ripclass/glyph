# Glyph Continuity v1 (demo-grade) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Near-exact clone of **Apa v1** (`docs/superpowers/plans/2026-06-19-glyph-apa-v1.md`) / Hospital v1 / Lens v1. "Mirror Apa X" = read that file/route and replicate with the deltas. Full code only for the new bits.

**Goal:** A recruiter/medical-centre physician records a fitness-for-work clearance for a migrant worker → a signatory signs → a `MedicalClearance` VC under the recruiter org's DID (subject = worker patient DID), publicly verifiable. Demo-grade.

**Design (clone — decided):** Glyph Continuity = the migrant-worker interface (feature-05; recruiter/cross-border scope). Reuses the owner foundation + org-type-general staff-auth (`recruiter` is already an owner type — NO staff-logic change) + `createOwnedPatient` + `issueCredential` (issuer = org DID) + `/api/verify`. New: migration 015 (`clearance_records`), `/continuity/*` surface, the `medical_clearance` sign route. **R1 note (demo discipline):** the record anchors to the worker's patient DID; cross-border portable identity (one-human→one-DID) is DEFERRED (the audit's R1 build) — demo anchors to DID only.

## Global Constraints
- **Chamber/Lens/Hospital/Apa untouched.** Only shared files touched: `scripts/create-org.mjs` (+`recruiter` to ALLOWED_TYPES, enterer role=doctor) + `types.ts` regen (migration 015) + `CLAUDE.md`. No change to `staff-logic.ts` (recruiter already an owner), `/center`, `/hospital`, `/apa`, `/doctor`, clinic RLS, or migrations ≤ 014.
- R1/R2: MedicalClearance anchors to worker patient DID; recruiter is an owner (`org_type='recruiter'`); issuer = recruiter org DID.
- Demo-grade: clearance→sign→credential only (remote consult, cross-border record ingest, employer-hiding, R1 persons — reserved).
- Single-scope + freeze invariants mirror `occupational_assessments` (member RLS, freeze guarding all clinical fields).
- No new deps; `@/` imports; `"use client"`; demo UI strings may be English. **types.ts regen: use `2>/dev/null` and pipe to UTF-8 (avoid the BOM) + preserve the hand-written tail.**

## File Structure
| File | Responsibility |
|---|---|
| `supabase/migrations/015_clearance_records.sql` | **Create:** `clearance_records` workflow table + member RLS + freeze (clone of `occupational_assessments`). |
| `scripts/smoke-continuity.mjs` | **Create:** Section A + Section B (E2E over Next routes, no LLM). |
| `scripts/create-org.mjs` | **Modify:** add `recruiter` to `ALLOWED_TYPES` (enterer role=doctor). |
| `apps/glyph/src/lib/services/continuity-logic.ts` (+`.test.ts`) | **Create:** `buildClearanceRow`, `buildMedicalClearanceData`. |
| `apps/glyph/src/app/continuity/{login,layout,page}.tsx` + `clearance/new/page.tsx` + `clearance/[id]/page.tsx` | **Create:** the `/continuity` surface (mirror `/apa`). |
| `apps/glyph/src/app/api/continuity/clearances/route.ts` + `[id]/route.ts` + `[id]/sign/route.ts` | **Create:** create / save / sign (mirror the Apa assessment routes). |
| `apps/glyph/src/lib/supabase/types.ts` | **Regenerate** after migration 015. |
| `CLAUDE.md` | **Modify:** migration 015, `/continuity`, `clearance_records`, create-org recruiter. |

---

### Task 1: Migration 015 + create-org recruiter + smoke Section A
**Files:** Create `supabase/migrations/015_clearance_records.sql`, `scripts/smoke-continuity.mjs` (Section A); Modify `scripts/create-org.mjs`.

- [ ] **Step 1: Migration** — clone `supabase/migrations/014_occupational_assessments.sql` → table `clearance_records`, trigger `clearance_records_frozen`, policy `clearance_records_member_all`. Columns:
```sql
CREATE TABLE clearance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_org_id UUID NOT NULL REFERENCES organizations(id),   -- the recruiter/medical centre
  patient_id UUID NOT NULL REFERENCES patients(id),          -- the migrant worker
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','signed','revoked')),
  purpose TEXT,                         -- overseas_employment/pre_employment/periodic/general
  fitness_status TEXT,                  -- fit/fit_with_restrictions/temporarily_unfit/unfit
  restrictions JSONB,                   -- string[]
  findings JSONB,                       -- [{testName,value,unit,referenceRange,isAbnormal,severity}]
  destination_country TEXT,
  valid_until DATE,
  created_by UUID REFERENCES auth.users(id),
  signatory_user_id UUID REFERENCES auth.users(id),
  signed_at TIMESTAMPTZ,
  credential_id UUID REFERENCES credentials(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_clearance_records_org_status ON clearance_records(owner_org_id, status);
CREATE INDEX idx_clearance_records_patient ON clearance_records(patient_id);
```
Freeze trigger guards `purpose, fitness_status, restrictions, findings, destination_country, valid_until, credential_id` under `OLD.credential_id IS NOT NULL`. Member RLS identical to the `occupational_assessments` policy.

- [ ] **Step 2: create-org.mjs** — add `'recruiter'` to `ALLOWED_TYPES` (now `['hospital','diagnostic_centre','employer','recruiter']`); recruiter enterer role = `doctor`. Keep other types unchanged.
- [ ] **Step 3: smoke-continuity.mjs Section A** — clone `scripts/smoke-apa.mjs` Section A for `clearance_records`. Leave the Section B marker (single `if (!appUrl)` stub — no dead else branch).
- [ ] **Step 4: Apply + verify** — `supabase db reset` (001–015 clean; Kong-502 → `docker restart supabase_kong_glyph`), `node scripts/smoke-continuity.mjs http://localhost:3000 <API_URL> <ANON> <SERVICE>` Section A PASS. Seed a recruiter: `node scripts/create-org.mjs <API_URL> <SERVICE> --type recruiter --name "GAMCA Medical Centre" ...`.
- [ ] **Step 5: Commit** — `feat(continuity): clearance_records table (migration 015) + create-org recruiter + smoke A`

---

### Task 2: continuity-logic builders + /continuity shell
**Files:** Create `lib/services/continuity-logic.ts` (+`.test.ts`); regen `types.ts`; create `app/continuity/{login,layout,page}.tsx`.

- [ ] **Step 1: Regen types** — `supabase gen types typescript --local 2>/dev/null | Out-File -Encoding utf8 apps/glyph/src/lib/supabase/types.ts` (or equivalent; AVOID a BOM; preserve the hand-written tail). Confirm `clearance_records` present + `npm run type-check` clean.
- [ ] **Step 2: continuity-logic tests first** (`continuity-logic.test.ts`):
```ts
import { describe, it, expect } from 'vitest';
import { buildClearanceRow, buildMedicalClearanceData } from './continuity-logic';
import { validateClinicalCredential } from '@kham/schemas-clinical';

describe('buildClearanceRow', () => {
  it('builds a draft row owned by the recruiter', () => {
    expect(buildClearanceRow({ ownerOrgId:'r1', patientId:'w1', createdBy:'u1' }))
      .toEqual({ owner_org_id:'r1', patient_id:'w1', created_by:'u1', status:'draft' });
  });
});
describe('buildMedicalClearanceData', () => {
  it('validates as a medical_clearance credential', () => {
    const data = buildMedicalClearanceData({
      orgDid:'did:web:example:organization-r1', orgName:'GAMCA Medical Centre',
      encounterDate:'2026-06-19', purpose:'overseas_employment', fitnessStatus:'fit',
      destinationCountry:'UAE',
    });
    expect(() => validateClinicalCredential('medical_clearance', data)).not.toThrow();
    expect(data.assessingFacility.did).toBe('did:web:example:organization-r1');
  });
  it('throws on missing purpose or fitnessStatus', () => {
    expect(() => buildMedicalClearanceData({ orgDid:'d', orgName:'R', encounterDate:'2026-06-19' } as never)).toThrow();
  });
});
```
- [ ] **Step 3: continuity-logic.ts** (pure):
```ts
/** @fileoverview Pure builders for Glyph Continuity (migrant medical clearance). Mirrors apa-logic. */
import type { MedicalClearanceData } from '@kham/schemas-clinical';

export interface BuildClearanceRowInput { ownerOrgId: string; patientId: string; createdBy: string; }
export function buildClearanceRow(i: BuildClearanceRowInput) {
  return { owner_org_id: i.ownerOrgId, patient_id: i.patientId, created_by: i.createdBy, status: 'draft' as const };
}

export interface BuildMedicalClearanceInput {
  orgDid: string; orgName: string; encounterDate: string;
  purpose: MedicalClearanceData['purpose'];
  fitnessStatus: MedicalClearanceData['fitnessStatus'];
  restrictions?: string[]; findings?: Array<Record<string, unknown>>;
  destinationCountry?: string; validUntil?: string;
}
export function buildMedicalClearanceData(i: BuildMedicalClearanceInput): MedicalClearanceData {
  if (!i.purpose || !i.fitnessStatus) throw new Error('MedicalClearance requires purpose and fitnessStatus');
  return {
    encounterDate: i.encounterDate, locale: 'bn',
    assessingFacility: { did: i.orgDid, name: i.orgName },
    purpose: i.purpose, fitnessStatus: i.fitnessStatus,
    ...(i.restrictions?.length ? { restrictions: i.restrictions } : {}),
    ...(i.findings?.length ? { findings: i.findings } : {}),
    ...(i.destinationCountry ? { destinationCountry: i.destinationCountry } : {}),
    ...(i.validUntil ? { validUntil: i.validUntil } : {}),
  } as MedicalClearanceData;
}
```
(Confirm field names against `packages/schemas-clinical/src/medical-clearance.ts`.)
- [ ] **Step 4: /continuity shell** — mirror `app/apa/{layout,login,page}.tsx`, deltas: `requireOrgType(staff,'recruiter')`; login→`/continuity`; login-exempt path `/continuity/login`; dashboard reads `clearance_records`, rows → `/continuity/clearance/[id]`, "New clearance" → `/continuity/clearance/new`. Inline guard (4th — leave the TODO note; still acceptable).
- [ ] **Step 5: test + type-check + commit** — `feat(continuity): continuity-logic builders + /continuity shell`

---

### Task 3: create + save routes + new/detail pages
- [ ] **Step 1: create route** `app/api/continuity/clearances/route.ts` — mirror `app/api/apa/assessments/route.ts` (incl. the `req.json()` try/catch→400 guard), deltas: `requireOrgType(staff,'recruiter')`; `buildClearanceRow` into `clearance_records`; response `{ clearanceId, patientId }`.
- [ ] **Step 2: save route** `app/api/continuity/clearances/[id]/route.ts` — mirror the Apa save route; persist `purpose, fitness_status, restrictions, findings, destination_country, valid_until`; 409 if `credential_id`; `canEnterResults` gate; malformed→400. (Use a typed `Partial` update — NO `as never`.)
- [ ] **Step 3: new page** `app/continuity/clearance/new/page.tsx` — mirror the Apa new page (worker name/phone/age/gender + purpose select).
- [ ] **Step 4: detail page** `app/continuity/clearance/[id]/page.tsx` — mirror the Apa detail page: purpose select, fitness_status select, restrictions list, findings rows, destination_country input, valid_until date; Save; Sign-panel placeholder. Sign-panel visibility gates on `record?.purpose || purpose` (saved value).
- [ ] **Step 5: type-check + commit** — `feat(continuity): create + save routes + new/detail pages`

---

### Task 4: sign route → MedicalClearance credential
- [ ] **Step 1: sign route** `app/api/continuity/clearances/[id]/sign/route.ts` — mirror `app/api/apa/assessments/[id]/sign/route.ts` EXACTLY, deltas: `requireOrgType(staff,'recruiter')` + `canSign`; `buildMedicalClearanceData({orgDid:orgIdentity.did, orgName:staff.orgName, encounterDate:new Date().toISOString().slice(0,10), purpose:record.purpose, fitnessStatus:record.fitness_status, restrictions:record.restrictions, findings:record.findings, destinationCountry:record.destination_country, validUntil:record.valid_until})`; require `purpose` AND `fitness_status` set (400 else); `issueCredential({issuer:{kind:'organization',id:staff.orgId,name:staff.orgName}, subjectDid:patientIdentity.did, type:'medical_clearance', data})`; one-shot 409; NO projection; update status='signed'+signatory_user_id+signed_at+credential_id (typed update, NO `as never`); response `{ medicalClearanceVcId, patientDid, orgDid }`.
- [ ] **Step 2: sign panel** — add to the detail page (mirror Apa), gated on purpose+fitness_status set; show vcId once signed.
- [ ] **Step 3: type-check + commit** — `feat(continuity): sign → MedicalClearance credential (issuer=recruiter DID)`

---

### Task 5: smoke-continuity Section B (E2E) + docs + regression gates
- [ ] **Step 1: Section B** — clone `scripts/smoke-apa.mjs` Section B (NO LLM): seed 2 recruiter orgs + a `doctor` (enterer) + a `signatory` each; create clearance → save (purpose 'overseas_employment', fitness 'fit', destination 'UAE') → doctor CANNOT sign 403 → signatory signs → MedicalClearance VC → status='signed'+credential_id → `/api/verify` data.valid+acceptable → cross-recruiter RLS isolation → cleanup. Replace the whole Section A stub-marker (no dead else).
- [ ] **Step 2: run gates** — `supabase db reset`; with `npm run dev`: `node scripts/smoke-continuity.mjs http://localhost:<port> <API_URL> <ANON> <SERVICE>` (controller runs the full E2E — implementer builds Section B + runs: db reset, smoke-continuity A, smoke-apa A + smoke-hospital A + smoke-lens A regression, `npm run test`, type-check, lint). Note the dev-server port (stale server may push to 3001).
- [ ] **Step 3: CLAUDE.md** — migration 015 (`clearance_records`), §3 `/continuity/*` + `api/continuity/clearances/*` + `continuity-logic` + smoke-continuity, §5 `clearance_records` row, create-org recruiter.
- [ ] **Step 4: Commit** — `docs(continuity): record Continuity v1 (migration 015, /continuity, clearance_records) in CLAUDE.md`

---

## Self-Review
- Coverage: recruiter owner + (already-general) staff-auth, clearance_records workflow, MedicalClearance VC under recruiter DID, verify + RLS. Remote-consult / cross-border ingest / R1 persons reserved. ✅
- No-placeholder: new bits complete; "mirror Apa X" names the file + deltas. ✅
- Type consistency: `buildClearanceRow`/`buildMedicalClearanceData` ↔ routes; `issueCredential(type:'medical_clearance')` matches the registry key; `clearance_records` columns match migration/routes/smoke. NO `as never` on insert/update (use typed Partial — addressing the Apa follow-up). ✅
- Chamber/Lens/Hospital/Apa-safe: only create-org.mjs (+recruiter) + types.ts + CLAUDE.md touch existing files; staff-logic unchanged. ✅
