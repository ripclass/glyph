# Glyph — Phase 1 Audit

**Date:** 2026-05-30
**Scope:** Audit only. No production code in Glyph or EIN was modified. (One throwaway test file was written into the EIN repo to execute the trust-root checks, then deleted — EIN is back to its prior state.)
**Method:** Direct inspection + execution. Build/type-check/lint/test were run. EIN's identity core was exercised with a throwaway harness against its real code. Four read-only sub-agents mapped the mocks, edge functions, TODO debt, and schema.

> **One-line verdict.** The brief's framing holds up under measurement. Glyph **compiles and builds** but has **never run end-to-end** — every client→edge call is broken by a casing mismatch, the doctor flow is mock-backed, and one external-API function out of nine de-identifies. EIN's identity envelope, by contrast, is **real and provably correct** (6/6 trust-root checks pass on execution). The lift is low-risk; the integration work and the PDPO de-identification gap are where the real effort and the real exposure sit.

---

## 0. Ground truth — claimed vs. measured

| Claim (brief / vision doc / CLAUDE.md) | Measured | Verdict |
|---|---|---|
| Glyph "1 commit" | **2 commits** (`6df9055` scaffold, `3ff1347` CLAUDE.md) | ~claim (one extra) |
| ~133 files | **133 tracked files** | ✅ |
| 0 tests | **0 test files** (`vitest`: "No test files found, exiting with code 1") | ✅ |
| ~106 TODO/placeholder markers | **138 raw grep hits** incl. docs/lockfile; **~66 distinct in-code markers** | ✅ (order right) |
| 10 edge functions calling real APIs | **10 functions, all call real provider APIs** | ✅ |
| 18 prompts (~4,520 lines) | Not re-counted; structure matches | ✅ (trusted) |
| 8 tables, "12 indexes" | **8 tables, 12 indexes, RLS on all 8, 3 triggers** | ✅ (vision says 11; actual 12) |
| "9 routes" | **10 page routes** (landing + 4 intake + 5 doctor) + `/api/[...path]` catch-all | minor |
| Zero identity-layer code | **Confirmed — no DID, Ed25519, VC, or `.well-known` anywhere in Glyph** | ✅ |
| "Clean TypeScript build" | **TRUE** — `tsc --noEmit` and `next build` both pass | ✅ but see §A |
| EIN identity core "real, working-shaped" | **TRUE and proven by execution** | ✅ see §E |
| EIN "1 commit, 0 tests" | **2 commits, 0 test files** | ✅ |

---

## A. Run-vs-compile reality

Commands run from repo root on Node 24.14 / npm 11.2 (CI targets Node 20).

| Step | Result | Notes |
|---|---|---|
| `npm install` | **PASS** (exit 0) | clean |
| `npm run type-check` (`tsc --noEmit`) | **PASS** (exit 0) | genuinely clean |
| `npm run build` (`next build`) | **PASS** (exit 0) | Next 14.2.35, 9 app routes prerendered, First-Load JS 96–106 kB (matches vision doc) |
| `npm run lint` (`next lint`) | **FAIL** (exit 1) | **Not a lint error** — ESLint is uninitialized. `next lint` drops into its interactive "How would you like to configure ESLint?" prompt and dies non-interactively. No `.eslintrc*`/`eslint.config.*` exists in `web/`, although `eslint` + `eslint-config-next` are installed. |
| `npm run test -- --run` | **FAIL** (exit 1) | `vitest` → "No test files found, exiting with code 1". Script lacks `--passWithNoTests`, so it errors rather than passing vacuously. |

**CI is almost certainly red and always has been.** `.github/workflows/ci.yml` runs `lint → type-check → test → build`. **`lint` is the first step and it fails on a fresh checkout**, so the pipeline never reaches the steps that pass. The "test" step is doubly broken (no tests + no `--passWithNoTests`). The green-looking CI badge story is fiction.

**"Compiles" ≠ "works."** The build is a static prerender over mock data; it touches no live service. What breaks on first real run (each detailed in later sections):
- **Every** client→edge call 400s on a snake_case/camelCase body-key mismatch (§D, §C).
- STT is wired to a `speech-stream` edge function **that does not exist** (§C).
- WhatsApp calls target function names (`whatsapp-send-summary`, `whatsapp-send-followup`) that **don't exist** — the deployed function is `send-followup` (§C, §D).
- All MedGemma calls will 401 — Vertex AI is called with a static API key where it requires an OAuth access token (§D).
- `seed.sql` uses placeholder `auth.users` UUIDs, so a local `db reset` produces a DB whose `doctors` rows can never join a real auth session — login returns `doctor: null` (§B).

---

## B. TODO / placeholder triage

~66 distinct in-code markers (138 raw hits including docs and the lockfile). Bucketed:

| Bucket | Count | Meaning |
|---|---:|---|
| (i) Blocks first-doctor demo | **14** | Stops intake→briefing→consult→note from running against live services |
| (ii) Blocks identity layer | **0** | There is no identity code to have debt — clean slate |
| (iii) Cosmetic / later | **~52** | Almost entirely `TODO: i18n key` (inline Bangla strings not yet in `bn.json`) |

**Highest blast radius (the 14, ranked):**

1. `web/src/lib/services/ai.ts` (all 6 exported fns, lines ~153–254) — **snake_case body keys** (`visit_id`, `is_attendant`, `image_url`) vs camelCase edge-function contracts. Single widest blocker; nothing end-to-end works until fixed.
2. `web/src/lib/services/speech.ts:68` — connects to `/functions/v1/speech-stream`, **a function that does not exist**. Kills both intake STT and ambient recording.
3. `web/src/app/intake/conversation/page.tsx:66–127` — **simulated STT + fake `setInterval` streaming**; the real `useIntakeConversation` hook is imported nowhere.
4. `web/src/app/doctor/page.tsx:38–50` — `MOCK_PATIENTS`; the Supabase Realtime subscription is commented out. New visits never appear.
5. `web/src/app/doctor/briefing/[visitId]/page.tsx:28–36` — `MOCK_BRIEFING`; ignores `visitId`, always renders the same canned patient.
6. `web/src/app/doctor/consult/[visitId]/page.tsx:63–91` — `setTimeout` fake AI response; `useConsultChat` never called.
7. `web/src/app/doctor/note/[visitId]/page.tsx:45–62,112–121` — hardcoded note; approve = `console.log`; send = `setTimeout`. No write to `visits.approved_note`.
8. `web/src/app/intake/summary/page.tsx:44–63` — hardcoded summary; "Send to Doctor" is a `setTimeout` no-op. `intake-complete`→`generate-briefing` is never triggered.
9. `web/src/app/intake/conversation/page.tsx:31` — `attendantRelation` permanently `""`; the attendant-protocol source-tagging (a stated differentiator) receives an empty label.
10. `supabase/seed.sql:12` — placeholder doctor UUIDs that won't match `auth.users`.

**Misleading markers worth knowing:** `useIntakeConversation.ts` / `useConsultChat.ts` "placeholder AI message" comments are normal streaming UX, not stubs — those hooks are complete. `PatientQueue.tsx:75` has a stale "Realtime placeholder" comment, but the real subscription exists in `useRealtimeQueue.ts`; the fix is one line in `doctor/page.tsx`. `ConsentPrompt.tsx` is complete but **imported by no page** — consent is never surfaced during intake (a PDPO concern, not a demo blocker).

---

## C. Mock-wiring map

**10 page routes.** Status:

| Route | Status | Renders from |
|---|---|---|
| `/` | static shell | two `<Link>`s, no data |
| `/intake` | stub | writes role to `sessionStorage` |
| `/intake/history` | **partial** | real camera capture; images never uploaded, only a count saved |
| `/intake/conversation` | **mock** | simulated transcript + fake streaming |
| `/intake/summary` | **mock** | hardcoded Bangla summary; fake send |
| `/doctor` | **mock** | `MOCK_PATIENTS` (Realtime commented out) |
| `/doctor/briefing/[visitId]` | **mock** | `MOCK_PATIENT` + `MOCK_BRIEFING` |
| `/doctor/consult/[visitId]` | **mock** | hardcoded panel + `setTimeout` AI |
| `/doctor/note/[visitId]` | **mock** | hardcoded `bdNote`/`soapNote`; no-op approve/send |
| `/doctor/patient/[patientId]` | **mock** | 5 `MOCK_*` constants |

**The doc claim "6 hooks, 6 services, 4 stores are real" is essentially TRUE as *implementations* — but almost none are *wired*.** The architecture exists; the pages bypass it.

| Layer | Real | Notes |
|---|---|---|
| Hooks (6) | **All 6 real** | `useVoiceInput`, `useAmbientRecording`, `useIntakeConversation`, `useConsultChat`, `usePatientHistory`, `useRealtimeQueue` — fully implemented, **imported by zero pages** |
| Services (6) | 4 real, 2 broken | `camera`/`patients`/`visits` real (real Supabase queries); **`ai` partial** (correct fetch plumbing, wrong body-key casing + a streaming/JSON mismatch on `consultQuery`); **`speech` broken** (targets non-existent `speech-stream`); **`whatsapp` broken** (wrong function names) |
| Stores (4) | **All 4 real** | correct shapes; pages use local `useState`/`sessionStorage` instead |
| Auth | real but un-bootstrapped | `auth-store.checkSession()` is complete but **never called** by any layout — no doctor identity is ever loaded |

**Mock-removal critical path:** fix `ai.ts` casing → fix `whatsapp.ts` names → build/replace `speech-stream` → bootstrap auth in `doctor/layout.tsx` → swap `MOCK_PATIENTS` for `useRealtimeQueue` → fetch real `briefing_card` by `visitId` → wire conversation page to `useVoiceInput`+`useIntakeConversation` (needs a real `visitId`, which needs a patient-registration + `createVisit` step that **does not exist yet**) → wire consult to `useConsultChat` → wire note to `generateNote` + DB write. The missing **patient registration / visit-creation step** is an architectural gap, not just a mock swap.

---

## D. Edge-function reality + the de-identification compliance finding

All 10 functions call real provider APIs. Input/output contracts are coherent **server-side**, but the **client contract is broken across the board**.

| Function | Provider(s) | Streams | Client input OK? | Output OK? |
|---|---|---|---|---|
| intake-start | Gemini | no | **400 (`visit_id` vs `visitId`)** | ok |
| intake-turn | Gemini | SSE | **400 (casing)** | ok |
| intake-complete | Gemini→Claude-haiku | no | **400 (casing)** | **shape mismatch** (client expects `IntakeSummary`, gets `{summary,…}`; client type snake_case, server camelCase) |
| extract-document | MedGemma-4b→Gemini | no | **400 (casing + missing required `patientId`)** | ok |
| generate-briefing | MedGemma-27b→Claude | SSE | **400 (casing)** | ok |
| consult-query | Claude/Gemini/MedGemma/Perplexity/UpToDate | no | **400 (casing)** | **mismatch — returns JSON, client calls `invokeStreamingFunction`** |
| consult-uptodate | UpToDate→Claude→Gemini | no | ok (server-to-server only) | ok |
| generate-note | MedGemma-27b→Claude | SSE | **400 (casing)** | ok |
| generate-patient-summary | Gemini | no | n/a (no client path; called by send-followup) | ok |
| send-followup | WhatsApp Cloud API v19 | no | **404 (wrong fn name) + casing** | ok |

**Vertex/MedGemma auth is broken** (`_shared/llm-router.ts:163–169`): `Authorization: Bearer ${VERTEX_AI_API_KEY}` — a static env var. Vertex's `aiplatform.googleapis.com` requires a short-lived OAuth2 access token (`cloud-platform` scope) from a service account; there is no token flow anywhere. All MedGemma-primary routes (extract-document, briefing, note, consult lab-interpretation) will 401 and fall through to Claude/Gemini.

### The compliance finding (flagged as such)

**`deidentify()` is invoked in exactly one function — `consult-query` — and even there only on `patientContext`, not the raw doctor `query`.** Every other external-API function ships raw PII to foreign clouds (Google, Anthropic, Meta):

| Function | PII leaked to external API (no de-identification) |
|---|---|
| intake-start | patient name, age, gender, attendant name + relation |
| intake-turn | name, age, gender, allergies, chronic conditions, **full verbatim conversation incl. spoken symptoms** |
| intake-complete | **entire intake transcript**, attendant name/relation |
| extract-document | **document image** incl. printed/handwritten patient + doctor names |
| generate-briefing | name, age, gender, blood group, allergies, conditions, full history, all prescriptions/labs |
| consult-query | `patientContext` de-identified ✅; raw `query` **not** (forwarded raw to UpToDate + LLM) |
| generate-note | full record + consultation transcript + prior queries |
| generate-patient-summary | name, doctor name, full diagnosis + prescription |
| send-followup | name, doctor, full Bangla clinical summary → Meta |

This is a **systemic PDPO-2025 exposure**: health data (a sensitive category) crosses the border un-de-identified in 8 of 9 external-facing functions. The vision doc (§20) already names this the "soft underbelly" but understates it — the doc implies de-identification is wired and the gap is *quality* (regex vs ML); the code shows it is **absent** from nearly every path. This is the single most urgent correctness/legal finding in the audit.

---

## E. EIN identity-core fitness for lift — **PROVEN**

EIN's identity core is real, not stubs: `lib/crypto/{keys,encrypt,hash}.ts`, `lib/credentials/{sign,verify,issue,revoke,present,canonicalize,types,schemas}.ts`, `lib/did/{document,generate,resolve}.ts`, `lib/issuers/helpers.ts`, plus `app/.well-known/did/[...slug]/route.ts` and `app/api/v1/`. Stack: `@noble/ed25519@3` + `@noble/hashes@2`, `multiformats`, `jsonld`, `zod@4`, on Next 16 / React 19.

**I did not trust the read — I executed it.** A throwaway harness imported EIN's real modules and ran the five required trust-root checks plus an AES-at-rest check:

```
PASS  1. sign->verify round-trip        — valid=true  status=valid  trust=issuer_verified
PASS  2. tampered payload rejected      — valid=false status=signature_invalid
PASS  3. expired credential flagged     — valid=false status=expired  trust=expired
PASS  4. did:web resolution round-trip  — did:web:glyph.health:.well-known:did:doctor-abc
                                          → https://glyph.health/.well-known/did/doctor-abc/did.json, verify=valid
PASS  5. canonicalization stability     — key-order independent, deterministic, array order preserved
PASS  6. AES-256-GCM at-rest round-trip — decrypts to original
```

Check 2 is the one that matters most: **a tampered credential is rejected** — `verify` does not wrongly return `true`. The trust root is sound. **The lift estimate is now a measurement, not a belief.**

### Friction for lifting into a shared package (real, but all minor)

1. **`server-only` headers.** `keys.ts`, `sign.ts`, `encrypt.ts`, `did/generate.ts`, `credentials/issue.ts` start with `import "server-only"`. Under plain Node/test this *throws* unless the `react-server` export condition is set (I ran with `NODE_OPTIONS=--conditions=react-server`). A framework-agnostic package must drop these and instead document/guard "private-key ops are server-only" at the app boundary.
2. **`@/*` path aliases + type entanglement.** Internal imports use `@/lib/...`, and the identity types (`DIDDocument`, `PublicKeyJwk`, `TrustLevel`, `CredentialType`) live inside **`lib/supabase/types.ts`**. Extraction must pull those types out into the package and rewire imports to relative paths.
3. **Fragile sha512 wiring.** `@noble/ed25519@3` needs SHA-512 wired manually. `keys.ts` and `verify.ts` do it; **`sign.ts` does not** and relies on one of them being imported first (a module-singleton side effect). The package must centralize this in one `init` module imported by the index.
4. **Runtime assumptions.** Uses Node `Buffer` (base64) and Web Crypto `crypto.subtle` (AES-GCM). Both are fine in the Next.js server runtime (the brief's chosen home). Do **not** port into Deno edge functions.
5. **Version skew is a non-issue for the envelope.** EIN is Next16/React19/zod4; Glyph is Next14/React18. The crypto/DID/credential envelope imports **no React/Next** — only `@noble`, `Buffer`, `crypto.subtle`, `fetch`. It lifts cleanly across the version gap. `zod@4` is only used by EIN's *supply-chain schemas*, which we are **not** keeping (§F/§G).

### Vision-vs-code gap to surface (per the brief)

EIN's `canonicalize.ts` is a **pragmatic JCS** (sort keys, compact JSON) and `sign.ts` emits an `Ed25519Signature2020`-labelled proof with a **base64** `proofValue` over JCS bytes — **not** the W3C Data Integrity / URDNA2015 / multibase form. It is internally consistent (this library's `verify` agrees with its `sign`), which is all the in-network "doctor → pharmacy" loop needs. But the vision's claim that credentials are "verifiable by anyone holding an issuer's public key" is true **only for verifiers using this same library** — not for a generic W3C VC verifier. `canonicalize.ts`'s own comment admits URDNA2015 is "a follow-up." Keep this honest in the northstar: **single-network verifiable today; W3C-interoperable later.**

---

## F. Data-model gap

8 tables, 12 indexes, RLS (doctor-scoped-by-clinic) on all 8, 3 triggers (`set_visit_number`, two `update_timestamp`). The schema is a clean, conventional **rows-first clinical DB**.

**The claim "append-only patterns ready for VC storage" is ASPIRATIONAL, not true.** Evidence from `001_initial_schema.sql`:
- **No** `credentials`/VC table, **no** `issuer_did`/`subject_did`/`public_key`/`signature`/`proof`/`hash` columns, **no** `.well-known`/DID anything.
- **No** immutability enforcement — no trigger RAISEs on UPDATE/DELETE anywhere.
- The two `update_timestamp` triggers actively **facilitate** mutation of clinical facts. `visits.generated_note`, `approved_note`, `briefing_card`, `intake_summary`, and `status` are plain mutable columns, overwritten in place with no version history.
- The closest thing to append-only is `consent_records.withdrawn_at` (soft-delete by convention) and `api_usage_log` (insert-only by convention) — neither enforced.

So the current design is **exactly the "rows first" failure mode** the brief exists to prevent. To make rows a projection over credentials:

| Clinical fact | Today | Becomes VC | Missing |
|---|---|---|---|
| Physician registration | `doctors.bmdc_reg_no` (plain text) | `PhysicianRegistrationCredential` | doctor DID, signing key |
| Visit note / Rx | `visits.approved_note`, `prescriptions.medications` | `VisitNote` / `Prescription` credential | issuer signature; immutability after issue |
| Lab result | `lab_reports.results` | `LabResultCredential` | lab DID, chain of custody |
| Consent | `consent_records` | `ConsentCredential` | signature on the grant |

**New schema needed:** a canonical `credentials` table (`vc_id`, `type[]`, `issuer_did`, `subject_did`, `issued_at`, `expires_at`, `credential_json` JSONB [JCS-canonical], `jws_proof`, `status`, `revoked_at`; **no `updated_at`**, INSERT-only with an UPDATE/DELETE-blocking trigger); a `did_documents` table; a `credential_status_log` (append-only revocation audit); `did`/key columns on `patients`/`doctors`/`clinics`; and `*_credential_id` FKs on `visits`/`prescriptions`/`lab_reports` pointing at the canonical row the projection was built from. The mutable/immutable conflict resolves by: amendments issue a **new** credential (`replaces` pointer) rather than overwriting; a trigger blocks mutation of a credentialed column once its `*_credential_id IS NOT NULL`; operational columns (`status`, timestamps, `api_costs`) stay mutable.

*(Aside: `web/src/lib/supabase/types.ts` is significantly out of sync with the SQL — many columns omitted, several renamed/invented. Regenerate it with `supabase gen types` before any projection code reads it.)*

---

## G. Proposed restructure plan

Given A–F and the non-negotiables, here is the concrete plan. Estimates are engineering-days for a solo founder + AI tooling; they assume the trust-root lift is low-risk (proven) and that the integration/PDPO work is where the time really goes.

### Workspace layout (npm workspaces — keep it lightweight)

```
glyph/  (repo root)               package.json → workspaces: ["apps/*","packages/*"]
  apps/glyph/                      (was web/) — Next.js 14 PWA, identity API routes + .well-known
  packages/identity/               @kham/identity — lifted EIN envelope (crypto, did, credentials)
  packages/schemas-clinical/       @kham/schemas-clinical — Zod clinical VC schemas (authored fresh)
  supabase/                        unchanged — Deno edge functions stay for LLM/clinical work
```

### `@kham/identity` extraction steps (Milestone 1)

1. Scaffold `packages/identity` (deps: `@noble/ed25519@^3`, `@noble/hashes@^2`; add `jsonld`/`multiformats` later for URDNA2015). Own `tsconfig`, no `@/*` alias.
2. Copy **envelope only**: `crypto/{keys,encrypt,hash}`, `credentials/{sign,verify,issue,revoke,present,canonicalize,types}`, `did/{document,generate,resolve}`, `issuers/helpers`. **Drop** `credentials/schemas.ts` (supply-chain).
3. Extract identity types out of EIN's `lib/supabase/types.ts` into `packages/identity/src/types.ts`; rewire imports to relative.
4. **Remove `server-only`**; document private-key ops as server-only and guard at the app layer.
5. **Centralize SHA-512 wiring** in one `init.ts` (kills the sign.ts import-order fragility).
6. Port the 6 trust-root checks into the package as its CI gate (vitest or `node:test`). **The package does not publish until they pass** (non-negotiable #5 — already proven achievable).
7. Leave EIN working: add a thin re-export shim in EIN, or simply leave EIN as-is for now and note it. Do not fork.

### Issuance seam (Milestone 3 — non-negotiables #1, #2)

One server path: `issueCredential({ type, issuerDid, issuerPrivateKey, subjectDid, claims, validFrom, validUntil })` → build VC (schemas-clinical) → sign (identity) → **write canonical VC to `credentials`** → upsert projection row(s). Self-issued by the writer's Glyph-generated key now; when BMDC anchors that key later, the *same stored credential* verifies as `issuer_verified` with **no migration** (proven by the §E expiry/trust-level behavior). Provide `rebuildProjections(subjectDid)` that recomputes rows from credentials.

### Clinical credential schemas (Milestone 2)

`PhysicianRegistrationCredential`, `VisitNoteCredential` (CC/O-E/Ix/Rx/Advice), `PrescriptionCredential` (1+0+1 dosing), `LabResultCredential`, `DispensingEventCredential`. Share a common envelope (`subjectDid`, `encounterContext`, `sourceTags[]`, `issuedBy`) so future `ANCVisit`/`FactoryEncounter`/`MigrantRegistration` fit without a schema break — **designed-for, not built** (non-goal compliance).

### Order of operations + honest estimates

| Step | Work | Est. |
|---|---|---|
| **M0** Housekeeping | Commit/revert `web/public/sw.js`; init ESLint config; add `--passWithNoTests`; make CI green for real | 0.5–1 d |
| **M1** Workspace + `@kham/identity` + trust-root tests green | low-risk lift (proven); friction = server-only/aliases/type-extraction/sha512-init | 2–4 d |
| **M2** `schemas-clinical` (5 Zod schemas) | authored fresh, EIN as pattern | 1–2 d |
| **M3** Issuance seam + `credentials`/`did_documents`/status-log tables + immutability triggers + DID gen at registration + `.well-known/did` publishing | the core of the new architecture | 4–7 d |
| **M4** Kill mocks / wire scribe to live services | fix `ai.ts` casing, `whatsapp.ts` names, build `speech-stream`, **fix Vertex OAuth**, **extend `deidentify` to all external fns**, add patient-registration/visit-creation step | 5–9 d |
| **M5** Two-node verify loop | doctor issues Rx VC → pharmacy view verifies via `verifyCredential` local fast-path | 2–3 d |
| | **Total** | **~15–26 d** |

The risk is **not** in M1 (the lift is proven). It is concentrated in **M4** — the first time anything in Glyph runs end-to-end against live services, plus two net-new builds (Vertex OAuth, the missing `speech-stream` function) and the PDPO de-identification rollout.

### Where I'd push back on the non-negotiables (raised, not relitigated)

I agree with all six in principle. Two flags:

1. **Sequencing M3 before M4 (mild concern, not a rejection).** Building a credential-canonical write path on top of a scribe that has *never executed end-to-end* risks perfecting the vault while the front door is off its hinges. I'd interleave: land the **M4 essentials that make one path real** (fix the casing bug, create the visit, get a single intake→note flow running) *before or alongside* M3, so the issuance seam is built against a flow that actually runs. The credential stays canonical; we just avoid designing the seam in the dark. If you'd rather hold the strict M3→M4 order, that's fine — but keep the seam thin and the immutability triggers from blocking the first demo.
2. **"Credential-canonical, W3C-verifiable" needs the honesty caveat from §E.** The envelope is single-network-verifiable today (JCS + base64 proof), not generically W3C-interoperable until URDNA2015/Data-Integrity is added. Build to non-negotiable #1 as written; just don't let the northstar imply external interoperability that the proof format doesn't yet deliver. It's a follow-up, and the code already says so.

---

## Phase-1 close

Audit complete. Nothing in Glyph or EIN was changed (the EIN throwaway test was deleted). **Awaiting explicit approval before any Phase 2 restructuring** — per the brief, I will not start on my own initiative.

Three things I'd want a decision on before M1:
- **M0 housekeeping** (commit/revert `sw.js`, fix CI) — cheap, do-now? 
- **M3-before-M4 sequencing** — strict order, or the interleave I proposed?
- **PDPO de-identification** — the §D gap is a live legal exposure today; do you want it pulled forward as an immediate fix rather than waiting for M4?
