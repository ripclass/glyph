# Glyph — Phase 2 Authorization & Build Brief

**To:** the Claude Code session that produced `AUDIT.md`
**Status:** Phase 1 audit accepted. The audit was thorough and correct — in particular, executing the EIN trust root instead of trusting the read, and flagging the two non-negotiable concerns rather than silently acting on them. **Phase 2 is authorized**, with the decisions and one hard constraint below.

---

## Decisions on your three questions

1. **M0 housekeeping — APPROVED, do it now, first.** Initialize ESLint config, add `--passWithNoTests`, resolve `web/public/sw.js`, and make CI genuinely green (`lint → type-check → test → build` all real). The point is not cosmetics: until CI is true, no later milestone has a trustworthy signal. Land this before M1.

2. **Sequencing — INTERLEAVE APPROVED. Your pushback was right; the original brief was wrong.** Do **not** build the issuance seam in the dark on top of a flow that has never executed. Pull the *minimum* M4 essentials forward so **one** intake→note path actually runs against live Supabase **before** you build the seam, then build the seam against that working path. Specifically, before M3:
   - Fix the `ai.ts` snake_case/camelCase body-key mismatch (the single widest blocker).
   - Build the missing **patient-registration + `createVisit`** step (this is an architectural gap, not a mock swap — the intake flow currently has no `visitId` to hang real calls on).
   - Get one path executing end-to-end: register patient → create visit → intake turn → generate note, against live Supabase + at least one working edge function.
   **The non-negotiable is unchanged:** the credential is still the source of truth; Postgres rows are still a projection. You are only changing *when* the door gets put on its hinges, not the architecture.

3. **PDPO de-identification — PULL FORWARD, and treat it as a ROUTING decision, not a redaction fix.** This is the hard constraint. It has its own section because the easy version of this "fix" is the dangerous one. Read the next section as a non-negotiable spec.

---

## HARD CONSTRAINT — Data-egress routing policy (implement, do not interpret away)

The audit's most important finding: de-identification is not *low-quality*, it is **absent** from 8 of 9 external-facing functions. Names, full verbatim symptom transcripts, and **document images** currently cross the border to Google / Anthropic / Meta un-de-identified.

**The trap to avoid:** "extend `deidentify()` to all 9 functions" makes the exposure *look* solved while leaving the deepest hole open. **Regex cannot de-identify a free-text voice transcript in dialect, and cannot de-identify a photograph of a prescription.** Village names, relational identifiers ("my brother-in-law in Comilla"), and handwritten names on document images will pass straight through. Those are exactly the inputs belonging to the populations the product promises to protect most.

So the decision to implement is **which flows are allowed to leave the country at all** — not how good the redaction is. Classify every external-API call into one of three tiers and enforce the tier in code:

**Tier A — May leave after structured-field de-identification.**
Flows whose PII is in *structured fields* regex can reliably strip (name, age, gender, phone, NID, address, blood group). De-identify, then send.
- `intake-start`, `generate-briefing`, `generate-note` (structured record portions), `generate-patient-summary`.
- Requirement: `deidentify()` (extended beyond the current single call site) runs on **every** field before egress, including the doctor `query` in `consult-query`, not just `patientContext`.

**Tier B — Must NOT leave the country un-transformed until an in-country/on-device path exists.**
Flows containing **free-text transcripts or document images**, where regex demonstrably cannot guarantee de-identification.
- `intake-turn` and `intake-complete` (verbatim conversation, dialect symptom descriptions).
- `extract-document` (image of a prescription/lab report with printed + handwritten names).
- `send-followup` (full Bangla clinical narrative to Meta/WhatsApp).
- **Required behavior now:** these flows are either (a) gated behind an explicit, logged, per-encounter consent that names the external processor, **and** run through best-effort redaction with conservative over-redaction; or (b) disabled in any build that touches the protected-population modes (anonymous mode, mental health, reproductive health) until an in-country/on-device model path exists. Do **not** silently ship verbatim transcripts and document images to foreign clouds. If you cannot meet (a) for a given flow this milestone, default to (b).

**Tier C — Must never leave the country.**
Anything flagged as a protected-population flow (anonymous-mode DID, mental-health, reproductive-health, anything a patient marked confidential-from-employer). No external API, full stop, until KhaMed / on-device inference exists. For now these flows are **feature-flagged off** rather than routed to a foreign API.

**Implementation requirements:**
- A single egress chokepoint (e.g. in `llm-router` or a wrapper around it) that **refuses to send** unless the call declares its tier and satisfies the tier's rule. Fail closed: an un-tiered call is rejected, not sent.
- An append-only `egress_log` recording, per external call: function, tier, processor, whether de-identification ran, and consent reference. This is your PDPO evidence trail.
- Extend `deidentify()` to all Tier-A paths (the floor), but **the tier gate is the actual control**, not the regex.

Also fix, as part of M4, the correctness bugs the audit found that will otherwise mask this work: the universal casing 400s, the non-existent `speech-stream` function, the wrong WhatsApp function names, and the Vertex/MedGemma static-key-vs-OAuth 401 (no MedGemma route works until a service-account access-token flow exists).

---

## Build order (authorized)

Proceed in this order, small reviewable commits, app buildable after each milestone, **stop after M5 and report**. Do not build population-module surfaces (Continuity, Factory, Maa, Lens, Hospital, Bridge) — design schemas so they remain possible, build none of them.

| Milestone | Work | Notes |
|---|---|---|
| **M0** | ESLint init, `--passWithNoTests`, `sw.js`, real green CI | do now, first |
| **M1** | Workspace (`apps/glyph` + `packages/{identity,schemas-clinical}`); extract EIN envelope into `@kham/identity`; port the 6 trust-root checks as the package's CI gate — package does not publish until they pass | lift is proven low-risk; friction = drop `server-only` (guard at app boundary), pull identity types out of `lib/supabase/types.ts`, centralize sha512 wiring in one `init`, relative imports. Leave EIN working — do not fork. |
| **M3-pre** *(interleaved)* | Fix `ai.ts` casing; build patient-registration + `createVisit`; get one intake→note path running live | this is the "door on its hinges" — build the seam against it |
| **M2** | `@kham/schemas-clinical`: `PhysicianRegistration`, `VisitNote`, `Prescription` (1+0+1 dosing), `LabResult`, `DispensingEvent` Zod schemas; shared envelope so future ANC/Factory/Migrant credentials fit without a schema break | authored fresh; EIN supply-chain schemas are pattern only |
| **M3** | Single `issueCredential` seam: build VC → sign with writer's self-issued Glyph key → write **canonical VC to `credentials`** → upsert projection row(s). Add `credentials`, `did_documents`, `credential_status_log` tables (INSERT-only, UPDATE/DELETE-blocking triggers, no `updated_at`); DID + key columns on patients/doctors/clinics; `*_credential_id` FKs on visits/prescriptions/lab_reports; `rebuildProjections(subjectDid)`; publish DID docs at `.well-known/did/...`. Amendments issue a **new** credential with a `replaces` pointer — never overwrite. | the core of the new architecture; self-issued now, `issuer_verified` later with **zero migration** |
| **M4** | Kill remaining mocks; wire scribe to live services; **implement the Tier A/B/C egress policy above**; fix casing/speech-stream/WhatsApp/Vertex-OAuth; regenerate `supabase/types.ts` from SQL | risk is concentrated here — first true end-to-end run + net-new Vertex OAuth + `speech-stream` build + PDPO rollout |
| **M5** | Two-node loop: doctor issues Rx credential → pharmacy view queries patient DID and **verifies** via `verifyCredential` local fast-path | proves "network," not "app"; the AMR story in miniature |

---

## Closeout task (after M5 report) — reconcile the northstar to ground truth

After reporting M5, produce a short `NORTHSTAR-CORRECTIONS.md` listing the edits the audit forces on `glyph-vision-v3.1.md`, so the document stops overstating. At minimum:
1. **De-identification status.** §20 implies de-identification is wired and the gap is *quality* (regex vs ML). Ground truth: it was **absent** from 8 of 9 external paths. State that the control is now tiered egress routing, with regex as the floor for Tier A only.
2. **W3C interoperability caveat.** The envelope is **single-network verifiable today** (JCS + base64 `Ed25519Signature2020`-labelled proof), **not** generic-W3C-interoperable until URDNA2015 / Data Integrity is added. Fix any sentence implying "verifiable by anyone holding the issuer's public key" to "verifiable by any participant on the network; full W3C interoperability is a follow-up."
3. **Scribe-vs-identity status inversion.** §14 / §25 imply identity is speculative and the scribe is near-demo ("40–60 hours"). Ground truth: the identity envelope is **proven**; the scribe had **never run** (universal casing 400s, missing `speech-stream`, Vertex 401). Restate honestly.

Do **not** edit the northstar yourself — produce the corrections list and stop. The founder will apply them.

---

## Working agreement (unchanged from the original brief)

- Audit before action; report before destructive changes; small commits; app buildable after each milestone.
- Test the trust root, not everything. Don't gold-plate UI tests now.
- **The credential is canonical.** If a Postgres row becomes the source of truth and VCs become an export, stop — that's the failure mode this whole effort exists to prevent.
- **One identity engine.** If you find yourself copying crypto into a second location instead of extracting to the shared package, stop.
- **Fail closed on egress.** An un-tiered external call is rejected, not sent.
- "Compiles" is not "works." Say which you mean.