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
| `packages/schemas-clinical` | `@kham/schemas-clinical` | Zod schemas for clinical VC *payloads* (`credentialSubject.data`): PhysicianRegistration, VisitNote (CC/O-E/Ix/Rx/Advice), Prescription (1+0+1 dosing), LabResult, DispensingEvent + shared envelope/registry. |

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

**Fonts:** Inter, Noto Sans Bengali, JetBrains Mono. **Theme colors:** `glyph-*` (green scale) and `clinical-*` (slate neutrals), `red_flag` for alerts (see `apps/glyph/tailwind.config.ts`).

**LLM providers wired in `supabase/functions/_shared/llm-router.ts`:** Gemini, MedGemma (via Vertex AI), Claude, OpenAI, Perplexity. Streaming is supported for Gemini and Claude.

---

## 3. Project Structure (real tree, not the scaffold prompt)

```
Glyph/
├── .env.example
├── .github/workflows/ci.yml       # npm ci → lint → type-check → test → build (genuinely green since M0)
├── README.md
├── AUDIT.md                        # Phase 1 audit (2026-05-30) — ground truth on every claimed-vs-measured gap. READ THIS.
├── glyph-vision-v3.1.md            # ⚠ UNTRACKED working doc — northstar; known to overstate (see AUDIT.md). Do not treat as ground truth.
├── inlinePrompt.md                 # ⚠ UNTRACKED working doc — founder ↔ session channel; contents change between sessions
├── package.json                    # workspace root: workspaces ["apps/*","packages/*"]; dev/build/lint proxy to glyph-web; test/type-check run --workspaces --if-present
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
│   ├── config.toml                 # Local dev: api 54321, db 54322, studio 54323
│   ├── seed.sql
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # All 8 tables, RLS, triggers
│   └── functions/
│       ├── _shared/
│       │   ├── cors.ts
│       │   ├── cost-logger.ts
│       │   ├── deidentify.ts       # PII strip + re-identify (names/phones/NID/addr)
│       │   ├── llm-router.ts       # Multi-provider + streaming + fallback
│       │   └── types.ts
│       ├── intake-start/
│       ├── intake-turn/
│       ├── intake-complete/
│       ├── extract-document/
│       ├── generate-briefing/
│       ├── consult-query/          # The router-of-routers (see §4)
│       ├── consult-uptodate/
│       ├── generate-note/
│       ├── generate-patient-summary/
│       └── send-followup/
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
        │   ├── page.tsx            # Landing: Doctor Login / রোগী ইনটেক শুরু করুন
        │   ├── api/[...path]/route.ts   # Catch-all proxy → Supabase Edge Functions
        │   ├── intake/
        │   │   ├── layout.tsx
        │   │   ├── page.tsx             # role selection (patient vs attendant)
        │   │   ├── history/page.tsx
        │   │   ├── conversation/page.tsx   # ⚠ still uses simulated STT + fake streaming (real wiring = rest of M3-pre/M4)
        │   │   └── summary/page.tsx
        │   └── doctor/
        │       ├── layout.tsx
        │       ├── page.tsx             # ⚠ still uses MOCK_PATIENTS (swap for useRealtimeQueue = M4)
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
        │   ├── services/            # ai, camera, speech, patients, visits, whatsapp
        │   ├── stores/              # auth-store, intake-store, consult-store, queue-store
        │   ├── supabase/            # client.ts, server.ts, types.ts (Database type)
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
| Prescription / lab OCR | `medgemma-4b` (vision) | `gemini-2.0-flash` | `extract-document` | No | Image fetched from Supabase Storage `documents` bucket |
| Briefing card | `medgemma-27b` | `claude-sonnet-4-20250514` | `generate-briefing` | **Yes (SSE)** | Outputs strict `BriefingCard` JSON, red-flag rules in system prompt |
| Consult: guideline | UpToDate Connect API → `claude-sonnet-4-20250514` | `gemini-2.0-pro` | `consult-query` → `consult-uptodate` | No | Falls through to LLM synthesis if UpToDate unavailable |
| Consult: drug interaction | `claude-sonnet-4-20250514` | `gemini-2.0-pro` | `consult-query` | No | Deidentifies context first |
| Consult: differential Dx | `claude-sonnet-4-20250514` | `gemini-2.0-pro` | `consult-query` | No | — |
| Consult: recent studies | `perplexity sonar-pro` | `claude-sonnet-4-20250514` | `consult-query` | No | — |
| Consult: lab interpretation | `medgemma-27b` | `claude-sonnet-4-20250514` | `consult-query` | No | — |
| Consult: generic clinical | `claude-sonnet-4-20250514` | `gemini-2.0-pro` | `consult-query` | No | Default route |
| Clinical note generation | `medgemma-27b` | `claude-sonnet-4-20250514` | `generate-note` | **Yes (SSE)** | BD format default, SOAP optional |
| Patient WhatsApp summary | `gemini-2.0-flash` | `gemini-1.5-flash` | `generate-patient-summary` | No | Entirely in Bangla, no emoji |
| WhatsApp delivery | WhatsApp Business Cloud API v19 | — | `send-followup` | No | Requires `whatsapp_followup` consent row |

**Routing inside `consult-query`** is regex-driven (`detectQueryType`) — see `supabase/functions/consult-query/index.ts`. Every external call is preceded by `deidentify()` and the response is passed through `reidentify()` before returning.

**Cost + usage logging:** `callLLM()` in `llm-router.ts` fires `logUsage()` to `api_usage_log` after every successful call. When the primary fails and fallback runs, the row is flagged `was_fallback = true`.

---

## 5. Database Schema Summary

From `supabase/migrations/001_initial_schema.sql`. Postgres 15, `uuid-ossp` enabled.

**Tables:**

| Table | Key columns | Notes |
|---|---|---|
| `clinics` | `id`, `name`, `district` | Single clinic per doctor (via `doctors.clinic_id`) |
| `doctors` | `id → auth.users(id)`, `clinic_id`, `bmdc_reg_no`, `preferred_language`, `preferred_note_format` | Phone unique; BMDC = Bangladesh Medical & Dental Council |
| `patients` | `clinic_id`, `name`/`name_bn`, `phone`, `age`, `blood_group`, `known_allergies JSONB`, `chronic_conditions JSONB` | Soft-denormalized allergies/conditions for fast briefing |
| `visits` | **central table** — `status` enum: `intake → intake_complete → in_consultation → note_review → completed → followup_sent`; includes `intake_transcript`, `intake_summary`, `briefing_card`, `consultation_transcript`, `consultation_queries`, `generated_note`, `doctor_edits`, `approved_note`, `evidence_links`, `api_costs`, attendant fields | Auto `visit_number` via trigger per patient |
| `prescriptions` | `patient_id`, `visit_id`, `source` (`photo_historical`/`photo_current`/`generated`), `medications JSONB`, `extraction_confidence` | Linked to image in Storage |
| `lab_reports` | Same pattern as prescriptions + `test_category`, `results JSONB` | — |
| `consent_records` | `consent_type` enum: `recording`, `data_storage`, `ai_processing`, `image_capture`, `whatsapp_followup`, `data_sharing`; `granted_by` ∈ {patient, attendant, guardian} | Tracks withdrawal + device info for PDPO audit |
| `api_usage_log` | `edge_function`, `model_used`, `was_fallback`, input/output tokens, latency, cost, error | Populated by `cost-logger.ts` |

**Indexes:** on `visits(patient_id|doctor_id|visit_date DESC|status|clinic_id,visit_date)`, `prescriptions(patient_id)`, `lab_reports(patient_id|category)`, `patients(phone|clinic_id)`, `consent_records(patient_id)`, `api_usage_log(visit_id)`.

**RLS:** Enabled on all 8 tables. Policy is **doctor-scoped-by-clinic** — a doctor can only see rows whose path traces back to their own `doctors.clinic_id`. `doctors` table has a self-access policy (`id = auth.uid()`).

**Triggers/functions:**
- `set_visit_number()` — auto-increments `visit_number` per `patient_id` on insert.
- `update_timestamp()` — bumps `updated_at` on `patients` and `visits`.

⚠ **`apps/glyph/src/lib/supabase/types.ts` has a history of drifting from this SQL** (audit item F: invented columns hidden behind `as never` casts). The migration file is the source of truth. Regenerate via `supabase gen types` once a live DB exists (M4); until then any hand edit must be checked line-by-line against `001_initial_schema.sql`.

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
```

---

## 7. Environment Variables

From `.env.example` (copy to `apps/glyph/.env.local` — **Next.js loads from the workspace, not the repo root**).

| Variable | Required for | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Required** for dev | From `supabase start` output |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Required** for dev | Same |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions (service writes) | Do NOT expose to client |
| `GOOGLE_CLOUD_PROJECT_ID` | Vertex AI / MedGemma | — |
| `GOOGLE_CLOUD_SPEECH_KEY` | Google STT | Not yet wired end-to-end |
| `GOOGLE_AI_STUDIO_KEY` | Gemini API | ⚠ name mismatch (M4) — `llm-router.ts` actually reads `GEMINI_API_KEY` |
| `ANTHROPIC_API_KEY` | Claude | Matches code |
| `OPENAI_API_KEY` | OpenAI (unused by any current function, but router supports it) | Optional |
| `PERPLEXITY_API_KEY` | Consult: recent studies | Optional |
| `UPTODATE_API_KEY` | UpToDate Connect | Optional — falls back to Claude synthesis |
| `UPTODATE_BASE_URL` | UpToDate endpoint | ⚠ Not currently read by code (hard-coded to `https://connect.uptodate.com/...`) |
| `WHATSAPP_BUSINESS_TOKEN` | WhatsApp Business API | ⚠ name mismatch (M4) — `send-followup` reads `WHATSAPP_ACCESS_TOKEN` |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business API | Matches code |
| `NEXT_PUBLIC_APP_ENV` | App | `development` / `production` |
| `NEXT_PUBLIC_DEFAULT_LANGUAGE` | App | `bn` |
| `NEXT_PUBLIC_APP_NAME` | App | `Glyph` |

**Undocumented env vars read by code (must add to `.env.example` before these work):**
- `GEMINI_API_KEY` — `llm-router.ts`
- `VERTEX_AI_API_KEY` — `llm-router.ts` (broken by design — Vertex expects OAuth, not a raw key; M4 replaces this)
- `GCP_PROJECT_ID`, `GCP_LOCATION` — `llm-router.ts` (`callVertexMedGemma`), defaults `"kham-health"` / `"us-central1"`
- `WHATSAPP_ACCESS_TOKEN` — `send-followup`

---

## 8. Current Status (honest read as of 2026-06-10, branch `phase2/restructure`)

**Phase 1 (audit) and the early Phase 2 milestones are done. The app has still never run end-to-end against live services** — that is by design of the build order, not an accident; the remaining mocks fall in M3-pre part 2 and M4. `AUDIT.md` is the canonical deep status document; this section is the summary.

### ✅ Done (verified, committed)
- **M0** (`c350e7b`) — CI is *genuinely* green: ESLint initialized, `--passWithNoTests` on the app, `sw.js`/workbox build artifacts untracked. Before this, CI had been red since the first commit.
- **M1** (`008b0fd`, `6b209dc`) — `web/` → `apps/glyph`; `@kham/identity` extracted from EIN with the 3 known frictions fixed: `server-only` imports dropped (guard at app boundary), sha512 wiring centralized in `src/crypto/ed.ts` (kills the import-order fragility), identity types pulled out of EIN's `lib/supabase/types.ts`. 7/7 trust-root tests pass (sign→verify, tamper-reject, expiry, did:web resolution, canonicalization stability, AES round-trip) and are the package's CI gate.
- **M2** (`55fb9b8`) — `@kham/schemas-clinical`: PhysicianRegistration, VisitNote, Prescription, LabResult, DispensingEvent payload schemas + shared envelope/registry. 11/11 tests.
- **M3-pre part 1** (`d21b06e`) — the audit's #1 blocker fixed: `ai.ts` now sends camelCase keys matching edge-function contracts, unwraps the `{success,data}` envelope; `consultQuery` is correctly non-streaming; `whatsapp.ts` targets the real `send-followup` function. **Live verification still deferred (no Supabase/keys yet).**

### ⚠ Known-broken (scheduled, do not "discover" these again)
- **Schema drift in client services**: `visits.ts`/`types.ts` were written against an invented schema — `queue_position`, `image_url`, `extracted_data`, `report_type`, `started_at`, `completed_at` do not exist in `001_initial_schema.sql` (real: `visit_number`, `image_path`, `test_category`, `consultation_started_at`/`consultation_ended_at`). Hidden by `as never` casts; fails at runtime. Reconciliation is the current work item (pulled forward from M4).
- Intake conversation page: simulated STT + fake streaming; doctor dashboard: `MOCK_PATIENTS`; briefing/consult/note pages: mock-backed. (M3-pre part 2 / M4.)
- `speech.ts` targets a `speech-stream` edge function that **does not exist** (M4 builds it).
- Vertex/MedGemma auth uses a static key; Vertex requires OAuth — all MedGemma routes 401 and fall through (M4).
- Env-var name mismatches (`GOOGLE_AI_STUDIO_KEY` vs `GEMINI_API_KEY`, `WHATSAPP_BUSINESS_TOKEN` vs `WHATSAPP_ACCESS_TOKEN`) — M4.
- **PDPO: de-identification is ABSENT from 8 of 9 external-facing functions** (only `consult-query`'s `patientContext` is covered). The fix is the tiered egress policy in §8.5, not "more regex". Nothing real has shipped because nothing has run — but treat every new external call as if the gate already existed.

---

## 8.5. Phase 2 Plan of Record (binding — from the founder's brief)

The architecture decision: **the Verifiable Credential is canonical; Postgres rows are projections.** If you ever find rows becoming the source of truth and VCs becoming an export, STOP — that is the failure mode this phase exists to prevent.

| Milestone | Work | Status |
|---|---|---|
| M0 | Real green CI | ✅ |
| M1 | Workspaces + `@kham/identity` + trust-root gate | ✅ |
| M2 | `@kham/schemas-clinical` | ✅ |
| **M3-pre** | `ai.ts` casing ✅ → schema/types reconciliation (in progress) → patient-registration + `createVisit` → one intake→note path live | ◑ current |
| M3 | `issueCredential` seam: build VC → sign → canonical row in `credentials` → projection upsert. New tables `credentials`/`did_documents`/`credential_status_log` are INSERT-only (UPDATE/DELETE-blocking triggers, no `updated_at`). Amendments = new credential with `replaces` pointer, never overwrite. DID docs at `.well-known/did/...` | pending |
| M4 | Kill mocks, wire scribe live, build `speech-stream`, Vertex OAuth, env-var fixes, regenerate types from live DB, **tiered egress policy** | pending |
| M5 | Two-node loop: doctor issues Rx credential → pharmacy view verifies via local `verifyCredential`. **Stop after M5 and report.** | pending |

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

**Important:** `prompts/README.md` lists a model matrix that differs from what edge functions actually use. For example, `prompts/README.md` says briefing card uses `Gemini 2.0 Flash @ 0.2 / 4096`, but `generate-briefing/index.ts` uses `medgemma-27b @ 0.2 / 4000` with Claude Sonnet 4 fallback. **The running code is the source of truth**; treat the README table as aspirational until reconciled.

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

The plan of record is §8.5 — follow the milestone order, don't freelance. Immediate queue:

1. **Finish M3-pre**: reconcile `types.ts` + visit/patient services to the real migration, then build patient-registration + `createVisit` (`registerAndStartVisit`), then get one intake→note path running against live Supabase.
2. **Live Supabase**: nothing has ever been verified against a real DB. `seed.sql` uses placeholder `auth.users` UUIDs, so local login yields `doctor: null` until seeding is fixed — fix when standing up the local stack.
3. **M3** issuance seam (only after M3-pre's live path exists).
4. **M4** — see §8.5; the egress tier policy is the heart of it. Smaller M4 items: `prompts/README.md` model matrix reconciliation, `UPTODATE_BASE_URL` unused, `consult-uptodate` URL hard-coded.
5. After M5: stop, report, write `NORTHSTAR-CORRECTIONS.md`.

---

*Last updated: 2026-06-10 (post-restructure; M0–M2 + M3-pre part 1 landed). Keep this file current. If a future session needs something and finds it missing here, that's a signal to add it.*
