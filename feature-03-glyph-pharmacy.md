# Glyph Pharmacy
## The Dispensary Interface — and the Antibiotic Enforcement Loop

**Glyph by KhaM Health · Product Document 03 of 11 · June 2026 · Dhaka**
**Powered by KhaM-Med, Bangladesh's sovereign clinical AI**

---

## 1. The counter this is built for

A drug shop in a Lakshmipur bazaar, run by a man everyone calls "doctor" though
he has no medical or pharmacy degree — he learned the trade by apprenticeship
behind this same counter fifteen years ago. A mother comes in: her child has had
fever and a cough for two days. He reaches for an azithromycin course, because
that is what moves, what the last customer with this complaint bought, what the
pharmaceutical rep pushes, and what keeps her from walking to the shop forty
meters down the road if he refuses. There is no prescription. There will be no
follow-up. The child may have a virus. The course may be stopped on day three
when the fever breaks. None of this is recorded anywhere.

This counter is where Bangladesh's antibiotics are actually rationed — by sales
instinct, not clinical judgment. Glyph Pharmacy is built to put a verifiable,
physician-signed prescription where today there is only a guess and a cash
register.

## 2. The evidence: the most documented failure in Bangladeshi healthcare

If any part of the Glyph thesis is proven beyond argument by the published
record, it is this one. The studies do not merely agree — they escalate.

**Antibiotics are dispensed without prescription as the norm, not the
exception.** Estimates vary by method and region, and every one of them is
alarming. A WHO/DGDA-linked AWaRe-classification study in Bangladesh found 50.9%
of antibiotic courses purchased without a registered physician's prescription. A
2025 community-pharmacy study reported 56.6%. A September-December 2024
observational study across 246 Dhaka pharmacies found roughly 45% dispensed as
outright self-medication and another 19% on the drug-seller's informal advice —
leaving only 36.2% sold against a registered physician's prescription. And a
2024 survey of 287 pharmacy staff across four regions found that 92.4% of them
reported dispensing antibiotics without prescriptions — a rate the authors note
runs 15-25 percentage points above other South Asian and comparable low-resource
settings (Nigeria 78%, Vietnam 65%). Whether the true figure is "half of
courses" or "nearly all dispensers," the conclusion is identical: the
prescription is not a control.

**The dispenser is usually not a pharmacist.** Bangladesh has roughly 106,919
licensed retail pharmacies and an estimated equal number of *unlicensed* ones.
A Dhaka observational study found 93.5% of pharmacies held a valid license — but
only 7.6% had a registered pharmacist present. Around half of drug sellers
nationally have no formal pharmacy training, having learned by apprenticeship;
in one rural Matlab study, 51% of drug shops had no authorization to sell
antibiotics at all and were run by "village doctors" and untrained dispensers.
The country sits below 5 pharmacists per 10,000 population — effectively a 1:1
pharmacist-to-pharmacy ratio at best, meaning the professional simply is not at
the counter. The "pharmacist" in the AMR studies is, statistically, a
salesperson.

**The drivers are economic and structural, not malicious.** When asked why,
dispensers are honest: a 2024 study found fear of losing customers cited by
99.5% of rural and 74.6% of urban pharmacies, patient pressure by 65-78%, and
the absence of accessible doctors by 65% in rural areas — alongside the simple
profitability of antibiotics. Dispensers also report never seeing any government
authority enforce the existing rules. The law against OTC antibiotic sale
exists; enforcement does not. This is precisely the gap a structural mechanism,
rather than another awareness campaign, is needed to close.

**The clinical consequences are already here.** Reviews of AMR and
hospital-acquired infection in Bangladesh describe first-line antibiotics losing
efficacy, rising treatment costs, more treatment failures, and higher mortality
from bacterial infection — driven by irrational prescribing, incomplete courses
(patients buying partial doses they can afford), old-prescription reuse, and
unrestricted access. Globally, AMR is among the WHO's top ten health threats;
Bangladesh combines the worst access conditions with one of the highest
infectious-disease burdens. The DGDA/WHO mapping reported antibiotic sales rising
31% in a recent period, dominated by WHO "Watch" group agents — the ones
stewardship is supposed to protect.

**The patient side closes the loop with Pocket's findings.** Recall from the
Pocket paper that the pharmacy is the first (often only) point of care, sitting
1.5 km from home versus 2-4 km to a facility, and that self-medication relies on
old prescriptions and family advice. The Rajshahi dispensing study found that of
medicines sold without prescription, 66% were on the *client's own request* and
34% on the seller's recommendation. Demand-side habit and supply-side incentive
reinforce each other. Breaking the loop requires acting on both — which is why
Pharmacy only works in concert with Chamber (which creates verifiable
prescriptions) and Pocket (which gives the patient an alternative first voice).

## 3. The product: the Swedish loop, built for Bangladesh

The model Glyph implements is the one Sweden, Denmark, and the UK used to bring
antibiotic dispensing under control: the prescription is a system record, not a
piece of paper. The patient identifies at the pharmacy; the system shows what is
authorized; the pharmacy dispenses exactly that and records the event. No paper
transits, so none can be forged, lost, or ignored. Glyph Pharmacy is that loop,
adapted to a counter often staffed by a non-pharmacist on a basic Android phone.

**Verify, don't transcribe.** The dispenser queries the patient's DID (with
patient consent, via Pocket QR or phone number). The patient's wallet returns
the active prescription credential, signed by the prescribing physician's
BMDC-anchored DID. The dispenser's screen shows what was prescribed, by whom,
when, and for how long — legible, unambiguous, eliminating the 46%-illegibility
and missing-dose error profile documented in the Chamber paper at a stroke,
because nothing is hand-read.

**Dispense what is signed.** For controlled categories — antibiotics first — the
system's posture is: a valid, current, physician-signed credential is the
condition of dispensing. The signature is verified against the prescriber's
published key; the credential's temporal validity is checked; the BMDC anchor
behind the prescriber is checked. The forged prescription, the expired course
reused months later, the antibiotic bought on a hunch — each fails at the
verification step rather than at the conscience of a salesperson who fears
losing the sale.

**Interaction and adherence checks (RulHub).** Before dispensing, the patient's
full active-medication graph is checked for interactions and duplications via
RulHub's deterministic rule substrate — the same engine the commercial side uses
for regulatory reasoning. Dispensing events themselves are written back as
signed credentials, which makes adherence visible: the course abandoned on day
three, the refill never collected, surface in the patient's record and in the
prescriber's follow-up.

**Free, because the public good is the point.** Glyph Pharmacy is free to
participating pharmacies. The enforcement layer cannot be a revenue line; its
value is the antibiotic loop closing across a community, and that only happens
at density. The pharmacy gains legitimacy (a verifiable record of correct
dispensing, useful when enforcement does eventually arrive), interaction safety,
and connection to the Chamber/Lens/Pocket network that brings it customers.

**Designed around the real counter.** Because most counters lack a trained
pharmacist, KhaM-Med assists the dispenser in plain Bangla: what the prescription
means, what to counsel the patient about, when to refuse and refer. This is not
deputizing the salesperson as a clinician — it is wrapping the unavoidable
informal provider in competence and a verifiable record, which the published
literature repeatedly names as the missing piece that pure regulation never
delivers.

## 4. Why this needs the identity layer — and cannot be done without it

Every prior attempt to fix Bangladeshi antibiotic dispensing has been an
awareness campaign, a training program, or a regulation — and the dispensers
themselves report never seeing enforcement. The reason a *database* cannot solve
this and an *identity network* can: enforcement at the counter requires the
dispenser to verify, in seconds, that a specific prescription was written by a
specific currently-licensed physician for this specific patient. That is three
identities and a signed claim binding them. BMDC's own admission (Chamber paper)
that it cannot reliably distinguish licensed from forged practitioners means
the prescriber's legitimacy must travel *with the prescription*, cryptographically,
not be looked up in a registry no one trusts. did:web + Ed25519 + Verifiable
Credentials is what makes a salesperson on a ৳12,000 phone able to do what no
Bangladeshi pharmacy can do today: refuse confidently, because the system, not
his nerve, is saying no.

## 5. The pilot, and the path to enforcement

Pharmacy is not a launch-day product. It requires that enough prescriptions
exist as credentials for verification to be meaningful — which means Chamber
adoption comes first. The sequence, matching the bKash pattern of building until
the state formalizes what already works:

1. **Density first.** Reach meaningful Chamber adoption in one administrative
   unit (a thana or upazila), so a critical mass of local prescriptions are
   signed credentials.
2. **Free pharmacy rollout** in that same unit. Cost is never the barrier.
3. **Measure and publish.** Track non-prescribed antibiotic dispensing over six
   months against the documented ~50-92% baselines, transparently, to WHO
   Bangladesh, the DGDA, UNICEF, and domestic press. Comparable interventions
   internationally have shown meaningful reductions; the honest claim is that
   the data, published openly, makes the regulatory case self-evident.
4. **DGDA engagement.** With evidence in hand, work toward DGDA recommending or
   mandating credential-based dispensing for controlled categories — the
   directorate that co-authored the WHO sales-mapping is already on record about
   the scale of the problem.

The impact ceiling is high and worth stating without inflation: if
credential-based dispensing measurably moves a 50-90% non-prescription rate
downward across adopting communities, the downstream effect on resistance,
treatment failure, and infectious mortality is among the larger public-health
returns available in the country. The realistic near-term claim is per-community
reduction demonstrated and published; the national claim is earned only at
scale, and the document says so.

## 6. Honest constraints

- **The unlicensed shop is outside the perimeter.** Roughly half of drug shops
  are unlicensed and least likely to adopt voluntarily; some are run by
  untrained village doctors with no incentive to verify. Pharmacy changes
  behavior at participating counters and shifts the norm; it does not, by
  itself, reach the shadow market. That requires the eventual DGDA mandate,
  which the pilot data is designed to earn.
- **Refusal has a competitor forty meters away.** A dispenser who refuses an
  unprescribed antibiotic risks the sale walking to the next shop — the
  99.5%-cited fear. Enforcement only holds when adoption is dense enough that
  the next shop verifies too. This is why Pharmacy is a saturate-one-area
  strategy, not a scatter strategy.
- **Patient demand is half the problem.** With 66% of non-prescription sales on
  the client's own request, supply-side verification must be paired with Pocket's
  triage and the patient's growing trust in matched doctors. Pharmacy without
  Pocket fights demand with a "no" and no alternative.
- **Liability and counseling scope.** KhaM-Med assists the dispenser; it does
  not turn a salesperson into a prescriber. The system dispenses against a
  physician's credential; it does not generate one. The bright line is the same
  as everywhere in Glyph: the licensed human decides, the network verifies.

## 7. Build status (June 2026)

Pharmacy depends on infrastructure not yet built: the DID/VC identity layer
(the EIN lift, document 10) and a critical mass of Chamber-issued prescription
credentials. The RulHub interaction substrate exists on the commercial side and
is adaptable. The dispenser-facing surface, the wallet-verification flow, and
the dispensing-credential issuance are designed but unbuilt. Pharmacy is
correctly sequenced as a Year-2-into-Year-3 product, behind Chamber, Pocket, and
the identity lift — because it is the payoff of the network, not its entry
point. It is, however, the single feature most likely to convert this work from
"a clinical product" into "national health infrastructure the government has a
reason to formalize," because it is the one that visibly bends a curve the state
has publicly failed to bend.

---

*Sources relied on in Section 2: WHO AWaRe-classification antibiotic-dispensing
study, Bangladesh (PMC8868217); community-pharmacy stewardship study,
ScienceDirect 2025 (56.6% figure); Dhaka 246-pharmacy observational study,
Sept-Dec 2024 (PMC12744235); pharmacy-staff KAP study, 287 staff, four regions,
2024 (PMC12778233, 92.4% figure); Rajshahi/Lakshmipur dispensing-pattern study,
BMC Health Services Research 2017; urban antibiotics-without-prescription survey,
1,102 adults (PMC10023939, 37.02%); Matlab rural drug-dispenser study,
Tandfonline 2020 (51% unauthorized shops); AMR/HAI burden review, Discover
Public Health 2025; antimicrobial supply-chain mapping, GHSP 2021 (pharmacy
counts, pharmacist density); accredited-drug-shop-model study, PMC5506600;
Pharmacy Council of Bangladesh licensing requirements; DGDA/WHO antibiotic sales
mapping.*

*Glyph by KhaM Health · KhaM Labs Inc. · In memory of Khayer and Mamataj.*
