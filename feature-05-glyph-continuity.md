# Glyph Continuity
## The Migrant Worker's Interface

**Glyph by KhaM Health · Product Document 05 of 11 · June 2026 · Dhaka**
**Powered by KhaM-Med, Bangladesh's sovereign clinical AI**

---

## 1. The man this is built for

A construction worker from Dinajpur, eight years in Abu Dhabi. He shares a room
with seven other men. He sends most of his salary home and eats from what
remains. He works at height, in heat that regularly passes 45 degrees. His back
has hurt for two years; lately there is blood when he coughs in the morning. He
will not see a doctor here: the clinic costs money he has promised to his
family, the doctor speaks Arabic or English, and a bad result on any medical
record can mean a cancelled permit and a one-way flight. He has never had a
doctor in Bangladesh either — there was no "his doctor" to leave behind. So he
works, and waits, and tells his wife on the phone that everything is fine.

He is one of millions, and he is the most economically important and clinically
invisible Bangladeshi alive. Glyph Continuity is built so that this man can be
seen by a Bangladeshi physician — in his own language, on his own terms,
without his employer ever knowing — and so that whatever happens to his body
abroad is known at home before he lands.

## 2. The evidence: the scale, the danger, and the wall between him and care

**The scale is national-economy scale.** Bangladesh government statistics record
nearly 16.1 million short-term overseas labor contracts taken from 1976 through
2023, across 164 countries, with the overwhelming majority in the Persian Gulf
(BMET data via the Migration Policy Institute); current estimates put roughly
15.4 million Bangladeshis abroad. The remittances they send — $23.9 billion in
FY2023-24 alone (Bangladesh Bank) — place Bangladesh among the top ten
remittance-receiving countries on earth, with Saudi Arabia the single largest
source. This population is not a niche; it is a pillar of the national economy,
and it has no clinical relationship with the country it funds.

**The work is dangerous at documented rates.** A global systematic review and
meta-analysis found that about 47% of international migrant workers suffer
occupational health issues and 22% report workplace injuries or accidents.
The Gulf concentration makes it worse: labor migrants there are clustered in
construction and other high-heat, high-risk work, with extreme heat linked to
cardiac arrest and exhaustion; reporting around the 2022 World Cup attributed
over a thousand Bangladeshi deaths in Qatar across the build-up decade, within
a larger toll of thousands of migrant deaths. These are the bodies behind the
remittance figure.

**The wall between the worker and care is structural, not attitudinal.** The
GCC healthcare-access literature names the barriers consistently: limited or no
insurance, restricted statutory care rights under sponsorship (kafala) systems,
language, cost, and unfamiliarity with the host system — with the sponsorship
structure itself associated with labor control that discourages reporting
illness at all. The comparative Nepali data (the closest well-studied analog to
the Bangladeshi Gulf worker) quantifies the result: only about half of workers
sought any healthcare when sick abroad, and of those who attended mandatory
pre-departure training, only 30% received any health-related materials. Studies
of undocumented Bangladeshi migrants add the sharpest edge: poor medical access
recurs as a core theme in detention settings, and irregular status drives
risky health behavior and untreated infection because every contact with the
formal system risks exposure.

**Health status is itself a deportation weapon.** The Migration Policy
Institute profile notes plainly that workers are forced home for, among other
reasons, "unsuccessful health tests." Destination-country medical screening
regimes mean that a positive TB or hepatitis result discovered at permit
renewal can end a livelihood — which teaches workers to hide symptoms, avoid
testing, and arrive home undiagnosed mid-disease. A returnee whose treatment
abroad was interrupted by deportation lands with no records, no handover, and
no Bangladeshi clinician who knows his story: a continuity failure with
public-health consequences (interrupted TB regimens are an AMR engine — see
the Pharmacy paper).

**The enrollment rail already exists, and it is already digital.** This is the
strategic discovery. Every legal migrant must register with BMET before
departure: biometric enrollment at a district BMET office, a mandatory
three-day Pre-Departure Orientation, and issuance of an emigration clearance
smart card — a QR-based digital card carrying passport, visa, and biometric
data, without which airport immigration will not let the worker board, valid
visa or not. The card has been free since December 2024; registration runs
through the oc.bmet.gov.bd portal; and ILO-supported systems now digitally
record migrants at departure and arrival, let them update employment details
from abroad, and mark returnees in the database. Read this as what it is: the
Bangladeshi state already issues every legal migrant a digital identity
credential with biometrics, at a mandatory touchpoint, days before departure.
Glyph Continuity does not have to build an enrollment channel. It has to attach
a health wallet to a rail the worker is already standing on.

## 3. The product: asynchronous care, anchored in Bangladesh

Glyph Continuity is not telemedicine. A video appointment assumes the patient
can take a private 30-minute call at a scheduled hour — impossible in a shared
labor-camp room on a twelve-hour shift with metered data. Continuity is built
on the opposite assumptions: asynchronous, voice-first, offline-capable, and
anchored to a Bangladeshi physician relationship that the system *creates*,
because (per the matching paper, document 10) the worker almost never had one
to begin with.

**Step 1 — Provisioned before departure.** At BMET registration — or at the
three-day PDO, where a health module is the natural insertion point the Nepali
data shows is currently nearly empty — the worker's Glyph wallet is created,
anchored to the same identity verification BMET already performs. He departs
with his record, his family linkage, and a matched Bangladeshi physician
already in his pocket.

**Step 2 — Vitals captured by whoever is there.** When he is unwell, he goes to
whatever is reachable: a camp dispensary, a pharmacy with a BP machine, a
literate co-worker. Glyph guides that helper — no medical training assumed —
through blood pressure, temperature, pulse, glucose where available, photographs
of anything visible, and a voice note in the worker's own words, in his own
dialect. Everything records offline and syncs when data allows.

**Step 3 — Asynchronous review by his Bangladeshi physician.** The submission
arrives in the matched doctor's Glyph queue — a doctor chosen for clinical
need, home-district proximity (so in-person follow-up is possible on return),
language, and gender appropriateness. The doctor reviews within his normal
hours, listens to the voice note, asks follow-up questions that route back to
the worker's phone, and responds — in voice, in Bangla, replayable as many
times as needed.

**Step 4 — Assessment and structured handover, not cross-border
prescribing.** This boundary is deliberate and legally necessary: a Bangladeshi
physician is not licensed to prescribe into the UAE or Saudi Arabia, and
Continuity does not pretend otherwise. What the physician provides is
assessment, triage, and a structured clinical handover: what this likely is,
how urgent it is, what investigations to request, and — where local care is
needed — a concise summary the worker can hand to a local clinic, translated,
with his history attached, so the paid local visit takes minutes instead of
starting from zero. For over-the-counter-level needs, Glyph supplies
generic-name guidance with local brand equivalents (Paracetamol: Panadol, Adol,
Fevadol in the UAE) so the worker can navigate a foreign pharmacy for what is
lawfully sold without prescription. Prescription-grade medication is obtained
through a local prescriber, with the Bangladeshi assessment doing the
expensive diagnostic work in advance.

**Step 5 — Continuity captured, both directions.** Everything — the vitals, the
assessment, the local clinic's findings photographed and extracted — enters his
wallet. When he comes home for Eid, his doctor sees him in person with the full
record. When he is suddenly deported mid-treatment, the handover already
exists: the first Bangladeshi clinic he visits picks up the TB regimen or the
diabetes management without a gap. And the linkage runs in reverse: through
family circles (Pocket paper), he sees his mother's BP readings from Abu Dhabi,
authorizes her specialist consult, and is no longer helpless at 4,000
kilometers when the emergency call comes.

**Designed-for use cases the research demands:** the scaffolding injury hidden
from the employer (consultation invisible to the sponsor); the chronic
hypertension unmanaged for three years because the Malay pharmacy was
unnavigable; the symptoms suggesting cancer assessed *before* he spends
৳100,000 flying home blind; the confidential consultation for the female
domestic worker whose employer controls her movement; the depressed worker who
can speak to a Bangladeshi psychiatrist in Bangla, privately, which no
destination-country system will ever offer him.

## 4. Why this needs the identity layer

Continuity is the multi-anchor model's reason for existing (document 10). The
worker's identity must be: established before departure (BMET anchor),
verifiable without NID infrastructure access from abroad, intact through phone
loss in a labor camp (multi-path recovery), shareable with family at home under
his control, and *absolutely invisible to his employer and the destination
state* — because the research shows health status is a deportation trigger.
Patient-held keys are not ideology here; they are the difference between a
health record and a self-incrimination file. The same property serves the
undocumented worker (anonymous-mode identity, NGO-mediated paths) whom no
government-run system can safely serve at all.

## 5. Economics and the funding pathway

The worker cannot pay $20/month; he can pay per event, and his family can
co-pay from the remittance he sends. Pricing: ৳200-500 per asynchronous
consultation, with a Premium family tier at $3-5/month payable through bKash or
Probashi banking rails — priced against the reality that one avoided emergency
flight home (৳50,000-100,000+) repays years of subscription. The reviewing
Bangladeshi physician is paid per consultation: a new income stream that
recruits the physician pool and makes the home-district doctor an ally of the
program.

The non-commercial pathway is unusually strong because this population has
dedicated institutions: BMET and the Ministry of Expatriates' Welfare and
Overseas Employment have explicit welfare mandates (and have just demonstrated,
with ILO, an appetite for digital governance of exactly this lifecycle); ILO
and IOM run migrant-health workstreams; the Wage Earners' Welfare Board exists
to fund worker protection. A Continuity pilot embedded in the PDO — where the
Nepali comparison shows health content is currently a 30%-reach afterthought —
is fundable, measurable, and aligned with what the ministry already says it
wants. Realistic dedicated funding accessible for this module: $2-5M
(consistent with the vision document's mapping), separate from every other
Glyph stream.

## 6. Honest constraints

- **No cross-border prescribing, ever, and the document says so.** Continuity
  is consultation, triage, and structured handover. The moment it drifts toward
  remote prescribing into Gulf jurisdictions it becomes legally untenable and
  endangers the whole program. OTC guidance is information, clearly bounded.
- **The voice note is the most sensitive data in all of Glyph.** A worker
  describing symptoms in Dinajpuri dialect, naming his camp and employer, is
  exactly what regex de-identification cannot scrub. Until on-device
  transcription and KhaM-Med local routing carry these flows, Continuity's
  sensitive categories run restricted — this is the architecture's hardest
  privacy test and it is named, not hidden (see Chamber §6 and document 11).
- **The BMET partnership is a dependency with a fallback.** If institutional
  engagement stalls, the alternates are real but slower: enrollment through
  PDO-adjacent NGOs, embassies and consulates (~70 missions), destination-side
  community networks, and the Ami Probashi-style app channel the workers
  already use. The product works without BMET; the *elegant* onboarding needs
  BMET.
- **Destination-state sensitivities are managed by design, not defiance.**
  Continuity operates as a Bangladeshi service for Bangladeshi citizens'
  records and home-country consultations; it does not practice medicine inside
  host jurisdictions. That framing is load-bearing and must survive every
  marketing draft.
- **Connectivity assumptions stay brutal.** Shared phones, metered data,
  no-signal worksites. Offline-first is not a feature flag; it is the product.

## 7. Build status (June 2026)

Continuity is designed, not built. It inherits the voice pipeline, WhatsApp
layer, extraction prompts, and (once landed) the identity lift and matching
engine. Its specific unbuilt pieces: the guided vitals-capture flow for
non-medical helpers, the asynchronous physician queue, the destination-country
formulary tables (UAE, KSA, Qatar, Bahrain, Kuwait, Oman, Malaysia, Singapore
first), the structured-handover document generator, and the BMET/PDO enrollment
integration. Sequenced as a Year-1-second-half pilot — one corridor (Dhaka ↔
UAE is the natural first, given volume), a handful of workers, a small paid
physician panel — with the explicit pilot question being whether the
capture-review-handover loop completes reliably under real labor-camp
conditions before any scale conversation. The founder has filmed this
population for years; the pilot should be designed with the same people who
were in front of the camera.

---

*Sources relied on in Section 2: BMET departure statistics 1976-2023 via
Migration Policy Institute profile (April 2024); Bangladesh Bank remittance
figures FY2023-24 via Emerald SEAMJ (2025); global migrant-worker occupational
health meta-analysis (47% / 22%) via PLOS One GCC systematic-review protocol
(2025) and medRxiv preprint (kafala analysis, World Cup mortality); Qatar
mortality reporting via Migration Policy Institute; Nepali GCC mixed-methods
study, ScienceDirect 2023 (52% care-seeking, 30% PDO health materials);
Bangladeshi undocumented-migrant studies — BMC Public Health 2024 (STI
vulnerability), Discover Social Science and Health 2025 (detention, poor
medical access); Emerald SEAMJ 2025 (Southeast Asia living conditions and
health-access barriers); BMET registration mechanics — Wego guide 2026
(smart-card QR/NFC, free since Dec 2024, oc.bmet.gov.bd, PDO), Limpid Travels
manpower-processing guide, ManpowerHR work-permit guide; ILO, "From
registration to return," December 2025 (digital recording at
departure/arrival, returnee marking).*

*Glyph by KhaM Health · KhaM Labs Inc. · In memory of Khayer and Mamataj.*
