# Glyph Lens
## The Diagnostic Center Interface

**Glyph by KhaM Health · Product Document 04 of 11 · June 2026 · Dhaka**
**Powered by KhaM-Med, Bangladesh's sovereign clinical AI**

---

## 1. The center this is built for

A diagnostic center on a district-town main road, two floors above a pharmacy.
It has a functioning X-ray machine, an ultrasound, a busy sample-collection
counter — and no radiologist. The films are read in batches when a Dhaka-based
consultant reviews them remotely, or visits weekly, or, in the worst version of
this story, when the center simply prints a report over the name of a physician
who has never seen the image. The X-ray technologist who took the film has been
doing this work for eleven years and can often see the tuberculosis or the
fracture himself — but his seeing counts for nothing, because no system exists
in which his observation can be captured, assisted, verified, and signed.

Meanwhile a patient holds her report and has no way to know whether the
signature on it belongs to a doctor who ever looked at her film. Glyph Lens is
built for both of them.

## 2. The evidence: a diagnostic sector running on missing specialists and unverifiable paper

**Roughly 700 radiologists for 170+ million people.** A Bangladesh Journal of
Medical Science estimate puts the country's radiologist count near 700 — about
four per million population — with the Bangladesh Society of Radiology and
Imaging confirming the figure is below one thousand and overwhelmingly
concentrated in Dhaka (Bonik Barta, November 2025). The reported consequence is
exactly what the district-town scene describes: patients outside Dhaka waiting
days to weeks for X-ray, ultrasound, CT, and MRI reports, with delayed cancer
diagnosis named explicitly by the professional society. Pathology mirrors
radiology: reviews of the health workforce document a scarcity of pathologists,
minimal technical support staff, and the long pipeline required to train
replacements, while roughly 70% of health facilities outside cities lack basic
examination equipment entirely.

**The license is often missing, and so is the truth on the report.** DGHS's
2022 nationwide crackdown closed 1,149 illegal private hospitals, clinics,
diagnostic centers, and blood banks in its first days — 267 in a single day —
and triggered 558 license applications in one day from facilities suddenly
fearing raids. An icddr,b study found about 14% of private hospitals had never
filed for registration at all, with many more operating on expired licenses
because renewal is slow and costly. A Financial Express editorial summarizing
the sector put it bluntly: around half of diagnostic centers reportedly operate
without valid licenses, often without maintaining lab standards — and, most
damning for this paper, *using the names of technicians and physicians without
their knowledge*. The ghost-signed report is not an anecdote; it is a described
industry practice.

**Fake reports have already collapsed public trust once, at national scale.**
During COVID-19, a Dhaka hospital owner and more than a dozen others were
arrested for issuing thousands of fake virus-free certificates without
performing tests; DGHS separately banned four named Dhaka laboratories from
traveler rt-PCR testing over false reports. The measurable aftermath: national
daily testing nearly halved (about 18,000 to just over 10,000), with the former
head of IEDCR attributing the drop to public distrust of test credibility. This
is the controlled experiment no one wanted: when reports cannot be trusted,
people stop testing. The diagnostic market's most valuable asset is
verifiability, and Bangladesh's diagnostic market has publicly lost it once
already.

**The regulator is already reaching for verification — crudely.** In September
2022, DGHS ordered every private hospital, clinic, diagnostic center, and blood
bank to display its license number, expiry date, and *a QR code* on its
signboard, on pain of legal action. Read that as what it is: the state
instinctively groping toward verifiable credentials with the only tool it had —
a QR code pointing at a registry entry. Glyph Lens is that instinct implemented
properly: not a sign on the wall, but a cryptographic signature on every single
report.

**Demand-side context from the companion papers.** Out-of-pocket spending
(73% of total health expenditure) allocates its second-largest share to
diagnostics; duplicate testing — re-ordering investigations because the prior
report is lost, unreadable, or untrusted — is precisely the waste ADB's
health-DPI modelling priced in the hundreds of millions of dollars annually
(Pocket paper). And the Chamber paper's prescription-error literature shows
investigations ordered on paper enter the same illegibility pipeline as drugs.

## 3. The product: what Lens does

Glyph Lens is the diagnostic center's connection to the Glyph network: orders
in, signed results out, AI co-interpretation in the middle.

**Structured orders in (from Chamber).** When a Glyph Chamber doctor orders
investigations, the order arrives at the patient's chosen center as structured
data — test, clinical context, ordering physician's signed credential — not as
a handwritten line on an Rx pad. The center knows exactly what was ordered and
by whom; the documented order-transcription error class disappears at
participating centers.

**Results out as signed Verifiable Credentials.** Every report the center
issues is signed by the center's DID and by the verifying professional's DID,
and lands in the patient's wallet with reference ranges, abnormal flags, and
sample provenance as structured fields. Three consequences follow directly from
the evidence above. The ghost-signature practice dies at participating centers,
because a report signed over a radiologist's name now requires that
radiologist's actual key. The patient — and any future doctor — can verify in
seconds that the report is real, which is the antidote to the COVID-era trust
collapse. And the HbA1c from last year is findable, trendable, and trusted, so
the duplicate-test economy shrinks for exactly the patients who can least
afford it.

**AI co-interpretation for the technologist (the heart of Lens).** The
eleven-year X-ray technologist gets KhaM-Med as a second reader: multimodal
models (MedGemma-class vision capability on X-ray, ECG, and ultrasound imagery,
routed through the same multi-provider layer as the rest of Glyph) produce a
draft observation — not a diagnosis — flagging likely findings and urgency.
The draft routes to a remote radiologist for verification and signature. The
scarce specialist's hour is spent confirming and correcting structured drafts
across many centers instead of reading cold films for one; the four-per-million
radiologist supply is multiplied rather than bypassed. The technologist's
seeing finally counts, inside a chain where a licensed human still signs.

**Remote verification workflow.** Lens's queue connects district-town centers
to the Dhaka-concentrated radiologist pool the Bonik Barta reporting describes:
films and drafts flow up, signed reports flow back — turning the
days-to-weeks wait into hours where the network has coverage, with urgent flags
(the suspected malignancy, the pneumothorax) jumping the queue by design.

**Center-format intelligence.** The extraction layer already encodes the panel
formats of Popular, Ibn Sina, Lab Aid and other major chains (Chamber paper,
build status); Lens inverts this knowledge to *generate* clean, structured,
chain-consistent reports, and to ingest legacy paper reports a patient brings
from any non-participating center.

## 4. Why this needs the identity layer

Lens is the clearest case after Pharmacy. The sector's documented pathologies —
ghost signatures, fake certificates, unlicensed operation behind a convincing
signboard — are all *attribution* failures. A report is only worth what its
signature is worth. DGHS's QR-code directive shows the regulator knows this and
lacks the instrument. The instrument is exactly what the network provides: the
center holds a DID anchored to its DGHS license credential; the radiologist
holds a DID anchored (in phases, per the trust-bootstrap model in document 10)
to BMDC registration; the report is a credential signed by both. A forged
report fails verification at any Glyph-connected doctor, hospital, or pharmacy.
The honest center — and there are thousands — gains what it cannot buy today:
proof of honesty that travels with every report it issues.

## 5. Economics

Lens charges the center: per-report fees of ৳50-100 or subscriptions of
৳15,000-25,000/month depending on volume. The center's return is concrete —
faster reporting attracts ordering doctors (the Chamber network is a referral
channel pointed straight at participating centers), co-interpretation raises
throughput on existing machines, and the verifiable-report credential becomes a
competitive weapon in a market where, post-COVID-scandal, trust is the scarce
good. The patient pays nothing for verification; checking a report's signature
is free forever, for the same reason Pharmacy is free: verification density is
the public good.

For KhaM Health, Lens is also the imaging arm of the data flywheel: consented,
de-identified image-and-report pairs, corrected by verifying radiologists, are
the training corpus that moves KhaM-Med's multimodal capability from
frontier-dependent to sovereign — the highest-value clinical data in the whole
ecosystem.

## 6. Honest constraints

- **AI co-interpretation is regulated medical territory and must be framed
  as draft-for-verification, never autonomous reading.** The signing
  professional is legally and clinically the reader. Lens's safety case
  depends on that line never blurring — including in marketing.
- **Vision-model performance claims must be earned locally.** Published
  MedGemma-class benchmarks are not Bangladeshi chest films from
  fifteen-year-old machines. Lens pilots must measure local sensitivity and
  specificity per modality before urgency-flagging is trusted, and publish
  what they find.
- **The unlicensed half of the sector will not adopt voluntarily** — the same
  perimeter problem as Pharmacy. Lens changes the competitive landscape for
  honest centers and gives DGHS a formalization instrument; it does not
  abolish the shadow sector by itself.
- **Connectivity and hardware.** District centers run old machines without
  DICOM networking; Lens must accept a technologist photographing a film with
  a phone as a first-class input, because that is the ground truth of the
  installed base.
- **Radiologist incentives.** Remote verification pays the specialist per
  signed report; if the rate undercuts Dhaka chamber income, the queue starves.
  Pilot economics must price the radiologist's hour honestly.

## 7. Build status (June 2026)

Lens inherits more than any other interface: the extraction prompts for lab
formats, the multimodal routing (MedGemma 4B/27B via Vertex — pending the OAuth
fix flagged in the technical audit), the lab_reports schema, and the
LabTrendChart component all exist. Not yet built: the center-facing surface,
the order-routing from Chamber, the draft-verify-sign workflow, the
per-modality local validation program, and — as everywhere — the DID/VC layer
itself (document 10). Lens is sequenced behind Chamber (which generates its
order flow) and alongside the identity lift, with the first pilot being one
district-town center paired with two or three remote radiologists and the
local Chamber doctors already ordering from it. Wave 3 in the adoption plan;
the forcing function is Chamber's structured order volume, exactly as the
vision document specifies.

---

*Sources relied on in Section 2: Bonik Barta reporting on the radiologist
shortage with BJMS estimate and BSRI statements, November 2025; health-workforce
and digitalization-perception studies (PMC9602521, PMC3037300) on pathologist
scarcity and facility equipment gaps; Daily Star and Dhaka Tribune coverage of
the 2022 DGHS crackdown (1,149 closures; 558 single-day license applications);
icddr,b 2019 registration findings via TBS; Financial Express editorial on
unlicensed diagnostic centers and unauthorized use of physician names; Dhaka
Tribune and Gulf News coverage of the COVID fake-certificate scandal, the four
banned laboratories, and the ~45% national testing decline attributed to
distrust; DGHS September 2022 signboard license/QR directive (TBS, Financial
Express); Bangladesh National Health Accounts diagnostics share; ADB health-DPI
duplicate-testing modelling via Daily Star.*

*Glyph by KhaM Health · KhaM Labs Inc. · In memory of Khayer and Mamataj.*
