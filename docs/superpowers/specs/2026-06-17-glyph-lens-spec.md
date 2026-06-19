# Glyph Lens — Product Spec (every feature mapped; v1 cut for the first 24 centers)

**KhaM Health · Glyph · 2026-06-17**

> **Status: PRODUCT, not demo.** ~24 diagnostic centers have asked to use it. Built per the build doctrine: lay out *every* feature now (so deferral never compounds), ship a tight v1, defer the rest with the foundation reserved. Obeys R1 (records anchor to the patient **DID/credential**, never `patient_id`) and R2 (the center is an **owner**, not a clinic). Grounded in `lib/landing/products.ts` (Lens) + the 2026-06-17 design conversation. Reuses the live extraction prompts + LabResult schema + `lab_reports` + credential rails + wallet.

## What Lens is

"Results that arrive **signed**." Any diagnostic center (walk-in or Chamber-ordered) runs a test → Glyph's AI (**KhaM-Med = self-hosted MedGemma, *with* Opus 4.8**) **normalizes + second-reads + sanity-checks** it → a qualified human **signs** it → it lands in the patient's pocket as a **verifiable, comparable, trend-able** result. The signature makes it trustworthy; the AI makes "same test → same answer" across centers. The AI + the data it accrues (the flywheel → KhaM-Med) + the signature network are the moat.

## Lens triggers two foundation builds (the honest scope)

| Foundation (from the audit) | Why Lens forces it | v1 build |
|---|---|---|
| **#2 owner/scope model** — center is a non-clinic owner | a diagnostic center must own its orders/results/staff; it is **not** a clinic | build the `organizations`/owner abstraction; "diagnostic_centre" is the first non-clinic owner type |
| **Provisional / unaffiliated patient** | a walk-in lab patient has no clinic | a patient minted under a Lens/center holding scope (the front-door's provisional concept, first real use) + retention rule |
| **#1 portable DID (R1)** — one-human-one-record | needed for cross-center trending (deferred), but the v1 result must anchor to a reconcilable DID | discipline only in v1 (anchor to DID); reconciliation deferred |

## Full feature map

**A. Order intake**
- `[v1]` **Manual / walk-in order** — center types patient + test (the launch-day common case; Chamber isn't nationwide).
- `[later]` **Chamber-sourced structured order** — the ordering doctor's signed credential + clinical context arrives from Chamber (after Chamber density).
- `[later]` **Paper-slip capture** — OCR a paper requisition from any (non-Glyph) doctor.
- `[later]` **Patient-initiated** — ordered from Pocket.

**B. Result + the AI layer (the moat)**
- `[v1]` **Result entry** — manual values + **extraction from the report/machine image** (reuses `extract-document` + the lab-report-reading prompt).
- `[v1]` **AI normalize** (Opus now) — messy center report → one standard structured form: units, reference ranges, naming, abnormal flags. *This is the "same test, comparable answer" beat.*
- `[v1]` **AI sanity-check** — flag implausible values / inconsistency with the patient's history.
- `[B / v1.5]` **AI co-interpretation with vision** — **MedGemma (KhaM-Med) reads the film/image** (the technologist's assisted second eyes) + Opus reasons → a **draft observation + urgency flag** (never a diagnosis). Lands after the self-hosted MedGemma box is up (task B).
- `[later, gated]` **Trusted urgency-flagging** — only after the vision model is **measured on real BD films** and published.

**C. Verify + sign**
- `[v1]` **Single qualified signature** → a **LabResult Verifiable Credential** (the center's signatory signs). Kills the ghost-signed report (signature needs the real key).
- `[later]` **Remote-radiologist draft→verify→sign loop** — the AI draft routes to a remote radiologist who verifies + signs (multiplies the 4-per-million supply). Needs **remote-radiologist key custody** (a new identity flow) → dual signature.
- `[later]` **Correction / revocation** — re-issue + revoke a wrong result (reuses the revocation rails).

**D. Deliver + verify**
- `[v1]` **Lands in the patient's wallet (Pocket)** — signed, with ranges, abnormal flags, provenance (reuses wallet + token).
- `[v1]` **Free public verification** — anyone verifies the signature (the QR-directive done properly; reuses the `/verify` + pharmacy verify loop).
- `[later]` **Flows into the ordering Chamber doctor's briefing** (when Chamber-ordered).

**E. Comparability / longitudinal (the moat payoff)**
- `[v1, within-patient]` normalized results are **trendable** for a known patient.
- `[later]` **cross-center / cross-clinic trending** — needs the **portable DID (R1 build)** so the same human's results from different centers line up.

**F. Center-side (the diagnostic centre as an owner)**
- `[v1]` **Center account + onboarding** (the R2 owner build) + **staff roles** (technologist enters; signatory signs).
- `[v1]` **Center dashboard** — order queue, in-progress, signed/pending.
- `[later]` **Billing** — per-report (Tk 50–100) or subscription (Tk 15–25k/mo).

**G. Trust / regulatory / moat**
- `[v1]` ghost-report prevention (signature = real key).
- `[ongoing]` **the flywheel** — every signed result = a labeled BD example → trains KhaM-Med.
- `[later]` DGHS-alignment / published verification density.

## The v1 product (what ships to the 24 centers first)

The minimum that delivers the real value — *normalized, signed, verifiable results in the patient's pocket*:
1. **Center account + staff roles** (builds the R2 owner / `organizations` foundation; "diagnostic_centre" owner type).
2. **Manual order + result entry** (values + image extraction, reusing what's built).
3. **AI normalize + sanity-check** (Opus live) → standard structured LabResult + ranges + abnormal flags.
4. **Single qualified signature** → **LabResult credential** (anchored to the patient DID — R1).
5. **Patient delivery** (walk-in → provisional-patient scope, or known patient) via the **wallet** + **free verification**.

Deliberately **out of v1** (mapped, foundation-reserved): the remote-radiologist co-interp loop, MedGemma vision (arrives with task B), trusted urgency-flagging (needs film eval), Chamber-order intake, cross-center trending (needs R1 build), billing.

## Build order

1. **Foundation:** the owner/scope model (`organizations`, diagnostic_centre owner) + provisional patient scope — *because Lens is the first consumer; this is the audit's "build when the first non-clinic owner arrives."*
2. **Lens v1** on top (A-manual, B-normalize, C-single-sign, D-deliver/verify, F-center account).
3. **Task B:** wire self-hosted MedGemma (KhaM-Med) into the router → light up the vision co-interpretation (feature B `[B/v1.5]`).
4. Then v1.5+: remote-radiologist sign loop, cross-center trending, billing — each additive.
