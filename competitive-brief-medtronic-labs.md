# Competitive brief: Medtronic LABS / SPICE / NCD 360 vs KhaM Health

> Internal strategy note. Researched 2026-06-20 from Medtronic LABS' own
> pages, Medtronic newsroom, DPGA, BRAC/DGHS press, and a Lancet Global
> Health pilot writeup (sources at end). Numbers are theirs, not audited.

## TL;DR

Medtronic LABS is **not a duplicate of KhaM and not a legal/existential threat
to your wedge.** They run a **vertical disease program** (NCDs) on a
**government-owned, open-source platform**. You are building a **horizontal,
patient-owned, verifiable identity layer** plus a private-doctor copilot.
Different problem, different record model, different buyer, different money.

**KhaM is not dependent on donor/government/funder money** — Chamber (private
paying doctors) is the self-sustaining core; that lane is *upside, not oxygen*.
So Medtronic's head start on the government + BRAC + donor channel touches only
**optional upside** (the population modules), not survival. And of those
modules, **Karigor and Continuity have zero overlap with Medtronic** (they run
no occupational/garment-worker or migrant-worker program anywhere), and **Maa
overlaps only in mechanism, not mission** (see module map below). Chamber,
Pocket, Pharmacy, Lens, Hospital, Bridge: untouched by them.

The sharpest positioning: **they are a program; you are the rail every program
runs on. SPICE is a database the government owns; KhaM is a record the patient
owns.** That difference is real, defensible, and exactly what a Digital-Public-
Good population platform structurally does not provide.

## What they are (facts)

- **Medtronic LABS** — an independent nonprofit, funded by Medtronic, operating
  since 2013. Reach (their figures): ~1M+ patients touched, 217,000+ enrolled
  into chronic care, 8,000+ community health workers trained, across 8 countries
  (Kenya, Tanzania, Rwanda, Ghana, Sierra Leone, Bangladesh, Bhutan, US).
- **SPICE** — their digital health platform for community/population health:
  CHW screening, risk stratification, clinical decision support, longitudinal
  patient records, and "SPICE Connect" for system-to-system interoperability.
  **Open-source** (since 2023) and named a **Digital Public Good** by the UN-
  endorsed DPGA. Launched May 2022; designed to be **owned and run by
  governments** inside their national digital-health stack.
- **NCD 360 (Bangladesh)** — hypertension + diabetes focus (plus malaria/TB
  screening). Model: CHW community screening -> facility diagnosis/enrollment ->
  CHW-led follow-up + telemedicine + referral, all on SPICE. Partners:
  **Medtronic LABS** (tech), **BRAC** (implementation), **MoHFW / DGHS + a2i**
  (national-strategy alignment). **Novo Nordisk** is a named partner (global
  Medtronic-Novo Nordisk diabetes tie-up; Bangladesh-specific role not
  independently confirmed). Still early: a pilot of ~1,700 patients enrolled;
  stated aim is national scale "in the coming years." An earlier community-NCD
  pilot in Bangladesh was written up in Lancet Global Health.

## How it compares to KhaM / Glyph

| Dimension | Medtronic LABS — NCD 360 / SPICE | KhaM Health — Glyph |
|---|---|---|
| **What it is** | A vertical care *program* (NCDs) | A horizontal *identity + credential* layer + clinician copilot |
| **The record** | Longitudinal record held by the **program / government** (a database) | **Patient-owned, signed, portable** credentials; verifiable without the operator |
| **"Interop"** | SPICE Connect = system-to-system integration | did:web + signed VCs = the patient carries proof anywhere, no integration needed |
| **Entry point** | Top-down: government + BRAC + donor | Bottom-up: private chamber doctors paying |
| **Buyer / money** | Medtronic-funded nonprofit + grants + pharma | Doctor subscriptions; later institutions/funders |
| **AI** | Risk scores + protocol decision support | KhaM-Med: sovereign, Bangla + dialect, in-country |
| **Scope** | NCD screening + management | Whole clinical loop (intake -> note -> Rx -> pharmacy -> labs -> hospital -> migrant -> maternal) on a verifiable spine |
| **Posture** | DPG, government-embedded, well-resourced | Solo, self-funded, single-operator on open standards |

## Module-by-module overlap (verified 2026-06-20)

| KhaM module | Medtronic overlap | Notes |
|---|---|---|
| **Chamber** | None | They don't serve private solo chamber doctors |
| **Pocket / Pharmacy / Lens / Hospital / Bridge** | None | Different layer (patient-owned credentials) and different buyer |
| **Maa** (maternal) | **Mechanism only** | NCD 360 in BD is hypertension/diabetes, *not* maternal. "Maternal health" is on Medtronic LABS' global *ambition* list but no deployed antenatal/preeclampsia program, none in BD. The only adjacency is CHW + community BP readings — the technique, not the application. Their BD program is a ~1,700-patient pilot. |
| **Karigor** (garment occupational health) | **None — white space** | No occupational/garment-worker program found, anywhere. |
| **Continuity** (migrant workers) | **None — white space** | No migrant-worker program found, anywhere. |

## Threat assessment

**Low / none:**
- **Legal or "did I copy them" risk:** none. Different architecture, different
  product, no overlap of IP. The shared words ("longitudinal records,"
  "decision support," "interoperability," "CHWs") are category vocabulary, not
  a collision.
- **Your wedge (Chamber):** untouched. They do not serve private solo chamber
  doctors; they work through government and BRAC on NCD cohorts.

**Real, manageable:**
- **Channel incumbency (upside, not survival).** Medtronic + BRAC + DGHS + a2i
  are building government/NGO relationships that the *optional* population-module
  upside would benefit from. Because Chamber funds the company, this is not a
  survival risk — it only means that *if* KhaM later pursues grant/government
  scale for Maa, that table already has an incumbent platform. Note even there,
  Karigor and Continuity are white space, and Maa overlaps only in mechanism.
- **Funder mindshare.** Pitching Maa or Karigor, you will hear "Medtronic LABS
  already does CHW digital health for NCDs here." You need the one-liner below
  ready, and a crisp "we're a different layer" story.
- **Credibility asymmetry.** A Medtronic-funded, DPG-badged program has
  instant institutional trust a solo startup does not.

**Actually good for you:**
- **Validation.** A device giant + Novo Nordisk + BRAC + government investing
  here proves the market, the CHW-digital-health thesis, and the fundability of
  this space. Strong tailwind for your pitch.
- **You are the layer they lack.** SPICE holds records in a government/program
  database — the honeypot model your identity white paper warns against (cf. the
  2023 leak of ~50M citizens' data). A patient-owned, verifiable credential is
  precisely what a DPG population platform does not give. You can sit *beneath*
  programs like NCD 360, not against them.

## Strategic implications

1. **Don't compete head-on with a Medtronic-funded NCD program.** You lose a
   resource race and you'd be picking the wrong fight.
2. **Position as infrastructure, not a program:** "the identity/trust layer that
   any program, including NCD 360, can issue into and verify against." A program
   needs patients to have a portable record; that is your product, not theirs.
3. **Lead with Chamber + the private-sector wedge** where they are absent, and
   let the patient-owned wallet accumulate there first.
4. **For the population modules, differentiate on ownership + portability +
   verification + sovereignty (KhaM-Med), not on "we also do CHW screening."**
   The moat is the patient-held key and the cross-setting portable record, never
   "our CHW program is better."
5. **Consider the complementary framing with funders/government:** interoperate
   rather than collide. SPICE results landing in a KhaM wallet is a feature for
   both, and a story a funder likes.

## Funder / government one-liner (pick by audience)

- **General:** "Medtronic LABS runs a disease *program*; KhaM gives the patient
  a *record she owns* across every program, including theirs."
- **Funder:** "NCD 360 is a vertical care program on a government-owned database.
  KhaM is the patient-owned, verifiable health record that lets any program's
  results follow the patient for life. We are the rail, not a competing train."
- **Government / policy:** "SPICE is a platform the system owns; KhaM is a record
  the *citizen* owns and can verify without trusting any single operator, which
  is the only honeypot-proof way to run a national health record after the 2023
  leak."
- **Objection ("Medtronic already does digital health here"):** "Different layer.
  They digitize an NCD program's workflow. We give the patient a portable,
  signed identity so her prescription, her lab result, and her NCD enrollment
  are one verifiable record she carries to any doctor, pharmacy, or hospital,
  including theirs."

## Sources

- Medtronic LABS — Bangladesh / NCD 360: https://www.medtroniclabs.org/programs/bangladesh/
- NCD 360 writeup: https://www.medtroniclabs.org/insights/ncd-360-transforming-ncd-care-in-bangladesh/
- SPICE open-source / DPG: https://www.medtroniclabs.org/insights/spice-is-now-open-source-what-it-means-for-global-health/ ; https://www.3blmedia.com/news/medtronic-labs-spice-named-digital-public-good
- Medtronic newsroom (reach, open-source): https://news.medtronic.com/opening-up-software-to-expand-access-to-healthcare-newsroom
- BRAC/DGHS/Medtronic launch: https://www.tbsnews.net/economy/corporates/brac-dghs-medtronic-launch-national-ncd-care-model-1185946
- Lancet Global Health community-NCD pilot (Bangladesh): https://www.sciencedirect.com/science/article/pii/S2214109X22001462
- SPICE product docs: https://spice.docs.medtroniclabs.org/
