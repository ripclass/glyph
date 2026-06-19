# The Identity & Matching Layer
## What Everything Stands On

**Glyph by KhaM Health · Product Document 10 of 11 · June 2026 · Dhaka**
**Powered by KhaM-Med, Bangladesh's sovereign clinical AI**

---

## 1. The question this layer answers

Nine product documents precede this one, and every one of them, examined
closely, describes the same failure wearing a different uniform. The pharmacy
cannot tell a real prescription from a forged one: an identity failure. The
diagnostic center prints reports over the names of radiologists who never saw
the film: an identity failure. The dying mother arrives at her third facility
as a stranger: an identity failure. The regulator admits it cannot say which
of its 134,568 registered physicians are genuinely licensed: the issuer of
medical identity declaring its own failure. The migrant hides his diagnosis
because his health record is employer-readable: an identity *ownership*
failure.

The one-sentence thesis of the entire Glyph program: **Bangladesh's healthcare
failures are not record-keeping failures. They are identity failures.** This
document specifies the layer that fixes them — and the matching engine built
on top of it, which addresses the quieter structural absence underneath
everything: Bangladesh never had family physicians, so the system cannot
*reconnect* patients to their doctors; it must *create* doctor-patient
relationships that never existed.

## 2. The evidence specific to identity

**The credential registry is unverifiable at the point of care.** BMDC's
November 2024 statements (Chamber paper) stand as the foundational fact:
134,568 registered physicians, ~36,000 on lapsed registrations, an unknown
number of forgeries, an unknown number practicing with no registration. The
consequence threads through every paper: no pharmacy, lab, hospital, or
patient can verify a prescriber in real time.

**The centralized alternative has already failed publicly.** In 2023, a
Bangladeshi government website leaked the personal data of roughly 50 million
citizens; Smart NID and voter information subsequently circulated on Telegram
channels (The Record; Daily Star). This is not an argument against the state —
it is the documented reason a national *health* record cannot be one more
honeypot. The architecture must assume breach and make breach unrewarding:
records encrypted to patient-held keys, no central trove whose theft exposes a
population's diagnoses.

**The law now says what the architecture already assumed.** The Personal Data
Protection Ordinance 2025 — approved by the Council of Advisers on 9 October
2025, gazette notifications issued in November — recognizes every citizen as
the rightful owner of their personal data, mandates explicit consent for
collection and use, regulates sensitive data (health, genetic, biometric)
with special strictness, imposes localization requirements, and establishes
a National Data Governance Authority, with key compliance sections taking
effect 18 months after gazette — roughly May 2027. Glyph's design — patient
ownership, explicit consent, in-country processing trajectory — is not merely
PDPO-compatible; it is the ordinance's architecture rendered in cryptography
rather than policy. Arriving compliant-by-construction before the enforcement
date is a moat most incumbents will meet as a scramble.

**The state validates demand and supplies anchors — but its instruments are
registries, not wallets.** Surokkha reached ~60M users; universal health-ID
pilots are underway; ADB prices a full health-DPI stack at ~$500M/year
(Pocket paper). Meanwhile the state already operates the anchor
infrastructure Glyph needs: NID covers effectively the adult citizen
population through voter registration; birth registration covers children
unevenly; BMET issues biometric digital credentials to every departing
migrant (Continuity paper); DGHS licenses facilities and already orders
QR-coded license display (Lens paper). The anchors exist. What does not exist
is the citizen-held layer that binds them to a portable health identity — and
the populations the anchors miss entirely: the Rohingya refugee, the
undocumented returnee, the patient whose diagnosis must never touch a
state-linked identity at all.

**The relationship layer is missing, not broken.** The family-physician
institution never formed in Bangladesh: care is episodic, specialist-first,
chamber-based, with no continuity. The matching evidence from the prior
papers: patients self-refer to tertiary care (59%) because nothing routes
them; female patients get materially better consultations from female doctors
(CHT study) but female physicians concentrate in a few specialties; dialect,
geography, and budget determine real access. A record layer without a
relationship layer would give Bangladesh better-documented strangers.

## 3. The architecture

**Identities for every party.** Every patient, physician, pharmacy,
diagnostic center, hospital, factory, and NGO holds a `did:web` decentralized
identifier — a stable cryptographic identity resolvable over plain HTTPS, no
blockchain, no token, no exotic dependency. Ed25519 keys; JCS canonicalization;
W3C DID Core and Verifiable Credentials 2.0 throughout. Every clinical fact in
Glyph — prescription, lab result, dispensing event, discharge summary,
professional license — is a credential signed by its issuer's DID and held in
its subject's wallet.

**Multi-anchor enrollment: meeting every Bangladeshi where their documents
are.** One enrollment path would be a gate; Glyph specifies eight:

- **A — NID:** the default adult path; verification against the national
  registry, strongest civil anchor.
- **B — Birth certificate:** children, and adults the NID rolls missed;
  the Maa newborn path begins here.
- **C — Bangladeshi passport:** diaspora and dual contexts where NID access
  is impractical.
- **D — BMET registration:** the migrant path — riding the biometric smart
  card and PDO touchpoint (Continuity paper).
- **E — Embassy/consular attestation:** workers already abroad, enrolled
  through missions.
- **F — Institutional vouching:** an enrolled, verified institution (clinic,
  NGO, factory program) attests identity for patients without documents —
  strength labeled accordingly.
- **G — NGO-mediated:** for Rohingya refugees and stateless populations,
  enrollment through humanitarian organizations whose own DIDs anchor the
  attestation, with no requirement of state documentation.
- **H — Anonymous mode:** for stigmatized care (HIV, mental health, GBV,
  adolescent reproductive health), a wallet with *no* civil anchor —
  pseudonymous by construction, linkable to the person's primary identity
  only by the patient, only later, only if they choose.

Every credential carries its anchor provenance: a verifier always knows
whether identity rests on NID verification or an NGO attestation, and policy
can differ accordingly without excluding anyone from care.

**Trust bootstrap: honest about day one.** Glyph cannot launch with BMDC
integration, so professional identity strengthens in declared phases.
*Phase 1 — self-issued with provenance:* the doctor's credential states
exactly what was checked (BMDC registry lookup, certificate inspection) and by
whom. *Phase 2 — institution-vouched:* hospitals, professional societies, and
known clinics countersign their practitioners. *Phase 3 — authority-anchored:*
BMDC (and DGHS for facilities) issue or countersign directly — the gold
anchor, pursued through the regulator's own demonstrated need (its November
2024 admissions) and its demonstrated instinct (the QR directive). The
architecture upgrades in place; early adopters re-anchor without re-enrolling.
No phase pretends to be a later one — the credential says what it is.

**Patient-held keys, family custody, and recovery.** Keys live with patients —
on-device for smartphone holders, with guarded custody modes for the
shared-phone and no-phone realities (Pocket paper): PIN/biometric-wrapped
local keys, family-circle co-custody where the patient chooses it, and
institution-assisted custody (the Apa tablet, the Maa CHW, the Chamber clinic)
as the assisted channel. Recovery is multi-path by design — any two of:
re-verification against the original anchor, family-circle quorum, recovery
contact, custodial institution — because the Dinajpur worker losing his phone
in a labor camp is a certainty, not an edge case. The platform holds no key
that unlocks everyone; that is the lesson of the 50-million-record leak,
implemented.

**Selective disclosure and scoped consent.** Consent is per-provider,
per-category, per-duration, revocable — and aggregate proofs (Apa's
compliance reporting) disclose statistics without records. Break-glass
emergency access (Hospital paper) is read-only, time-boxed, audited, and
patient-notified; its independent review is a launch precondition.

## 4. The matching engine

On top of identity sits the layer that creates relationships. Matching
weighs: clinical need (KhaM-Med's triage of the presenting problem against
specialty), geography (home and work, because the Apa user sees doctors near
the factory and the Continuity user needs a home-district physician for
return visits), language and dialect, gender preference (defaulting to
offering female physicians for gynecological and obstetric care, where supply
concentrates), price tier, and — once relationships exist — continuity itself:
the engine's strongest signal is "you have seen this doctor before."

The deliberate goal is the durable pairing Bangladesh never institutionalized:
the second visit to the *same* doctor, the doctor who accumulates context, the
patient who stops being episodic. Matching success is measured exactly there —
repeat-visit rate to the matched physician — not in consultations brokered.
For physicians, matching is the demand side of the Chamber subscription: a
practice pipeline of patients routed by fit rather than by broker referral
fees (the BMJ Global Health economy the Chamber paper documents).

## 5. The honest decentralization position

This section exists because an earlier draft of the vision overclaimed, was
corrected, and the correction is now doctrine. `did:web` resolution depends on
KhaM Health's web infrastructure: **Glyph is a single-operator system built on
portable open standards, not a decentralized network.** The honest claims are
exactly three. *Portability:* every wallet exports in W3C-standard form;
credentials verify against published keys with or without KhaM Health's
cooperation. *No lock-in:* a future operator — including the government —
can assume resolution of the namespace; signed credentials remain valid.
*Succession:* KhaM Labs' governing documents carry a named obligation — if
the operator fails, keys, namespace, and escrowed resolution infrastructure
transfer to a designated successor (in preference order: a Bangladeshi public
authority, a consortium of participating institutions, an international
digital-public-goods custodian). The bKash pattern is the strategic frame —
build the working system, let the state formalize what works — and the
succession clause is what makes that frame honest rather than convenient.

## 6. Honest constraints

- **Anchor verification has real friction.** NID verification requires
  Election Commission integration or attested manual checks; until formal
  access exists, Path A runs on document inspection with provenance labeled
  as such. The architecture never claims a stronger anchor than was actually
  checked.
- **Anonymous mode will be abused** — duplicate enrollments, drug-seeking
  across pseudonyms. The design accepts this cost knowingly: the alternative
  (no anonymous path) excludes exactly the patients whose exclusion is
  deadliest. Prescription-abuse controls operate at the dispensing layer
  (Pharmacy) rather than by stripping anonymity.
- **Key recovery is the attack surface.** Every recovery path is an
  impersonation path; quorum design, rate-limiting, and notification are
  security-reviewed before launch, alongside break-glass.
- **The matching engine inherits its training data's biases** and operates in
  a market with documented broker incentives; ranking transparency (why this
  doctor was suggested) and a no-paid-placement rule are structural, stated
  commitments.
- **Phase-3 anchoring depends on regulators who move slowly.** The system is
  designed to be useful at Phase 1 and credible at Phase 2; Phase 3 is
  pursued, not presumed.

## 7. Build status (June 2026)

This layer is the program's largest gap between design and code: the
technical audit found zero identity-layer implementation in the Glyph repo —
no DID resolution, no Ed25519 signing, no credential issuance — against a
mature scribe layer. The lift comes from EIN, where the same architecture
(did:web, VC issuance, multi-language, Stripe-billed) is already shipped and
serving supply-chain identity in production: the work is adaptation —
health-credential schemas, the eight enrollment paths, wallet custody modes,
consent and selective disclosure, recovery and break-glass — not invention.
This is the single critical-path dependency for Pharmacy, Lens results,
Hospital, Bridge, and the full Pocket wallet; Chamber alone can launch before
it (paper-parallel operation) and must not wait for it. Sequencing: the EIN
lift begins alongside Chamber's pilot, with credential issuance entering the
Chamber workflow the moment prescriptions can be signed — because every
signed prescription from day one is the Pharmacy network's future inventory.

---

*Sources relied on in Section 2: BMDC statements via Prothom Alo (November
2024); The Record and The Daily Star reporting on the 2023 government data
leak (~50M citizens) and Smart NID/Telegram circulation; Personal Data
Protection Ordinance 2025 — cabinet approval 9 October 2025, gazette
notifications November 2025, ownership/consent/sensitive-data/localization
provisions and 18-month effectivity (Daily Star, Prothom Alo, Dhaka Tribune,
ordinance text via dpo-india); National Data Governance Ordinance 2025;
Surokkha scale, universal health-ID pilots, and ADB health-DPI modelling via
Daily Star; BMET smart-card and ILO digital-governance sources as cited in
the Continuity paper; referral self-referral data (Hospital paper); CHT
consultation-length study and female-physician findings (Chamber paper);
W3C DID Core 1.0 and Verifiable Credentials Data Model 2.0 specifications.*

*Glyph by KhaM Health · KhaM Labs Inc. · In memory of Khayer and Mamataj.*
