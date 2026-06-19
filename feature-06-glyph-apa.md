# Glyph Apa
## The Garment Worker's Interface

**Glyph by KhaM Health · Product Document 06 of 11 · June 2026 · Dhaka**
**Powered by KhaM-Med, Bangladesh's sovereign clinical AI**

*Working name in earlier drafts: Glyph Factory. Renamed, because Factory names
the building and the building is not the patient. আপা — Apa, elder sister — is
what every woman on the line calls the woman at the next machine, and what
every worker, male or female, calls the health assistant in the medical room.
The product is the apa: the trained, trusted, always-present elder sister who
knows your health and stands between you and being invisible. It pairs with
Glyph Maa the way the words pair in a family.*

---

## 1. The woman this is built for

A sewing operator in Ashulia, 26 years old, eight years on the line. Her lower
back aches by mid-morning; her eyes burn by evening; she has had a headache for
so long it feels like weather. There is a medical room downstairs — the law put
it there — but going means losing her hourly production target, and the room
exists mostly for the buyer audits anyway. So she does what the research says
she does: she buys Panadol and keeps sewing. She is newly pregnant and has told
no one at the factory, because she has watched what happens to women who tell.
If nothing changes, she will leave this industry before she is 40 with a body
the doctors say this work uses up in ten years — and no medical record that any
of it ever happened.

Rupa Akter, 32, told the Dhaka Tribune in 2025 that after a blood-infection
diagnosis her doctor advised weekly check-ups, and she could not attend except
on her single weekly day off. The product is built for the distance between
that sentence and the medical room one floor below her machine.

## 2. The evidence: a workforce the law already covers and the system still misses

**The scale, corrected.** The "four million garment workers" figure is
repeated everywhere and supported nowhere: Mapped in Bangladesh's
physically-verified census found 3,555 export-oriented RMG factories employing
about 3.04 million workers (December 2024), while BGMEA's own June 2024 figure
is 3,317,397. The female share — 80% from 1980 to 1994 — has declined steadily:
roughly 58% per MiB, 52.28% per BGMEA 2024, with the decline concentrated in
ages 18-35. Why women leave matters enormously for this product: the ETI/GIZ/
BRAC University study found 77% of cited reasons were "family condition" —
childcare (26.7%), pregnancy and *discrimination for being pregnant* (17.9%),
age-appropriateness (11.9%) — alongside working conditions. Pregnancy
concealment is not an edge case; it is a documented exit driver, and it defines
the confidentiality architecture in Section 3.

**The health burden is occupational, chronic, and documented in the workers'
own words.** The qualitative literature (BMC/PMC studies built on in-depth
interviews, factory observations, and factory-doctor interviews) converges:
back and joint pain, continuous headache, eye strain, and breathing difficulty
from inhaling fabric dust are the recurring cluster; sickness and injury are
described by workers as "an everyday phenomenon"; the highest proportion of
female workers quit before 40; and the factories' own doctors confirm both the
symptom pattern and the brutal arithmetic that the job cannot be done for more
than about ten years. Mental health is described in the literature as
"neglected" outright.

**The law already mandates the infrastructure — and the workers don't use
it.** Chapter VIII of the Bangladesh Labour Act 2006 is remarkably specific:
every establishment must keep accessible first aid (s.89); 300+ workers
requires a sick room with a dispensary under a medical practitioner and nursing
staff; 500+ requires a welfare officer; 5,000+ requires a permanent medical
centre; 7,500+ requires at least three physicians (Labour Rules 2015, rr.76-78);
and treatment of occupational disease or work injury must continue *at the
employer's expense until cure*. Enforcement belongs to DIFE. The published
assessment of this framework is consistent: low worker awareness, uneven
compliance, weak enforcement — and the starkest finding of all, from the
qualitative studies: workers *do not even go to the factory clinic*; they
self-treat with Panadol. The room exists; the trust and the usefulness do not.
A compliance artifact is not a care system.

**What works has already been demonstrated — by a peer, during work hours.**
The HERhealth model (BSR), implemented in Bangladeshi factories, used peer
health educators — workers nominated from the line — to deliver health
information during work hours, with measurably improved knowledge and behavior
in difference-in-differences evaluation, and identified distance-to-clinic and
short breaks as the binding access constraints. Read the finding precisely: the
intervention that moved the needle was not a better doctor or a better room. It
was a trusted *apa*, on the floor, during work hours. Glyph Apa is that finding,
given a clinical backbone.

**The buyer is the enforcement mechanism that actually functions.** The labor-
law literature is equally clear that the compliance pressure factories respond
to is not DIFE inspection but buyer requirement: non-compliant factories risk
losing international contracts. Post-Rana Plasa, the Accord/RSC apparatus
proved that buyer-mandated, independently-verified compliance can transform an
entire sector's practice — for structural and fire safety. Worker *health*
remains audit-theater: a staffed room, a logbook, a checkbox. A verifiable,
privacy-preserving health-compliance credential is the missing instrument, and
the same EU buyers now implementing Digital Product Passport requirements (the
EIN business) are the natural demand side for it.

## 3. The product: what Glyph Apa does

**The apa herself.** In each participating factory, the medical room is staffed
by a Glyph-trained health assistant — in most factories a woman, recruited the
HERhealth way (a respected worker or nurse-aide, not an outside professional) —
equipped with a tablet, a BP cuff, a glucometer, a thermometer, a scale, and
KhaM-Med guidance in Bangla. She is the floor's health apa: she captures
structured vitals and complaints in minutes, between production targets, and
KhaM-Med routes what she captures — self-care guidance she relays in plain
Bangla, or escalation to a remote physician for asynchronous review (the
Continuity loop, repurposed for the factory floor), or urgent referral out.
The Labour Act's mandated room finally has a function the worker has a reason
to enter.

**The worker's wallet, not the employer's file.** Every encounter writes
credentials to the *worker's* Glyph Pocket wallet — hers, cryptographically,
under PDPO 2025 and under the architecture itself. Management never sees
clinical content. This line is absolute because the evidence demands it: in a
sector where pregnancy discrimination is a documented exit driver, a
factory-readable health record would be a weapon against the women it claims
to serve. The early-pregnancy consultation, the reproductive-health question,
the depression screen — these are shielded categories, visible to the worker
and her chosen clinicians only.

**What management gets instead: compliance, aggregated and verifiable.** The
factory receives what it actually needs and the buyer actually audits:
Section-89 compliance documentation as signed credentials (staffed room ✓,
encounters happening ✓, occupational-injury treatment tracked to resolution ✓
— the Act's "until cured" obligation, finally auditable), plus de-identified
aggregate health trends (this floor's heat-stress incidents, this season's
respiratory cluster) that let a responsible owner fix the ventilation before
the buyer's auditor finds it. Individual records: never. Aggregates and
compliance proofs: continuously.

**The female-physician pool, by design.** Matching for factory consultations
prioritizes female physicians for female workers — the CHT consultation-length
study (Chamber paper) found female doctors associated with materially longer,
more communicative visits, and the reproductive-health caseload makes the
preference structural, not cosmetic.

**The occupational record that outlives the job.** When she leaves at 35 —
to another factory, to tailoring work, to her village — her decade of
occupational health history leaves with her, in her wallet: the documented
back injury that becomes a disability claim, the respiratory baseline that a
future doctor needs, the proof of employer-funded treatment the Act entitled
her to. Today that history evaporates at the factory gate. Under Glyph Apa it
is hers, permanently.

**The EIN bridge.** Participating factories already hold (or will hold) DIDs
in the Enso Identity Network for EU Digital Product Passport compliance. The
same factory identity anchors its health-compliance credentials: one
cryptographic identity, two credential families — product provenance for the
buyer's sustainability audit, worker-health compliance for the buyer's social
audit. For the buyer, "this factory's health provision is independently
verifiable" becomes as checkable as a seam. For KhaM Labs and Enso, it is the
first place the mission company and the commercial company share
infrastructure in production — deliberately, with the worker's clinical data
never crossing the bridge.

## 4. Why this needs the identity layer

Every property above is an identity property. The worker's record must be
hers and not her employer's: patient-held keys. The shielded pregnancy
consultation must be invisible even to a factory-owned device: credential-level
access control, not app-level promises. The compliance proof must be
verifiable by a buyer in Amsterdam without exposing a single worker's data:
selective disclosure — prove the aggregate, reveal no individual. The
occupational record must survive job changes across factories that do not
trust each other: portability by standard (W3C VC), not by database export.
And enrollment must work for a workforce where smartphone ownership is
individual-variable but the factory floor is a daily, physical touchpoint: the
apa's tablet is the assisted channel (Pocket paper) through which three million
workers can acquire wallets — the single densest enrollment rail in the
country after BMET.

## 5. Economics

The factory pays: ৳15,000-30,000/month per facility, scaled by headcount —
priced against what it already spends on a Section-89 room that delivers
audit-theater, and against the cost of a failed social audit. The sale is made
to the owner on three grounds the research supports: compliance made
provable (buyer-facing value), absenteeism and attrition reduction (a workforce
that exits by 40 is an experience drain the sector is already studying), and
the brutal simple one — the room is a sunk cost; Apa makes it work. The worker
pays nothing, ever. Buyer- and brand-funded deployment is the scaling path:
the HERhealth precedent shows international brands will fund worker-health
programming in their supplier base, and a verifiable-outcomes version is a
stronger grant object than a training curriculum. BGMEA, already a counterpart
of Enso's on EIN, is the channel into the 2,720 affiliated factories MiB
counts.

## 6. Honest constraints

- **The employer is the threat model and the customer simultaneously.** This
  tension is permanent and the architecture must hold it: the factory pays for
  compliance proof and aggregates; the worker owns the clinical record. Any
  drift — a "manager dashboard" with individual data, ever — destroys the
  product's reason to exist. This is written into the design as a
  non-negotiable, the way "no cross-border prescribing" is written into
  Continuity.
- **The apa's time is production time.** The assistant model works only if
  encounters are minutes, not appointments, and only if management honors the
  visit. Pilot factories must commit to protected access time — and the pilot
  measures whether they actually do.
- **Aggregates can deanonymize in small populations.** A "pregnancy-related
  consultations this month" statistic in a 300-worker factory is not anonymous.
  Aggregate reporting uses minimum-cell-size suppression from day one.
- **The compliance credential is only as strong as DIFE and buyers make it.**
  Until a buyer or the regulator recognizes the credential, it is a
  better-organized logbook. The EIN/BGMEA relationships are the path to
  recognition; the document does not pretend recognition exists yet.
- **Coverage stops at the export sector's edge.** MiB counts 836 factories
  outside both trade bodies, and beyond them lies the non-export and informal
  garment economy where conditions are worse and no buyer pressure reaches.
  Glyph Apa starts where the leverage is; it does not claim to reach where it
  has none.

## 7. Build status (June 2026)

Apa is designed, not built. It inherits the assisted-capture flow being built
for Continuity (guided vitals by a non-physician), the asynchronous physician
queue, the Pocket wallet, and the identity layer (document 10). Its specific
unbuilt pieces: the apa's tablet workflow, the shielded-category access model,
the aggregate-compliance report generator with cell-size suppression, and the
EIN factory-DID bridge. Sequencing: after Chamber proves the encounter loop
and the identity lift lands — Year 2 territory — with a first pilot of one
BGMEA-affiliated factory in the 1,000-3,000 worker range, one trained apa, a
small female-physician review panel, and two measured questions: do workers
use the room more than the Panadol baseline, and does management keep its
hands off the clinical data when the architecture says it must.

---

*Sources relied on in Section 2: Mapped in Bangladesh factory/worker census
via Financial Express (February 2025); BGMEA workforce figures via Dhaka
Tribune (September 2025, including the Rupa Akter account); female-share
trend series — BGMEA 1980-2021, UN Women, CPD, SANEM, MiB — via Financial
Express and TBS; ETI/GIZ/BRAC University, "The declining women workers in the
Bangladesh RMG industry" (2023; departure-reason percentages); BIDS technology-
upgradation study via Daily Star; qualitative health studies — "Sewing shirts
with injured fingers and tears" (PMC6341570), mental-health study (PMC5566390),
occupational-stress study (PMC9424988); WIEGO narrative study (Absar);
Bangladesh Labour Act 2006 Chapter VIII and Bangladesh Labour Rules 2015
rr.76-78 (ILO text, Lawyers & Jurists, Mondaq analysis); Indian Journal of
Labour Economics welfare-policy study (2024); HERhealth difference-in-
differences evaluation (PubMed 34749591 / PMC8583827); buyer-compliance
findings, Academia labor-law survey (2019).*

*Glyph by KhaM Health · KhaM Labs Inc. · In memory of Khayer and Mamataj.*
