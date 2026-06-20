# Glyph Front Door — design spec

> Citizen self-onboarding to a patient-owned health identity from home, via
> WhatsApp, hooked to triage. Brainstormed 2026-06-20. Status: design, pending
> review → writing-plans.

## Purpose

Let any citizen get a patient-owned health identity (a DID + Pocket wallet) from
home, by sending one WhatsApp message — no app install, no chamber visit. This
decouples Pocket growth from chamber throughput and reaches the citizen on the
phone already in their hand, which neither the telemedicine apps nor the
government SHR/Health ID do (they require app-signup, a facility visit, a CHW
campaign, or an appointment portal).

**Strategic guardrails (do not violate):**
- The Front Door is an *amplifier* of the Chamber/Pocket loop, not a replacement.
  Chamber funds the company and fills the wallet with credentials worth holding.
- Identity created here is the **weakest, self-asserted tier** and must be
  labeled honestly. It strengthens later through the "eight doors"; it must never
  be presented as doctor- or NID-verified.

## The hook: triage, inbound-first

A citizen texts the Glyph number because they already have a reason — a symptom,
a health question. Triage (already built) answers; the identity is created
quietly underneath as a byproduct of being helped. Inbound-user-initiated only
(no outbound/missed-call in v1, which would need approved Meta templates).

## Identity model

- A WhatsApp number is a **household**, not a person (shared phones are the norm).
  A household holds a **family circle of member-DIDs**.
- Each registered human is a **member**: a provisional patient (owner =
  `kham_holding` provisional singleton, per migration 011) with a minted
  `did:web:khamhealth.com:patient:<id>`, custodial Ed25519 key (encrypted with
  `CREDENTIAL_ENCRYPTION_KEY`), and an honestly-recorded anchor:
  `whatsapp_phone` (self-asserted tier).
- **Custodial-but-portable:** the citizen never handles keys (no seed phrase);
  KhaM custodies, the patient controls access via the wallet (+ optional PIN) and
  can export. This is custodial-with-export, stated honestly — not self-custody.

## The flow (all inside WhatsApp, in Bangla)

1. Citizen texts the Glyph number (symptom / question / anything). **No DID is
   minted yet** — we never create identity for spam or wrong numbers.
2. Glyph replies with a one-line **consent notice** + the subject question:
   *"কার জন্য? — আপনি নিজে / পরিবারের কেউ"* ("Who is this for? — Yourself /
   a family member"). For a returning household, known members appear as
   quick-reply options plus "someone new".
3. **On consent + subject selection:**
   - New subject → create a new member patient + mint DID; record consent with
     `granted_by = patient` (self) or `guardian`/`attendant` (proxy).
   - Existing member chosen → resolve to that member (no duplicate).
4. Triage runs (existing engine, egress-gated Tier B) and answers.
5. Glyph offers the wallet: *"Want me to keep this, and your records, for you?"*
   → sends the **Pocket wallet link**. The citizen now has a portable, signed
   identity and a wallet they can open, fill (photograph an old prescription via
   the existing Leg-C capture), and return to.

## Subject disambiguation (the shared-phone safeguard)

Because one number = many humans, every interaction that writes to a record first
resolves *who it is about*. A new person's data can never silently land on an
existing member, because Glyph always asks. Duplicates at the weak tier are
low-harm and **reconcilable** — they merge when a stronger anchor (a chamber
doctor's vouch, an NID/BRN/Health ID) later confirms two members are one person.
A proxy-registered member can be **claimed** by the real person later and **split**
to their own number (credentials move with them — portability).

## Reused vs new

**Reused (already built):** WhatsApp bridge (webhook, intent router, conversation
state, `wa_*` tables); triage-runner + `triage` edge fn; provisional-patient
mechanism (migration 011 / `kham_holding`); `ensure-identity` DID minting; Pocket
wallet + bearer token; `consent_records` (with `granted_by`); egress gate;
stop-word revoke (Leg B).

**New (the build):**
1. An **unbound-number → onboarding** branch in the WhatsApp intent router
   (today it expects a bind code; add first-contact onboarding).
2. A lightweight **household model**: number → set of member patients, plus the
   "who is this for?" subject-selection state in the conversation flow.
3. The **front-door flow module** (consent → subject → create member + DID →
   triage → wallet hand-off).
4. Honest **provenance/anchor** recorded on the DID (`whatsapp_phone`,
   self-asserted tier), so strength is never overstated.

## Scope

**In v1:** the flow above (inbound text → consent → household/member → DID →
triage → wallet link).

**Out of v1 (later):** missed-call / outbound onboarding (needs approved Meta
templates); Maa or campaign-scoped branches; NID/BRN/Health-ID anchoring and
government MCI linkage; a merge-engine UI (v1 only records the weak anchor and
tolerates duplicates).

## Guardrails

- DID minted only **after** consent, never on raw inbound (prevents spam DIDs).
- Per-number **rate limiting**.
- Weak-tier DIDs labeled honestly everywhere they surface.
- Consent is revocable (stop-word, already built); egress gate unchanged.
- No PII gating — profiling is progressive, never blocks onboarding.

## Success metrics (pilot)

Onboarding completion rate; return rate (do they text again?); wallet opens;
records added; % that later strengthen (chamber visit or stronger anchor).
**Watch-metric:** duplicate members per household (the dedup health signal).

## Honest risks

- **Weak anchor:** phone-possession is the floor; fine for a personal wallet,
  triage, and self-photographed records; not equivalent to verified identity
  until strengthened. Must be labeled.
- **Custodial keys:** create a recovery / operator-trust / court-order surface;
  guardian/social recovery is a known follow-up (out of v1).
- **Dedup is reconcilable, not resolved:** "one human → one DID" is reached over
  time, not guaranteed at the door.
- **WhatsApp policy / cost:** inbound-user-initiated is clean; outbound at scale
  is a later, template-gated, costed step.
