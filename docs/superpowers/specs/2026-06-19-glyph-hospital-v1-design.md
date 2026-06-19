# Glyph Hospital v1 (demo-grade) — Discharge-as-a-Credential (design)

**KhaM Health · Glyph · 2026-06-19**

> First module of the post-Lens build-out (build doctrine: **demo-grade**, on the shipped owner/scope foundation). Hospital's product doc defines four credential flows (admission-read, discharge, referral, institutional DID); this v1 builds the **discharge flow** — it mints the now-reserved `DischargeSummary` credential and is a near-structural clone of Lens v1, so it's the thinnest add that proves "the hospital is a connected node, not an island." The other three flows are reserved/deferred. **Demo-grade: a seeded hospital + a discharge surface behind staff auth → a signed DischargeSummary VC → free verification. Chamber untouched.**

## What it is

A hospital staffer logs in (memberships-based, like a Lens centre), creates a discharge record for a patient (admission/discharge dates, diagnoses, discharge meds, follow-up, condition), and a qualified signatory signs → a **DischargeSummary Verifiable Credential** issued under the **hospital's institutional DID** (subject = patient DID), publicly verifiable via `/api/verify`. No AI step (unlike Lens's normalize) — so the whole flow is data-entry → sign → credential.

## Why this is safe + thin (the foundation paying off)

- **`hospital` is already a valid `organizations.org_type`** (migration 011 CHECK) — **no org migration**. A hospital is just another owner, exactly like a diagnostic_centre.
- **Reuses the Lens spine wholesale:** the owner/scope foundation (organizations + memberships + `patients.owner_org_id`), the `createOwnedPatient` service, the credential issuance seam (`issueCredential`, issuer = org DID), the single-scope RLS, the `/api/verify` loop.
- **No LLM** → the E2E is fully local-runnable (Next routes + local Supabase; no `functions serve`/LLM keys), unlike Lens's normalize step.
- **Chamber untouched** (no change to doctor auth, `/doctor/*`, clinic RLS, or migrations ≤ 012).

## Architecture

### 1. Generalize the staff-auth (the reusable win for all owner modules)

`shapeStaffSession` (`lib/services/staff-logic.ts`) currently hard-picks `org_type === 'diagnostic_centre'`. Generalize it to pick the first **non-clinic owner** membership (any `org_type` except `clinic`) and return its `orgType` (already a field on `StaffSession`). Each module's layout then enforces its own `orgType`. This lets `staff-store`/`StaffGuard` serve hospital staff (and Karigor/Maa/Bridge later) unchanged — one staff-auth, many owner surfaces.
- Add a tiny helper `requireOrgType(staff, 'hospital')` (pure) or enforce inline in the `/hospital` layout: if `staff.orgType !== 'hospital'` → not a hospital member (deny/redirect). Same guard pattern Lens uses for `/center`, but parameterized by org type.
- Update `staff-logic.test.ts`: a centre membership still shapes (orgType `diagnostic_centre`), a hospital membership now shapes (orgType `hospital`), a clinic-only membership still returns null, and the per-module org-type enforcement is unit-tested.

### 2. Migration 013 — `discharge_records` (the workflow table; mirrors `lab_orders`)

Owner-org-scoped workflow table, the hospital analogue of `lab_orders`:
`id, owner_org_id (hospital) → organizations, patient_id → patients, status ('draft'|'signed'|'revoked'), admission_date, discharge_date, discharge_diagnosis jsonb, discharge_medications jsonb, procedures jsonb, hospital_course text, follow_up_instructions jsonb, discharge_condition text, created_by → auth.users, signatory_user_id → auth.users, signed_at, credential_id → credentials, created_at`. Member RLS (`owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid())`) + freeze-on-credential trigger (mirror `lab_orders_frozen`). Index on `(owner_org_id, status)` + `(patient_id)`.

### 3. Hospital onboarding — generalize `create-center.mjs` → `create-org.mjs`

Generalize the centre onboarding script to `scripts/create-org.mjs --type <hospital|diagnostic_centre> ...` (same org + staff + memberships flow, parameterized by org_type; refuses `clinic` — clinics onboard via `create-doctor.mjs`). Keep `create-center.mjs` as a thin wrapper that calls it with `--type diagnostic_centre` (no breakage), or leave create-center.mjs and add create-org.mjs and use it going forward. Either way the hospital seed is `node scripts/create-org.mjs --type hospital --name "..." --signer-* --staff-*`.

### 4. `/hospital/*` surface (mirrors `/center/*`)

- `/hospital/login` — reuse the centre login pattern (or a generalized `staff/login`); on success route to `/hospital` (deny if `orgType !== 'hospital'`).
- `/hospital/layout.tsx` — `StaffGuard` + `orgType==='hospital'` enforcement + chrome.
- `/hospital` — discharge-records dashboard (queue: draft / signed).
- `/hospital/discharge/new` — create a discharge record (find/create patient + admission/discharge dates + test category-less; the summary fields).
- `/hospital/discharge/[id]` — enter the summary (diagnoses, meds, follow-up, condition) + sign.

### 5. Logic + API (mirrors Lens)

- `lib/services/hospital-logic.ts` (pure, +test): `buildDischargeRecordRow({ ownerOrgId, patientId, createdBy, admissionDate, dischargeDate })`; `buildDischargeSummaryData({ orgDid, orgName, ...summary })` → a `dischargeSummaryData`-valid payload (the reserved schema). Mirrors `lens-logic`'s `buildLabOrderRow`/`buildLabResultData`.
- `POST /api/hospital/discharges` — staff auth + `orgType==='hospital'` + create record (patient find-or-create via `createOwnedPatient`).
- `POST /api/hospital/discharges/[id]` — save the summary draft (canEnter gate, scope, 409 if signed).
- `POST /api/hospital/discharges/[id]/sign` — sign → DischargeSummary VC (issuer `{ kind:'organization', id: hospitalOrgId }`, subject = patient DID, `type:'dischargeSummary'`... actually the registry key is `discharge_summary`), one-shot 409, status `signed` + `credential_id`. Mirrors the Lens sign route exactly (minus the projection — see below).

### 6. Delivery + verify

- **Free verification:** reuse `/api/verify` with the DischargeSummary `vcId` — the demo proof (valid + issuer_verified under the hospital DID).
- **Wallet surfacing: deferred (demo-grade).** The wallet currently reads visits/prescriptions/lab_reports; surfacing discharge summaries needs a wallet-read addition. For v1 the credential is issued + publicly verifiable (the core "signed + verifiable" proof). A `lab_reports`-style projection + wallet read is a thin later add — reserved.

## Testing

- **Unit:** `staff-logic` (generalized org-type shaping + the per-module enforcement), `hospital-logic` (the pure builders incl. a DischargeSummary payload that validates against `@kham/schemas-clinical`).
- **E2E (`scripts/smoke-hospital.mjs`, fully local — no LLM):** Section A: `discharge_records` schema + status CHECK + freeze. Section B (over `npm run dev` + local Supabase): create record → save summary → non-signer can't sign (403) → signatory signs → DischargeSummary VC under the hospital DID → `/api/verify` valid+acceptable → cross-hospital RLS isolation. (No `functions serve` needed — Hospital has no edge-function/LLM step.)
- **Regression:** smoke-path 19/19 + smoke-lens (the centre still works after the staff-auth generalization) stay green.

## Reserved / deferred (demo discipline — NOT built here)

Admission-read (wallet at the bedside) + **break-glass emergency access** (a real auth-policy build); referral routing (upward/downward structured handovers); the day-3/14 WhatsApp post-discharge follow-up (rides the existing bridge rails — later); wallet surfacing of discharge summaries; R1 cross-institution portable DID (anchor to DID, defer the persons build); death-certificate / medico-legal credential variants.

## Chamber-safety

Additive: one migration (013), one generalized pure function (`shapeStaffSession`, with the centre path preserved + tested), new `/hospital` routes/UI, new API routes, a generalized onboarding script. No change to doctor/clinic code, `/doctor`, `/center` behavior (the centre keeps working — regression-gated by smoke-lens), or migrations ≤ 012.
