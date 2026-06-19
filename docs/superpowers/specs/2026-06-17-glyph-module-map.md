# Glyph — Module Map (all 11 interfaces)

**KhaM Health · Glyph · 2026-06-17**

> The "nothing left behind" artifact for the build doctrine (core trio production-grade · rest demo-mode · all feature-mapped · defer the build, never the foundation). Grounded in `apps/glyph/src/lib/landing/products.ts` + the canonical credential model (`@kham/schemas-clinical`, the `credentials`/`did_documents` tables). Artifact types marked *(new)* are proposed to **reserve now** in the schema so deferring the surface never forces a foundation retrofit. v1 — deepen any row against its `feature-NN-*.md`.

## The map

| Module | What it is (codename) | Mints → / Reads ← | Schema to reserve now | Grade | Depends on |
|---|---|---|---|---|---|
| **Identity & Matching** | "what everything stands on" — DID + signed-credential substrate + patient↔record matching | → `did_documents`, issuer keys, **PhysicianRegistration**; signs+verifies **every** credential | **one-human → one portable DID** (reconcile the per-clinic patient row); enrollment + key-custody modes; the scope model (below) | 🟢 **PROD** (core live) | — (it's the base) |
| **Chamber** | "the doctor's interface" — intake → briefing → consult → note → approve | → **VisitNote**, **Prescription** · ← patient record, prior Rx/labs, allergies/conditions | none — built | 🟢 **PROD** (live in pilot) | Identity |
| **Pocket** | "the patient's interface" — wallet + triage + WhatsApp + family | → triage_sessions, bag-photo **Prescription/LabResult**, consents · ← **all** the patient's credentials | family-circle consent graph; doctor-matching; **unaffiliated/provisional patient** scope (front-door) | 🟢 **PROD** (wallet + triage live) | Identity, Chamber (seeds it) |
| **Pharmacy** | "the antibiotic enforcement loop" | → **DispensingEvent** · ← **Prescription** (verify before dispense; revocation → counter) | dispensing-records table | 🔷 DEMO (verify loop proven) | Identity, Chamber (Rx supply) |
| **Lens** | "the diagnostic interface" | → **LabResult** · ← the order/referral | order-flow / center workflow | 🔷 DEMO (extraction + schemas live) | Identity, Chamber (order flow) |
| **Hospital** | "the institutional interface" | → **DischargeSummary** *(new)* · ← admission + patient record | **institutional scope** (vs solo chamber); admit/discharge model | 🔷 DEMO | Identity, Chamber |
| **Continuity** | "the migrant worker's interface" (Dhaka→UAE) | → **MedicalClearance / FitnessForWork** *(new)*, portable record export · ← longitudinal record | **cross-border portability**; clearance credential type | 🔷 DEMO | Identity, Pocket, one-human-one-DID |
| **Karigor** | "the garment worker's interface" (RMG factory) | → worker **OccupationalHealth** record *(new)*, factory attestations · ← worker record | **employer/factory scope**; worker enrollment | 🔷 DEMO | Identity, Chamber-style intake |
| **Maa** | "the mother's interface" (maternal — the flagship grant object) | → **AntenatalRecord** *(new)* + ANC schedule · ← mother's longitudinal record | **program scope**; CHW role; **protected-population (Tier C) egress** | 🔷 DEMO | Identity, Chamber/Continuity, Tier-C path |
| **Bridge** | "the cross-border interface" (diaspora/specialist, oncology first) | → **SpecialistOpinion** *(new)* · ← patient-**presented** record (cross-clinic ingest) | **cross-clinic credential ingest** (front-door §8); specialist-panel model | 🔷 DEMO | Identity, Pocket, cross-clinic ingest |
| **KhaM-Med** | "the sovereign clinical model" | → the fine-tuned model · ← de-identified consented encounters + **doctor verdicts** (the flywheel) | training-corpus export (de-id) pipeline | 🔷 DEMO / research (corpus accruing) | All encounters, Identity (consent/provenance) |

## What the map exposes (feeds the foundation audit)

1. **There is one spine: the credential layer.** Almost every module is "mint credential type X / read the patient's credentials." So onboarding a module = *define its credential type (extend `@kham/schemas-clinical`) + a projection + a surface* — never a foundation rebuild. That is the doctrine working by design.

2. **The #1 compounding landmine — one-human → one portable DID.** Pocket (front-door), Continuity (cross-border), Bridge (cross-clinic), Hospital (cross-institution), and Identity itself **all** depend on a reconciled, portable patient identity — not today's per-clinic patient row (same human at two clinics = two DIDs). **5 of 11 modules ride on this.** Settle it once in Identity → all five inherit it free. Leave it → all five deepen the debt. This is "Identity must be spot on" stated precisely.

3. **The second foundation decision — the scope model.** Today everything is `clinic_id`-scoped. The modules need more owners: **institutional** (Hospital), **employer/factory** (Karigor), **program** (Maa), **provisional/unaffiliated** (Pocket front-door). All are "who owns this patient row." Decide the scope taxonomy at the foundation, or each module re-litigates it.

4. **Credential types to reserve now (cheap insurance).** Have: PhysicianRegistration, VisitNote, Prescription, LabResult, DispensingEvent. Reserve: **DischargeSummary, MedicalClearance/FitnessForWork, OccupationalHealth, AntenatalRecord, SpecialistOpinion.** Defining the *shapes* now (even unused) means a deferred surface is a surface, never a schema migration.

5. **Two engines that need a de-identified export tap:** KhaM-Med (training corpus) and any analytics. The egress gate + consent provenance already exist; the export pipeline is the new piece.

## Sequencing implication

- **Production now:** Identity (settle #2 and #3), Chamber (done), Pocket.
- **Demo, on your calendar:** the other eight — each is "mint a (reserved) credential type + a seeded surface behind a flag, off the live Chamber path."
- **The two foundation decisions (#2, #3) are the only things that *must* happen before more demo modules get built**, because they're what stop the debt from compounding. Everything else is surface.
