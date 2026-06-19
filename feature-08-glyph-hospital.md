# Glyph Hospital
## The Institutional Interface

**Glyph by KhaM Health · Product Document 08 of 11 · June 2026 · Dhaka**
**Powered by KhaM-Med, Bangladesh's sovereign clinical AI**

---

## 1. The ward this is built for

A medicine ward in a district hospital, built for forty beds, holding
sixty-three patients — the extra twenty-three on floor mattresses between the
cots. A 58-year-old man arrives at 2am, unconscious, brought by relatives who
know he "takes gas tablets and something for pressure." There is no referral
note because no one referred him; the family came straight here, past the
union and upazila facilities, because everyone knows those have nothing. The
duty doctor starts from zero on a stranger, at night, in a corridor. Eleven
days later the man leaves with a discharge slip — a few handwritten lines —
that will go into the plastic bag and never be seen by another clinician. If
he returns in three months, he will be a stranger again.

The hospital is where every failure documented in the previous seven papers
converges: the unprepared receiving facility from Maa's verbal autopsies, the
illegible medication history from Chamber's error studies, the unverifiable
report from Lens, the broken referral that Pocket's patients route around by
self-referring. Glyph Hospital is the institutional end of the same loop.

## 2. The evidence: an inverted pyramid that admits strangers and discharges into a void

**The pyramid is upside down, in the government's own numbers.** Bangladesh's
referral architecture assumes patients flow upward — community clinic to
union to upazila to district to medical college. The occupancy data shows the
opposite: secondary facilities run at roughly 148% bed occupancy and tertiary
at 137%, while *primary* facilities sit at 79% — under-used at the base,
crushed at the top. The Health Bulletin 2020 figures put average bed occupancy
around 163% nationally, ranging up to 370%; Sylhet's Osmani Medical College has
reported 190%. For calibration: international service-delivery evidence
associates occupancy above even 85-92% with measurably higher mortality and
near-certain inability to absorb emergency admissions. Bangladeshi tertiary
wards run at one-and-a-half to nearly four times that threshold as a steady
state.

**The patients are not misbehaving; they are routing rationally around a
system nobody told them about.** A two-hospital cross-sectional study of 822
tertiary-care patients found 59% were self-referred — and 58% were entirely
unaware that a referral system exists. Self-referral correlates with exactly
what the previous papers document: distrust of lower-tier capability (the 70%
equipment-gap figure from Lens), distance, and the absence of any visible
benefit to entering at the bottom. The DEA efficiency study of secondary
hospitals found 79% technically inefficient under constant-returns assumptions,
and its policy prescription names the levers precisely: *proper referral
systems, discharge planning, and post-discharge follow-up* — the three things
that are, in information terms, credential flows.

**Admission means starting from zero.** There is no functioning record layer
(Pocket paper), so the unconscious man's "gas tablets and something for
pressure" is the actual standard of medication history at admission. The
inpatient prescribing study from the Chamber paper was conducted in exactly
this setting: 692 medication-related problems and 366 interactions in 200
inpatient orders, with no renal dose adjustment for identified kidney
patients — errors that begin with not knowing what the patient was already
taking.

**Discharge is an information cliff.** In one tertiary-hospital admissions
analysis, over a quarter of all discharges were "on request" or on request
bond — patients leaving early, against or ahead of advice, often for cost
reasons (the 61% distress-financing figure from the Pocket paper's
hospitalization study). Whatever the discharge type, the artifact is a
handwritten slip that does not travel. The efficiency literature's call for
"post-discharge follow-up initiatives" is an acknowledgment that, today, the
hospital's knowledge of the patient dies at the gate — readmissions arrive as
strangers, and the 30-day deterioration that a single follow-up call would
catch is caught by nobody.

## 3. The product: what Hospital does

Glyph Hospital is deliberately not a hospital information system. Bangladesh's
hospitals do not need another billing-and-beds HIMS sold top-down to
administrators; international graveyards are full of those. Hospital is the
*continuity layer*: four credential flows that make the institution a
connected node in the patient's record instead of an island.

**Admission with the wallet (the stranger problem).** The arriving patient —
or the relative holding her phone — presents the Pocket wallet; with consent
(or the emergency-access protocol for the unconscious patient, designed with
break-glass audit), the duty doctor sees in thirty seconds what no Bangladeshi
admission has ever had: active medications across every prescriber, allergies,
recent labs with trends, the Chamber visit two weeks ago where the warning
already appeared. The 2am corridor decision is made on a known patient.
KhaM-Med renders it as the same red-flag-first briefing card Chamber uses —
one format, learned once, across the whole network.

**Discharge as a credential (the cliff problem).** The discharge summary
becomes a structured, signed credential written to the patient's wallet:
diagnoses, procedures, discharge medications reconciled against the admission
list (closing the loop on the documented inpatient error profile), follow-up
schedule, and red-flag instructions in plain Bangla for the family. The
follow-up schedule rides the existing WhatsApp rails — the post-discharge
check at day three and day fourteen that the efficiency literature asks for,
automated, with escalation back to the discharging ward or the patient's
matched Chamber doctor. The "on request" early discharge gets a specific
variant: what to watch for, when return is non-negotiable — harm reduction for
a departure the hospital could not prevent.

**Referral as a routed credential (the pyramid problem).** Upward referrals
from Glyph-connected facilities arrive as Maa-style structured handovers —
the receiving hospital sees the patient coming, with history and current
findings, before the ambulance does. Downward referrals — the stabilized
patient sent back to district or upazila care, today almost nonexistent
because the lower tier can't be trusted with a paper slip — become viable
because the record travels with cryptographic integrity. Glyph cannot
single-handedly re-invert the pyramid; it can make the correct routing
*cheaper than self-referral* for the patient who has a wallet and a matched
doctor, which is the only mechanism (per the self-referral study's own
findings about awareness and trust) with any prospect of working.

**The institutional DID (the trust problem).** The hospital itself holds a
DID anchored to its DGHS license — the same architecture as Lens centers.
Its discharge summaries, death certificates, and medico-legal documents are
institutionally signed and verifiable, which matters in a sector where the
Lens paper documented ghost signatures and where (per icddr,b) 14% of private
hospitals have never registered at all. The honest hospital gets the same
asset as the honest diagnostic center: portable proof of legitimacy.

## 4. Why this needs the identity layer

Every hospital IT project in Bangladesh's history has tried to build the
record *inside* the institution and failed to make it travel. The evidence
says the failure mode is structural: the patient's care is spread across
chambers, pharmacies, diagnostic centers, NGO clinics, and multiple hospitals
that do not and will not share databases. The only architecture in which the
district hospital, the Dhanmondi private clinic, and the village pharmacy all
see one truthful record is the one where the record belongs to the patient and
each institution signs its contribution. Hospital is also where emergency
access forces the identity layer's hardest design: break-glass read access for
the unconscious patient, family-circle authorization, full audit trail, and
post-hoc patient notification — specified in document 10, stress-tested here.

## 5. Economics

Hospitals pay ৳25,000-60,000/month by bed count — priced against the cost of
a single avoidable adverse event, and against what the institution already
wastes on duplicate admission workups (the ADB duplicate-diagnostics figure
from the Pocket paper, concentrated precisely at admission). But the honest
go-to-market is bottom-up, not procurement-first: the Chamber doctors already
inside every hospital (dual practice is the sector's structure, per the
Chamber paper) become the internal champions — they have already seen the
briefing card work in their evening chambers and start asking why the morning
ward round can't have it. Institutional sales follow demonstrated clinical
demand; the bKash pattern again. Public-hospital deployment is a
government-partnership track (DGHS), realistically grant-subsidized, and
sequenced last.

## 6. Honest constraints

- **Hospital cannot fix capacity.** A 163% occupancy ward with a perfect
  information layer is still a 163% ward. Glyph reduces information-driven
  waste (duplicate workups, medication errors, blind readmissions) and makes
  correct routing cheaper; beds, staff, and MgSO4 stocks are the state's to
  fund. The claim is efficiency at the margin, honestly bounded.
- **The emergency-access protocol is the single most abusable surface in
  Glyph.** Break-glass access must be narrow (read-only, time-boxed,
  fully audited, patient-notified) and its design reviewed independently
  before any hospital pilot. This document flags it as a precondition, not a
  feature.
- **Institutional adoption is slow and political.** Public hospitals answer
  to DGHS; private hospitals answer to owners with HIMS contracts and
  incentives the BMJ Global Health qualitative study (Chamber paper)
  describes frankly. The wedge is clinical utility to individual doctors, and
  the timeline is measured in years. Hospital is sequenced accordingly.
- **Downward referral requires lower-tier capability Glyph does not create.**
  Routing a patient back to an upazila facility that genuinely lacks the
  drugs (the NCD-readiness study found essential-medicine availability
  failing at every level) would be malpractice by software. The
  facility-readiness table from Maa governs here too: route only to what is
  verified real.

## 7. Build status (June 2026)

Hospital is the least-built and latest-sequenced clinical interface, by
design: it consumes everything the others produce — the wallet (Pocket), the
briefing card (Chamber), structured results (Lens), the routing and
facility-readiness tables (Maa), the handover format (Continuity), and the
identity layer itself (document 10). Its specific unbuilt pieces: the
admission/discharge credential flows, medication reconciliation, the
break-glass protocol, and the ward-facing surface. Year 2-3, entered through
the dual-practice doctors Chamber has already won, with the first deployment
being a single private hospital where two or more existing Chamber users
practice — the smallest possible institutional experiment that can prove the
admission-to-discharge loop.

---

*Sources relied on in Section 2: referral-system strengthening study with
occupancy ratios (148.2% secondary / 137% tertiary / 79% primary) and
822-patient self-referral analysis (59% self-referred; 58% unaware),
ResearchGate 2025; Sylhet geo-referenced referral modelling with Osmani
Medical College 190% occupancy (PMC7526238); secondary-hospital DEA efficiency
study with Health Bulletin 2020 occupancy figures (~163%, range to 370%) and
discharge-planning/referral prescriptions (PMC12505863 / BMC Health Services
Research 2025); tertiary-hospital admissions analysis with discharge-type
distribution (Bangladesh Journal of Medical Science); NICE evidence review on
bed occupancy and mortality (NCBI Bookshelf NBK564920) for international
calibration; cross-references as noted to the Chamber (inpatient medication
errors), Pocket (distress financing; ADB duplicate diagnostics), Lens
(equipment gaps; unregistered facilities), and Maa (facility readiness)
papers.*

*Glyph by KhaM Health · KhaM Labs Inc. · In memory of Khayer and Mamataj.*
