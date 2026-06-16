# Glyph Pocket — The Front Door (Home Intake → Triage → Doctor-Ready Briefing)

**KhaM Health · Glyph · 2026-06-16**

> **STATUS: FUTURE / PARKED.** This is a vision-capture design doc, not a build-now spec. It is **gated on doctor supply** — the last mile ("connect me to a doctor") only works once enough doctors are live on Glyph to route into. It is written now so the idea is preserved, the guardrails are locked, and the build is ready the moment supply exists. Earlier work it depends on (triage engine, document pipeline, briefing card, WhatsApp bridge, verifiable record) is already shipped — see §5.

---

## 1. The idea, in one line

A patient who feels unwell, **from home**, opens Glyph (on WhatsApp or Pocket-web), describes their symptoms, optionally adds vitals, and uploads their history (the "plastic bag" — old prescriptions and lab reports). Glyph **organizes** it, **triages** the urgency, **prepares a doctor-ready briefing**, and offers to **connect them to a doctor**. It never diagnoses; it routes.

This is the clinic intake **relocated out of the chamber and into the patient's hands, before the visit.**

## 2. Why this matters (strategic)

- **It is the front door / acquisition funnel.** A funnel that routes sick people to doctors fills chambers — that is the growth engine, not a side quest.
- **It scales intake without clinic hardware.** Today intake runs on a clinic tablet; this moves the work-up to the patient's phone.
- **It grows the moat at the patient's own initiative.** Every home session quietly builds the patient's *verifiable record* before they ever see a doctor. The longitudinal record — the one thing nobody else in Bangladesh holds — accrues one self-served encounter at a time.
- **It makes the doctor's scarce minutes count.** The doctor opens an already-assembled picture (symptoms, vitals, med list, last labs, red flags) instead of starting cold at patient #80.

## 3. The flow — what Glyph does with the pile (and only this)

**1. Organize.** Symptoms → structured history. Vitals (when the patient has a cuff / glucometer / oximeter — common among the diabetics and hypertensives who need this most) → attached, clearly marked self-reported. The plastic-bag uploads → run through the existing extractor → structured `prescriptions` / `lab_reports` (current meds, last HbA1c, etc.). The mess becomes a clean clinical picture.

**2. Triage.** The existing engine: deterministic red-flag screen → one-time consent → ≤3 guided questions → a routed outcome (*handle at a pharmacy / see a doctor / urgent — go now*). If a vital or a lab value trips a red flag, it escalates the route. It names a **next step**, never a disease.

**3. Prepare.** All of the above assembles into the **doctor-ready briefing** — the same briefing card a doctor gets before a chamber visit, except built from home, pre-visit.

**4. Connect.** Glyph offers to route the patient to a doctor. The patient stops being an anonymous WhatsApp user and becomes a *routed patient with a real clinician* — which creates the encounter, which creates the record.

## 4. The bright line (non-negotiable, and sharper once labs are in the bag)

**Glyph organizes, triages, and prepares — for the patient. It interprets and diagnoses — only for the doctor.**

When a patient uploads a scary lab value, every instinct (theirs and the model's) pulls toward *"your kidneys might be failing."* **That line must not be crossed.** Glyph extracts and structures that lab *for the doctor at the other end*; to the *patient* it stays in organize-and-route mode — *"this needs a doctor's eyes soon."* The doctor reads the bag; Glyph only holds it. This is what keeps the feature safe (liability), Meta-survivable (channel ban risk on diagnosis-sounding content), and on-strategy (a router strengthens the moat; a diagnoser is a commodity dead-end).

## 5. What it reuses (already built — this is mostly assembly, not invention)

- **Triage engine** — `lib/services/triage-runner.ts` + the `triage` edge fn (red-flag screen → consent → guided Q&A → routed outcome, clamped, never diagnoses). Shared by the wallet route and the WhatsApp bridge today.
- **Document pipeline ("plastic bag")** — capture → consent → private storage → `extract-document` → structured rows → briefing. Already works from the WhatsApp bridge (Leg C pre-chamber capture) and the clinic tablet.
- **Briefing card** — `generate-briefing` assembles history + meds + red flags. This is the "prepare" output; here it is built pre-visit.
- **WhatsApp bridge** — LIVE on the real BD number; the first-contact channel.
- **Verifiable record / wallet** — Pocket v1; the record this flow starts.
- **Egress gate + consent** — Tier B (free-text + images) is consent-gated; the photo/ai-processing consent machinery already exists. PDPO: sensitive health data, consented at the point of capture.

## 6. What is new (to build when supply is there)

- **Vitals capture** — a light structured input (BP, glucose, SpO₂, temp, weight), self-reported and marked as such; fed into triage + briefing. Glyph must not over-trust self-reported vitals.
- **The "connect to a doctor" close** — the routing/booking step. At low supply this is *"a doctor will call you back"* or *"here is the nearest Glyph clinic,"* not an instant video consult. At higher supply it can become async-then-live.
- **The first-contact gate** — letting an *unbound* person through triage, on the explicit condition that the flow **ends by connecting them to a doctor** (so they don't remain unaffiliated — the earlier liability worry dissolves precisely because the flow always terminates at a clinician).
- **Pre-visit briefing assembly for a not-yet-in-clinic patient** — generating and holding a briefing for a patient who has no scheduled visit yet, ready to attach the moment a doctor is connected or the patient walks in.

## 7. Dependencies & sequencing

- **Gating dependency: doctor supply.** "Connect me to a doctor" needs doctors live on Glyph to route into. **Build this after a real doctor base exists.**
- **Value exists before the gate.** Even with no live doctor-connect, the home flow still (a) starts the verifiable record, (b) triages and routes ("see a doctor — here's a clinic"), and (c) holds a ready briefing for the eventual encounter (even in-person). So it is not blocked on supply; it gets *better* when supply arrives.
- **Channel survival.** The conservative persona is mandatory (Meta can ban a WABA for diagnosis-sounding health content). The bridge is already built conservative; this preserves that.

## 8. Where the data lives, who controls it, and how it travels (the hard part)

The DID/key mechanics are **not** the hard part. A patient never holds their own key today — Glyph mints a `did:web:khamhealth.com:…` and custodies the encrypted private key server-side (`CREDENTIAL_ENCRYPTION_KEY`), and the patient reads their record through a wallet link/token. Because the DID lives on Glyph's own domain, the patient's physical location is irrelevant — "from home" mints and custodies a DID exactly the way an in-clinic visit does. (True patient-*held* keys are a later lift, not v1.)

The hard parts are **scope** and **portability**.

### 8.1 Where a first-contact record lives + who controls it

Glyph's data model is **clinic-scoped**: every `patients` row has a `clinic_id`, all RLS and storage paths trace to a clinic, and there is no self-signup. A brand-new home user has **no clinic** — so today there is no clean home for their data.

**Design (to decide, not assumed):** a **provisional patient record under KhaM Health's own holding scope** (not a real clinic). Glyph mints the DID there; the symptoms/vitals/uploaded docs land in private storage under that provisional patient id; the record begins accruing. On **connect-to-a-doctor**, the provisional record is **adopted** into that doctor's clinic — the DID persists as the anchor, the clinical relationship attaches.

**The cost of that, stated honestly:**
- **KhaM Health itself becomes the data controller** for provisional records — health data on Glyph's servers with *no clinician attached*. Heavier PDPO posture: explicit consent at capture, and a defined **retention/purge** rule for users who never connect (an orphan health record held forever is a liability, not an asset).
- It needs a new **"unaffiliated patient" concept** the schema does not have — a holding scope + RLS to keep it isolated until a clinic adopts it.
- The most sensitive home uploads (free-text, images, protected populations) are **Tier B/C**, and the strong protections (ML de-id, on-device) are still future — so early on there is a real limit on *what can safely be accepted from home* before a doctor is in the loop.

### 8.2 Portability — how a *different* doctor sees the data

This is the moat question. The answer is deliberately **not** "Clinic B queries Clinic A's database." Clinic-scoped RLS siloes clinics from each other **by design** — that privacy boundary is a feature, not a gap. So:

- **Same doctor / same clinic:** works today. The record accumulates; the briefing pulls the longitudinal history; a home upload that belongs to that clinic's bound patient feeds that clinic's briefing.
- **A different doctor / different clinic:** access is **patient-mediated, not database-mediated.** The patient *carries* their record — the verifiable credentials (signed VisitNotes, Prescriptions) anchored to their DID, presented via the wallet. The new doctor reads what the patient presents and *verifies* it (the credentials are canonical and signed); they do not get a backdoor into the other clinic's projections. The patient is the bridge.

**What this means is built vs. missing:**
- **Built (the rails):** canonical, INSERT-only signed credentials anchored to the patient's DID (`credentials` table); Postgres rows are clinic-scoped *projections* of those credentials; the wallet (patient view); the pharmacy verify loop (proof the verify path works).
- **Missing (the cars on the rails):** (1) **doctor-side ingest** — a flow where the new doctor receives the patient-presented credentials and projects them into *their* briefing/consult; (2) **cross-clinic identity reconciliation** — today a patient row (and its DID) is minted per clinic, so the *same human* at two clinics can end up as two rows with two DIDs; the clean "one human → one portable DID-anchored record" requires reconciling them (phone is the rough de-facto key today, but it is family-shared and imperfect); (3) the **patient-consented share/hand-off UX** on both ends.

So the architecture was *built for exactly this* — the credential layer is the portable, patient-carried record by design — but the cross-clinic **hand-off and identity reconciliation are designed, not shipped.** This, alongside doctor supply, is a true prerequisite for the front door.

### 8.3 Smaller open questions (decide at build time)

- Async hand-off vs. live consult for "connect" — and how it degrades gracefully at low supply (callback queue? clinic list? booking slot?).
- How much to trust / how to caveat self-reported vitals.
- Whether the first-contact entry is WhatsApp-only at first, or Pocket-web too.
- The exact consent + disclaimer wording for a patient with no existing doctor relationship.

## 9. Status & next step

**Parked.** This captures the vision and the guardrails so it is ready. The next step is **not** to build it now — it is to **grow doctor supply** (the real gate), and to ship the nearer-term clinical-trust work first (the prescription safety check — see `docs/superpowers/plans/2026-06-15-prescription-safety-check.md`). When doctors are live and routable, this becomes a real build: turn §6 into an implementation plan, reusing §5 wholesale.

*The patient holds the bag from home; Glyph organizes and routes; the doctor reads it. That ordering is the product.*
