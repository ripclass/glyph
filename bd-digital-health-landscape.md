# Bangladesh digital-health landscape — competitive map

> Internal scan, 2026-06-20. Grounded in Tracxn/Future Startup/UNB coverage,
> the DGHS Shared Health Record official site, Transform Health, and company
> pages (sources at end). Market context: BD digital health ~EUR 179M by 2025,
> ~11% CAGR; ~113 telemedicine startups, only ~8 funded; total healthtech raised
> ~$32M 2015-2023. The space is busy at the consumer layers and thin where KhaM
> actually plays.

## The headline: the real incumbent on KhaM's thesis is the GOVERNMENT, not a startup

DGHS already launched (2023) the pieces of a national patient record:
- **Unique Health ID** — one per citizen, tied to the Master Client Index (MCI).
- **Shared Health Record (SHR)** — a national electronic archive meant to be
  retrievable "anywhere, anytime," across facilities, with patient consent.
- **Health Information Exchange (HIE)** + **OpenMRS+** (OpenMRS + OpenELIS +
  dcm4chee) for public hospitals, **DHIS2** for aggregate stats, and draft
  **health informatics / interoperability standards** for public and private.
- Plus the FY27 budget's announced universal **Health Card + IPMS**.

**This is the one effort genuinely adjacent to KhaM's identity layer.** It is
also the *centralized-database* model KhaM's own white paper argues against: a
national trove (the honeypot behind the 2023 leak of ~50M citizens' data), a
record the *system* holds rather than the *patient*, a Health ID anchored to the
national ID (which structurally excludes the undocumented, migrants, refugees,
and the stigmatized — exactly KhaM's "eight doors" people), and system-managed
consent rather than patient-held keys.

Two honest caveats: (1) like most national e-health systems, the SHR is more
*announced* than *deployed* — real coverage is likely thin, which is KhaM's
opening (it's the "row that dies at the door" at national scale). (2) It is a
government mandate with state weight behind it, so KhaM should differentiate
*and* design to interoperate, never collide head-on.

**KhaM's differentiation vs the SHR (the sharpest version of the whole pitch):**
patient-*owned* and patient-*keyed* (breach-proof, no central trove to leak);
cryptographically *verifiable* by anyone without trusting the operator; *portable*
by open standard; *inclusive* via multi-anchor enrollment + anonymous mode; and
single-operator-honest with a succession path. The cleanest framing: **the SHR is
the government's database; KhaM is the patient's verifiable wallet — and the
national Health ID is simply one of KhaM's enrollment anchors, not a competitor.**

## SHR / Health ID deep-dive (verified 2026-06-20)

- **Who built it:** DGHS (under Prof. Abdul Kalam Azad) with **Thoughtworks**,
  funded by **UKAID**. Built on **OpenHIE** (Client/Master Client Index, Facility
  Registry, Provider Registry, Terminology Registry), **OpenMRS+** for public
  hospitals, **OpenSRP** for community/CHW registration. Standards-based, credible.
- **Health ID:** introduced 2023, numbers start with **9**, linked to the
  **Master Client Index (MCI)** — explicitly "a *centralized* registry linking
  every Health ID with demographic details." (This is the central trove.)
- **How a citizen gets one — three facility-tethered pathways:** (1) **Point of
  care** at an OpenMRS+ hospital, presenting **NID or Birth Registration Number**;
  (2) **Community** via OpenSRP during maternal/child or vaccination campaigns
  (CHW-led); (3) a limited **online portal** in pilot areas, while booking an
  outpatient appointment. **Requires NID or BRN.** More inclusive than NID-only
  (BRN covers under-18s) but still excludes the truly undocumented, refugees,
  migrants abroad, and anyone who won't register under a government ID.
- **Consent:** system-managed — "with proper consent, any facility with
  automation can retrieve previous records." Not patient-held keys.
- **Adoption (early):** ~**1.4M** Health IDs issued (June 2024 pilot), **67**
  hospitals automated; stated goal 60M in five years. So: real, standards-based,
  donor-backed — but at ~1.4M of ~170M and 67 hospitals, far more *announced
  than deployed*. That gap is KhaM's window.

**The decisive gap (and KhaM's opening):** every SHR registration path makes the
citizen **come to a facility, wait for a CHW, or use a portal tied to an
appointment.** None of them reaches the citizen **at home, on the phone already
in their hand.** And the record lives in a central MCI the *system* holds. KhaM
should (a) differentiate on patient-owned/keyed/verifiable/inclusive, (b) treat
the **Health ID / NID / BRN as enrollment *anchors*** (the multi-anchor model),
not rivals — a KhaM wallet can later link to the MCI and carry SHR records with
consent, and (c) own the channel the government structurally can't: WhatsApp.

## The layers, and where KhaM sits in each

| Layer | Who's there | KhaM relationship |
|---|---|---|
| **Telemedicine / consult marketplaces** | Praava Health (clinic+telemed, ~150k patients, best-funded), Maya, DocTime, Tonic (Grameenphone), Olwel, QuickMed, Sebaghar | **Not competing.** Glyph augments the in-person 48-second chamber visit; it is not a video-consult marketplace. Their "records/e-prescriptions" are institution-held, not patient-owned verifiable credentials. |
| **E-pharmacy / med delivery** | Arogga (largest, 64 districts), MedEasy ($750k seed, +teleconsult), Shombhob | **Different.** Glyph Pharmacy is a *verification* loop (signed-Rx, antibiotic stewardship), not e-commerce/logistics. Watch: e-pharmacies going "full-stack" (adding teleconsult + records). |
| **Diagnostics / lab marketplaces** | AmarLab (largest diagnostic marketplace, home collection), Praava (own lab) | **Different layer.** Glyph Lens = signed/verifiable results + AI co-interpretation landing in the patient's wallet, not sample logistics. Potential *partner*, not rival. |
| **Clinic / hospital software (HIS/EHR)** | Pridesys, Clintee (claims NID integration + DGHS/BMDC compliance), Arch/Esteem, Orange Soft, Mysoftheaven; **DoctorKoi** (Digital RX prescription-writing) | Institution-owned databases (the "row that dies at the door"). **DoctorKoi is the nearest neighbor** to Glyph's note/Rx piece, but it's a digital prescription *form* — not AI Bangla intake + briefing + a verifiable signed credential + the whole loop. |
| **National gov infrastructure** | DGHS SHR + Unique Health ID + HIE + OpenMRS+ + DHIS2 + a2i; Health Card/IPMS | **The real adjacency** (see headline). Differentiate on ownership/verifiability/inclusion; interoperate via Health-ID-as-anchor. |
| **NCD / population programs** | Medtronic LABS NCD 360 (+BRAC/DGHS/a2i), mPower Social, BRAC health | Covered in `competitive-brief-medtronic-labs.md`. Adjacent program, not a duplicate. |
| **Patient-owned verifiable credentials + AI clinical copilot** | **(empty)** | **KhaM's actual space.** No BD player found doing patient-held cryptographic credentials / verifiable prescriptions / did:web health identity, or a Bangla-voice-intake + BD-format-note + signed-Rx doctor copilot. White space. |

## What this means for KhaM

1. **You are not in the crowded fights.** Telemedicine, e-pharmacy, and lab
   logistics are busy and racing on delivery/price. Glyph is none of those.
2. **Your nearest startup neighbors are narrow slices:** DoctorKoi (digital Rx)
   and the HIS vendors (clinic databases). None do the patient-owned verifiable
   record or the AI copilot or the whole loop. Your wedge is intact.
3. **The one to watch is the government SHR / Health ID** — and your entire
   architecture is the principled answer to its weaknesses. Lean into the 2023
   leak argument; offer the patient-owned, verifiable, inclusive complement;
   treat the Health ID as an enrollment anchor, not an enemy.
4. **Survival doesn't depend on any of this** — Chamber (private paying doctors)
   funds the company; the national-record conversation is upside.

## One-liners

- **vs the crowded layers:** "They connect a patient to a doctor, sell her
  medicine, or ship her a lab test. We give her a record she owns and can verify
  for life, and give her doctor the 48 seconds back."
- **vs the government SHR:** "The Shared Health Record is the government's
  database; Glyph is the patient's verifiable wallet. The national Health ID is
  one of the doors a patient enters through, not a competitor — and a wallet the
  patient keys can't be leaked the way a central trove of 50 million records was."

## Sources

- BD telemedicine landscape: https://tracxn.com/d/explore/telemedicine-startups-in-bangladesh/ ; https://unb.com.bd/category/Business/digital-healthcare-startups-in-bangladesh-an-overview/76049 ; https://futurestartup.com/2022/03/30/startups-to-watch-these-startups-are-taking-digital-healthcare-services-mainstream-in-bangladesh/
- E-pharmacy: https://futurestartup.com/2024/04/04/online-pharmacy-players-set-sights-beyond-delivering-medicines/ ; https://www.arogga.com/ ; https://medeasy.health/
- Diagnostics: https://futurestartup.com/2021/12/21/how-amarlab-provides-high-quality-on-demand-diagnostic-services-in-bangladesh/
- Gov national digital health: https://en.info.shr.dghs.gov.bd/ ; https://en.info.shr.dghs.gov.bd/uhidmci/ ; https://transformhealthcoalition.org/insights/use-of-open-source-applications-in-strengthening-the-health-system-and-improving-universal-coverage-in-bangladesh-2/
- Clinic software: https://clintee.com/clinic-management-software-bangladesh ; https://pridesys.com/top-10-hospital-management-software-in-bangladesh/
