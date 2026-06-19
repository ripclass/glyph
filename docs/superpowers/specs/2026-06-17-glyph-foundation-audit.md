# Glyph — Foundation Audit (the two decisions that stop debt compounding)

**KhaM Health · Glyph · 2026-06-17**

> Step ② of the build doctrine. The module map collapsed to two foundation decisions — **(1) one-human → one portable DID** and **(2) the scope model** — both living in Identity. This audit grounds them in the actual code/schema and says, concretely, what to **reserve now** vs **build later**. Headline: the credential-centric design already carries most of the load; the reservations are cheap (mostly *decisions + discipline*), and the real work is additive and deferrable per-module.

## Ground truth (what the code actually does today)

| Fact | Evidence |
|---|---|
| A DID is minted **per entity row**, slug `${kind}-${id}` → `did:web:khamhealth.com:…:patient-<row_uuid>` | `lib/identity/ensure-identity.ts` + `config.ts` (`entitySlug`) |
| DID + keys live **on the patient/doctor/clinic row** | `ensure-identity.ts` UPDATE of `did/public_key_jwk/encrypted_private_key/key_nonce` |
| `patients.clinic_id` is **NOT NULL** — a patient is hard-scoped to one clinic | migration 001 |
| `patients.phone` is **nullable and NOT unique** (plain index, family-shared) — not a reliable person key | migration 001 (`idx_patients_phone`) |
| No person-level anchor — the patient *row* **is** "the person at this clinic" | migration 001 (no NID/person_id) |
| Credentials anchor to **`subject_did`** (the patient-row DID); RLS lets a doctor read credentials whose subject is a patient **in their clinic** | migration 002 (`credentials.subject_did`, the RLS policy) |

**Net:** the same human at two clinics → two patient rows → two DIDs (`patient-<uuidA>`, `patient-<uuidB>`) → two disjoint credential sets. Identity is clinic-fragmented, by construction.

## The good news first

The architecture was built **right** for portability: records are canonical **signed credentials anchored to a DID**, and Postgres rows are clinic-scoped *projections*. The DID is already the portable anchor. So the foundation is **not** blocking the future modules — only two specific, *additive* gaps remain. Neither needs a rebuild now.

## Decision #1 — one human → one portable DID

**The gap (precise):** the DID is minted **per patient row**, not per person; and there's **no reconciliation** linking two rows that are the same human. (Depended on by Pocket front-door, Continuity, Bridge, Hospital — and Identity itself.)

**Options:**
- **A. Person anchor** — a `persons` table holds the DID/keys; `patients.person_id` makes the clinic row a local enrollment of a person. Credentials anchor to the *person's* DID → unified across clinics. Clean and correct.
- **B. Patient-mediated** — keep per-clinic DIDs; the patient *carries* credentials via the wallet and a new doctor *ingests* what's presented (front-door §8 "the patient is the bridge"). Preserves clinic silos; unifies at presentation time.

**Recommendation (doctrine-aligned):**
- **Reserve now (cheap — decision + discipline, ~no migration):** declare **"the DID is the person anchor."** Keep treating the *credential/DID* as the record anchor (already true). **Discipline rule for all new code, incl. demo modules:** never assume `patient_row = the canonical person`; reference records by DID, not by `patient_id`. That single rule keeps the future additive.
- **Build later (when Bridge/Continuity is the first cross-clinic module):** (a) start minting the DID **per person** (a `persons` row), with `patients.person_id` linking the clinic enrollment; (b) a **reconciliation** step (phone + name + DOB + explicit patient consent — never auto) that links rows to one person; (c) **doctor-side ingest** of patient-presented credentials. All additive; existing per-row DIDs migrate by backfilling one person each (today they're disjoint, so it's 1:1 and clean).

## Decision #2 — the scope model

**The gap (precise):** `clinic_id NOT NULL` + RLS + storage paths all assume a **clinic** owns the patient. The modules need other owners: **institutional** (Hospital), **employer/factory** (Karigor), **program** (Maa), **provisional/unaffiliated** (Pocket front-door).

**Options:**
- **A. Polymorphic scope** — `scope_type` + `scope_id` everywhere; biggest RLS change.
- **B. Owner generalization** — an `organizations` parent that clinics/hospitals/employers/programs belong to; `clinic_id` generalizes to `org_id` (or clinics gain an `org_id`). Provisional = a "KhaM holding" org.

**Recommendation (doctrine-aligned):**
- **Reserve now (cheap — decision, ~no migration):** commit to **Option B (clinic is one *type* of owner)** as the target, and the **discipline rule:** new code treats "the owner of a patient" as an abstraction, not literally "a clinic." Don't rewrite RLS now.
- **Build later (when the first non-clinic owner arrives):** introduce `organizations` with `org_type`, point patient ownership at it, and add the **"KhaM holding" provisional scope** (the front-door's first concrete need — also the simplest first build, since it's just one new org type + a retention/purge rule).

## The disciplined bottom line

| | Reserve **now** (cheap, zero behavior change) | Build **later** (additive, per-module trigger) |
|---|---|---|
| #1 portable DID | Decision: DID is the person anchor. Discipline: reference records by **DID, not patient_id**; never bake `patient_row = person`. | `persons` table + `patient.person_id` + reconciliation + doctor-side ingest — when Bridge/Continuity lands |
| #2 scope | Decision: clinic = one owner *type*. Discipline: treat "owner" as an abstraction; don't hardcode clinic-only. | `organizations` + `org_type` + provisional "KhaM holding" scope + retention/purge — when Hospital/Karigor/Maa/front-door lands |
| credential types | Define the shapes (DischargeSummary, MedicalClearance, OccupationalHealth, AntenatalRecord, SpecialistOpinion) in `@kham/schemas-clinical` | wire the producing surface |

**What NOT to do now (avoid over-building):** don't add unused `persons`/`organizations` tables speculatively, don't rewrite the clinic-scoped RLS, don't migrate existing DIDs. The reservation is a **decision + a discipline rule**, not a migration — because the credential/DID layer already gives you the portable substrate. The *only* thing that would compound debt is letting the production trio or the demo modules bake in `patient_row = person` or `owner = clinic` assumptions. Hold that line and every deferral stays cheap.

## So "Identity must be spot on" means, concretely

Two things, and they're decisions you can make today without a migration: **(1)** records are anchored to and referenced by the **DID/credential**, never the clinic patient-row id; **(2)** "who owns a patient" is an **owner abstraction**, with clinic as today's only instance. Make those two true in the code you write from here, and the other eight modules attach additively — the debt never compounds.
