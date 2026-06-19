# Glyph Chamber
## The Doctor's Interface

**Glyph by KhaM Health · Product Document 01 of 11 · June 2026 · Dhaka**
**Powered by KhaM-Med, Bangladesh's sovereign clinical AI**

---

## 1. The room this is built for

A chamber on Mirpur Road, 6:30 in the evening. The doctor finished his government
hospital shift at 2:30pm and has been seeing private patients since 4. Thirty-one
seen, fourteen waiting. The next patient is 68, speaks Chittagonian, and is
accompanied by her son, who answers every question on her behalf and quietly
minimizes the symptoms because the last round of tests cost ৳8,000. She carries a
plastic bag holding three years of prescriptions and lab reports from seven
different doctors. The doctor has minutes — not the thirty the case deserves. He
cannot read the bag. He will rely on what the son chooses to say.

Glyph Chamber exists so that when this doctor walks in, he already knows what is
in the bag, what the patient herself said before her son rephrased it, and what
in her history would be dangerous to miss.

## 2. The evidence: what Bangladeshi outpatient care actually looks like

This section is deliberately built on published research and official statistics,
because the design decisions in Section 3 each answer a documented failure.

**The shortest consultations measured anywhere in the world.** The largest
international review of consultation length ever conducted (Irving et al., BMJ
Open, 2017 — 179 studies, 67 countries, 28.5 million consultations) found
Bangladesh at the bottom of the global table: an average primary care
consultation of roughly 48 seconds, against 22.5 minutes in Sweden. The same
review notes that in countries like Bangladesh, Pakistan and China a single
primary care physician may run more than 90 consultations in a day, and that
consultations under five minutes amount to little more than triage plus a
prescription. A Bangladeshi hospital-based study in the Chittagong Hill Tracts
(763 patients, six district/upazila hospitals, published 2021) measured a more
generous 9.1 minutes on average in that setting — and found that longer visits
correlated with patient-centered communication, follow-up visits, and female
doctors. The honest synthesis: depending on setting, the Bangladeshi outpatient
encounter runs from under one minute to under ten. Nowhere does it approach what
complex chronic disease requires.

**Too few doctors, and a registry that cannot be verified downstream.** World
Bank data puts Bangladesh at roughly 0.67 physicians per 1,000 people (2021) —
about one doctor per 1,500 citizens. BMDC reported (November 2024) 134,568
registered physicians, while acknowledging that approximately 36,000 are
practicing without renewed registration, that it cannot say how many registered
with forged documents, and that it does not know how many people practice with
no registration at all. This is not a side detail. It means that today, no
pharmacy, diagnostic center, hospital, or patient in Bangladesh can reliably
verify that a prescription was written by a currently-licensed physician. The
regulator itself has said it lacks this visibility.

**The paper prescription is an error engine.** Bangladeshi prescription-error
studies converge on the same picture: a multi-city survey of handwritten
outpatient prescriptions found illegible handwriting in 46% of the subscription
section; a tertiary-hospital study counted 3.85 errors per prescription and
found antibiotics on 78% of prescriptions examined; a private-hospital study of
200 inpatient prescription orders identified 692 medication-related problems and
366 drug interactions, with an average of more than six drugs per prescription
and no dose adjustment for identified renal patients. A 2024 Dhaka comparison of
government and private hospital prescriptions against WHO prescribing indicators
found both sectors far off the standard, with illegibility and omissions cited
as drivers of the large majority of medication errors. The doctor is not the
villain in these numbers; the 48-second visit and the paper pad are.

**Patients pay for the dysfunction directly.** Bangladesh's National Health
Accounts show out-of-pocket spending rising from 67% (2015) to 68.5% (2020) to
73% (2021) of total health expenditure — the highest in SAARC. The Health
Economics Unit attributes the majority of that spending to medicines (54-64%
across surveys), with diagnostics second. The same body reports that 16.4% of
households skip needed care because of cost, and that roughly 4.5% of the
population is pushed into poverty by health spending every year. Every
unnecessary repeat test because the old report is unreadable, every duplicate
or interacting drug, every wrong-specialty referral is paid for out of a
household's food budget.

**The market structure is chamber practice.** The dominant outpatient reality is
the private chamber: a government or hospital-employed doctor seeing private
patients in evening sessions, fee-for-service, cash, no EHR, no appointment
system, supported at most by an assistant managing the queue. Qualitative
research on Dhaka's for-profit sector (BMJ Global Health) documents the
ecosystem around it — broker referral fees, pharmaceutical-agent influence on
prescribing — which is precisely the environment where a doctor-owned,
evidence-cited decision layer changes behavior.

## 3. The product: what Chamber does, mapped failure by failure

Glyph Chamber is a tablet/phone PWA in the doctor's chamber, with a companion
intake surface in the waiting area. Each capability below exists because a
specific number above demanded it.

**Pre-visit intake (answers the 48 seconds).** While the patient waits, Glyph
conducts a structured clinical interview in Bangla — voice-first, dialect-aware,
unhurried. By the time the doctor walks in, the history-taking that the
48-second visit can never do has already happened. The doctor's minutes are
spent on examination and judgment, not on extraction.

**The attendant protocol (answers the son who speaks for his mother).** Glyph's
first question is who is holding the device. In attendant mode, every clinical
fact is source-tagged — patient self-reported, attendant-reported,
attendant-translated, attendant-observed — and discrepancies are flagged
("possible attendant minimization — verify directly"). No clinical AI built for
Western solo-patient encounters does this; in Bangladesh it is not an edge case,
it is the default visit. The CHT study's finding that patient-centered
communication is the strongest predictor of adequate consultation length is, in
effect, what the attendant protocol operationalizes for the doctor.

**Plastic-bag digitization (answers the unreadable history).** The intake camera
photographs every paper in the bag. Extraction is tuned to Bangladeshi reality:
the ℞ pad layout, 1+0+1 dose notation, local brand names mapped to generics
(Napa → Paracetamol), the panel formats of Popular, Ibn Sina, Lab Aid and the
other major chains, dengue panels, critical values. Three years of paper becomes
a structured longitudinal record in the minutes the patient would otherwise
spend simply waiting.

**The briefing card (the fifteen-second read).** Red-flag-first. Current
medications cross-referenced against every prescription in the bag — the
beta-blocker another doctor started three months ago surfaces *before* a second
one is prescribed, not after. Lab trends, not lone values. Source tags visible.
Built against the documented error profile: interactions, duplications, renal
dosing.

**In-consultation evidence (the global brain on tap).** The doctor can ask
KhaM-Med — routed today through Claude for Healthcare, UpToDate, and PubMed-
grounded search, tomorrow increasingly through the sovereign model itself — and
receive a cited answer in seconds. Citations are mandatory; in an ecosystem
where pharmaceutical agents shape prescribing, the counterweight is visible
evidence.

**Note generation in the Bangladeshi format (answers the 46% illegibility).**
CC / O-E / Ix / Rx / Advice — never SOAP. The doctor reviews, edits one line,
approves. The output is legible, complete, dose-stated, interaction-checked: a
direct strike at the 3.85-errors-per-prescription baseline. On approval, the
prescription is issued as a Verifiable Credential signed by the doctor's
BMDC-anchored DID — which is what makes Glyph Pharmacy's enforcement loop
possible downstream.

**Follow-up (answers the visit that ends at the door).** Two days later the
patient receives a plain-Bangla WhatsApp message checking symptoms and
reinforcing instructions — written at the comprehension level of the patient,
not the doctor.

## 4. What the identity layer changes for the doctor specifically

The BMDC statistics above — 36,000 unrenewed registrations, unknown forgeries —
are usually framed as a regulator's problem. They are equally the honest
doctor's problem: his legitimate registration is indistinguishable, at the point
of care, from a forged one. Chamber gives the legitimate doctor a
cryptographically verifiable professional identity. His prescriptions carry his
signature in a form any pharmacy or hospital can verify against a published key.
In phase one this credential is self-attested with provenance disclosed; as
institutions and ultimately BMDC join as issuers, its strength upgrades without
the doctor changing anything about how he works. The doctor who adopts Chamber
early is, in effect, first in line for the verified tier of his own profession.

The patient-side identity matters to the doctor too: a returning patient's
record is genuinely longitudinal — including encounters at other Glyph-connected
providers the patient consents to share — which is the first time a Bangladeshi
chamber doctor has ever had that.

## 5. Why the doctor pays: the economics

Chamber pricing: ৳8,000-10,000/month solo; ৳15,000-25,000/month clinic tier.

The value case is throughput and risk, in that order. A chamber doctor seeing
35-45 patients per evening session at ৳500-1,000 per visit grosses
৳17,500-45,000 per session. If pre-visit intake and the fifteen-second briefing
let him see even three to five more patients per session without extending hours
— or see the same number with materially better documentation — the subscription
returns itself within days. The risk side is quieter but real: the briefing
card's interaction and duplication checks operate directly against the
documented error profile that produces patient harm and, increasingly,
professional consequences for doctors.

Per-visit AI cost at current routing is $0.10-0.30; at 40 patients/day this is
roughly $120-360/month in cost against $67-210/month in revenue per doctor —
which is why the KhaM-Med distillation path (frontier models as teachers,
sovereign model taking an increasing share of routine traffic) is not a
nice-to-have but the margin model. Chamber is the data flywheel's first turbine:
every doctor-corrected note is training signal for KhaM-Med, with consent and
de-identification governing the pipeline.

## 6. Honest constraints

- **The 48-second number is also the adoption risk.** A doctor running 90
  consultations a day has no slack to learn software. Chamber must demand
  nothing: the doctor's only new behaviors are reading a card and tapping
  approve. Anything more fails. This is why the first pilot is one doctor, with
  the founder physically present in the chamber, iterating daily.
- **Dialect speech recognition is not solved.** Standard Bangla STT is workable;
  Chittagonian, Sylheti, Noakhali are not, yet. Text fallback and
  attendant-mediated intake bridge until KhaM's dialect training matures on data
  Glyph itself collects.
- **The briefing is decision support, never decision.** The doctor approves
  every note. KhaM-Med suggests; the BMDC-registered human signs. This is both
  the clinical-safety position and the only defensible regulatory posture.
- **De-identification before external AI calls is mandatory and currently
  incomplete in the build** (enforced in consult-query; extension to all edge
  functions is on the critical path). Until KhaM-Med carries sensitive flows
  locally, regex-level de-identification is a known-insufficient stopgap and is
  documented as such.

## 7. Build status (June 2026)

The Chamber workflow is the most-built part of Glyph: ~130 files, clean
TypeScript build, 10 edge functions calling real APIs, 18 Bangladesh-specific
prompt files (~4,500 lines including the Bangla medical glossary and the
attendant-mode source-tagging protocol), 32 UI components, multi-provider
routing with fallback. The audited critical path to first doctor demo is 40-60
hours of wiring (auth, realtime queue, voice end-to-end, briefing/consult/note
connections, de-identification extension, consent persistence) — plus the
known-broken items from the technical audit: the client-to-edge body-key
mismatch, the missing STT function, and OAuth for the Vertex/MedGemma path.
Chamber ships first; every other Glyph interface inherits the identity and
record infrastructure it proves.

---

*Sources relied on in Section 2: Irving G. et al., "International variations in
primary care physician consultation time," BMJ Open 2017; Hossain A. et al.,
hospital-based cross-sectional study of consultation length in CHT, 2021 (PMC);
BMDC public statements, November 2024 (Prothom Alo); World Bank physicians
density indicator, 2021; Bangladesh National Health Accounts 6 and Health
Economics Unit releases 2021-2024 (TBS, Daily Star, BSS); handwritten
prescription error studies — Haque et al. J App Pharm Sci 2016, Bangladesh
Pharmaceutical Journal 2015 (two studies), multi-city prevalence survey 2019;
Dhaka government-vs-private prescribing comparison, 2024 (PMC); qualitative
study of Dhaka's for-profit sector, BMJ Global Health (PMC).*

*Glyph by KhaM Health · KhaM Labs Inc. · In memory of Khayer and Mamataj.*
