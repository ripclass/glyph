# Glyph Bridge
## The Cross-Border Interface

**Glyph by KhaM Health · Product Document 09 of 11 · June 2026 · Dhaka**
**Powered by KhaM-Med, Bangladesh's sovereign clinical AI**

---

## 1. The family this is built for

A retired college teacher in Khulna with a suspicious mass on his CT report.
His children have decided — the way hundreds of thousands of families decide
every year — that the diagnosis must be confirmed in Chennai, because nobody
here trusts the report, the machine, or the signature on it. The family will
spend three weeks and the equivalent of two years of his pension. They will
carry his medical life in a shopping bag: a CT film, six prescriptions in six
hands, lab printouts from three centers. In Chennai, the oncologist will spend
the first two days re-doing tests because she cannot trust or read what came
out of the bag. And in 2026 there is a new cruelty: the Indian medical visa
that half a million Bangladeshis used in 2024 is now restricted to critical
cases — so the family may instead fly farther and pay more, to Bangkok, for
the same two days of re-testing.

Glyph Bridge exists to do two things for this family: let the Chennai or
Bangkok specialist see a verifiable, structured, complete record *before*
anyone buys a ticket — often making the ticket unnecessary — and, when travel
is genuinely warranted, make the record arrive better organized than the
patient.

## 2. The evidence: an outflow larger than the national health budget

**The scale.** Bangladeshis spend an estimated $4-5 billion annually on
overseas medical treatment (CPD-derived analyses, DCCI keynote, TBS
reporting) — a figure exceeding the government's entire FY2025-26 health
budget of roughly $3.38 billion. Patient counts vary by method: India's
Ministry of Tourism recorded about 482,000 Bangladeshi medical travelers in
2024 — roughly 52% of all inbound medical tourists to India — while broader
estimates of total outbound medical travel run from 300,000 to 800,000 per
year across India, Thailand, Singapore, Malaysia, and, increasingly, Turkey
and China. Whatever the exact count, the direction is undisputed: the
country's most diagnosis-intensive, highest-spending patients are exported,
along with their foreign exchange.

**Why they go — the DCCI's own diagnosis.** When Dhaka's commercial
establishment examined the outflow (DCCI seminar, December 2025), the keynote
named the drivers: lack of trust among patients and families, doubts over
proper diagnosis, sudden bill increases and hidden charges, fear of
counterfeit medicines and substandard equipment. Read that list against the
previous papers: doubts over diagnosis is the Lens ghost-signature problem;
counterfeit-medicine fear is the Pharmacy verification problem; hidden charges
is a records-and-accountability problem. The outflow is not primarily a
technology gap — Dhaka has CT scanners — it is a *trust* gap, and trust is
precisely what verifiable credentials manufacture. The University of Dhaka
health economist quoted in the same reporting adds that equipment without
ecosystem (personnel, maintenance, coordination) cannot retain patients. Both
analyses point the same direction: the missing layer is integrity
infrastructure, not machines.

**The 2024-26 visa shock turned remote access from convenience to
necessity.** India's restriction of medical visas to critical cases (amid
post-2024 political tensions) cut the dominant corridor: 482,000 travelers in
2024, already down from ~500,000, with reporting of a 200% surge in Thailand
inquiries from Bangladesh in late 2024 as patients scrambled for alternatives
at higher cost. For the family in Khulna, the Chennai specialist's opinion is
now harder to reach physically than ever — which makes a structured remote
second opinion not a nice-to-have but the only affordable access to exactly
the expertise the family was buying with the plane ticket. Bridge's core use
case was handed a tailwind by geopolitics.

**The workflow reality.** Studies of Bangladeshi medical travelers to India
(IVAC-based survey, N=388) confirm the texture: predominantly self-arranged,
self-treated decisions, records carried by hand, repeated diagnostics on
arrival. Every re-done test in Chennai is the ADB duplicate-diagnostics waste
(Pocket paper) exported at international prices.

## 3. The product: what Bridge does

**The credential bundle.** From the patient's wallet, with consent, Bridge
assembles a specialist-ready dossier: structured history, medication list
with generic names, lab results as signed credentials with reference ranges,
imaging with reports (and original DICOM/films where digitized), all
machine-translated into clinical English with the Bangla originals attached
and every item's issuer signature verifiable by the receiving physician. The
two days of Chennai re-testing exist because the bag is unreadable and
untrustworthy; the bundle is neither.

**The remote second opinion.** Bridge connects the bundle to a panel of
foreign specialists — Indian, Thai, Singaporean, Malaysian, and diaspora
Bangladeshi physicians abroad (the cardiologist in London who left, finally
plugged back into the system that trained her) — for paid, asynchronous,
structured review: diagnosis concurrence, treatment-plan commentary,
is-travel-warranted triage. The output returns as a signed credential into
the wallet, in English and plain Bangla, and lands with the patient's
Bangladeshi treating physician — because the bright line, identical to
Continuity's, is that the foreign specialist *informs* and the locally
licensed doctor *decides and prescribes*. No cross-border prescribing; the
same legal architecture, pointed the other direction.

**When travel happens anyway.** For genuinely travel-warranted cases, the
bundle precedes the patient to the destination hospital; appointments begin
with review, not repetition. And — the half everyone forgets — when the
patient returns, Bridge's intake digitizes the foreign records (discharge
summaries from Apollo or Bumrungrad, operative notes, histopathology) back
into the wallet, so the Khulna follow-up doctor inherits the Chennai surgery
instead of a rumor of it. Continuity-of-care for medical travel currently
ends at each border in both directions; Bridge closes both crossings.

**The diaspora purchaser.** The children deciding and paying for the Khulna
teacher's care are, in a large fraction of cases, abroad. Bridge is a natural
extension of the Pocket Premium family tier (Continuity paper): the son in
London commissions and pays for the second opinion in pounds, reads the
English summary, and joins the family decision with actual information. The
purchasing power is already offshore; Bridge gives it a product.

## 4. Why this needs the identity layer

A foreign specialist's first question about records from a country whose
diagnostic sector the previous papers describe — half of centers reportedly
unlicensed, physician names used without knowledge, a national fake-report
scandal — is *why should I believe any of this?* Bridge's answer is the only
scalable one: don't believe the paper, verify the signature. Every element of
the bundle is checkable against its issuer's published key — this lab is
DGHS-licensed, this radiologist's DID is BMDC-anchored, this prescription was
signed by this physician on this date. Verification is what converts a
shopping bag into a dossier a Singapore oncologist will stake an opinion on.
No database export, no bilateral integration agreement between Bangladeshi
and Indian hospital systems — which will never exist — just W3C-standard
credentials any party can verify unilaterally. This is the portability thesis
at its purest: the record crosses borders because it belongs to the patient
and proves itself.

## 5. Economics — and Bridge's honest role in the ecosystem

Bridge serves Bangladeshis who can contemplate $5,000-30,000 of foreign
treatment; it is therefore the ecosystem's *paying* tier, priced accordingly:
second-opinion consultations at market rates (foreign specialist's fee plus
platform margin — realistically $100-400 per case depending on specialty and
panel), credential-bundle preparation included, diaspora-billed in foreign
currency. Bundle-only preparation (for families traveling regardless):
flat-fee ৳3,000-8,000. Returning-record digitization included with either.

Its role in the ecosystem must be stated plainly: Bridge is a revenue and
cross-subsidy engine and a demand-side wedge for the affluent and diaspora —
the populations that least need Glyph's mission and most fund it. Every
Bridge fee helps pay for Maa cuffs and Apa tablets. It also recruits exactly
the demographic whose adoption legitimizes the network domestically (the
Dhanmondi consultant whose own family uses Bridge starts trusting Glyph
credentials in his chamber). If, over years, verifiable domestic diagnostics
(Lens) and credible domestic specialists retain even a few percent of the
$4-5B outflow, that is a macroeconomic contribution — but this document does
not claim Bridge repatriates the outflow; it claims Bridge makes the existing
outflow less wasteful and funds the mission while doing so.

## 6. Honest constraints

- **Bridge is not the mission; it funds the mission.** The Khulna teacher's
  family is not Glyph's neediest user, and design attention must never let
  Bridge's revenue gravity pull the roadmap away from Maa, Apa, and
  Continuity. Stating this in the product document is the cheapest governance
  mechanism available.
- **Foreign-specialist liability and registration.** A second opinion is
  information to the patient and treating physician, not practice of medicine
  in Bangladesh — the framing must be airtight per jurisdiction, panel
  agreements must say what specialists may and may not state, and the
  treating-physician-decides rule is absolute.
- **Panel quality is the product.** A second-opinion marketplace is only as
  credible as its worst panelist; credentialing foreign specialists (their
  own verifiable credentials — the system eating its own cooking) precedes
  scale.
- **Translation is clinical-grade or it is dangerous.** Machine translation
  of clinical Bangla with dialect-inflected histories needs the same human-
  verification loop as Lens drafts; KhaM-Med's bilingual clinical capability
  (document 11) is the long-term answer, human review is the near-term one.
- **The visa tailwind can reverse.** If the India corridor reopens fully,
  remote-opinion urgency softens; the bundle and return-digitization value
  survive regardless. Bridge's design leans on the durable half.

## 7. Build status (June 2026)

Bridge is unbuilt and correctly last among the patient-facing interfaces: it
presumes a wallet worth bundling (Pocket), credentials worth verifying
(Chamber, Lens), and the identity layer (document 10). Its specific pieces —
bundle assembler, translation pipeline, specialist panel and payment flows,
return-intake — are mostly compositions of existing designs plus payments
(Stripe rails exist on the Enso side; bKash/foreign-currency flows are new).
Sequenced for Year 2-3, launched with a deliberately narrow first corridor:
oncology second opinions, one partner panel (the specialty with the highest
stakes, the clearest dossiers, and — per the outflow reporting — the
disease-specific gap the government itself names first). The first pilot
family should be one that was denied an Indian visa; the product's reason to
exist is currently sitting in their living room.

---

*Sources relied on in Section 2: TBS medical-tourism analyses (October and
December 2025) including India Ministry of Tourism figures (482,000 in 2024;
~52% of inbound), visa-restriction reporting, Thailand inquiry surge, and the
$5B-vs-health-budget comparison; DCCI seminar keynote (United Hospital
MD/CEO), December 2025, on outflow drivers; The Bangladesh Today / Daily Star
800,000-traveler and $4-5B estimates with CPD attribution; ITHJ 2021 study
($3.5B / 700,000 with trust-and-diagnostics attribution); Frontiers in Public
Health / PMC IVAC survey of Bangladeshi medical travelers to India (N=388);
ORF research on India-Bangladesh medical-travel corridor and post-2024
restrictions; cross-references to Lens (report integrity), Pharmacy
(counterfeit fear), Pocket (duplicate diagnostics), and Continuity (no
cross-border prescribing) papers.*

*Glyph by KhaM Health · KhaM Labs Inc. · In memory of Khayer and Mamataj.*
