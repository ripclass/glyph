# Glyph Pocket
## The Patient's Interface

**Glyph by KhaM Health · Product Document 02 of 11 · June 2026 · Dhaka**
**Powered by KhaM-Med, Bangladesh's sovereign clinical AI**

---

## 1. The person this is built for

A 52-year-old shopkeeper in Jatrabari. He has hypertension he half-knows about —
a doctor mentioned it two years ago during a visit for something else. The
prescription from that visit is somewhere at home, in the bag. When his head
aches he walks to the pharmacy ninety meters from his shop and buys what the
shopkeeper-pharmacist suggests, or what worked last time, or what his
brother-in-law recommended. He has never had a check-up. He will see a doctor
again when something frightens him — and that doctor will know nothing about
him, because nothing about him is written anywhere except in a bag he may or
may not bring.

He is not careless. He is responding rationally to a system where the pharmacy
is near, the doctor is far, the visit costs a day's income, and no one keeps
his story. Glyph Pocket is built for him — and for his daughter in London who
worries about him, and for the version of him who, at 60, will need every
record that today does not exist.

## 2. The evidence: how Bangladeshis actually manage their own health

**The pharmacy is the de facto front door of the health system.** A Dhaka study
of customers seeking care for acute respiratory illness at pharmacies (icddr,b-
affiliated, PMC) found that only 10% had sought care from any other provider
before the pharmacy — and of those, most had come from *another pharmacy*.
Research on self-medication geography found community pharmacies typically
within 1.5 km of people's homes while formal health facilities sat 2-4 km away;
proximity and cost were the stated drivers. Self-medication studies across
Bangladeshi populations report prevalence ranging up to 88% in surveyed groups,
with antipyretics, analgesics, cold/cough preparations, and antacids leading,
and the information sources being old prescriptions, family advice, and the
internet. The system's true primary-care layer is an untrained drug seller and
a remembered prescription.

**Care is skipped because care impoverishes.** Out-of-pocket payments reached
73% of total health expenditure in 2021 (Bangladesh National Health Accounts) —
the highest in South Asia — with 54-64% of that going to medicines. The Health
Economics Unit reports 16.4% of households forgoing needed care outright, 24.4%
facing catastrophic health expenditure at the 10% income threshold, and roughly
4.5% of the population pushed below the poverty line by health costs every
year. Every avoidable repeat test, every duplicate drug, every wrong first
stop has a direct poverty cost.

**No one holds the record — not even the patient, really.** Bangladesh has no
functioning EHR layer; the patient's "record" is the plastic bag of paper, and
the bag is lossy: prescriptions fade, reports tear, the bag stays home. The
state's own trajectory confirms both the gap and the appetite: the Surokkha
COVID vaccination platform scaled to roughly 60 million users — proof that
Bangladeshis will use a digital health credential when it is simple and
necessary — and the government is now piloting universal health IDs, with ADB
modelling suggesting a complete health digital-public-infrastructure stack
could return on the order of $500 million annually largely by eliminating
duplicate diagnostics. The demand is validated; the citizen-owned
implementation does not yet exist.

**The phone is already in the household.** BBS's ICT survey (2025-26 Q1)
reports 98.9% of households with at least one mobile phone and 72.4% with a
smartphone — up sharply from 63.3% two years earlier — with individual internet
use at 48.9% and household internet access at 54.8%. Rural penetration (≈49%)
still trails urban (≈78%), and individual internet use trails handset
ownership, which means Pocket must work on a shared family smartphone, over
intermittent data, for a user who may be more comfortable speaking than typing.
That is a design constraint, not a disqualifier: bKash built national financial
infrastructure on exactly this device base.

**The patient often is not the speaker.** The attendant reality documented in
the Chamber paper applies in reverse here: the household manages health
collectively. A wife's symptoms are reported by her husband; an elderly
parent's medication is managed by whichever adult child is nearest — or, for
millions of families, by a son abroad coordinating by phone. A patient-facing
product that assumes one autonomous user with private device ownership is
designed for a different country.

## 3. The product: what Pocket does

Glyph Pocket is the patient's wallet, voice, and memory — free, in Bangla,
voice-first, designed for shared phones and thin data.

**The wallet (the bag, made permanent).** Every credential issued anywhere in
the Glyph network — prescriptions from Chamber, results from Lens, dispensings
from Pharmacy, discharge summaries from Hospital — lands in the patient's
wallet, signed by its issuer. The patient can also photograph legacy paper at
home; extraction turns the existing bag into the opening balance of the
lifelong record. The wallet survives the rain, the move, the house fire, and
the years. Under PDPO 2025 the data belongs to the patient by law; in Pocket it
belongs to the patient by cryptography — consent to share is granted and
revoked by the patient, per provider, per credential type.

**Triage in plain Bangla (meeting the self-medication reality where it
lives).** The shopkeeper with the headache can ask Pocket before he asks the
drug seller. KhaM-Med answers in plain Bangla at his comprehension level: what
this probably is, what to watch for, whether the pharmacy is enough or a doctor
is needed, and — critically — *which kind* of doctor. Pocket does not pretend
self-medication will vanish; it inserts a competent, patient-loyal voice into
the moment where today only the drug seller speaks. Red-flag symptoms escalate
firmly: this is a chest-pain-go-now system, not a chatbot that chats.

**Doctor matching (the family physician Bangladesh never had).** When a doctor
is needed, Pocket matches by clinical need, geography, language and dialect,
gender preference, and budget — then remembers. The second visit goes to the
same doctor; a relationship accretes where the system previously produced only
strangers. This matching layer is documented fully in the Identity & Matching
paper (document 10); Pocket is its main consumer surface.

**Family circles (the attendant protocol, patient-side).** A wallet can grant
standing, scoped access to family members: the daughter in London sees her
father's BP readings and prescription refills; the son in Dhaka gets the
WhatsApp nudge when the mother's follow-up is due. Consent is explicit, visible,
and revocable; the elderly patient's autonomy is the default, with
family-managed mode available where the patient chooses it. This is also the
bridge into Glyph Continuity: the migrant worker's Pocket and his mother's
Pocket are two nodes of one family graph.

**Medication management (against the documented error profile).** The wallet
knows every active prescription across every doctor. It flags the duplicate
beta-blocker, the interaction, the antibiotic course abandoned on day three. It
reminds in Bangla, by WhatsApp — the channel households already live in — at
literacy-appropriate simplicity.

**Follow-up and continuity.** Two days after a Chamber visit, the patient gets
the plain-Bangla check-in. Before the next visit, the new doctor — with consent
— walks the wallet's credential graph and starts from knowledge instead of
zero. The 48-second consultation problem is attacked from both ends: Chamber
gives the doctor preparation; Pocket gives the patient a history that travels.

## 4. What the identity layer changes for the patient specifically

The government's universal-health-ID pilots and the Surokkha precedent show
where the state is heading; Glyph's difference is *who holds the keys*. A
ministry database knows the citizen; a Pocket wallet is *owned* by the citizen
— portable across providers, exportable in W3C-standard form, intact even if
KhaM Health itself were succeeded by another operator. For the populations
covered in later papers — the migrant whose record must cross borders, the
garment worker whose employer must not see her gynecological history, the
stigmatized patient who needs an anonymous-mode identity with no NID linkage —
patient-held keys are not a philosophical nicety; they are the safety
mechanism. Multi-anchor enrollment (NID, birth certificate, passport, BMET,
with anonymous and NGO-mediated modes) is specified in document 10.

## 5. Economics: why Pocket is free, and what funds it

Pocket is free for domestic patients. Permanently. Three reasons, in order of
importance: the 73% OOP reality means any paywall excludes precisely the people
the system fails most; the wallet's network value to every paying interface
(Chamber doctors get prepared patients, Lens gets order flow, Pharmacy gets
verifiable prescriptions) exceeds any subscription it could charge; and the
de-identified, consented encounter corpus that flows from a large Pocket
population is what trains KhaM-Med — the strategic asset that makes the whole
ecosystem's economics work.

Paid tiers exist only where ability to pay is structurally different: Pocket
Premium for diaspora and migrant family coordination ($3-5/month via bKash or
Probashi banking rails, detailed in the Continuity paper), and Bridge
consultations (document 09). The domestic patient never pays for her own
record. Aggregate, de-identified insights may eventually be sold under
independent oversight; raw patient data is never sold — a structural
commitment, enforced by the patient-held-key architecture itself.

## 6. Honest constraints

- **Pocket alone cannot fix care avoidance.** If 16.4% of households skip care
  because of cost, a better-informed patient still cannot pay the ৳8,000 for
  tests. Pocket reduces *wasted* spending (duplicates, wrong first stops,
  abandoned courses) and routes to the lowest-cost adequate option; it does not
  pretend to be insurance.
- **Triage liability is real and the line must be bright.** Pocket informs and
  routes; it does not diagnose or prescribe. Red-flag escalation is
  conservative by design, and every answer carries the "this is not a doctor"
  framing in plain Bangla, not legal English.
- **The shared-phone household complicates privacy.** Wallet access is
  PIN/biometric-guarded per person even on a shared device, and sensitive
  credential categories (reproductive health, mental health, anonymous-mode
  records) are shielded behind a second confirmation — because the threat model
  includes the household itself.
- **The rural data gap is the adoption gap.** With rural internet at ~49%,
  Pocket must function offline-first: wallet cached locally, sync
  opportunistic, voice notes queued. Where the smartphone itself is absent,
  Pocket's reach extends through the assisted channels — the Chamber intake
  tablet, the Factory health assistant, the Maa community health worker — so a
  patient can have a wallet before she has a phone.
- **Triage answers currently route through frontier APIs** with
  known-insufficient regex de-identification (see Chamber, Section 6). The
  KhaM-Med local-routing milestone matters most for exactly this surface, and
  the sensitive-flow restriction applies until it lands.

## 7. Build status (June 2026)

Pocket inherits Chamber's infrastructure: the patient/visit/prescription/lab
schema, the WhatsApp service, the extraction prompts, and the consent tables
all exist in the current build. What does not yet exist is Pocket's own
surface: the patient-facing wallet UI, the triage conversation flow, family
circles, and the patient-held-key custody model (today keys are
platform-custodied with the DID/VC layer itself still unimplemented — the
identity-layer lift from EIN is the prerequisite, tracked in document 10).
Pocket ships after Chamber proves the record is worth holding: the first
Pocket users are the patients of the first Chamber doctors, invited at the end
of a visit with their record already in hand — the cheapest patient acquisition
in healthcare, because the product's value is demonstrated before it is
installed.

---

*Sources relied on in Section 2: pharmacy care-seeking for ARI in Dhaka
(icddr,b-affiliated, PMC); self-medication prevalence and geography studies —
ScienceDirect 2022 cross-sectional KAP study, IJS Global Health 2024, BMC
Research Notes 2015, Pharmacy (MDPI) 2018; Bangladesh National Health Accounts
6 and Health Economics Unit releases 2021-2024 (TBS, Daily Star, BSS);
BBS ICT Access and Use Survey 2025-26 Q1 (BSS, December 2025); Wikipedia
synthesis of BTRC/BBS connectivity data, June 2025; Daily Star reporting on
Bangladesh digital public infrastructure, Surokkha scale, universal health ID
pilots, and ADB health-DPI modelling, 2025-26.*

*Glyph by KhaM Health · KhaM Labs Inc. · In memory of Khayer and Mamataj.*
