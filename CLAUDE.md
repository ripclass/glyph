# CLAUDE.md — Glyph by KhaM Health

> Memory file for any future Claude Code session working on this repo.
> Update this file when you learn something a future session would need to know.

---

## 1. Project Identity

**Glyph** is a clinical AI copilot for Bangladeshi doctors — a PWA (Next.js App Router) that:

1. Runs patient **intake** on a clinic tablet (voice-first, Bangla), capturing history and camera-reading prior prescriptions and lab reports.
2. Generates a **briefing card** for the doctor before the patient walks in — structured, source-attributed, with red-flag detection.
3. Provides **ambient recording + real-time clinical research** during the consultation (UpToDate + Perplexity + PubMed).
4. Drafts **visit notes** in Bangladesh prescription format (**CC / O-E / Ix / Rx / Advice — NOT SOAP**).
5. Sends **WhatsApp follow-ups** with a patient-friendly Bangla summary 2-3 days later.

The soul behind Glyph is called **Saarah**. She is *not* in the product name or UI. She is in every design decision. When in doubt: *would this feel soulful or mechanical?*

- **Company:** KhaM Health
- **Product:** Glyph
- **Founder:** Ripon
- **Location:** Dhaka, Bangladesh

---

## 2. Tech Stack (from actual package.json)

Monorepo: npm workspaces `apps/*` + `packages/*`. Node >=20.

| Workspace | Name | What it is |
|---|---|---|
| `apps/glyph` | `glyph-web` | The Next.js 14 PWA (was `web/` before the Phase 2 restructure) |
| `packages/identity` | `@kham/identity` | Shared identity envelope lifted from EIN: Ed25519 (`@noble/ed25519` v3), did:web, VC sign/verify/issue, JCS canonicalization. Framework-agnostic, no DB. Gated by 7 trust-root tests. |
| `packages/schemas-clinical` | `@kham/schemas-clinical` | Zod schemas for clinical VC *payloads* (`credentialSubject.data`): PhysicianRegistration, VisitNote (CC/O-E/Ix/Rx/Advice), Prescription (1+0+1 dosing), LabResult, DispensingEvent + shared envelope/registry. **Five reserved demo-grade shapes (2026-06-19, module-map):** DischargeSummary (Hospital), MedicalClearance (Continuity), OccupationalHealth (Karigor), AntenatalRecord (Maa), SpecialistOpinion (Bridge). Deepen when each module is built. |

Both packages are TS-source packages (`main: ./src/index.ts`) consumed via `transpilePackages` in `apps/glyph/next.config.js`. Inside packages use **relative imports** (no `@/*` alias); private-key ops are server-only **by convention, guarded at the app boundary** (no `server-only` import — that was deliberately dropped at extraction).

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | ^14.2.0 |
| UI runtime | React | ^18.3.0 |
| Language | TypeScript | ^5.4.0 |
| Styling | Tailwind CSS | ^3.4.0 |
| UI primitives | shadcn/ui style (`components/ui/*`), class-variance-authority, clsx, tailwind-merge | — |
| Icons | lucide-react | ^0.400.0 |
| Toasts | sonner | ^1.5.0 |
| State | Zustand | ^4.5.0 |
| PWA | next-pwa | ^5.6.0 |
| Markdown | react-markdown | ^9.0.0 |
| Dates | date-fns | ^3.6.0 |
| Database/Auth/Realtime/Storage | Supabase (`@supabase/supabase-js` ^2.45, `@supabase/ssr` ^0.5) | — |
| Edge Functions runtime | Deno (Supabase Edge Functions) | — |
| Tests | Vitest, React Testing Library, jsdom | ^1.6 / ^16 / ^24 |
| Lint/Format | ESLint (`eslint-config-next`), Prettier | ^8.57 / ^3.3 |

**Fonts:** Inter, Noto Sans Bengali, JetBrains Mono (+ Instrument Sans as `font-display` for landing/display use). **Theme colors — ANCHORED DESIGN (2026-06-13):** the whole app inherits the marketing site's "quiet clinical" system at token level (`apps/glyph/tailwind.config.ts`). The `glyph-*` scale is REMAPPED: 50-500 = lime accent family (#dff258 at 400), 600-950 = ink darks (#171a19 at 600) — so `bg-glyph-600 text-white` renders as an ink pill and `bg-glyph-50` as pale lime. `clinical-*` and the raw `slate-*` scale are remapped to warm bone/ink neutrals (bone #f4f5f3, line #e2e4e0, ink #171a19). shadcn CSS vars in globals.css carry the same system (--primary=ink, --ring=lime). Buttons are pill-shaped; `accent` variant = lime. `red_flag` unchanged. Do NOT reintroduce green or cool slate values.

**LLM providers wired in `supabase/functions/_shared/llm-router.ts`:** Gemini, MedGemma (self-hosted OpenAI-compatible, dormant until `MEDGEMMA_BASE_URL` is set), Claude, OpenAI, Perplexity. Streaming is supported for Gemini and Claude.

---

## 3. Project Structure (real tree, not the scaffold prompt)

```
Glyph/
├── .env.example
├── .github/workflows/ci.yml       # npm ci → lint → type-check → test → build (genuinely green since M0)
├── README.md
├── AUDIT.md                        # Phase 1 audit (2026-05-30) — ground truth on every claimed-vs-measured gap. READ THIS.
├── NORTHSTAR-CORRECTIONS.md        # Phase 2 closeout: corrections the vision doc needs (founder applies)
├── glyph-vision-v3.1.md            # ⚠ UNTRACKED working doc — northstar; known to overstate (see AUDIT.md). Do not treat as ground truth.
├── inlinePrompt.md                 # ⚠ UNTRACKED working doc — founder ↔ session channel; contents change between sessions
├── .db-password.glyph-prod.local   # ⚠ git-ignored: prod DB password (for `supabase db push -p`)
├── .credential-encryption-key.prod.local  # ⚠ git-ignored: prod CREDENTIAL_ENCRYPTION_KEY backup — founder must keep a copy
├── package.json                    # workspace root: workspaces ["apps/*","packages/*"]; dev/build/lint proxy to glyph-web; test/type-check run --workspaces --if-present
├── scripts/                        # Node smoke/ops scripts (run with repo-root node_modules)
│   ├── smoke-db.mjs                # schema/trigger/registration semantics (local or prod)
│   ├── smoke-ai.mjs                # first-AI-call harness (intake-start E2E)
│   ├── smoke-path.mjs              # THE full clinical path: register→intake(SSE)→summary→note
│   ├── smoke-credentials.mjs       # migration 002 immutability suite (NEVER run on prod — append-only rows)
│   ├── smoke-issuance.mjs          # credential issuance E2E incl. tamper rejection
│   ├── smoke-egress.mjs            # Tier A/B gate: scrub round-trip, consent withdrawal, log tamper
│   ├── smoke-documents.mjs         # document pipeline: storage RLS, Tier B consent, real extraction
│   ├── smoke-triage.mjs            # Pocket v2 triage E2E (hits the live Next route): red-flag escalation, Tier B consent fail-closed, real LLM exchange, session persistence. usage: node scripts/smoke-triage.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>
│   ├── smoke-whatsapp.mjs          # WhatsApp bridge Leg A–D E2E: drives the webhook, asserts bind→conversation→dedupe (Leg A), triage/wallet/revoke (Leg B), image→consent→type-question + whatsapp_document consent recorded (Leg C), scheduled_messages enqueue (Leg D — deterministic queue state; real template delivery needs Meta-approved templates + live number). usage: node scripts/smoke-whatsapp.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>
│   ├── smoke-medgemma.mjs          # KhaM-Med light-up: direct OpenAI-compatible round-trip against MEDGEMMA_BASE_URL. DEFERRED — run only after a real endpoint exists (see spec runbook). usage: node scripts/smoke-medgemma.mjs <MEDGEMMA_BASE_URL> [MODEL] [API_KEY]
│   ├── smoke-lens.mjs              # Lens v1: Section A = lab_orders schema + constraints; Section B = full E2E (needs Next + edge fns running)
│   ├── smoke-hospital.mjs          # Hospital v1: Section A = discharge_records schema; Section B = full E2E (needs Next running, no edge fns)
│   ├── smoke-karigor.mjs               # Karigor v1: Section A = occupational_assessments schema; Section B = full E2E (needs Next running, no edge fns — no LLM)
│   ├── smoke-continuity.mjs        # Continuity v1: Section A = clearance_records schema; Section B = full E2E (needs Next running, no edge fns — no LLM)
│   ├── smoke-maa.mjs               # Maa v1: Section A = antenatal_visits schema; Section B = full E2E create→save→sign→verify + cross-program RLS (needs Next running, no edge fns — no LLM). usage: node scripts/smoke-maa.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_KEY>
│   ├── smoke-bridge.mjs            # Bridge v1: Section A = specialist_opinions schema + constraints; Section B = full E2E create→save→doctor-403→sign→SpecialistOpinion VC→verify + cross-panel RLS isolation (needs Next running, no edge fns — no LLM). usage: node scripts/smoke-bridge.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_KEY>
│   ├── dev-doctor.mjs              # recreate doctor@glyph.dev/glyph-dev-2026 after local db reset (refuses prod)
│   ├── create-doctor.mjs           # REAL doctor onboarding (works on prod; safety rails, no self-signup yet)
│   └── fixtures/rx-napa.jpg        # synthetic BD prescription (Napa/Seclo, 1+0+1) for extraction smoke
├── docs/                           # Long-form design docs (see §12)
│   ├── architecture.md
│   ├── api-routing.md
│   ├── data-model.md
│   ├── clinical-workflow.md
│   ├── attendant-protocol.md
│   ├── abridge-patterns.md
│   ├── pdpo-compliance.md
│   ├── uptodate-integration.md
│   └── deployment.md
├── prompts/                        # Production prompt library (see §10)
│   ├── README.md
│   ├── persona/glyph-core.md
│   ├── intake/{welcome,conversation,attendant-mode,summary-generation}.md
│   ├── extraction/{prescription-reading,lab-report-reading}.md
│   ├── doctor/{briefing-card,clinical-consult,note-generation,linked-evidence}.md
│   ├── patient/{whatsapp-summary,followup-message}.md
│   └── reference/{bangla-medical-glossary,bd-drug-names,bd-prescription-format,bd-diagnostic-centers}.md
├── supabase/
│   ├── config.toml                 # Local dev: api 54321, db 54322, studio 54323 (CLI v2, Postgres 17)
│   ├── seed.sql                    # dev-only data; intentionally NO doctors (need real auth.users ids)
│   ├── migrations/
│   │   ├── 001_initial_schema.sql  # All 8 tables, RLS, triggers
│   │   ├── 002_identity_layer.sql  # INSERT-only credentials, versioned did_documents, status log, projection freeze
│   │   ├── 003_egress_log.sql      # append-only egress evidence (the M4 gate's audit trail)
│   │   ├── 004_document_storage.sql # private `documents` bucket + clinic-scoped storage RLS
│   │   ├── 005_waitlist.sql        # waitlist_signups: RLS deny-all (service-role only via /api/waitlist)
│   │   ├── 006_wallet_tokens.sql   # wallet_access_tokens: Pocket bearer tokens, RLS deny-all (service-role only)
│   │   ├── 007_triage_sessions.sql # triage_sessions: Pocket v2 triage exchanges, RLS deny-all (service-role only)
│   │   ├── 008_whatsapp_bridge.sql # whatsapp_links + wa_conversations + wa_messages: WhatsApp bridge Leg A, RLS deny-all (service-role only)
│   │   ├── 009_scheduled_messages.sql # scheduled_messages: Leg D proactive send queue + visits.next_appointment_at, RLS deny-all
│   │   ├── 010_prescription_safety.sql # visits.prescription_safety_check JSONB: safety result + per-warning doctor verdicts, recorded at note-approval (audit today, KhaM-Med ground truth tomorrow)
│   │   ├── 011_owner_scope.sql      # organizations + memberships + clinics.organization_id (backfilled), patients.owner_org_id + clinic_id RELAXED to nullable, kham_holding provisional-owner singleton; RESTRICTIVE patients_single_scope policy + patients_one_scope CHECK enforce one-owner-scope; NEW owner-scoped RLS ALONGSIDE the untouched clinic RLS. The audit's R2 "clinic is one owner type" foundation (Lens is first consumer). Chamber path unchanged; smoke-path 19/19 + smoke-owner-scope green.
│   │   ├── 012_lab_orders.sql       # lab_orders workflow table: owner-org-scoped order→result→sign lifecycle; raw_results + normalized_results + sanity_flags JSONB; status enum (ordered/resulted/signed/revoked); freeze-on-credential trigger (blocks update when status=signed); member RLS (org members read/write their own org's orders). Lens v1 surface.
│   │   ├── 013_discharge_records.sql # discharge_records workflow table: Hospital v1 analogue of lab_orders; status enum (draft/signed/revoked); freeze-on-credential trigger; discharge_diagnosis + discharge_medications + procedures + hospital_course + follow_up_instructions + discharge_condition JSONB/TEXT fields; member RLS (hospital org members only). DischargeSummary VC issued on sign.
│   │   ├── 014_occupational_assessments.sql # occupational_assessments workflow table: Karigor v1 analogue of discharge_records (employer owner); status enum (draft/signed/revoked); freeze-on-credential trigger; assessment_type/exposures/findings/fitness_for_role/restrictions/recommendations JSONB fields; member RLS (employer org members only). OccupationalHealth VC issued on sign; assessment_type required before signing.
│   │   ├── 015_clearance_records.sql # clearance_records workflow table: Continuity v1 analogue of occupational_assessments (recruiter owner); status enum (draft/signed/revoked); freeze-on-credential trigger; purpose/fitness_status/restrictions/findings/destination_country/valid_until fields; member RLS (recruiter org members only). MedicalClearance VC issued on sign; purpose AND fitness_status required before signing.
│   │   ├── 016_antenatal_visits.sql  # Maa v1: (1) widens organizations org_type CHECK to include 'program' (additive, no value removed); (2) antenatal_visits workflow table — maternal analogue of clearance_records; status enum (draft/signed/revoked); freeze-on-credential trigger (blocks clinical field mutation once credential_id set); visit_number/gestational_age_weeks/lmp/edd/blood_pressure/weight_kg/fundal_height_cm/fetal_heart_rate_bpm/risk_flags JSONB/next_visit_date fields; member RLS (program org members only). AntenatalRecord VC issued on sign.
│   │   └── 017_specialist_opinions.sql # Bridge v1: (1) widens organizations org_type CHECK to include 'specialist_panel' (additive, no value removed); (2) specialist_opinions workflow table — Bridge analogue of antenatal_visits; status enum (draft/signed/revoked); freeze-on-credential trigger (blocks specialty/referral_reason/opinion/recommendations/differential_diagnosis/presented_record_refs once credential_id set); member RLS (specialist_panel org members only). SpecialistOpinion VC issued on sign; specialty AND opinion required before signing. No projection table (wallet surfacing deferred).
│   └── functions/
│       ├── _shared/
│       │   ├── cors.ts
│       │   ├── cost-logger.ts
│       │   ├── deidentify.ts       # PII strip + re-identify (names/phones/NID/addr)
│       │   ├── egress.ts           # THE Tier A/B/C chokepoint — fail closed, evidence before egress
│       │   ├── llm-router.ts       # Multi-provider + streaming + fallback + transport (native/OpenRouter)
│       │   └── types.ts
│       ├── intake-start/
│       ├── intake-turn/
│       ├── intake-complete/
│       ├── extract-document/       # Three auth paths: (1) user-JWT intake path (doctor uploads via tablet); (2) bridge service path (WHATSAPP_BRIDGE_SECRET, deployed --no-verify-jwt) for visitless WhatsApp pre-chamber uploads (Leg C); (3) Lens centre image-extract path (staff JWT, extractOnly=true — called by /api/center/orders/[id]/extract, no DB row written).
│       ├── generate-briefing/
│       ├── consult-query/          # The router-of-routers (see §4)
│       ├── consult-uptodate/
│       ├── generate-note/
│       ├── generate-patient-summary/
│       ├── send-followup/
│       ├── triage/                   # POCKET v2: patient symptom triage; deployed --no-verify-jwt, auth via TRIAGE_SHARED_SECRET (server-to-server), Tier B egress (consentId required)
│       └── lens-normalize/           # LENS v1: AI normalize + sanity-check of raw lab results; deployed --no-verify-jwt, auth via LENS_SHARED_SECRET (same pattern as triage); Tier A egress; primary claude-opus-4-8, fallback gemini-2.0-flash. MUST be deployed with --no-verify-jwt (the gateway JWT check rejects the shared-secret bearer without it).
├── packages/
│   ├── identity/                   # @kham/identity — src/{crypto,credentials,did}, test/trust-root.test.ts (7 tests = CI gate)
│   └── schemas-clinical/           # @kham/schemas-clinical — src/{common,registry,*-schemas}, test/schemas.test.ts (11 tests)
└── apps/glyph/                     # Next.js PWA (workspace name: glyph-web; was web/)
    ├── next.config.js              # next-pwa wrapper; transpilePackages for @kham/*; supabase.co image remote pattern
    ├── package.json
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── postcss.config.js
    ├── public/
    │   ├── manifest.json
    │   └── (sw.js / workbox-*.js are build artifacts, untracked since M0)
    └── src/
        ├── app/
        │   ├── layout.tsx          # <html lang="bn">, sonner Toaster
        │   ├── page.tsx            # COMPANY LANDING ("quiet clinical", color-matched to founder's
        │   │                       # reference: canvas #F6F6F6, scene #9DB7B8, lime #DFF258).
        │   │                       # NO product status labels here (founder rule) — status lives in
        │   │                       # prose on the product pages. English-first (founder decision);
        │   │                       # KhaM casing is sacred (named for Khayer + Mamataj).
        │   ├── [product]/page.tsx  # Editorial product landings for policy/gov/donor readers, condensed
        │   │                       # from the founder's 11 product docs (feature-*.md, repo root,
        │   │                       # UNTRACKED): /chamber /pocket /pharmacy /lens /continuity /karigor
        │   │                       # /maa /hospital /bridge /identity /kham-med. Content in
        │   │                       # lib/landing/products.ts; dynamicParams=false. NO em dashes in
        │   │                       # copy (founder voice rule). Brand: Glyph = product family,
        │   │                       # KhaM-Med = sovereign model, KhaM Labs = house.
        │   │                       # Hero images: AI-generated (Higgsfield soul_2) in public/landing/.
        │   ├── start/page.tsx      # Role selection (was the old root): Doctor Login / রোগী ইনটেক — clinic tablets use this
        │   ├── login/page.tsx      # email+password pilot auth (accounts via scripts/create-doctor.mjs)
        │   ├── verify/page.tsx     # M5 pharmacy verify loop (moved from /pharmacy, which is now the
        │   │                       # marketing page): phone → DID → ✓ dispensable / ✗ revoked
        │   ├── .well-known/did/[...slug]/route.ts  # public did:web resolution
        │   ├── api/[...path]/route.ts   # Catch-all proxy → Supabase Edge Functions
        │   ├── api/verify/route.ts      # credential verification (local fast-path + status overlay)
        │   ├── api/visits/approve-note/route.ts  # note approval → Rx + VisitNote credentials (one-shot); Leg D: also enqueues a followup (+2d fire_at) and, if visits.next_appointment_at is set, an appointment reminder into scheduled_messages
        │   ├── api/waitlist/route.ts    # public (unauthenticated) waitlist signup: honeypot, phone-dedupe, service-role insert
        │   ├── api/wallet/issue/route.ts # POCKET: doctor-session, find-or-create patient wallet bearer token (+optional PIN)
        │   ├── api/wallet/[token]/route.ts # POCKET: public, service-role read of one patient's record by bearer token (PIN-gated)
        │   ├── api/wallet/[token]/triage/route.ts # POCKET v2: token-gated symptom triage. Validates token (wallet-logic) → deterministic screenRedFlags pre-screen → resolves/creates patient ai_processing consent (device_info='pocket_triage') → calls triage edge fn (service-role) → validateOutcome clamp → persists triage_sessions on final answer
        │   ├── api/whatsapp/webhook/route.ts # WHATSAPP BRIDGE: inbound webhook (GET challenge + POST: signature-verify → dedupe on provider_message_id → processInbound inline). Next 14.2 has no stable after(), so processing is inline + sweeper-recovered. Leg B: processInbound runs the intent router + in-thread triage/wallet/revoke state machine.
        │   ├── api/whatsapp/bind-code/route.ts # WHATSAPP BRIDGE: doctor-session issues a one-time bind code + wa.me QR link (RLS patient scope-check via user client; service-role insert into whatsapp_links).
        │   ├── api/cron/whatsapp-sweeper/route.ts # WHATSAPP BRIDGE: every-minute cron (Vercel Pro) retrying inbound wa_messages stuck in 'received'. (Leg A skeleton + Leg B patient core + Leg C pre-chamber photo capture built; voice deferred. specs/plans in docs/superpowers/{specs,plans}/2026-06-14-glyph-whatsapp-bridge-*.md. Leg C plan: docs/superpowers/plans/2026-06-14-glyph-whatsapp-bridge-leg-c.md)
        │   ├── api/cron/whatsapp-scheduler/route.ts # WHATSAPP BRIDGE Leg D: every-5-min cron (Vercel Pro); enqueues doctor nudges for overdue visits + drains scheduled_messages (followup/appointment_reminder/doctor_nudge) past fire_at via sendTemplate. Delivery gated on 3 Meta-approved utility templates (glyph_followup, glyph_appointment_reminder, glyph_doctor_nudge). Plan: docs/superpowers/plans/2026-06-14-glyph-whatsapp-bridge-leg-d.md
        │   ├── center/
        │   │   ├── layout.tsx           # Centre-staff AuthGuard (checks staff-store session, redirects to /center/login)
        │   │   ├── page.tsx             # LENS: centre dashboard — open orders list
        │   │   ├── login/page.tsx       # Glyph Lens centre sign in (email+password, staff-store)
        │   │   └── orders/
        │   │       ├── new/page.tsx     # New order form (patient lookup/create + test category)
        │   │       └── [id]/page.tsx    # Order detail: result entry, AI normalize, sign + wallet link
        │   ├── api/center/
        │   │   ├── orders/route.ts      # POST: create new lab order (staff session, owner-org RLS)
        │   │   └── orders/[id]/
        │   │       ├── results/route.ts  # POST: save raw_results for an order
        │   │       ├── normalize/route.ts # POST: call lens-normalize edge fn (LENS_SHARED_SECRET) → persist normalized_results + sanity_flags
        │   │       ├── extract/route.ts  # POST: upload a lab-report photo (consent required, device_info='lens_image_extract') → service-role upload to documents bucket → extract-document (staff JWT, extractOnly=true, Tier B) → return rawResults for UI pre-fill; does NOT save results
        │   │       └── sign/route.ts     # POST: issue LabResult VC (org DID as issuer), freeze order, set status=signed
        │   ├── hospital/
        │   │   ├── layout.tsx           # Hospital-staff AuthGuard (checks staff-store, org_type='hospital')
        │   │   ├── page.tsx             # HOSPITAL: discharge list dashboard
        │   │   ├── login/page.tsx       # Glyph Hospital staff sign in (email+password, staff-store)
        │   │   └── discharge/
        │   │       ├── new/page.tsx     # New discharge form (patient lookup/create + admission date)
        │   │       └── [id]/page.tsx    # Discharge detail: summary entry + sign → DischargeSummary VC
        │   ├── api/hospital/
        │   │   └── discharges/
        │   │       ├── route.ts         # POST: create draft discharge record (walk-in or known patient)
        │   │       └── [id]/
        │   │           ├── route.ts     # POST: save summary fields (diagnosis, meds, condition, dates)
        │   │           └── sign/route.ts # POST: issue DischargeSummary VC (org DID as issuer, signatory-only), freeze record, set status=signed. No edge fn — pure Next + Supabase.
        │   ├── karigor/
        │   │   ├── layout.tsx           # Karigor employer-staff AuthGuard (checks staff-store, org_type='employer')
        │   │   ├── page.tsx             # Karigor: assessment list dashboard
        │   │   ├── login/page.tsx       # Glyph Karigor employer-staff sign in (email+password, staff-store)
        │   │   └── assessment/
        │   │       ├── new/page.tsx     # New assessment form (worker lookup/create)
        │   │       └── [id]/page.tsx    # Assessment detail: field entry + sign → OccupationalHealth VC
        │   ├── api/karigor/
        │   │   └── assessments/
        │   │       ├── route.ts         # POST: create draft occupational assessment (walk-in or known worker; employer-member auth, requireOrgType='employer')
        │   │       └── [id]/
        │   │           ├── route.ts     # POST: save assessment fields (assessment_type, fitness_for_role, exposures, findings, restrictions, recommendations); canEnterResults gate (doctor/technologist/signatory/owner/admin)
        │   │           └── sign/route.ts # POST: issue OccupationalHealth VC (employer org DID as issuer, canSign gate = signatory/owner/admin), freeze record, set status=signed. No edge fn — pure Next + Supabase.
        │   ├── continuity/
        │   │   ├── layout.tsx           # Continuity recruiter-staff AuthGuard (checks staff-store, org_type='recruiter')
        │   │   ├── page.tsx             # Continuity: clearance list dashboard
        │   │   ├── login/page.tsx       # Glyph Continuity recruiter-staff sign in (email+password, staff-store)
        │   │   └── clearance/
        │   │       ├── new/page.tsx     # New clearance form (worker lookup/create)
        │   │       └── [id]/page.tsx    # Clearance detail: field entry + sign → MedicalClearance VC
        │   ├── api/continuity/
        │   │   └── clearances/
        │   │       ├── route.ts         # POST: create draft medical clearance (walk-in or known worker; recruiter-member auth, requireOrgType='recruiter')
        │   │       └── [id]/
        │   │           ├── route.ts     # POST: save clearance fields (purpose, fitness_status, destination_country, restrictions, findings, valid_until); canEnterResults gate (doctor/technologist/signatory/owner/admin)
        │   │           └── sign/route.ts # POST: issue MedicalClearance VC (recruiter org DID as issuer, canSign gate = signatory/owner/admin), freeze record, set status=signed. Requires purpose + fitness_status before signing. No edge fn — pure Next + Supabase.
        │   ├── maa/
        │   │   ├── layout.tsx           # Maa program-staff AuthGuard (checks staff-store, org_type='program')
        │   │   ├── page.tsx             # MAA: antenatal visit list dashboard
        │   │   ├── login/page.tsx       # Glyph Maa program-staff sign in (email+password, staff-store)
        │   │   └── visit/
        │   │       ├── new/page.tsx     # New antenatal visit form (mother lookup/create)
        │   │       └── [id]/page.tsx    # Visit detail: clinical field entry + sign → AntenatalRecord VC
        │   ├── api/maa/
        │   │   └── visits/
        │   │       ├── route.ts         # POST: create draft antenatal visit (walk-in or known mother; program-member auth, requireOrgType='program'). Returns visitId + patientId.
        │   │       └── [id]/
        │   │           ├── route.ts     # POST: save clinical fields (visit_number, gestational_age_weeks, lmp, edd, blood_pressure, weight_kg, fundal_height_cm, fetal_heart_rate_bpm, risk_flags, next_visit_date); canEnterResults gate (doctor/technologist/signatory/owner/admin)
        │   │           └── sign/route.ts # POST: issue AntenatalRecord VC (program org DID as issuer, canSign gate = signatory/owner/admin), freeze record, set status=signed. No required clinical field beyond provider (org supplies it). No edge fn — pure Next + Supabase.
        │   ├── bridge/
        │   │   ├── layout.tsx           # Bridge specialist-panel-staff AuthGuard (checks staff-store, org_type='specialist_panel')
        │   │   ├── page.tsx             # BRIDGE: specialist opinion list dashboard
        │   │   ├── login/page.tsx       # Glyph Bridge specialist-panel-staff sign in (email+password, staff-store)
        │   │   └── opinion/
        │   │       ├── new/page.tsx     # New opinion form (patient lookup/create)
        │   │       └── [id]/page.tsx    # Opinion detail: clinical field entry + sign → SpecialistOpinion VC
        │   ├── api/bridge/
        │   │   └── opinions/
        │   │       ├── route.ts         # POST: create draft specialist opinion (walk-in or known patient; specialist-panel-member auth, requireOrgType='specialist_panel'). Returns opinionId + patientId.
        │   │       └── [id]/
        │   │           ├── route.ts     # POST: save clinical fields (specialty, referral_reason, opinion, presented_record_refs, recommendations, differential_diagnosis); canEnterResults gate (doctor/technologist/signatory/owner/admin)
        │   │           └── sign/route.ts # POST: issue SpecialistOpinion VC (specialist_panel org DID as issuer, canSign gate = signatory/owner/admin), freeze record, set status=signed. specialty AND opinion required before signing. No edge fn — pure Next + Supabase.
        │   ├── wallet/[token]/page.tsx  # POCKET v1: patient-facing wallet (calm-presence, Bangla, read-only). Logic: lib/services/wallet-logic.ts (+test). QR issued on note-approval via components/doctor/WalletHandoff.tsx (qrcode dep). Has "Ask about a symptom" entry → /ask.
        │   ├── wallet/[token]/ask/page.tsx # POCKET v2: calm-presence Bangla triage chat. One-time consent notice → guided Q&A (≤3 follow-ups) → routed answer card (pharmacy/doctor/urgent; clinical red ONLY on urgent). Logic in lib/services/triage-logic.ts (+test, 12).
        │   ├── intake/
        │   │   ├── layout.tsx
        │   │   ├── page.tsx             # role selection + patient registration (registerAndStartVisit)
        │   │   ├── history/page.tsx     # LIVE: document capture → consent → private storage → extract-document
        │   │   ├── conversation/page.tsx   # LIVE: Web Speech (bn-BD) + typed fallback + ConsentPrompt gate
        │   │   └── summary/page.tsx     # intake-complete + extracted Rx/lab cards
        │   └── doctor/
        │       ├── layout.tsx           # AuthGuard + chrome (Patients/Schedule/Settings are disabled "soon" stubs)
        │       ├── page.tsx             # LIVE: useRealtimeQueue dashboard
        │       ├── briefing/[visitId]/page.tsx
        │       ├── consult/[visitId]/page.tsx
        │       ├── note/[visitId]/page.tsx
        │       └── patient/[patientId]/page.tsx
        ├── components/
        │   ├── doctor/              # BriefingCard, ConsultChat, NoteEditor, NoteFormatBD,
        │   │                        # AmbientRecorder, PatientQueue, PatientTimeline,
        │   │                        # MedicationTimeline, LabTrendChart, RedFlagAlert,
        │   │                        # SourceTag, CitationChip, LinkedEvidence, UpToDatePanel
        │   ├── intake/              # VoiceOrb, SaaraMessage, PatientMessage, AttendantBanner,
        │   │                        # DocumentCapture, ExtractedRxCard, ExtractedLabCard, ConsentPrompt
        │   ├── shared/              # Logo, LanguageToggle, LoadingStream
        │   └── ui/                  # badge, button, card, dialog, input, skeleton, textarea
        ├── lib/
        │   ├── hooks/               # useVoiceInput, useAmbientRecording, useIntakeConversation,
        │   │                        # useConsultChat, usePatientHistory, useRealtimeQueue
        │   ├── identity/            # M3 issuance seam: issue, ensure-identity, note-mapping(+test), config(+test), projections
        │   ├── services/            # ai, camera, speech, patients, visits, whatsapp, registration(+logic+test),
        │   │                        # consents, documents-logic(+test), wallet-logic(+test), triage-logic(+test), organizations(+logic+test),
        │   │                        # triage-runner (shared symptom-triage engine: red-flag screen → consent → egress-gated `triage` edge fn → clamp → persist; called by BOTH the wallet triage route and the WhatsApp bridge),
        │   │                        # staff-logic(+test) (org-type-generalized session: shapeStaffSession/requireOrgType/canSign/canEnterResults — guards Lens/Hospital/Karigor surfaces; the same shapeStaffSession works for any non-clinic owner org),
        │   │                        # lens-logic(+test) (lab-order helpers: buildLabOrderRow, normalizeRawItem, buildLabResultData, KNOWN_TEST_CATEGORIES, LabResultItem),
        │   │                        # hospital-logic(+test) (discharge helpers: buildDischargeRecordRow, buildDischargeSummaryData),
        │   │                        # karigor-logic(+test) (occupational-assessment helpers: buildAssessmentRow, buildOccupationalHealthData),
        │   │                        # continuity-logic(+test) (clearance helpers: buildClearanceRow, buildMedicalClearanceData),
        │   │                        # maa-logic(+test) (antenatal-visit helpers: buildAntenatalVisitRow, buildAntenatalRecordData),
        │   │                        # bridge-logic(+test) (specialist-opinion helpers: buildOpinionRow, buildSpecialistOpinionData)
        │   ├── whatsapp/            # WhatsApp bridge: provider/parse/verify/send (ported from Juugadu, 360dialog), window, binding (QR one-time code), router (+tests), process (orchestration) — Leg A. Leg B adds intents, flow, reply, wallet-link modules + intent-aware router handling in-thread triage (reuses lib/services/triage-runner.ts), wallet record requests, and stop-word revoke. Leg C adds media (360dialog download), documents (bucket upload), doc-type (flow: image → consent → type question → extract-document service path). Leg D adds templates (glyph_followup/glyph_appointment_reminder/glyph_doctor_nudge template definitions), schedule (enqueue/drain helpers for scheduled_messages), and sendTemplate (360dialog template send). Routes call into this; clinical thinking stays in edge fns.
        │   ├── stores/              # auth-store, intake-store, consult-store, queue-store, staff-store (centre-staff session + signIn)
        │   ├── supabase/            # client.ts, server.ts, types.ts (Database type — regenerate via gen types)
        │   ├── i18n/                # bn.json, en.json, index.ts (useLanguage hook)
        │   └── utils/               # cn, cost-tracker, format-date-bd, format-prescription
        └── styles/globals.css
```

---

## 4. AI Routing Table (actual — read from Edge Functions)

| Task | Primary Model | Fallback | Edge Function | Streams? | Notes |
|---|---|---|---|---|---|
| Intake greeting | `gemini-2.0-flash` | `gemini-1.5-flash` | `intake-start` | No | Creates consent rows, initializes transcript |
| Intake turn (convo) | `gemini-2.0-flash` | `gemini-1.5-flash` | `intake-turn` | **Yes (SSE)** | Streams tee'd to client + transcript capture |
| Intake summarization | `gemini-2.0-flash` | `claude-3-haiku-20240307` | `intake-complete` | No | Fires `generate-briefing` afterward |
| Prescription / lab OCR | `gemini-2.0-flash` (vision) | `claude-sonnet-4-20250514` | `extract-document` | No | MedGemma dormant until a self-hosted endpoint is configured + a route is re-promoted (measured); Tier B (image) egress |
| Briefing card | `claude-sonnet-4-20250514` | `gemini-2.0-flash` | `generate-briefing` | **Yes (SSE)** | MedGemma dormant (see above); strict `BriefingCard` JSON, red-flag rules in system prompt |
| Consult: guideline | UpToDate Connect API → `claude-sonnet-4-20250514` | `gemini-2.0-pro` | `consult-query` → `consult-uptodate` | No | Falls through to LLM synthesis if UpToDate unavailable |
| Consult: drug interaction | `claude-sonnet-4-20250514` | `gemini-2.0-pro` | `consult-query` | No | Deidentifies context first |
| Consult: differential Dx | `claude-sonnet-4-20250514` | `gemini-2.0-pro` | `consult-query` | No | — |
| Consult: recent studies | `perplexity sonar-pro` | `claude-sonnet-4-20250514` | `consult-query` | No | — |
| Consult: lab interpretation | `claude-sonnet-4-20250514` | `gemini-2.0-flash` | `consult-query` | No | MedGemma dormant until a self-hosted endpoint is configured + a route is re-promoted (measured) |
| Consult: generic clinical | `claude-sonnet-4-20250514` | `gemini-2.0-pro` | `consult-query` | No | Default route |
| Clinical note generation | `claude-sonnet-4-20250514` | `gemini-2.0-flash` | `generate-note` | **Yes (SSE)** | MedGemma dormant (see above); BD format default, SOAP optional |
| Patient WhatsApp summary | `gemini-2.0-flash` | `gemini-1.5-flash` | `generate-patient-summary` | No | Entirely in Bangla, no emoji |
| WhatsApp delivery | WhatsApp Business Cloud API v19 | — | `send-followup` | No | Requires `whatsapp_followup` consent row |
| Pocket symptom triage | `claude-sonnet-4-20250514` | `gemini-2.0-flash` | `triage` | No | Temp 0.2. **Tier B egress — requires `consentId`** (patient's `ai_processing` consent, `device_info='pocket_triage'`). Deterministic `screenRedFlags` pre-screen in the Next route forces urgent before the model. Never diagnoses/prescribes. |
| Lens lab normalize | `claude-opus-4-8` | `gemini-2.0-flash` | `lens-normalize` | No | **Tier A egress** (structured fields only, no free text). AI normalize raw lab values + sanity-check (flags `critical`/`warning`/`info`). Deployed `--no-verify-jwt`; auth via `LENS_SHARED_SECRET` (same pattern as `triage`). |

**Routing inside `consult-query`** is regex-driven (`detectQueryType`) — see `supabase/functions/consult-query/index.ts`. Every external call is preceded by `deidentify()` and the response is passed through `reidentify()` before returning.

**Transport (2026-06-11):** `llm-router.ts` resolves transport per provider — native API when the native key (`GEMINI_API_KEY`/`ANTHROPIC_API_KEY`/…) is set, otherwise **OpenRouter** (`OPENROUTER_API_KEY`, one key for Gemini/Claude/Perplexity/OpenAI; model ids mapped in `OPENROUTER_MODEL_MAP`). Native keys always win, so moving to direct keys later is config-only. MedGemma has **no OpenRouter path** — it uses `callSelfHostedMedGemma`, a self-hosted OpenAI-compatible adapter (POST `{MEDGEMMA_BASE_URL}/chat/completions`), gated on `MEDGEMMA_BASE_URL`; unset → provider unavailable, routes fall through to their fallback. Vertex OAuth is retired; `VERTEX_AI_API_KEY`/`GCP_PROJECT_ID`/`GCP_LOCATION` are no longer read. OpenRouter streaming is **normalized to Gemini-shaped SSE** in the router, so all stream consumers (function tee-parsers + client hooks) are transport-agnostic. ⚠ Latent pre-existing bug, untouched: a NATIVE Claude streaming fallback emits Claude-shaped SSE that Gemini-format parsers won't read — fix when M4 touches streaming. PDPO note: OpenRouter Inc. is an additional foreign processor in the chain — must be named in the M4 egress tiers/`egress_log`.

**Cost + usage logging:** `callLLM()` in `llm-router.ts` fires `logUsage()` to `api_usage_log` after every successful call. When the primary fails and fallback runs, the row is flagged `was_fallback = true`.

---

## 5. Database Schema Summary

From `supabase/migrations/001_initial_schema.sql`. Postgres 15, `uuid-ossp` enabled.

**Tables:**

| Table | Key columns | Notes |
|---|---|---|
| `clinics` | `id`, `name`, `district` | Single clinic per doctor (via `doctors.clinic_id`) |
| `doctors` | `id → auth.users(id)`, `clinic_id`, `bmdc_reg_no`, `preferred_language`, `preferred_note_format` | Phone unique; BMDC = Bangladesh Medical & Dental Council |
| `patients` | `clinic_id`, `name`/`name_bn`, `phone`, `age`, `blood_group`, `known_allergies JSONB`, `chronic_conditions JSONB` | Soft-denormalized allergies/conditions for fast briefing. Migration 011 added nullable `owner_org_id` (org-scoped/provisional patients) and relaxed `clinic_id` to nullable; a `patients_one_scope` CHECK enforces exactly one of clinic_id/owner_org_id (Chamber rows stay clinic-only). |
| `visits` | **central table** — `status` enum: `intake → intake_complete → in_consultation → note_review → completed → followup_sent`; includes `intake_transcript`, `intake_summary`, `briefing_card`, `consultation_transcript`, `consultation_queries`, `generated_note`, `doctor_edits`, `approved_note`, `evidence_links`, `api_costs`, attendant fields | Auto `visit_number` via trigger per patient |
| `prescriptions` | `patient_id`, `visit_id`, `source` (`photo_historical`/`photo_current`/`generated`), `medications JSONB`, `extraction_confidence` | Linked to image in Storage |
| `lab_reports` | Same pattern as prescriptions + `test_category`, `results JSONB` | — |
| `consent_records` | `consent_type` enum: `recording`, `data_storage`, `ai_processing`, `image_capture`, `whatsapp_followup`, `data_sharing`; `granted_by` ∈ {patient, attendant, guardian} | Tracks withdrawal + device info for PDPO audit |
| `api_usage_log` | `edge_function`, `model_used`, `was_fallback`, input/output tokens, latency, cost, error | Populated by `cost-logger.ts` |
| `waitlist_signups` | `name`, `phone` (unique, canonical `01X…`), `role` (doctor/clinic/pharmacy/other), `district`, `bmdc_reg_no`, `status` | Migration 005. RLS enabled with ZERO policies — service-role only, written by `/api/waitlist` |
| `organizations` | `id`, `name`, `org_type` (clinic/diagnostic_centre/hospital/employer/recruiter/kham_holding/**program**/**specialist_panel**), DID/key cols | Migration 011. The general owner (R2). Each clinic has a 1:1 backfilled org (`clinics.organization_id`). RLS: members read their own org. Migration 016 added `program` (maternal/CHW program owner — Maa v1). Migration 017 added `specialist_panel` (remote/diaspora specialist panel owner — Bridge v1). `OWNER_ORG_TYPES` in `staff-logic.ts` includes all non-clinic owner types including `program` and `specialist_panel`. |
| `memberships` | `user_id → auth.users`, `organization_id → organizations`, `role` (owner/admin/doctor/technologist/signatory/staff) | Migration 011. Who may act for an owner (generalizes `doctors.clinic_id`); lets non-doctor staff log in. UNIQUE(user_id, org). RLS: self-read. |
| `lab_orders` | `id`, `owner_org_id → organizations`, `patient_id → patients`, `ordered_by → auth.users`, `test_category`, `status` enum (ordered/resulted/signed/revoked), `raw_results JSONB`, `normalized_results JSONB`, `sanity_flags JSONB`, `lab_result_vc_id → credentials` | Migration 012. Lens v1 workflow table. Owner-org-scoped (RLS: members of the org). Freeze-on-credential trigger blocks updates once status=signed. |
| `discharge_records` | `id`, `owner_org_id → organizations` (hospital), `patient_id → patients`, `status` enum (draft/signed/revoked), `admission_date`, `discharge_date`, `discharge_diagnosis JSONB` ([{text,icd10}]), `discharge_medications JSONB`, `procedures JSONB`, `hospital_course TEXT`, `follow_up_instructions JSONB`, `discharge_condition TEXT`, `created_by → auth.users`, `signatory_user_id → auth.users`, `signed_at`, `credential_id → credentials` | Migration 013. Hospital v1 workflow table. Member RLS (org members only). Freeze-on-credential trigger blocks clinical field mutations once credential_id is set. DischargeSummary VC issued on sign; no projection table (wallet surfacing deferred). |
| `occupational_assessments` | `id`, `owner_org_id → organizations` (employer), `patient_id → patients`, `status` enum (draft/signed/revoked), `assessment_type TEXT` (pre_placement/periodic/return_to_work/incident/exit), `exposures JSONB` (string[]), `findings JSONB` ([{testName,value,unit,referenceRange,isAbnormal,severity}]), `fitness_for_role TEXT` (fit/fit_with_restrictions/unfit), `restrictions JSONB` (string[]), `recommendations JSONB` (string[]), `created_by → auth.users`, `signatory_user_id → auth.users`, `signed_at`, `credential_id → credentials` | Migration 014. Karigor v1 workflow table. Member RLS (org members only). Freeze-on-credential trigger blocks clinical field mutations once credential_id is set. OccupationalHealth VC (issuer=employer org DID) issued on sign; no projection table (wallet surfacing deferred). assessment_type required before signing. |
| `clearance_records` | `id`, `owner_org_id → organizations` (recruiter), `patient_id → patients`, `status` enum (draft/signed/revoked), `purpose TEXT` (overseas_employment/pre_employment/periodic/general), `fitness_status TEXT` (fit/fit_with_restrictions/temporarily_unfit/unfit), `restrictions JSONB` (string[]), `findings JSONB` ([{testName,value,unit,referenceRange,isAbnormal,severity}]), `destination_country TEXT`, `valid_until DATE`, `created_by → auth.users`, `signatory_user_id → auth.users`, `signed_at`, `credential_id → credentials` | Migration 015. Continuity v1 workflow table. Member RLS (recruiter org members only). Freeze-on-credential trigger blocks clinical field mutations once credential_id is set. MedicalClearance VC (issuer=recruiter org DID) issued on sign; no projection table (wallet surfacing deferred). purpose AND fitness_status required before signing. |
| `antenatal_visits` | `id`, `owner_org_id → organizations` (program), `patient_id → patients` (the mother), `status` enum (draft/signed/revoked), `visit_number INT`, `gestational_age_weeks NUMERIC`, `lmp DATE`, `edd DATE`, `blood_pressure TEXT`, `weight_kg NUMERIC`, `fundal_height_cm NUMERIC`, `fetal_heart_rate_bpm INT`, `risk_flags JSONB` (string[]), `next_visit_date DATE`, `created_by → auth.users`, `signatory_user_id → auth.users`, `signed_at`, `credential_id → credentials` | Migration 016. Maa v1 workflow table. Member RLS (program org members only). Freeze-on-credential trigger blocks clinical field mutations once credential_id is set. AntenatalRecord VC (issuer=program org DID) issued on sign; no required clinical field beyond provider (org supplies it). No projection table (wallet surfacing deferred). |
| `specialist_opinions` | `id`, `owner_org_id → organizations` (specialist_panel), `patient_id → patients`, `status` enum (draft/signed/revoked), `specialty TEXT`, `referral_reason TEXT`, `presented_record_refs JSONB` (string[]), `opinion TEXT`, `recommendations JSONB` (string[]), `differential_diagnosis JSONB` ([{text,icd10}]), `created_by → auth.users`, `signatory_user_id → auth.users`, `signed_at`, `credential_id → credentials` | Migration 017. Bridge v1 workflow table. Member RLS (specialist_panel org members only). Freeze-on-credential trigger blocks clinical field mutations once credential_id is set. SpecialistOpinion VC (issuer=specialist_panel org DID) issued on sign; specialty AND opinion required before signing. No projection table (wallet surfacing deferred). |

**Indexes:** on `visits(patient_id|doctor_id|visit_date DESC|status|clinic_id,visit_date)`, `prescriptions(patient_id)`, `lab_reports(patient_id|category)`, `patients(phone|clinic_id)`, `consent_records(patient_id)`, `api_usage_log(visit_id)`.

**RLS:** Enabled on all 8 tables. Policy is **doctor-scoped-by-clinic** — a doctor can only see rows whose path traces back to their own `doctors.clinic_id`. `doctors` table has a self-access policy (`id = auth.uid()`).

**Triggers/functions:**
- `set_visit_number()` — auto-increments `visit_number` per `patient_id` on insert.
- `update_timestamp()` — bumps `updated_at` on `patients` and `visits`.

⚠ **`apps/glyph/src/lib/supabase/types.ts` has a history of drifting from the SQL** (audit item F: invented columns hidden behind `as never` casts). The migration files are the source of truth. The type is now generated (`supabase gen types typescript --local` + a small compatibility tail) — regenerate after every new migration; never hand-invent columns. An `as never`/`as any` cast on a Supabase call is the drift alarm.

---

## 6. Commands

```bash
# Root workspace
npm install
npm run dev             # → glyph-web workspace: next dev
npm run build           # → glyph-web workspace: next build
npm run lint            # → glyph-web: next lint (packages have no lint script — known gap)
npm run type-check      # → tsc --noEmit in ALL workspaces (--workspaces --if-present)
npm run test            # → vitest run in ALL workspaces (app uses --passWithNoTests; packages have real tests)

# Supabase (local)
supabase start                                     # boots Postgres, Auth, Storage, Realtime, Studio
supabase stop
supabase db reset                                  # re-apply migrations + seed
supabase migration new <name>
supabase migration list
supabase functions serve                           # local Edge Function runner
supabase functions deploy                          # deploy all (remote)
supabase functions deploy <name>                   # deploy one
supabase gen types typescript --local > apps/glyph/src/lib/supabase/types.ts

# Studio URL: http://localhost:54323
# App URL:    http://localhost:3000

# Local doctor login (recreate after every `db reset` — auth users are wiped)
node scripts/dev-doctor.mjs http://127.0.0.1:54321 <sb_secret_key>   # → doctor@glyph.dev / glyph-dev-2026

# Real doctor onboarding (works on prod; no self-signup exists by design)
node scripts/create-doctor.mjs <SUPABASE_URL> <SERVICE_KEY> --email .. --password .. \
  --name "Dr. .." --phone 01XXXXXXXXX --clinic "Clinic Name" [--name-bn ..] [--bmdc ..]

# Lens/Hospital/Karigor org + staff onboarding (local or prod)
node scripts/create-org.mjs <SUPABASE_URL> <SERVICE_KEY> --type diagnostic_centre --name "Ibn Sina Diagnostics" --signer-email s@centre.bd --signer-password <pw> --signer-name "Dr. Signatory" --staff-email t@centre.bd --staff-password <pw> --staff-name "Technician"
node scripts/create-org.mjs <SUPABASE_URL> <SERVICE_KEY> --type hospital --name "Dev District Hospital" --signer-email s@hosp.dev --signer-password <pw> --signer-name "Dr. Signer" --staff-email d@hosp.dev --staff-password <pw> --staff-name "Doctor"
node scripts/create-org.mjs <SUPABASE_URL> <SERVICE_KEY> --type employer --name "Beximco RMG Unit 4" --signer-email s@employer.bd --signer-password <pw> --signer-name "Dr. Signatory" --staff-email d@employer.bd --staff-password <pw> --staff-name "Karigor Doctor"
node scripts/create-org.mjs <SUPABASE_URL> <SERVICE_KEY> --type recruiter --name "Al-Haramain Overseas" --signer-email s@recruiter.bd --signer-password <pw> --signer-name "Dr. Signatory" --staff-email d@recruiter.bd --staff-password <pw> --staff-name "Continuity Doctor"
node scripts/create-org.mjs <SUPABASE_URL> <SERVICE_KEY> --type program --name "Dhaka Urban MCH Program" --signer-email s@program.bd --signer-password <pw> --signer-name "Dr. Signatory" --staff-email d@program.bd --staff-password <pw> --staff-name "CHW Doctor"
node scripts/create-org.mjs <SUPABASE_URL> <SERVICE_KEY> --type specialist_panel --name "BD Oncology Specialist Panel" --signer-email s@panel.bd --signer-password <pw> --signer-name "Dr. Signatory" --staff-email d@panel.bd --staff-password <pw> --staff-name "Specialist Doctor"
  # Supported org types: diagnostic_centre, hospital, employer, recruiter, program, specialist_panel. clinic refused (use create-doctor.mjs). Signatory role is always 'signatory'; staff role is doctor (hospital/employer/recruiter/program/specialist_panel) or technologist (centre).

# Smoke suites (keys from `supabase start` output locally; for prod:
# `supabase projects api-keys --project-ref pywgimmcbzwnwcvnvmay -o json`)
node scripts/smoke-db.mjs <SUPABASE_URL> <sb_secret_key>
node scripts/smoke-path.mjs <SUPABASE_URL> <ANON_KEY> <SERVICE_KEY>          # THE regression gate
node scripts/smoke-egress.mjs <FUNCTIONS_URL> <SUPABASE_URL> <ANON> <SERVICE>
node scripts/smoke-documents.mjs <FUNCTIONS_URL> <SUPABASE_URL> <ANON> <SERVICE>
# smoke-credentials.mjs: LOCAL ONLY (append-only rows would be permanent on prod)
node scripts/smoke-lens.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_KEY>    # Lens v1: Section A = DB schema; Section B = full E2E (needs Next + edge fns running)
node scripts/smoke-hospital.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_KEY> # Hospital v1: Section A = discharge_records schema; Section B = full E2E (needs Next running, NO edge fns needed)
node scripts/smoke-karigor.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_KEY>      # Karigor v1: Section A = occupational_assessments schema; Section B = full E2E (needs Next running, NO edge fns needed — no LLM step)
node scripts/smoke-continuity.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_KEY> # Continuity v1: Section A = clearance_records schema; Section B = full E2E (needs Next running, NO edge fns needed — no LLM step)
node scripts/smoke-maa.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_KEY>        # Maa v1: Section A = antenatal_visits schema; Section B = full E2E create→save→sign→verify + cross-program RLS (needs Next running, NO edge fns needed — no LLM step)
node scripts/smoke-bridge.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_KEY>    # Bridge v1: Section A = specialist_opinions schema; Section B = full E2E create→save→doctor-403→sign→verify + cross-panel RLS (needs Next running, NO edge fns needed — no LLM step)

# Prod deploys (in this order when schema is involved)
supabase db push -p (Get-Content .db-password.glyph-prod.local)   # migrations → prod
supabase functions deploy                                          # all edge functions
supabase functions deploy lens-normalize --no-verify-jwt           # ⚠ MUST use --no-verify-jwt: lens-normalize
                                                                   # auths via LENS_SHARED_SECRET bearer; the
                                                                   # gateway JWT check rejects it without this flag
                                                                   # (same pattern as triage + extract-document)
vercel deploy --prod --yes                                         # frontend (server-side build;
                                                                   # local `vercel build` is broken on Windows)
```

---

## 7. Environment Variables

From `.env.example` (copy to `apps/glyph/.env.local` — **Next.js loads from the workspace, not the repo root**).

| Variable | Required for | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Required** for dev | From `supabase start` output |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Required** for dev | Same |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions (service writes) | Do NOT expose to client |
| `GOOGLE_CLOUD_PROJECT_ID` | ~~Vertex AI / MedGemma~~ **RETIRED** | No longer read — MedGemma is self-hosted (see `MEDGEMMA_BASE_URL` below) |
| `GOOGLE_CLOUD_SPEECH_KEY` | Google STT | Not yet wired end-to-end |
| `GEMINI_API_KEY` | Gemini API (native; OpenRouter used when absent) | `GOOGLE_AI_STUDIO_KEY` is legacy GCP-side only |
| `OPENROUTER_API_KEY` | LLM transport when native keys are absent | One key for Gemini/Claude/Perplexity/OpenAI |
| `ANTHROPIC_API_KEY` | Claude (native) | Optional — OpenRouter covers it |
| `OPENAI_API_KEY` | OpenAI (unused by any current function, but router supports it) | Optional |
| `PERPLEXITY_API_KEY` | Consult: recent studies | Optional |
| `MEDGEMMA_BASE_URL` | KhaM-Med self-hosted endpoint | Base URL for the OpenAI-compatible MedGemma endpoint (no trailing slash, e.g. `https://<endpoint>/v1`). **When unset (default), the `medgemma` provider is unavailable and all routes fall through to their fallback — no behavior change.** Set via `supabase secrets set` at light-up time. |
| `MEDGEMMA_API_KEY` | KhaM-Med self-hosted endpoint | Optional bearer token for the MedGemma endpoint. |
| `MEDGEMMA_MODEL` | KhaM-Med self-hosted endpoint | Optional model id override; defaults to whatever model id the calling route passes (e.g. `medgemma-27b-text-it`). |
| `UPTODATE_API_KEY` | UpToDate Connect | Optional — falls back to Claude synthesis |
| `UPTODATE_BASE_URL` | UpToDate endpoint | Optional — defaults to `https://connect.uptodate.com` |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Business API (`send-followup`) | Renamed from `WHATSAPP_BUSINESS_TOKEN` in M4 |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business API | Matches code |
| `TRIAGE_SHARED_SECRET` | Pocket v2 triage (server-to-server) | **Must be set with the SAME value in BOTH the Vercel env AND Supabase function secrets.** The `triage` edge fn is deployed `--no-verify-jwt` and authenticates only on this secret (a dedicated secret — NOT the service-role key, which differs between Vercel and the function's auto-injected env on this project). Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `WHATSAPP_PROVIDER` | WhatsApp bridge (Leg A) | Set to `360dialog` (default); selects the send/verify adapter in `lib/whatsapp/provider.ts` (`meta` is the alternate) |
| `DIALOG360_API_KEY` | WhatsApp bridge (Leg A) | From the founder's 360dialog channel — needed for outbound send; without it, outbound logs `failed` (expected in DB-only smoke) |
| `DIALOG360_API_BASE` | WhatsApp bridge (Leg A) | 360dialog API base URL (default `https://waba-v2.360dialog.io`); from founder's channel settings |
| `DIALOG360_PHONE_NUMBER_ID` | WhatsApp bridge (Leg A) | 360dialog phone number ID for the Glyph WA number; from founder's channel |
| `WHATSAPP_VERIFY_TOKEN` | WhatsApp bridge (Leg A) | Static string used for GET webhook challenge verification (set same value in 360dialog dashboard) |
| `DIALOG360_WEBHOOK_SECRET` | WhatsApp bridge (Leg A) | HMAC-SHA256 secret 360dialog uses to sign inbound POST payloads; used by `lib/whatsapp/verify.ts` |
| `GLYPH_WA_NUMBER` | WhatsApp bridge (Leg A) | The Glyph WhatsApp number for the QR bind flow, E.164 **without** `+` (e.g. `8801XXXXXXXXX`) — used verbatim in the `wa.me/<number>` link |
| `NEXT_PUBLIC_APP_URL` | WhatsApp bridge (Leg B) | Public app base URL, no trailing slash (e.g. `https://khamhealth.com`) — used to build the wallet link sent over WhatsApp |
| `WHATSAPP_BRIDGE_SECRET` | WhatsApp bridge (Leg C) | Shared secret the bridge sends to `extract-document` (deployed `--no-verify-jwt`). **Must be set with the SAME value in BOTH Vercel AND `supabase secrets set`** (same pattern as `TRIAGE_SHARED_SECRET`). Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `LENS_SHARED_SECRET` | Lens v1 normalize (server-to-server) | **Must be set with the SAME value in BOTH Vercel env AND `supabase secrets set`.** The `lens-normalize` edge fn is deployed `--no-verify-jwt` and authenticates only on this secret. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_APP_ENV` | App | `development` / `production` |
| `NEXT_PUBLIC_DEFAULT_LANGUAGE` | App | `bn` |
| `NEXT_PUBLIC_APP_NAME` | App | `Glyph` |

**Undocumented env vars read by code (must add to `.env.example` before these work):**
- `GEMINI_API_KEY` — `llm-router.ts`
- `WHATSAPP_ACCESS_TOKEN` — `send-followup`

**Retired env vars (no longer read by code):**
- `VERTEX_AI_API_KEY` — replaced by `MEDGEMMA_BASE_URL`; Vertex OAuth was broken by design anyway
- `GCP_PROJECT_ID`, `GCP_LOCATION` — were `callVertexMedGemma` defaults; adapter retired

---

## 8. Current Status (honest read as of 2026-06-11, branch `main`)

**Phase 2 is COMPLETE, MERGED, and LIVE IN PRODUCTION.** PR #1 merged `phase2/restructure` → `main` (merge commit `4ce0645`, full milestone history). `main` is the canonical branch; production (khamhealth.com) serves the same tree; the prod DB has migrations 001–004 applied. `AUDIT.md` remains the Phase 1 ground truth; §8.5 has the milestone detail.

### ✅ Live in production (every line verified by smoke tests against prod itself)
- **Full clinical loop**: register → Bangla AI intake (Web Speech bn-BD + typed fallback, streamed through the egress gate) → structured summary → realtime queue → briefing with red flags → consult → BD-format note → approve → signed VisitNote + Prescription credentials. (`smoke-path.mjs` 19/19 on prod.)
- **Document pipeline ("plastic bag")**: capture photos of old prescriptions/lab reports → consent at first capture → private `documents` bucket → `extract-document` (Tier B) → `prescriptions`/`lab_reports` rows → extracted cards on summary → briefing cites meds as "From Rx photo". (`smoke-documents.mjs` 16/16 on prod.)
- **Egress gate (M4)**: Tier A/B/C chokepoint, fail-closed twice over, append-only `egress_log`. Consent withdrawal blocks the next call and is never silently re-granted. (`smoke-egress.mjs` 8/8.)
- **Credential network (M3+M5)**: issuance seam, did:web at khamhealth.com, `/api/verify`, `/pharmacy` verify loop with revocation propagation.
- **Infra**: Supabase `pywgimmcbzwnwcvnvmay` (ap-southeast-1, Pro), Vercel production via CLI deploy (`main` is the git production branch; branch pushes = previews), OpenRouter as LLM transport (one key), CI green on pushes/PRs to `main`.

### ⚠ Known gaps (deliberate, not regressions)
- **Prod doctor accounts**: none exist out of the box — create via `scripts/create-doctor.mjs` (no self-signup until BMDC verification exists).
- `speech.ts` targets a `speech-stream` edge function that does not exist — v1 STT is the browser Web Speech API (transits Google outside the egress gate; covered by ai_processing consent, noted in NORTHSTAR-CORRECTIONS).
- MedGemma dormant from all primaries until a self-hosted endpoint is configured (`MEDGEMMA_BASE_URL`) and a route is re-promoted (a separate measured task); the `callSelfHostedMedGemma` adapter is wired and ready. Non-streaming — any route re-pointed at it must handle a plain-text (non-SSE) response.
- Native-Claude-stream SSE shape mismatch — latent, only if a native `ANTHROPIC_API_KEY` is ever set (OpenRouter normalizes today).
- Doctor nav: Schedule is a disabled "coming soon" stub (appointments aren't in the data model — needs a product decision). Patients and Settings are live screens.
- Many components keep inline Bangla strings with `TODO: i18n` markers (pre-existing pattern; new code should use `t()` but the M4/M5 screens did not — reconcile eventually).

---

## 8.5. Phase 2 Plan of Record (binding — from the founder's brief)

The architecture decision: **the Verifiable Credential is canonical; Postgres rows are projections.** If you ever find rows becoming the source of truth and VCs becoming an export, STOP — that is the failure mode this phase exists to prevent.

| Milestone | Work | Status |
|---|---|---|
| M0 | Real green CI | ✅ |
| M1 | Workspaces + `@kham/identity` + trust-root gate | ✅ |
| M2 | `@kham/schemas-clinical` | ✅ |
| **M3-pre** | `ai.ts` casing ✅ → schema/types reconciliation ✅ (root cause: `Database` was an `interface` → schema degraded to `never`; also `@supabase/ssr` 0.5→0.12) → patient-registration + `createVisit` ✅ (`scripts/smoke-db.mjs`, 14/14) → **one register→intake-turn(streaming)→note path LIVE on production** (`scripts/smoke-path.mjs`, 19/19 — Bangla multi-turn intake, BD-format note with Napa/1+0+1 dosing, via OpenRouter) | ✅ 2026-06-12 |
| M3 | **DONE.** Migration 002 (INSERT-only `credentials`, versioned `did_documents`, append-only status log, projection-freeze triggers; `scripts/smoke-credentials.mjs` 18/18) + the seam in `apps/glyph/src/lib/identity/` (`issueCredential` validates via schemas-clinical registry → signs via @kham/identity → canonical row → `rebuildProjections`). Routes: `/.well-known/did/[...slug]` (public did:web resolution), `/api/verify` (local resolveIssuer fast-path + store-status overlay), `/api/visits/approve-note` (first consumer: Rx + VisitNote credentials on approval, one-shot, 409 on re-approve). E2E `scripts/smoke-issuance.mjs` 14/14 incl. tampered-Rx rejection. Env: `DID_WEB_HOST` (khamhealth.com prod) + `CREDENTIAL_ENCRYPTION_KEY` (server-only; **founder must back it up — losing it orphans every stored private key**) | ✅ 2026-06-12 |
| M4 | **DONE** (except document-upload wiring — top follow-up). Egress gate ✅; all screens live (login/AuthGuard, registration, Web-Speech intake conversation + ConsentPrompt naming processors, summary, realtime dashboard, briefing+retry, consult, note→approve-note credentials, patient timeline); MedGemma demoted from primaries (now self-hosted adapter, dormant until MEDGEMMA_BASE_URL set); WhatsApp env renamed; null-visit usage logging | ✅ 2026-06-13 |
| M5 | **DONE.** `/pharmacy`: patient lookup by (family-shared) phone → DID → signed PrescriptionCredentials verified via the local fast-path (`✓ dispensable` / `✗ revoked` after a status transition — revocation propagates to the counter). Browser-verified both directions | ✅ 2026-06-13 |
| Post-P2 | **Document pipeline DONE + deployed** (2026-06-11): migration 004 private bucket + storage RLS, consent-at-capture, upload→extract→cards→briefing. Also: CORS preflight 500 fixed, "Saara" UI label removed (§12), intake-start consent insert idempotent + never resurrects withdrawn consent, doctor onboarding script. **PR #1 merged — `main` is canonical.** | ✅ 2026-06-11 |

**Egress hard constraint (M4, summarized):** every external-API call must declare a tier — **A** (structured fields only → de-identify then send), **B** (free-text transcripts / document images → consent-gated + over-redacted, or disabled), **C** (protected populations → never leaves the country, feature-flagged off). Enforced at a single chokepoint around `llm-router` that **fails closed** (un-tiered call rejected), with an append-only `egress_log`. Regex de-id is the Tier-A floor, **not** the control.

**Other binding rules:** one identity engine (never copy crypto — extend `@kham/identity`); don't build population-module surfaces (Continuity/Factory/Maa/Lens/Hospital/Bridge) — schemas stay compatible, surfaces stay unbuilt; W3C honesty — credentials are single-network verifiable today (JCS + base64 proof), not generic-W3C-interoperable until URDNA2015/Data Integrity; after M5, produce `NORTHSTAR-CORRECTIONS.md` rather than editing the vision doc directly.

**Working docs:** `inlinePrompt.md` (untracked) is the founder↔session channel — its contents change between sessions; read it at session start. `AUDIT.md` (tracked) is the Phase 1 ground truth.

---

## 9. Clinical Domain Context (DO NOT IGNORE)

- Bangladesh has ~1 doctor per 1,400 people. Volume is extreme — doctors see 50-100+ patients/day.
- Patients almost always come with an **attendant** (family member) who speaks on their behalf. The attendant protocol (source-tagging every fact as patient-reported / attendant-reported / attendant-translated / attendant-observed) is a differentiator, not a nice-to-have. See `docs/attendant-protocol.md` and `prompts/intake/attendant-mode.md`.
- Doctors use **paper Rx pads**, not EHRs. Glyph augments paper, it doesn't replace it.
- **Bangladesh prescription format:** `CC / O-E / Ix / Rx / Advice`. **Never SOAP** unless the doctor explicitly switches (`ClinicalNote.format: 'soap'` is supported as an opt-in, not the default).
- Rx dosing convention: `1+0+1` = morning + afternoon + night. Bangla numerals `১+০+১` also accepted in OCR.
- **Primary language is Bangla (বাংলা)** with English medical terms code-switched in. The UI defaults to Bangla (`<html lang="bn">`, `NEXT_PUBLIC_DEFAULT_LANGUAGE=bn`).
- Currency: ৳ (BDT/Taka).
- **PDPO 2025** (Bangladesh Personal Data Protection Ordinance) governs health data — consent is required, and health data is a sensitive category. See `docs/pdpo-compliance.md`.
- 74% of healthcare spending is out-of-pocket. **Cost-consciousness matters** when suggesting investigations.
- Drug names should prefer Bangladeshi brand/generic names (e.g., `Napa`, `Seclo`, `Losectil`, `Tab. Amlodipine`) not American brands (`Tylenol`, `Norvasc`). The reference data is in `prompts/reference/bd-drug-names.md`.
- Lab reports come from local diagnostic centers (Popular Diagnostics, Ibn Sina, Square, Labaid, etc.) with varying formats — see `prompts/reference/bd-diagnostic-centers.md`.
- **WhatsApp is the communication channel** for follow-ups (not SMS, not email).
- BMDC = Bangladesh Medical and Dental Council (registration authority). `doctors.bmdc_reg_no` is how doctors are identified professionally.

---

## 10. Prompts Inventory

All prompt files in `prompts/` are **real, detailed, and versioned** per the structure in `prompts/README.md` (§ "Prompt Structure"). None are placeholders.

| File | Lines | Purpose |
|---|---:|---|
| `persona/glyph-core.md` | 138 | Foundational identity, safety invariants, tone — the anchor every other prompt composes onto. |
| `intake/welcome.md` | 159 | Intake greeting prompt; warm Bangla opening. |
| `intake/conversation.md` | 301 | Main conversation policy — how to probe, when to stop, empathy rules. |
| `intake/attendant-mode.md` | 211 | How Glyph handles the attendant protocol and source-tags claims. |
| `intake/summary-generation.md` | 358 | Post-intake structured JSON summarization schema + rules. |
| `extraction/prescription-reading.md` | 312 | BD-prescription OCR grammar: 1+0+1 dosing, Rx/Ix/Dx abbreviations, Bangla/English mix. |
| `extraction/lab-report-reading.md` | 309 | BD-lab OCR grammar: reference ranges, abnormal markers, common panels (CBC/RFT/LFT/HbA1c/Thyroid/Urine). |
| `doctor/briefing-card.md` | 289 | Briefing-card schema + red-flag detection rules. |
| `doctor/clinical-consult.md` | 309 | Mid-consult research query policy. |
| `doctor/note-generation.md` | 246 | BD-format note generator (CC/O-E/Ix/Rx/Advice) + SOAP variant. |
| `doctor/linked-evidence.md` | 220 | How claims are mapped back to sources (patient utterance, document, UpToDate, etc.). |
| `patient/whatsapp-summary.md` | 249 | Patient-facing Bangla summary generator — no jargon, no emoji, 200-300 words. |
| `patient/followup-message.md` | 191 | Follow-up check-in message template. |
| `reference/bangla-medical-glossary.md` | 263 | Bangla ↔ English medical term mapping. |
| `reference/bd-drug-names.md` | 211 | Bangladeshi brand/generic drug reference. |
| `reference/bd-prescription-format.md` | 317 | BD Rx format specification. |
| `reference/bd-diagnostic-centers.md` | 283 | Major lab chains and their report formats. |
| `prompts/README.md` | — | Prompt engineering guide; model/temperature matrix, versioning, safety invariants. |

**Note:** the `prompts/README.md` model matrix was reconciled to the actual edge-function parameters on 2026-06-11. **The running code stays the source of truth** — re-sync the table whenever a function's `callLLM` config changes.

---

## 11. Conventions

Observed patterns in the code. Follow these for new work.

**File naming**
- React components: `PascalCase.tsx` (e.g. `BriefingCard.tsx`).
- Hooks: `useThing.ts` (e.g. `useIntakeConversation.ts`).
- Services/utils/stores: `kebab-case.ts` (e.g. `cost-tracker.ts`, `intake-store.ts`).
- Edge Functions: each function is its own directory with `index.ts`. Shared utilities live in `_shared/`.
- Prompts: `kebab-case.md`, grouped by workflow stage.

**Imports**
- In `apps/glyph`: always use the `@/*` path alias for anything under `apps/glyph/src/`. No relative `../../..` across modules.
- In `packages/*`: relative imports only (no `@/*` alias). App code imports packages by name (`@kham/identity`, `@kham/schemas-clinical`).

**Component structure**
- Client Components: start with `"use client";`. Default to RSC where possible, but most interactive clinical screens are client-side for voice/realtime/camera.
- One component per file; colocate small internal subcomponents (see `BriefingCard.tsx` → `BriefingSection`, `ClaimList`).
- JSDoc on exported components describing purpose, "THE" language for hero components (VoiceOrb = "THE primary interaction element", BriefingCard = "THE core UI component").
- Use `cn()` from `@/lib/utils/cn` for conditional classes. Never template-string class names.
- Semantic colors use Tailwind classes `glyph-*` (green primary), `clinical-*` (neutrals), `red_flag` (critical alerts).

**API / data flow**
- Client never calls LLM providers directly. Client → `apps/glyph/src/lib/services/ai.ts` → (fetch) → Supabase Edge Function → provider.
- Edge Functions always: (a) validate `Authorization` header via `supabase.auth.getUser()`, (b) use an anon-key client for reads respecting RLS, (c) use a service-role client for writes that bypass RLS, (d) log usage via `cost-logger.ts`, (e) deidentify before sending PII to external LLMs.
- Streaming responses use SSE (`text/event-stream`). The edge function `tee()`s the stream so one branch goes to the client while the other captures the full text to persist to the DB (see `intake-turn`, `generate-briefing`, `generate-note`).
- The Next.js `/api/[...path]/route.ts` catch-all proxies every `POST` to Supabase functions and passes SSE through as-is.

**State management**
- Zustand for cross-screen state (`auth-store`, `intake-store`, `consult-store`, `queue-store`). One store per workflow.
- React local state for screen-level interaction.
- Never fetch Supabase data directly from a component — go through a service in `lib/services/`.

**i18n**
- `useLanguage()` hook from `@/lib/i18n`. Default language is `bn`. Dictionaries are `bn.json` / `en.json`, keyed as `section.field` (two-level dots only).
- **Many components still have Bangla strings inlined** with `TODO: i18n key` comments. New code should use `t('section.field')`.

**Errors**
- Edge Functions return `{ success: false, error, code }` envelopes (`EdgeFunctionResponse<T>` in `types.ts`). HTTP status mirrors severity.
- Client services `throw new Error(...)` on non-ok responses; callers decide how to surface it (`sonner` Toaster is mounted at the root for notifications).

**Clinical output rules (baked into prompts — keep these invariant)**
- Never diagnose. Never prescribe. Always flag uncertainty. Always surface red flags. Never fabricate sources. Respect PDPO. Never override the doctor.

---

## 12. What NOT to do

- **Do not use SOAP note format by default.** BD format (CC/O-E/Ix/Rx/Advice) is the default. SOAP is an opt-in (`ClinicalNote.format: 'soap'`).
- **Do not send patient-identifying info to cloud LLMs.** Always pass through `deidentify()` first. Already wired for `consult-query`; extend any new external-facing function the same way.
- **Do not hardcode API keys** anywhere. All keys go through `Deno.env.get()` in edge functions and `process.env.NEXT_PUBLIC_*` in the client.
- **Do not put Bangla strings inline in new components.** Use `t('section.field')`. (Existing inline strings are tech debt — don't copy the pattern.)
- **Do not use the names "Saara" or "Saarah" anywhere in the product UI or visible copy.** The soul behind Glyph is internal design language only. Note: the existing `SaaraMessage.tsx` component is named that internally, which is fine — the *rendered* text must not expose the name.
- **Do not build native-app features.** Glyph is a PWA. Service worker + manifest only.
- **Do not assume patients come alone.** Every screen that captures input must account for the attendant scenario.
- **Do not use Western clinical defaults** — drug names, disease prevalence, workflow assumptions, insurance gatekeeping, etc. Bangladesh-specific references live in `prompts/reference/`.
- **Do not add new dependencies without checking** what's already installed (see `apps/glyph/package.json`). We're intentionally tight — Zustand for state, shadcn primitives for UI, lucide for icons, sonner for toasts, date-fns for dates. No new UI libs, no redux, no tanstack-query unless there's a strong reason.
- **Do not skip cost logging** in new Edge Functions. Every LLM call must end with a `logUsage()`.
- **Do not bypass RLS with the service-role client for reads** — use the anon client scoped to the user's `Authorization` header. Service role is for trusted writes only.
- **Do not amend existing prompts for style.** They're versioned and may require clinical review (`prompts/README.md` § "Iteration Process"). Style-only tweaks are fine; anything affecting clinical output is not.
- **Do not invent models.** As of 2026-06, the most recent Claude models are Fable 5 (`claude-fable-5`) and the 4.x family (`claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`). The code currently uses `claude-sonnet-4-20250514` — when upgrading, use a real current model ID, not a guess.
- **Do not write to `prescriptions.image_url`, `visits.queue_position`, or other columns that "feel right".** The schema source of truth is `supabase/migrations/001_initial_schema.sql`. If TypeScript needs an `as never`/`as any` cast to accept a Supabase insert/update, that is a signal the column doesn't exist — stop and check the migration.

---

## 13. Open Questions / Next Moves

Phase 2 (§8.5) is complete and merged; new work needs founder authorization (check `inlinePrompt.md` at session start). The follow-up queue, roughly by value:

1. **Founder actions**: back up `CREDENTIAL_ENCRYPTION_KEY` to a password manager (losing it orphans every stored private key); create the first real prod doctor via `scripts/create-doctor.mjs`; apply `NORTHSTAR-CORRECTIONS.md` to the vision doc.
2. **Pilot readiness**: doctor-facing Patients/Schedule/Settings screens (nav stubs exist); WhatsApp follow-up live verification (needs `WHATSAPP_ACCESS_TOKEN` + `whatsapp_followup` consent UI — that consent type is never collected today).
3. **W3C interop**: URDNA2015 / Data Integrity proofs so credentials verify outside this library.
4. **STT upgrade**: `speech-stream` Cloud STT relay (Render was deferred for exactly this workload) when bn-BD dialect accuracy demands it.
5. **Cleanups**: MedGemma fall-through SSE+double-log paths (dormant while demoted); native-Claude-stream SSE shape (dormant without a native key); i18n the inline Bangla strings; replace the generated placeholder PWA icons with the real brand mark when one exists.
6. **Verification culture** (keep it): every feature lands with unit tests + a `scripts/smoke-*.mjs` + a browser pass; `smoke-path.mjs` against prod is the regression gate after any functions/schema deploy.

---

**WhatsApp bridge design + plan:** `docs/superpowers/specs/2026-06-14-glyph-whatsapp-bridge-design.md` (architecture, schema, security model) and `docs/superpowers/plans/2026-06-14-glyph-whatsapp-bridge-leg-a.md` (task-by-task build plan for Leg A).

*Last updated: 2026-06-19 (all shipped to prod on `main`: owner/scope foundation migration 011; Lens v1 — migration 012 + /center routes + lens-normalize; Lens image-extract follow-up; KhaM-Med router integration — self-hosted OpenAI-compatible MedGemma adapter, DORMANT until `MEDGEMMA_BASE_URL` is set, Vertex path retired, `config.toml` now pins `verify_jwt=false` for triage/extract-document/lens-normalize so blanket function deploys are safe). Prod gates green: smoke-path 19/19, smoke-documents 16/16. Keep this file current. If a future session needs something and finds it missing here, that's a signal to add it.*
