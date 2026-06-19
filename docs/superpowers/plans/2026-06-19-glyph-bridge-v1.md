# Glyph Bridge v1 (demo-grade) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Clone of **Maa v1** (`docs/superpowers/plans/2026-06-19-glyph-maa-v1.md`) — which also added a new org_type. "Mirror Maa X" = read that file/route and replicate with deltas. Full code for the new bits.

**Goal:** A remote/diaspora specialist records an opinion on a patient (oncology first) → a signatory signs → a `SpecialistOpinion` VC under the specialist panel's org DID (subject = patient DID), publicly verifiable. Demo-grade.

**Design (clone + new org_type — decided):** Glyph Bridge = the cross-border specialist interface (feature-09; specialist-panel scope). Reuses the owner foundation + `createOwnedPatient` + `issueCredential` + `/api/verify`. NEW: `specialist_panel` org_type (migration 017 widens the CHECK; `OWNER_ORG_TYPES += 'specialist_panel'`), `specialist_opinions` table, `/bridge/*` surface, the `specialist_opinion` sign route. **Demo notes:** the **cross-clinic record ingest** (patient presents records from other clinics) is DEFERRED (the R1-dependent front-door §8 feature) — in the demo `presentedRecordRefs` is free-text entry of DIDs/VC-ids the specialist references; the record anchors to the patient DID. The dual-signature remote-radiologist loop is also reserved.

## Global Constraints
- **Chamber/Lens/Hospital/Apa/Continuity/Maa untouched/safe.** Shared files: migration 017 (WIDENS org_type CHECK — add 'specialist_panel', remove nothing), `staff-logic.ts` (`OWNER_ORG_TYPES += 'specialist_panel'`), `create-org.mjs` (+specialist_panel), `types.ts`, `CLAUDE.md`. Regression-gated by all FIVE prior surfaces' Section A smokes + staff-logic tests.
- R1/R2: SpecialistOpinion anchors to patient DID; the panel is an owner (`org_type='specialist_panel'`); issuer = panel org DID.
- Demo-grade: opinion→sign→credential only (cross-clinic ingest, dual-signature loop, specialist-matching — reserved).
- Single-scope + freeze mirror prior tables; typed updates (no `as never` on specialist_opinions ops).
- No new deps; `@/` imports; `"use client"`; demo UI English; types.ts regen `2>/dev/null`, no BOM, preserve tail (incl. re-adding any dropped aliases). SpecialistOpinion has NO enum dropdowns (specialty/opinion are free text) — low enum risk.

## File Structure
| File | Responsibility |
|---|---|
| `supabase/migrations/017_specialist_opinions.sql` | **Create:** widen org_type CHECK (+`specialist_panel`); create `specialist_opinions` table + member RLS + freeze. |
| `scripts/smoke-bridge.mjs` | **Create:** Section A + Section B (E2E over Next routes, no LLM). |
| `apps/glyph/src/lib/services/staff-logic.ts` (+`.test.ts`) | **Modify:** add `'specialist_panel'` to `OWNER_ORG_TYPES` + test. |
| `scripts/create-org.mjs` | **Modify:** add `specialist_panel` to `ALLOWED_TYPES` (enterer role=doctor). |
| `apps/glyph/src/lib/services/bridge-logic.ts` (+`.test.ts`) | **Create:** `buildOpinionRow`, `buildSpecialistOpinionData`. |
| `apps/glyph/src/app/bridge/{login,layout,page}.tsx` + `opinion/new/page.tsx` + `opinion/[id]/page.tsx` | **Create:** the `/bridge` surface (mirror `/maa`). |
| `apps/glyph/src/app/api/bridge/opinions/route.ts` + `[id]/route.ts` + `[id]/sign/route.ts` | **Create:** create / save / sign (mirror the Maa routes). |
| `apps/glyph/src/lib/supabase/types.ts` | **Regenerate** after migration 017. |
| `CLAUDE.md` | **Modify:** migration 017, `/bridge`, `specialist_opinions`, `specialist_panel` org_type, create-org specialist_panel. |

---

### Task 1: Migration 017 (specialist_panel widen + specialist_opinions) + staff-logic + create-org + smoke A
- [ ] **Step 1: Migration** — `supabase/migrations/017_specialist_opinions.sql`:
```sql
-- Widen the owner taxonomy: add 'specialist_panel'. Additive — drop + re-add the CHECK
-- with all prior values plus specialist_panel. No existing value removed.
ALTER TABLE organizations DROP CONSTRAINT organizations_org_type_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_org_type_check
  CHECK (org_type IN ('clinic','diagnostic_centre','hospital','employer','recruiter','kham_holding','program','specialist_panel'));

CREATE TABLE specialist_opinions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_org_id UUID NOT NULL REFERENCES organizations(id),   -- the specialist panel
  patient_id UUID NOT NULL REFERENCES patients(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','signed','revoked')),
  specialty TEXT,
  referral_reason TEXT,
  presented_record_refs JSONB,         -- string[] (DIDs/VC ids the opinion references)
  opinion TEXT,
  recommendations JSONB,               -- string[]
  differential_diagnosis JSONB,        -- [{text,icd10}]
  created_by UUID REFERENCES auth.users(id),
  signatory_user_id UUID REFERENCES auth.users(id),
  signed_at TIMESTAMPTZ,
  credential_id UUID REFERENCES credentials(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_specialist_opinions_org_status ON specialist_opinions(owner_org_id, status);
CREATE INDEX idx_specialist_opinions_patient ON specialist_opinions(patient_id);
```
Freeze trigger `specialist_opinions_frozen` guards `specialty, referral_reason, presented_record_refs, opinion, recommendations, differential_diagnosis, credential_id` under `OLD.credential_id IS NOT NULL`. Member RLS `specialist_opinions_member_all` identical to the prior pattern.

- [ ] **Step 2: staff-logic** — add `'specialist_panel'` to `OWNER_ORG_TYPES` (`staff-logic.ts:27`). Test: a `specialist_panel` membership shapes; prior cases pass. `npm run test --workspace glyph-web -- staff-logic` green.
- [ ] **Step 3: create-org.mjs** — add `'specialist_panel'` to `ALLOWED_TYPES`; enterer role = `doctor`.
- [ ] **Step 4: smoke-bridge.mjs Section A** — clone `scripts/smoke-maa.mjs` Section A for `specialist_opinions`. Clean single-`if` Section B marker.
- [ ] **Step 5: Apply + verify** — `supabase db reset` (001–017 clean; Kong-502 → `docker restart supabase_kong_glyph`); `node scripts/smoke-bridge.mjs http://localhost:3000 <API_URL> <ANON> <SERVICE>` Section A PASS. Seed a panel: `node scripts/create-org.mjs <API_URL> <SERVICE> --type specialist_panel --name "Diaspora Oncology Panel" ...`. Confirm existing org_types still insert (seed clinic intact).
- [ ] **Step 6: Commit** — `feat(bridge): specialist_panel org_type + specialist_opinions (migration 017) + staff-logic + create-org + smoke A`

---

### Task 2: bridge-logic builders + /bridge shell
- [ ] **Step 1: Regen types** — `supabase gen types typescript --local 2>/dev/null > apps/glyph/src/lib/supabase/types.ts`; strip BOM; preserve the tail AND re-add the `PrescriptionSource`/`LabReportSource`/`VisitStatus` aliases if the regen drops them. Confirm `specialist_opinions` present + `npm run type-check` clean.
- [ ] **Step 2: bridge-logic tests first** (`bridge-logic.test.ts`):
```ts
import { describe, it, expect } from 'vitest';
import { buildOpinionRow, buildSpecialistOpinionData } from './bridge-logic';
import { validateClinicalCredential } from '@kham/schemas-clinical';

describe('buildOpinionRow', () => {
  it('builds a draft row owned by the panel', () => {
    expect(buildOpinionRow({ ownerOrgId:'sp1', patientId:'p1', createdBy:'u1' }))
      .toEqual({ owner_org_id:'sp1', patient_id:'p1', created_by:'u1', status:'draft' });
  });
});
describe('buildSpecialistOpinionData', () => {
  it('validates as a specialist_opinion credential', () => {
    const data = buildSpecialistOpinionData({
      orgDid:'did:web:example:organization-sp1', orgName:'Diaspora Oncology Panel',
      encounterDate:'2026-06-19', specialty:'Oncology',
      opinion:'Findings consistent with early-stage disease; biopsy advised.',
      recommendations:['Core-needle biopsy'],
    });
    expect(() => validateClinicalCredential('specialist_opinion', data)).not.toThrow();
    expect(data.specialist.did).toBe('did:web:example:organization-sp1');
  });
  it('throws on missing specialty or opinion', () => {
    expect(() => buildSpecialistOpinionData({ orgDid:'d', orgName:'P', encounterDate:'2026-06-19' } as never)).toThrow();
  });
});
```
- [ ] **Step 3: bridge-logic.ts** (pure):
```ts
/** @fileoverview Pure builders for Glyph Bridge (specialist opinions). Mirrors maa-logic. */
import type { SpecialistOpinionData } from '@kham/schemas-clinical';

export interface BuildOpinionRowInput { ownerOrgId: string; patientId: string; createdBy: string; }
export function buildOpinionRow(i: BuildOpinionRowInput) {
  return { owner_org_id: i.ownerOrgId, patient_id: i.patientId, created_by: i.createdBy, status: 'draft' as const };
}

export interface BuildSpecialistOpinionInput {
  orgDid: string; orgName: string; encounterDate: string;
  specialty: string; opinion: string;
  referralReason?: string; presentedRecordRefs?: string[];
  recommendations?: string[]; differentialDiagnosis?: Array<{ text: string; icd10?: string }>;
}
export function buildSpecialistOpinionData(i: BuildSpecialistOpinionInput): SpecialistOpinionData {
  if (!i.specialty || !i.opinion) throw new Error('SpecialistOpinion requires specialty and opinion');
  return {
    encounterDate: i.encounterDate, locale: 'bn',
    specialist: { did: i.orgDid, name: i.orgName },
    specialty: i.specialty, opinion: i.opinion,
    ...(i.referralReason ? { referralReason: i.referralReason } : {}),
    ...(i.presentedRecordRefs?.length ? { presentedRecordRefs: i.presentedRecordRefs } : {}),
    ...(i.recommendations?.length ? { recommendations: i.recommendations } : {}),
    ...(i.differentialDiagnosis?.length ? { differentialDiagnosis: i.differentialDiagnosis } : {}),
  } as SpecialistOpinionData;
}
```
(Confirm against `packages/schemas-clinical/src/specialist-opinion.ts`.)
- [ ] **Step 4: /bridge shell** — mirror `app/maa/{layout,login,page}.tsx`, deltas: `requireOrgType(staff,'specialist_panel')`; login→`/bridge`; login-exempt `/bridge/login`; dashboard reads `specialist_opinions`, rows → `/bridge/opinion/[id]`, "New opinion" → `/bridge/opinion/new`. Inline guard.
- [ ] **Step 5: test + type-check + commit** — `feat(bridge): bridge-logic builders + /bridge shell`

---

### Task 3: create + save routes + new/detail pages
- [ ] **Step 1: create route** `app/api/bridge/opinions/route.ts` — mirror `app/api/maa/visits/route.ts` (incl. body try/catch→400), deltas: `requireOrgType(staff,'specialist_panel')`; `buildOpinionRow` into `specialist_opinions`; response `{ opinionId, patientId }`.
- [ ] **Step 2: save route** `app/api/bridge/opinions/[id]/route.ts` — mirror the Maa save; persist `specialty`, `referral_reason`, `presented_record_refs` (jsonb string[]), `opinion`, `recommendations` (jsonb string[]), `differential_diagnosis` (jsonb [{text,icd10}]); 409 if `credential_id`; `canEnterResults`; malformed→400; TYPED update (no `as never`).
- [ ] **Step 3: new page** `app/bridge/opinion/new/page.tsx` — mirror the Maa new page (patient name/phone/age + specialty text input).
- [ ] **Step 4: detail page** `app/bridge/opinion/[id]/page.tsx` — mirror the Maa detail page: specialty text, referral_reason text, presented_record_refs list, opinion textarea, recommendations list, differential_diagnosis rows (text+icd10); Save; Sign-panel placeholder (gated on `record?.specialty && record?.opinion` once loaded).
- [ ] **Step 5: type-check + commit** — `feat(bridge): create + save routes + new/detail pages`

---

### Task 4: sign route → SpecialistOpinion credential
- [ ] **Step 1: sign route** `app/api/bridge/opinions/[id]/sign/route.ts` — mirror `app/api/maa/visits/[id]/sign/route.ts`, deltas: `requireOrgType(staff,'specialist_panel')` + `canSign`; `buildSpecialistOpinionData({orgDid:orgIdentity.did, orgName:staff.orgName, encounterDate:new Date().toISOString().slice(0,10), specialty:record.specialty, opinion:record.opinion, referralReason:record.referral_reason, presentedRecordRefs:record.presented_record_refs, recommendations:record.recommendations, differentialDiagnosis:record.differential_diagnosis})`; require `record.specialty` AND `record.opinion` set (400 otherwise); `issueCredential({issuer:{kind:'organization',id:staff.orgId,name:staff.orgName}, subjectDid:patientIdentity.did, type:'specialist_opinion', data})`; one-shot 409; NO projection; typed status update; response `{ specialistOpinionVcId, patientDid, orgDid }`.
- [ ] **Step 2: sign panel** — add to the detail page (mirror Maa), gated on specialty+opinion set; show vcId once signed.
- [ ] **Step 3: type-check + commit** — `feat(bridge): sign → SpecialistOpinion credential (issuer=panel DID)`

---

### Task 5: smoke-bridge Section B (E2E) + docs + regression gates
- [ ] **Step 1: Section B** — clone `scripts/smoke-maa.mjs` Section B (NO LLM): seed 2 specialist_panel orgs + a `doctor` (specialist enterer) + a `signatory` each; create opinion → save (specialty 'Oncology', opinion 'Findings consistent…', recommendations ['Biopsy']) → doctor CANNOT sign 403 → signatory signs → SpecialistOpinion VC → status='signed'+credential_id → `/api/verify` data.valid+acceptable → cross-panel RLS isolation → cleanup. Replace the Section A stub-marker.
- [ ] **Step 2: run gates** — `supabase db reset`; with `npm run dev`: `node scripts/smoke-bridge.mjs http://localhost:<port> <API_URL> <ANON> <SERVICE>` (controller runs the full E2E — implementer builds Section B + runs: db reset, smoke-bridge A, **smoke-maa/continuity/apa/hospital/lens A regression (ALL FIVE — the org_type-widen + OWNER_ORG_TYPES change touched shared surfaces)**, `npm run test`, type-check, lint).
- [ ] **Step 3: CLAUDE.md** — migration 017 (`specialist_opinions` + the `specialist_panel` org_type widen), §3 `/bridge/*` + `api/bridge/opinions/*` + `bridge-logic` + smoke-bridge, §5 `specialist_opinions` row + note specialist_panel added, create-org specialist_panel.
- [ ] **Step 4: Commit** — `docs(bridge): record Bridge v1 (migration 017, /bridge, specialist_opinions, specialist_panel org_type) in CLAUDE.md`

---

## Self-Review
- Coverage: specialist_panel owner + staff-auth, specialist_opinions workflow, SpecialistOpinion VC under panel DID, verify + RLS. Cross-clinic ingest / dual-sign loop / matching reserved. ✅
- No-placeholder: new bits (migration 017 incl. CHECK widen, bridge-logic, staff-logic delta) complete; "mirror Maa X" names files + deltas. ✅
- Type consistency: `buildOpinionRow`/`buildSpecialistOpinionData` ↔ routes; `issueCredential(type:'specialist_opinion')` matches the registry key; `specialist_opinions` columns match migration/routes/smoke; typed updates. ✅
- Safety: CHECK widen additive (regression-gated by all 5 prior surfaces' Section A + staff-logic test); `staff-logic` additive. ✅
