/**
 * @fileoverview Editorial content for the product landing pages
 * (khamhealth.com/<slug>). Condensed for the web from the eleven
 * product documents (feature-01 through feature-11, June 2026), which
 * carry the full evidence and citations. Written for policy,
 * government, and donor readers.
 *
 * Voice rules (founder, 2026-06-12): no em dashes, no AI cadence.
 * Short declarative sentences. Specific numbers. Status in prose.
 *
 * Brand architecture: KhaM Labs is the house. KhaM Health operates the
 * infrastructure. Glyph is what a doctor or patient touches. KhaM-Med
 * is the clinical model underneath.
 */

export interface ProductSection {
  /** Mono index shown above the heading, e.g. "01" */
  index: string;
  heading: string;
  /** Paragraphs rendered as editorial body text */
  body: string[];
  /** Optional pull-quote rendered large between paragraphs */
  pullQuote?: string;
}

export interface ProductContent {
  slug: string;
  /** Short name used on cards and in navigation */
  name: string;
  /** Annotation shown beside the name, e.g. "the doctor's interface" */
  codename: string;
  /** Editorial H1, sentence case */
  headline: string;
  /** Magazine-style lede paragraph */
  standfirst: string;
  /** Hero image in /public/landing/ */
  image: string;
  imageAlt: string;
  sections: ProductSection[];
  /** One-line honest status, prose not badge */
  status: string;
  /** Who this serves */
  audience: string;
}

export const PRODUCTS: ProductContent[] = [
  {
    slug: "chamber",
    name: "Glyph Chamber",
    codename: "the doctor's interface",
    headline: "Built for the 48-second consultation",
    standfirst:
      "A chamber on Mirpur Road, 6:30 in the evening. Thirty-one patients seen, fourteen waiting. The next patient is 68, speaks Chittagonian, and is accompanied by a son who answers every question for her. She carries three years of prescriptions and lab reports from seven doctors in a plastic bag. The doctor has minutes. Chamber exists so that when he walks in, he already knows what is in the bag, what she said before her son rephrased it, and what would be dangerous to miss.",
    image: "/landing/chamber.webp",
    imageAlt: "A doctor listening to a patient in a softly lit chamber",
    sections: [
      {
        index: "01",
        heading: "The evidence",
        body: [
          "The largest international review of consultation length ever conducted, covering 179 studies and 28.5 million consultations, found Bangladesh at the bottom of the global table: an average primary care consultation of roughly 48 seconds, against 22.5 minutes in Sweden. A single physician may run more than 90 consultations a day. The World Bank counts roughly 0.67 physicians per 1,000 people, about one doctor for every 1,500 citizens.",
          "The paper prescription is an error engine. Bangladeshi studies found illegible handwriting in 46% of prescriptions surveyed, an average of 3.85 errors per prescription in one tertiary hospital, and 692 medication-related problems in 200 inpatient orders at another. The doctor is not the villain in these numbers. The 48-second visit and the paper pad are.",
          "Patients pay for the dysfunction directly. Out-of-pocket spending reached 73% of total health expenditure in 2021, the highest in South Asia, and 4.5% of the population is pushed into poverty by health costs every year.",
        ],
        pullQuote: "The 48-second visit cannot take a history. Chamber takes it first.",
      },
      {
        index: "02",
        heading: "What Chamber does",
        body: [
          "While the patient waits, Glyph conducts a structured clinical interview in Bangla: voice-first, dialect-aware, unhurried. The history-taking the visit can never do has already happened before the doctor walks in.",
          "The first question is who is holding the device. In attendant mode, every clinical fact is tagged with its source: patient self-reported, attendant-reported, attendant-translated, attendant-observed. Discrepancies are flagged for the doctor to verify directly. In Bangladesh the accompanied visit is not an edge case. It is the default, and no clinical AI built for Western solo encounters handles it.",
          "The intake camera photographs every paper in the bag. Extraction is tuned to Bangladeshi reality: the Rx pad layout, 1+0+1 dose notation, Napa mapped to Paracetamol, the report formats of Popular, Ibn Sina, and Lab Aid. Three years of paper becomes a structured record while the patient waits.",
          "The doctor gets a fifteen-second briefing card, red flags first, with current medications cross-checked against every prescription in the bag. During the consult he can ask KhaM-Med a clinical question and receive a cited answer in seconds. Afterward the note is drafted in the format Bangladeshi medicine actually uses, CC, O/E, Ix, Rx, Advice, never SOAP. The doctor reviews, edits, and approves. On approval the prescription is signed with his cryptographic identity, which is what makes pharmacy verification possible downstream. Two days later the patient receives a plain-Bangla WhatsApp check-in.",
        ],
      },
      {
        index: "03",
        heading: "What the identity layer gives the doctor",
        body: [
          "BMDC reported 134,568 registered physicians in November 2024 while acknowledging that roughly 36,000 practice on lapsed registrations, that it cannot say how many registered with forged documents, and that it does not know how many practice with no registration at all. That is usually framed as a regulator's problem. It is equally the honest doctor's problem: at the point of care, his legitimate registration is indistinguishable from a forged one.",
          "Chamber gives the legitimate doctor a verifiable professional identity. His prescriptions carry his signature in a form any pharmacy or hospital can check against a published key. The credential strengthens in declared phases as institutions and ultimately BMDC join as issuers, without the doctor changing anything about how he works.",
        ],
      },
      {
        index: "04",
        heading: "The economics, and the honest constraints",
        body: [
          "Chamber costs Tk 8,000 to 10,000 per month for a solo doctor. A chamber doctor seeing 35 to 45 patients per evening session grosses Tk 17,500 to 45,000 per session. If intake and the briefing let him see three to five more patients per session, or the same number with materially better documentation, the subscription returns itself within days.",
          "The constraints are stated, not hidden. A doctor running 90 consultations a day has no slack to learn software, so Chamber demands nothing: his only new behaviors are reading a card and tapping approve. Dialect speech recognition is not solved yet; text fallback and attendant-mediated intake bridge the gap while dialect training matures. And the briefing is decision support, never the decision. KhaM-Med suggests. The BMDC-registered human signs.",
        ],
      },
      {
        index: "05",
        heading: "Where it stands",
        body: [
          "Chamber is the most-built part of Glyph: the full loop from Bangla voice intake through the signed prescription to the WhatsApp follow-up runs in production today. The first pilot is deliberately small, one chamber at a time, with the founder physically present and iterating daily. Every other Glyph interface inherits the infrastructure Chamber proves.",
        ],
      },
    ],
    status: "Live in pilot. Dhaka chambers onboarding through the waitlist.",
    audience: "Doctors · Chambers · Clinics",
  },
  {
    slug: "pocket",
    name: "Glyph Pocket",
    codename: "the patient's interface",
    headline: "The bag, made permanent",
    standfirst:
      "A 52-year-old shopkeeper in Jatrabari has hypertension he half-knows about. When his head aches he walks to the pharmacy ninety meters away and buys what the drug seller suggests. He has never had a check-up. He will see a doctor when something frightens him, and that doctor will know nothing about him, because nothing about him is written anywhere except in a bag he may or may not bring. He is not careless. He is responding rationally to a system where the pharmacy is near, the doctor is far, and no one keeps his story.",
    image: "/landing/pocket.webp",
    imageAlt: "A shopkeeper at his counter, looking at his phone",
    sections: [
      {
        index: "01",
        heading: "The evidence",
        body: [
          "The pharmacy is the de facto front door of the health system. A Dhaka study of patients seeking care for respiratory illness found only 10% had seen any other provider before the pharmacy, and most of those had come from another pharmacy. Self-medication prevalence runs as high as 88% in surveyed groups, informed by old prescriptions, family advice, and the internet.",
          "Care is skipped because care impoverishes: 16.4% of households forgo needed care because of cost, and out-of-pocket spending stands at 73% of total health expenditure. Meanwhile the phone is already in the household. The national statistics bureau reports 98.9% of households with a mobile phone and 72.4% with a smartphone. The Surokkha vaccination platform reached roughly 60 million users, proof that Bangladeshis adopt a digital health credential when it is simple and necessary.",
        ],
      },
      {
        index: "02",
        heading: "What Pocket does",
        body: [
          "Pocket is the patient's wallet, voice, and memory. Free, in Bangla, voice-first, designed for shared family phones and thin data.",
          "Every credential issued anywhere in the Glyph network lands in the patient's wallet, signed by its issuer: prescriptions from Chamber, results from Lens, dispensings from Pharmacy, discharge summaries from Hospital. The patient can also photograph the legacy paper at home, turning the existing bag into the opening balance of a lifelong record. The wallet survives the rain, the move, and the years.",
          "Before the shopkeeper asks the drug seller, he can ask Pocket. KhaM-Med answers in plain Bangla at his comprehension level: what this probably is, what to watch for, whether the pharmacy is enough or a doctor is needed, and which kind of doctor. Red-flag symptoms escalate firmly. This is a chest-pain-go-now system, not a chatbot that chats.",
          "When a doctor is needed, Pocket matches by clinical need, geography, language and dialect, gender preference, and budget, then remembers. The second visit goes to the same doctor. A relationship accumulates where the system previously produced only strangers. And family circles extend the wallet to the people who actually manage a household's health: the daughter in London sees her father's blood pressure readings, with consent that is explicit, visible, and revocable.",
        ],
        pullQuote: "A ministry database knows the citizen. A Pocket wallet is owned by the citizen.",
      },
      {
        index: "03",
        heading: "Why it is free",
        body: [
          "Pocket is free for domestic patients, permanently. Any paywall would exclude precisely the people the system fails most. The wallet's value to every paying interface exceeds any subscription it could charge: Chamber doctors get prepared patients, Lens gets order flow, Pharmacy gets verifiable prescriptions. Paid tiers exist only where ability to pay is structurally different, for diaspora and migrant family coordination. The domestic patient never pays for her own record, and raw patient data is never sold. That commitment is enforced by the architecture itself, because the keys are the patient's.",
        ],
      },
      {
        index: "04",
        heading: "Where it stands",
        body: [
          "Pocket inherits Chamber's infrastructure and ships after Chamber proves the record is worth holding. The first Pocket users will be the patients of the first Chamber doctors, invited at the end of a visit with their record already in hand. That is the cheapest patient acquisition in healthcare, because the product's value is demonstrated before it is installed.",
        ],
      },
    ],
    status: "In design. Ships behind Chamber; the first users are Chamber patients.",
    audience: "Patients · Families · Diaspora",
  },
  {
    slug: "pharmacy",
    name: "Glyph Pharmacy",
    codename: "the antibiotic enforcement loop",
    headline: "A prescription that can prove itself",
    standfirst:
      "A drug shop in a Lakshmipur bazaar, run by a man everyone calls doctor though he holds no degree. A mother comes in: her child has had fever and a cough for two days. He reaches for an azithromycin course, because that is what moves and what keeps her from walking to the shop forty meters down the road. There is no prescription. There will be no follow-up. This counter is where Bangladesh's antibiotics are actually rationed, by sales instinct, not clinical judgment.",
    image: "/landing/pharmacy.webp",
    imageAlt: "A pharmacist's hands passing medicine across a counter",
    sections: [
      {
        index: "01",
        heading: "The most documented failure in Bangladeshi healthcare",
        body: [
          "The studies do not merely agree. They escalate. A WHO-linked classification study found 50.9% of antibiotic courses purchased without a registered physician's prescription. A 2024 observational study across 246 Dhaka pharmacies found only 36.2% of antibiotics sold against a registered prescription. A survey of 287 pharmacy staff across four regions found 92.4% reporting that they dispense antibiotics without prescriptions.",
          "The dispenser is usually not a pharmacist. Bangladesh has roughly 107,000 licensed retail pharmacies and an estimated equal number of unlicensed ones, and in one Dhaka study only 7.6% of pharmacies had a registered pharmacist present. When asked why they dispense without prescriptions, the answers are economic, not malicious: fear of losing the customer was cited by 99.5% of rural dispensers. The law against over-the-counter antibiotic sale exists. Enforcement does not.",
          "The consequence is antimicrobial resistance: first-line antibiotics losing efficacy, rising treatment costs, higher mortality from bacterial infection, in a country that combines the loosest access with one of the highest infectious-disease burdens.",
        ],
        pullQuote: "The prescription is not a control. Pharmacy makes it one.",
      },
      {
        index: "02",
        heading: "The Swedish loop, built for Bangladesh",
        body: [
          "Sweden, Denmark, and the UK brought antibiotic dispensing under control the same way: the prescription is a system record, not a piece of paper. Glyph Pharmacy is that loop, adapted to a counter staffed by a non-pharmacist on a basic Android phone.",
          "The dispenser queries the patient's identity, with consent, by QR or phone number. The wallet returns the active prescription, signed by the prescribing physician's BMDC-anchored identity. The screen shows what was prescribed, by whom, when, and for how long. Nothing is hand-read, so the 46% illegibility problem disappears at the counter. For controlled categories, antibiotics first, a valid signed credential is the condition of dispensing. The forged prescription, the expired course, the antibiotic bought on a hunch: each fails at the verification step rather than at the conscience of a salesperson who fears losing the sale.",
          "Dispensing events are written back as signed credentials, so adherence becomes visible: the course abandoned on day three surfaces in the prescriber's follow-up. And KhaM-Med assists the dispenser in plain Bangla: what the prescription means, what to counsel, when to refuse and refer.",
        ],
      },
      {
        index: "03",
        heading: "Free, because the public good is the point",
        body: [
          "Pharmacy is free to participating pharmacies. The enforcement layer cannot be a revenue line; its value is the antibiotic loop closing across a community, and that only happens at density. The pilot strategy follows: saturate one administrative unit with Chamber prescriptions first, roll Pharmacy out free in the same unit, then measure non-prescribed antibiotic dispensing against the documented 50 to 92% baselines for six months and publish the results to WHO Bangladesh, the DGDA, and the press. With evidence in hand, the path to a DGDA-recognized credential-based dispensing standard opens. The state has publicly failed to bend this curve. Publishing the data that bends it is how the network earns formalization.",
        ],
      },
      {
        index: "04",
        heading: "Where it stands",
        body: [
          "The prescription-signing side runs in production today through Chamber, and the pharmacy verification loop has been demonstrated end to end, including revocation reaching the counter. Full Pharmacy deployment is correctly sequenced behind Chamber density, as a Year 2 to 3 product. It is the payoff of the network, not its entry point.",
        ],
      },
    ],
    status: "Verification loop proven. Full rollout sequenced behind Chamber density.",
    audience: "Pharmacies · Dispensers · Drug regulators",
  },
  {
    slug: "lens",
    name: "Glyph Lens",
    codename: "the diagnostic interface",
    headline: "Results that arrive signed",
    standfirst:
      "A diagnostic center on a district-town main road has a working X-ray machine, a busy sample counter, and no radiologist. Films are read in batches when a Dhaka consultant reviews them remotely, or weekly, or, in the worst version of the story, the center prints a report over the name of a physician who never saw the image. The technologist who took the film has done this work for eleven years and can often see the tuberculosis himself. His seeing counts for nothing, because no system exists in which it can be captured, assisted, verified, and signed.",
    image: "/landing/lens.webp",
    imageAlt: "A laboratory technologist holding a test tube to the light",
    sections: [
      {
        index: "01",
        heading: "The evidence",
        body: [
          "Bangladesh has roughly 700 radiologists for more than 170 million people, about four per million, overwhelmingly concentrated in Dhaka. Patients outside the capital wait days to weeks for imaging reports, with delayed cancer diagnosis named explicitly by the professional society.",
          "The reports themselves cannot always be trusted. DGHS's 2022 crackdown closed 1,149 illegal facilities in its first days. Sector reporting describes roughly half of diagnostic centers operating without valid licenses, some using the names of physicians without their knowledge. And the country has already run the experiment of what happens when reports lose credibility: during COVID, after a fake-certificate scandal, national daily testing nearly halved because the public stopped believing results.",
          "The regulator has already reached for verification with the only tool it had: a 2022 directive ordering every facility to display a QR code on its signboard. Lens is that instinct implemented properly. Not a sign on the wall. A cryptographic signature on every report.",
        ],
      },
      {
        index: "02",
        heading: "What Lens does",
        body: [
          "Orders arrive from Chamber as structured data: test, clinical context, the ordering physician's signed credential. Results leave as Verifiable Credentials signed by the center and by the verifying professional, landing in the patient's wallet with reference ranges, abnormal flags, and provenance. The ghost-signed report dies at participating centers, because a report over a radiologist's name now requires that radiologist's actual key. And last year's HbA1c is findable, trendable, and trusted, so the duplicate-test economy shrinks for exactly the patients who can least afford it.",
          "The heart of Lens is co-interpretation. The eleven-year technologist gets KhaM-Med as a second reader: a draft observation, not a diagnosis, flagging likely findings and urgency. The draft routes to a remote radiologist for verification and signature. The scarce specialist's hour is spent confirming structured drafts across many centers instead of reading cold films for one. The four-per-million radiologist supply is multiplied rather than bypassed, and a licensed human still signs every report.",
        ],
        pullQuote: "A report is only worth what its signature is worth.",
      },
      {
        index: "03",
        heading: "Economics",
        body: [
          "Lens charges the center: per-report fees of Tk 50 to 100 or subscriptions of Tk 15,000 to 25,000 per month by volume. The center's return is concrete. Faster reporting attracts ordering doctors, co-interpretation raises throughput on existing machines, and in a market that publicly lost trust once, the verifiable report is a competitive weapon. Verifying a report is free for everyone, forever, for the same reason Pharmacy is free: verification density is the public good.",
        ],
      },
      {
        index: "04",
        heading: "Where it stands",
        body: [
          "Lens inherits more of the current build than any other interface: the extraction prompts for local lab formats, multimodal routing, and the results schema all exist. The center-facing workflow and the draft-verify-sign loop are designed but unbuilt. Vision-model performance will be measured on Bangladeshi films from real machines before urgency-flagging is trusted, and the results published. The first pilot pairs one district-town center with two or three remote radiologists and the local Chamber doctors already ordering from it.",
        ],
      },
    ],
    status: "In design. Extraction and schemas live; center workflow sequenced behind Chamber order flow.",
    audience: "Diagnostic centres · Radiologists · Technologists",
  },
  {
    slug: "continuity",
    name: "Glyph Continuity",
    codename: "the migrant worker's interface",
    headline: "Fifteen million patients the system lost",
    standfirst:
      "A construction worker from Dinajpur, eight years in Abu Dhabi. He works at height in heat that passes 45 degrees. His back has hurt for two years; lately there is blood when he coughs. He will not see a doctor there: the clinic costs money he has promised home, the doctor speaks Arabic or English, and a bad result on any medical record can mean a cancelled permit. So he works, and waits, and tells his wife on the phone that everything is fine. He is the most economically important and clinically invisible Bangladeshi alive.",
    image: "/landing/continuity.webp",
    imageAlt: "A migrant worker holding a phone, city blurred behind him",
    sections: [
      {
        index: "01",
        heading: "The evidence",
        body: [
          "Roughly 15.4 million Bangladeshis live and work abroad. The remittances they send, 23.9 billion dollars in one recent fiscal year, place Bangladesh among the top ten remittance economies on earth. The work is dangerous at documented rates: a global meta-analysis found 47% of international migrant workers suffer occupational health issues and 22% report workplace injuries.",
          "The wall between the worker and care is structural. Sponsorship systems, cost, language, and the hardest fact of all: health status is a deportation weapon. A positive TB result at permit renewal can end a livelihood, which teaches workers to hide symptoms and arrive home undiagnosed mid-disease.",
          "And here is the strategic discovery: the enrollment rail already exists. Every legal migrant registers with BMET before departure, with biometric enrollment, a mandatory three-day orientation, and a QR-based digital clearance card without which the airport will not let him board. The state already issues every legal migrant a digital identity credential at a mandatory touchpoint. Continuity attaches a health wallet to a rail the worker is already standing on.",
        ],
      },
      {
        index: "02",
        heading: "What Continuity does",
        body: [
          "Continuity is not telemedicine. A video appointment assumes a private 30-minute call at a scheduled hour, which is impossible in a shared labor-camp room on a twelve-hour shift. Continuity is asynchronous, voice-first, offline-capable, and anchored to a Bangladeshi physician relationship the system creates, because the worker almost never had one to begin with.",
          "The worker's wallet is provisioned before departure, at BMET registration or the pre-departure orientation. When he is unwell, whoever is reachable helps capture vitals: a camp dispensary, a pharmacy with a BP machine, a literate co-worker guided step by step. He records his symptoms as a voice note in his own dialect. Everything syncs when data allows. The submission lands in the queue of his matched Bangladeshi physician, chosen for clinical need, home-district proximity, language, and gender appropriateness. The doctor reviews within his normal hours and responds in voice, in Bangla, replayable as many times as needed.",
          "The boundary is deliberate and legally necessary: assessment, triage, and structured handover, never cross-border prescribing. Where local care is needed, the worker receives a concise translated summary to hand to a local clinic, with his history attached, so the paid local visit takes minutes instead of starting from zero. When he comes home for Eid, his doctor sees him in person with the full record. When he is deported mid-treatment, the handover already exists.",
        ],
        pullQuote: "Seen by a Bangladeshi doctor, in his own language, without his employer ever knowing.",
      },
      {
        index: "03",
        heading: "Why patient-held keys are the safety mechanism",
        body: [
          "The worker's record must be invisible to his employer and the destination state, because the research shows health status triggers deportation. Patient-held keys are not ideology here. They are the difference between a health record and a self-incrimination file. The same property serves the undocumented worker through anonymous-mode identity, whom no government-run system can safely serve at all.",
        ],
      },
      {
        index: "04",
        heading: "Economics and the funding pathway",
        body: [
          "The worker cannot pay 20 dollars a month; he can pay per event, and his family can co-pay from the remittance he sends. Consultations run Tk 200 to 500, with a family tier at 3 to 5 dollars a month through bKash or Probashi banking rails, priced against the reality that one avoided emergency flight home repays years of subscription. The reviewing physician is paid per consultation, a new income stream that recruits the physician pool.",
          "The institutional pathway is unusually strong: BMET and the Ministry of Expatriates' Welfare have explicit welfare mandates, ILO and IOM run migrant-health workstreams, and the Wage Earners' Welfare Board exists to fund worker protection. A pilot embedded in the pre-departure orientation, where health content today reaches under a third of workers, is fundable and measurable.",
        ],
      },
      {
        index: "05",
        heading: "Where it stands",
        body: [
          "Designed, not built. Continuity inherits the voice pipeline, the WhatsApp layer, and the identity work, and adds the guided vitals flow, the asynchronous physician queue, and destination-country formulary tables. The first pilot is one corridor, Dhaka to the UAE, a handful of workers, a small paid physician panel, and one question: does the capture-review-handover loop complete reliably under real labor-camp conditions. The founder has filmed this population for years. The pilot will be designed with the same people who were in front of the camera.",
        ],
      },
    ],
    status: "Designed. First-corridor pilot (Dhaka to UAE) sequenced for the program's first phase.",
    audience: "Migrant workers · Families · BMET · Missions abroad",
  },
  {
    slug: "karigor",
    name: "Glyph Karigor",
    codename: "the garment worker's interface",
    headline: "Care for the hands that clothe the world",
    standfirst:
      "A sewing operator in Ashulia, 26 years old, eight years on the line. Her back aches by mid-morning; her eyes burn by evening. There is a medical room downstairs, the law put it there, but going means losing her hourly production target, and the room exists mostly for the buyer audits anyway. So she buys Panadol and keeps sewing. She is newly pregnant and has told no one at the factory, because she has watched what happens to women who tell. She is a karigor, an artisan, and Karigor is built for her: her health, recorded, hers, following her wherever she goes next.",
    image: "/landing/karigor.webp",
    imageAlt: "A young garment worker, sewing floor behind her",
    sections: [
      {
        index: "01",
        heading: "The evidence",
        body: [
          "Bangladesh's export garment industry employs about 3 million workers across 3,555 verified factories, a majority of them women, though the female share has fallen from 80% in the early years to near 52% today. The reasons women leave are documented: childcare, pregnancy, and discrimination for being pregnant. Pregnancy concealment is not an edge case. It is a documented exit driver, and it defines this product's confidentiality architecture.",
          "The law already mandates the infrastructure. The Labour Act 2006 requires medical facilities scaled to workforce size, up to permanent medical centres and multiple physicians for the largest plants, with occupational injury treated at the employer's expense until cure. The published assessment is consistent: low awareness, uneven compliance, weak enforcement, and the starkest finding of all, workers do not use the rooms. A compliance artifact is not a care system.",
          "What works has already been demonstrated. The HERhealth program, evaluated in Bangladeshi factories, moved health knowledge and behavior measurably, and the active ingredient was not a better doctor or a better room. It was a trusted peer, on the floor, during work hours. Karigor is that finding, given a clinical backbone.",
        ],
      },
      {
        index: "02",
        heading: "What Karigor does",
        body: [
          "In each participating factory, the medical room is staffed by a Glyph-trained health assistant, in most factories a woman recruited the HERhealth way, equipped with a tablet, a BP cuff, a glucometer, and KhaM-Med guidance in Bangla. She captures structured vitals and complaints in minutes, between production targets. KhaM-Med routes what she captures: self-care guidance relayed in plain Bangla, escalation to a remote physician for asynchronous review, or urgent referral out. The mandated room finally has a function the worker has a reason to enter.",
          "Workforce nutrition rides the same encounter. Anaemia screening for a majority-female workforce, where anaemia affects 36.7% of Bangladeshi women of reproductive age, becomes a routine part of the visit, and the precedent is proven: the same peer channel evaluated in Bangladeshi factories has carried buyer-funded nutrition programming before.",
          "Every encounter writes to the worker's own wallet. Management never sees clinical content. This line is absolute because the evidence demands it: in a sector where pregnancy discrimination drives exits, a factory-readable health record would be a weapon against the women it claims to serve. The early-pregnancy consultation and the reproductive-health question are shielded categories, visible to the worker and her chosen clinicians only.",
          "What management receives instead is what it actually needs and the buyer actually audits: compliance documentation as signed credentials, the staffed room, the encounters happening, occupational injuries tracked to resolution, plus de-identified aggregate trends with small-count suppression. Individual records, never. And when she leaves at 35, her decade of occupational health history leaves with her: the documented back injury that becomes a disability claim, the respiratory baseline a future doctor needs. Today that history evaporates at the factory gate. Under Karigor it is hers.",
        ],
        pullQuote: "The factory pays for compliance proof. The worker owns the record. The line never moves.",
      },
      {
        index: "03",
        heading: "Economics",
        body: [
          "The factory pays Tk 15,000 to 30,000 per month per facility, priced against what it already spends on a mandated room that delivers audit theater, and against the cost of a failed social audit. The sale rests on compliance made provable, on absenteeism and attrition in a workforce that exits by 40, and on the simple fact that the room is a sunk cost Karigor makes work. The worker pays nothing, ever. Brand- and buyer-funded deployment is the scaling path: the same EU buyers now implementing Digital Product Passport requirements are the natural demand side for verifiable worker-health compliance, and the factory's existing digital identity for product provenance can anchor its health-compliance credentials too, with the worker's clinical data never crossing that bridge.",
        ],
      },
      {
        index: "04",
        heading: "Where it stands",
        body: [
          "Designed, not built. Karigor inherits the assisted-capture flow, the asynchronous physician queue, the wallet, and the identity layer. The first pilot is one factory in the 1,000 to 3,000 worker range, one trained health assistant, a small female-physician review panel, and two measured questions: do workers use the room more than the Panadol baseline, and does management keep its hands off the clinical data when the architecture says it must.",
        ],
      },
    ],
    status: "Designed. First factory pilot sequenced after Chamber and the identity layer.",
    audience: "Garment workers · Manufacturers · Brands · Auditors",
  },
  {
    slug: "maa",
    name: "Glyph Maa",
    codename: "the mother's interface",
    headline: "Ending the ricochet",
    standfirst:
      "A 24-year-old in a village in Mymensingh, pregnant with her second child. Her blood pressure has been climbing for three weeks and no one knows, because no one has measured it. When the headache and the swelling come at eight months, her family will do what the mortality surveys say families do: seek help, first at the village doctor, then the union facility that cannot treat eclampsia, then the upazila hospital that has no record of her, then, too late, the district hospital. She will have done everything right. The system will have made her ricochet.",
    image: "/landing/maa.webp",
    imageAlt: "A health worker checking a pregnant woman's blood pressure at home",
    sections: [
      {
        index: "01",
        heading: "The evidence",
        body: [
          "Bangladesh's maternal mortality decline is one of global health's real successes: a 40% fall in under a decade. The literature now uses one word for the period since: plateaued. With roughly three million live births a year, the country loses on the order of 4,000 to 6,000 mothers annually.",
          "The stalled cause is the detectable one. Deaths from preeclampsia and eclampsia fell sharply, then stopped falling, and now account for about 24% of maternal deaths, three quarters of them rural. The condition announces itself through blood pressure, a measurement a trained neighbor can take with a Tk 2,500 cuff, weeks before it kills. That is not a treatment gap. It is a surveillance gap.",
          "And the finding that defines this product: the verbal autopsies show that almost all women who died of preeclampsia had left home and sought care, most at more than one facility. Each facility met the dying woman as a stranger. No history, no BP trend, no warning she was coming. These are routing and information deaths.",
        ],
        pullQuote: "The women who died sought care. The system met them as strangers.",
      },
      {
        index: "02",
        heading: "What Maa does",
        body: [
          "Enrollment happens at first contact, wherever that is: a Chamber doctor, a community health worker, a Karigor health assistant in a garment factory, or self-enrollment through Pocket. The pregnancy record opens with a care schedule, and WHO-aligned visit reminders go by WhatsApp in plain Bangla to the mother and her family circle, because the husband and mother-in-law decide whether she travels to a visit.",
          "Blood-pressure surveillance is the spine. Every contact captures a reading: a CHW visit, a pharmacy corner, a factory medical room, a neighbor's cuff. KhaM-Med watches the trend, not the single value. A climbing trajectory triggers escalation under national protocol, and the receiving facility, where connected, sees her record and her warning before she arrives. Surveillance does not stop at delivery; the 48-hour postpartum window has its own schedule.",
          "When escalation fires, Maa answers the question no awareness campaign can: where. Which reachable facility actually stocks magnesium sulfate, which actually staffs emergency obstetric care, which is being notified now. The woman who today arrives as a stranger at her third facility arrives instead as an expected patient at the right first one. And delivery closes one record while opening another: the newborn's identity, birth details, and immunization schedule, a health record that begins at birth.",
        ],
      },
      {
        index: "03",
        heading: "The nutrition spine",
        body: [
          "Bangladesh is off course on every maternal and child nutrition target it has set. Stunting affects 28% of children under five, above the regional average. Low birth weight affects 27.8% of infants. Anaemia affects 36.7% of women of reproductive age, and the global monitoring records no progress on it at all. The national nutrition plan, NPAN2, has just reached the end of its 2016 to 2025 term, and its successor is being written now.",
          "The argument is the same one the blood pressure made. Stunting announces itself in a growth curve that nobody plots, because the weights are taken at scattered contacts and recorded nowhere. Anaemia in pregnancy is a screen and a trend. A MUAC tape costs pennies and the community health worker already knows how to use it. So Maa's surveillance spine carries nutrition alongside pressure: gestational weight and anaemia screening through pregnancy, iron and folate adherence on the same WhatsApp rails as everything else, and growth monitoring at every immunization contact after birth, plotted automatically, with faltering growth escalated the way a climbing pressure is. The child who is becoming stunted is visible eighteen months before the statistic records it.",
          "For nutrition funders this solves the sector's oldest complaint: data that arrives years late through surveys. A network that produces consented, real-time, longitudinal growth and anaemia data as a side effect of care is measurement infrastructure no campaign can match.",
        ],
        pullQuote: "Stunting announces itself in a growth curve nobody plots.",
      },
      {
        index: "04",
        heading: "For funders, with the arithmetic shown",
        body: [
          "Maa is free to mothers, permanently. The wealth gradient in skilled birth attendance means any paywall is a death gradient. The funder map is the densest in global health: UNICEF and UNFPA, whose own disparity data documents the gap Maa targets, the Gates Foundation, WHO Bangladesh, and DGHS and DGFP themselves.",
          "The impact claim is stated with its arithmetic. Preeclampsia's share of 4,000 to 6,000 annual deaths is roughly 1,000 to 1,400. A surveillance-and-routing intervention at national scale, performing exceptionally, might prevent a meaningful fraction of those. The claim is therefore hundreds of lives per year at scale, and never more. Earlier internal drafts carried larger numbers. They were wrong, and the correction stands. Hundreds of mothers is not a small number. It does not need inflating.",
        ],
      },
      {
        index: "05",
        heading: "Where it stands",
        body: [
          "Designed, not built. Maa inherits the wallet, family circles, the assisted-capture flow, and the WhatsApp rails that already run in production. The fundable pilot is sharply defined: one upazila, every identified pregnancy enrolled, CHW-run BP and nutrition surveillance, escalation routing to a facility verified ready, measured against the district's baseline. Maa detects and routes; it does not treat. Its ceiling is set by facility quality it does not control, and the pilot design says so.",
        ],
      },
    ],
    status: "Designed. The flagship grant object; upazila-scale pilot specified.",
    audience: "Mothers · CHWs · OB-GYNs · Maternal-health funders",
  },
  {
    slug: "hospital",
    name: "Glyph Hospital",
    codename: "the institutional interface",
    headline: "The 2am corridor decision, made on a known patient",
    standfirst:
      "A medicine ward built for forty beds, holding sixty-three patients. A 58-year-old man arrives at 2am, unconscious, brought by relatives who know he takes gas tablets and something for pressure. There is no referral note because no one referred him. The duty doctor starts from zero on a stranger, at night, in a corridor. Eleven days later the man leaves with a few handwritten lines that will go into the plastic bag and never be seen by another clinician.",
    image: "/landing/hospital.webp",
    imageAlt: "A duty doctor in a hospital corridor at night",
    sections: [
      {
        index: "01",
        heading: "The evidence",
        body: [
          "Bangladesh's referral pyramid is upside down in the government's own numbers: secondary facilities run at roughly 148% bed occupancy and tertiary at 137%, while primary facilities sit at 79%. National averages reach 163%, with wards reported as high as 370%. International evidence associates occupancy above even 85 to 92% with measurably higher mortality.",
          "The patients are not misbehaving. A study of 822 tertiary-care patients found 59% self-referred, and 58% entirely unaware that a referral system exists. They route around a lower tier they do not trust, with reason. Admission means starting from zero: the inpatient prescribing study that found 692 medication problems in 200 orders was conducted in exactly this setting, and the errors begin with not knowing what the patient was already taking. Discharge is an information cliff: a handwritten slip that does not travel, and a quarter of discharges leaving early, often for cost.",
        ],
      },
      {
        index: "02",
        heading: "What Hospital does",
        body: [
          "Hospital is deliberately not another hospital information system; international graveyards are full of those. It is the continuity layer, four credential flows that make the institution a connected node in the patient's record instead of an island.",
          "At admission, the arriving patient or the relative holding her phone presents the wallet. With consent, or through a break-glass emergency protocol that is read-only, time-boxed, audited, and patient-notified, the duty doctor sees in thirty seconds what no Bangladeshi admission has ever had: active medications across every prescriber, allergies, recent labs with trends, the chamber visit two weeks ago where the warning already appeared.",
          "At discharge, the summary becomes a structured, signed credential in the patient's wallet: diagnoses, procedures, medications reconciled against the admission list, follow-up schedule, and red-flag instructions in plain Bangla for the family, with automated WhatsApp check-ins at day three and day fourteen. Referrals travel as structured handovers in both directions, so the receiving hospital sees the patient coming before the ambulance does. And the institution itself holds a verifiable identity anchored to its DGHS license, so its summaries and certificates carry portable proof of legitimacy.",
        ],
        pullQuote: "Admission with a record. Discharge that travels. Referral that arrives first.",
      },
      {
        index: "03",
        heading: "Economics, honestly bounded",
        body: [
          "Hospitals pay Tk 25,000 to 60,000 per month by bed count, priced against a single avoidable adverse event and against the duplicate admission workups the sector already wastes money on. The go-to-market is bottom-up: the Chamber doctors already inside every hospital through dual practice become the internal champions, asking why the morning ward round cannot have the briefing card their evening chamber already has.",
          "The bounds are stated plainly. Hospital cannot fix capacity; a 163% occupancy ward with a perfect information layer is still a 163% ward. The claim is efficiency at the margin: fewer duplicate workups, fewer medication errors at admission, fewer blind readmissions.",
        ],
      },
      {
        index: "04",
        heading: "Where it stands",
        body: [
          "The least-built and latest-sequenced clinical interface, by design, because it consumes everything the others produce. The break-glass protocol is flagged as a precondition requiring independent review before any hospital pilot. The first deployment is a single private hospital where two or more existing Chamber doctors already practice, the smallest institutional experiment that can prove the admission-to-discharge loop.",
        ],
      },
    ],
    status: "Designed. Sequenced last among clinical interfaces; entered through Chamber doctors.",
    audience: "Hospitals · Duty doctors · Administrators · DGHS",
  },
  {
    slug: "bridge",
    name: "Glyph Bridge",
    codename: "the cross-border interface",
    headline: "A second opinion that travels as evidence",
    standfirst:
      "A retired college teacher in Khulna with a suspicious mass on his CT report. His children have decided, the way hundreds of thousands of families decide every year, that the diagnosis must be confirmed in Chennai, because nobody trusts the report, the machine, or the signature on it. The family will spend three weeks and two years of his pension. In Chennai, the oncologist will spend the first two days re-doing tests, because she cannot trust or read what came out of the shopping bag.",
    image: "/landing/bridge.webp",
    imageAlt: "A senior physician in a video consultation",
    sections: [
      {
        index: "01",
        heading: "The evidence",
        body: [
          "Bangladeshis spend an estimated 4 to 5 billion dollars a year on overseas medical treatment, more than the government's entire health budget. India alone recorded about 482,000 Bangladeshi medical travelers in 2024, roughly half of all its inbound medical tourism, before visa restrictions cut the corridor and sent families scrambling to Bangkok at higher cost.",
          "When Dhaka's own commercial establishment examined the outflow, the diagnosis was not a technology gap. Dhaka has CT scanners. The named drivers were lack of trust, doubts over diagnosis, hidden charges, and fear of counterfeit medicine. The outflow is a trust gap, and trust is precisely what verifiable credentials manufacture.",
        ],
      },
      {
        index: "02",
        heading: "What Bridge does",
        body: [
          "From the patient's wallet, with consent, Bridge assembles a specialist-ready dossier: structured history, medications by generic name, labs and imaging as signed credentials, machine-translated into clinical English with the Bangla originals attached, every item verifiable against its issuer's published key. The two days of Chennai re-testing exist because the bag is unreadable and untrustworthy. The bundle is neither.",
          "The bundle connects to a panel of foreign and diaspora specialists for paid, asynchronous, structured review: diagnosis concurrence, treatment-plan commentary, and the question that saves families the most money, whether travel is warranted at all. The opinion returns as a signed credential, in English and plain Bangla, and lands with the patient's Bangladeshi treating physician, because the bright line is identical to Continuity's: the foreign specialist informs, the locally licensed doctor decides and prescribes.",
          "When travel happens anyway, the bundle precedes the patient, and when the patient returns, Bridge digitizes the foreign records back into the wallet, so the Khulna follow-up doctor inherits the Chennai surgery instead of a rumor of it.",
        ],
        pullQuote: "Don't believe the paper. Verify the signature.",
      },
      {
        index: "03",
        heading: "Bridge's honest role in the ecosystem",
        body: [
          "Bridge serves the families who can contemplate 5,000 to 30,000 dollars of foreign treatment, and it is priced accordingly: second opinions at market rates, bundle preparation at Tk 3,000 to 8,000, diaspora-billed in foreign currency. Its role is stated plainly: Bridge is the ecosystem's paying tier and a cross-subsidy engine. Every Bridge fee helps pay for Maa cuffs and Karigor tablets. It is not the mission. It funds the mission, and the product documents say so in writing, because stating it is the cheapest governance mechanism available.",
        ],
      },
      {
        index: "04",
        heading: "Where it stands",
        body: [
          "Unbuilt, and correctly last among patient-facing interfaces: it presumes a wallet worth bundling and credentials worth verifying. The first corridor is deliberately narrow: oncology second opinions with one partner panel. The first pilot family should be one that was denied an Indian visa. The product's reason to exist is currently sitting in their living room.",
        ],
      },
    ],
    status: "Designed. Sequenced behind the wallet and credential base; oncology corridor first.",
    audience: "Families · Diaspora · Specialist panels",
  },
  {
    slug: "beacon",
    name: "Glyph Beacon",
    codename: "the emergency interface",
    headline: "The nearest stranger is the first responder",
    standfirst:
      "A man collapses on a street in Dhaka at dusk. A rider is hit at a junction. A mother goes down in a bus. No siren is coming, because the dispatch you would call does not reliably answer. What happens next is what happens a thousand times a day across the country: strangers stop. They lift him, find a CNG or a rickshaw, and carry him to whichever hospital someone half-remembers, on their own time, for a person they will never see again. Beacon is built for that minute. It does not replace the stranger who stops. It hands him a destination, a way to alert the hospitals, and a way to reach the family, in the moment he has already decided to help.",
    image: "/landing/beacon.webp",
    imageAlt: "A phone on the ground at dusk, a stranger's hand reaching for it",
    sections: [
      {
        index: "01",
        heading: "The thing we rely on and never name",
        body: [
          "Bangladesh has a national emergency number, but for a medical crisis on the road it is not the system that answers. The system that answers is the people standing nearby. Every Bangladeshi knows this is true. Most of us have been on one side of it, and many on both. And yet there is no name for it, no line in a budget, no box on an org chart. The country's real emergency response is not the ambulance and not the hotline. It is the uncredited, reflexive generosity of strangers.",
          "The kindness of strangers is not a sentiment here. It is infrastructure. Beacon starts from that fact instead of wishing it away. If strangers are the system the country actually has, the question is small and practical: what is the least we can do to help it work? Not a fleet of ambulances the state has not built. Not a dispatch center that does not exist. The phone already in the patient's pocket, and the willingness already on the street.",
        ],
        pullQuote:
          "The country's real emergency response is the uncredited generosity of strangers. Here, the kindness of strangers is infrastructure.",
      },
      {
        index: "02",
        heading: "What the helper cannot know",
        body: [
          "The strangers who stop are not short on willingness. They are short on information, and they always have been. Three things they cannot find out in the minute that decides everything.",
          "Where to take him. The nearest hospital may be the wrong one, jammed behind traffic, or shut for the night. The helper guesses, and a guess on a bad road can cost the patient the hour that decided whether he lived.",
          "Who to tell. The man's family does not know. He arrives alone, and the people who could speak for him, who know his heart condition and his medicines, are unreachable, because no one has their number and he cannot give it.",
          "What is wrong with him. He reaches the hospital as a stranger to the hospital too. The duty doctor starts from zero, at night, in a corridor, on a body that cannot answer, while the record that would have warned them sits in a plastic bag at home. Willingness without information is just a faster way to the wrong door.",
        ],
      },
      {
        index: "03",
        heading: "A code that turns a bystander into a dispatcher",
        body: [
          "The patient is already carrying the one thing that closes all three gaps: a phone. So Beacon is a small, scannable emergency code, sitting on the phone's lock screen and on a printed card in the wallet, readable without unlocking anything.",
          "A stranger scans it. Not to read the record. To act. In the seconds after the scan, three things happen at once. The helper is told where to run. Nearby hospitals are told someone is coming. The family is told it happened. The bystander who stopped, with no training and no authority, becomes the dispatcher the country never built.",
          "This is the whole idea. The country was always going to be saved by strangers. Beacon hands them a map, a line to the hospitals, and a destination, in the moment they have already chosen to help.",
        ],
        pullQuote:
          "A stranger scans it. Not to read the record. To act. The bystander becomes the dispatcher the country never built.",
      },
      {
        index: "04",
        heading: "One scan, and what each person sees",
        body: [
          "The design turns on a single rule: the same scan tells different people different things, and the stranger is told the least.",
          "To the stranger, the scan shows a destination and a thank-you, and no medical data at all. The nearest hospital, directions, a line saying the hospitals and the family have been alerted, and the words thank you for stopping. The helper does not need the diagnosis to save the life. He needs to know where to run.",
          "To nearby hospitals, the scan sends a brief, time-boxed alert with only the basics, so the emergency room can begin to prepare before the patient is through the door. And it does not bet on one hospital. It lights up several at once, because the closest may be unreachable behind a jam while the second-closest is clear. Whichever can respond, responds.",
          "To the family, the scan fires a message to the contacts the patient chose in advance: an emergency code was scanned, near here, at this time. Within minutes a relative is reachable, and the person who arrived alone is no longer alone. Every scan is logged, and the patient is told it happened, so the system is accountable to the one person it is about.",
        ],
        pullQuote:
          "The helper does not need the diagnosis to save the life. He needs to know where to run.",
      },
      {
        index: "05",
        heading: "Why the stranger sees nothing",
        body: [
          "It would be easier to make the scan show everything, and it would be a catastrophe. A code that displayed a person's blood type, diagnoses, and medicines to anyone who pointed a camera at it would be a gift to every thief and blackmailer. The most identifying thing a person owns cannot be the most exposed.",
          "So the stranger is shown a destination and nothing else. The clinical basics travel only to the hospitals and the family, in a minimal form, for a few hours, audited, with the patient notified each time. This is the same break-glass discipline Hospital uses at admission: read-only, time-boxed, audited, patient-notified. An emergency scan does not open the record. It pages for help. The lock never comes off, even at the worst moment, because the worst moment is exactly when the wrong person is most likely to be holding the phone.",
          "The honesty is part of the safety. Everything in the card is what the patient entered themselves, so every screen says, plainly, self-reported, verify on arrival. The routing says directions to the nearest hospital, never this hospital will treat you, because the nearest hospital may be closed or full. And this is not a replacement for 999. It dispatches no ambulance. What it does is make the ambulance the country already has, which is strangers and the phones in their pockets, better aimed and less alone.",
        ],
        pullQuote: "An emergency scan does not open the record. It pages for help.",
      },
      {
        index: "06",
        heading: "Where it stands",
        body: [
          "Built, merged, and deliberately dark. The emergency code, the stranger-scan page, the time-boxed hospital broadcast, and the family ping run in production today, and so does the first trigger: a patient who has bound WhatsApp can text SOS, confirm by sharing location, and fire the same engine. It is inert by design. Nothing happens until a patient opts in, fills the card, and chooses the contacts.",
          "Three things stand between the build and the first life it protects, and none of them are code. The break-glass protocol needs independent clinical, legal, and governance review before any real use. Two emergency WhatsApp templates, one for family and one for hospitals, need carrier approval. And the broadcast only works where hospitals have joined and published their location, which today is almost nowhere. Beyond the WhatsApp trigger, a one-tap SOS button inside Pocket and a proxied call line that connects a helper to the family without exposing a number are specified and sequenced next. Beacon ships last among the patient interfaces, on purpose, because it consumes the wallet, the family circle, and the hospital network the others build. The honest claim is not coverage. It is that a person found by a stranger is no longer found by a stranger with nothing.",
        ],
      },
    ],
    status:
      "Built and merged, intentionally dark. Inert until a patient opts in, and held from launch pending independent review of the break-glass protocol, carrier-approved emergency templates, and hospitals that have joined and published their location.",
    audience: "Patients · Families · Bystanders · Hospitals",
  },
  {
    slug: "identity",
    name: "Identity & Matching",
    codename: "what everything stands on",
    headline: "Bangladesh's healthcare failures are identity failures",
    standfirst:
      "The pharmacy cannot tell a real prescription from a forged one. The diagnostic center prints reports over the names of radiologists who never saw the film. The dying mother arrives at her third facility as a stranger. The regulator admits it cannot say which of its 134,568 registered physicians are genuinely licensed. Examined closely, every failure in this series is the same failure wearing a different uniform. These are not record-keeping failures. They are identity failures, and this layer is what fixes them.",
    image: "/landing/identity.webp",
    imageAlt: "Blank translucent cards catching pale light",
    sections: [
      {
        index: "01",
        heading: "Why not a national database",
        body: [
          "The centralized alternative has already failed publicly. In 2023 a government website leaked the personal data of roughly 50 million citizens, and national ID information subsequently circulated on Telegram. That is not an argument against the state. It is the documented reason a national health record cannot be one more honeypot. The architecture must assume breach and make breach unrewarding: records encrypted to patient-held keys, no central trove whose theft exposes a population's diagnoses.",
          "The law now says what the architecture already assumed. The Personal Data Protection Ordinance 2025 recognizes every citizen as the owner of their personal data, mandates explicit consent, regulates health data with special strictness, and takes key effect around May 2027. Glyph's design is that ordinance rendered in cryptography rather than policy, arriving compliant before the enforcement date.",
        ],
      },
      {
        index: "02",
        heading: "The architecture",
        body: [
          "Every patient, physician, pharmacy, diagnostic center, hospital, factory, and NGO holds a decentralized identifier resolvable over plain HTTPS. No blockchain, no token. Ed25519 signatures, W3C standards throughout. Every clinical fact is a credential signed by its issuer and held in its subject's wallet.",
          "Enrollment meets every Bangladeshi where their documents are, through eight paths: national ID, birth certificate, passport, BMET registration for migrants, embassy attestation, institutional vouching, NGO-mediated enrollment for refugees and stateless people, and an anonymous mode for stigmatized care with no civil anchor at all. Every credential carries its anchor provenance, so a verifier always knows what was actually checked, and no one is excluded from care.",
          "Professional identity strengthens in declared phases: self-issued with provenance first, institution-vouched second, authority-anchored third as BMDC and DGHS join as issuers. No phase pretends to be a later one. The credential says what it is.",
        ],
        pullQuote: "The platform holds no key that unlocks everyone. That is the lesson of the 50-million-record leak, implemented.",
      },
      {
        index: "03",
        heading: "The matching engine",
        body: [
          "Bangladesh never had family physicians, so the system cannot reconnect patients to their doctors. It must create relationships that never existed. On top of identity sits matching: clinical need, geography, language and dialect, gender preference, and price tier, with the strongest signal being continuity itself, the doctor you have seen before. Success is measured in repeat visits to the matched physician, not consultations brokered. Ranking is transparent and paid placement is structurally forbidden.",
        ],
      },
      {
        index: "04",
        heading: "The accountability layer",
        body: [
          "Bangladesh's health ministry already operates a national Grievance Redress System, and a 2025 PLOS Digital Health analysis of 11,604 messages submitted to it tells the familiar story: 67% forwarded to another department, 30% closed, 2.55% resolved. The channel exists. The accountability does not.",
          "In this network a grievance is a credential. It is filed by an identified patient, or through anonymous mode for the complaints people are afraid to sign. It is bound to the encounter it concerns. It is tracked to a resolution that is attested rather than self-reported, and it cannot be quietly forwarded into oblivion. Aggregate resolution rates are visible to funders and regulators through selective disclosure, with no complainant exposed. For donor-funded programs a functioning grievance mechanism is a standing requirement; here it is a property of the record architecture itself.",
        ],
      },
      {
        index: "05",
        heading: "The honest position on decentralization",
        body: [
          "An earlier draft of this vision overclaimed and was corrected, and the correction is now doctrine. Glyph is a single-operator system built on portable open standards, not a decentralized network. The honest claims are exactly three. Portability: every wallet exports in W3C-standard form, and credentials verify with or without KhaM Health's cooperation. No lock-in: a future operator, including the government, can assume the namespace, and signed credentials remain valid. Succession: KhaM Labs' governing documents oblige transfer of keys and infrastructure to a designated successor if the operator fails, in preference order a Bangladeshi public authority, a consortium of participating institutions, or an international digital-public-goods custodian.",
        ],
      },
      {
        index: "06",
        heading: "Where it stands",
        body: [
          "The cryptographic core runs in production today: physician identities, signed visit notes and prescriptions, and pharmacy-counter verification with revocation. The eight enrollment paths, wallet custody modes, selective disclosure, recovery, and break-glass protocols are specified and under build, adapted from identity infrastructure already serving supply-chain credentials in production. This layer is the single critical-path dependency for Pharmacy, Lens results, Hospital, and Bridge.",
        ],
      },
    ],
    status: "Core live in production; enrollment paths and custody modes under build.",
    audience: "Regulators · Standards bodies · Health systems · Funders",
  },
  {
    slug: "kham-med",
    name: "KhaM-Med",
    codename: "the sovereign clinical model",
    headline: "Bangladesh's own clinical AI",
    standfirst:
      "Every intelligent behavior in the Glyph network, the briefing card, the plain-Bangla triage, the draft imaging reads, runs today through foreign frontier models. That is the correct way to start and an impossible way to finish. KhaM-Med is the clinical model Bangladesh will own: built on open weights, trained on consented Bangladeshi encounters, fluent in the languages patients actually speak, running under Bangladeshi law on Bangladeshi infrastructure.",
    image: "/landing/kham-med.webp",
    imageAlt: "A constellation of connected points of light",
    sections: [
      {
        index: "01",
        heading: "Why a sovereign model",
        body: [
          "Four reasons compound. Cost: frontier inference on every consultation cannot support free care for patients at national scale; the mission's economics require near-zero marginal inference for routine traffic. Privacy and law: PDPO 2025 treats health data as a specially protected category with localization requirements, and the honest fix for sensitive voice data is not better scrubbing but not sending the data out at all. Language: frontier models are competent in standard Bangla and unusable in Sylheti, Chittagonian, and Noakhali dialect speech, the languages in which Glyph's actual patients describe their actual symptoms. And dependency: national health infrastructure whose intelligence lives behind another country's terms of service is infrastructure on loan.",
        ],
        pullQuote: "The 4am triage answer for a mother in Mymensingh should not depend on a billing dispute in San Francisco.",
      },
      {
        index: "02",
        heading: "What it is",
        body: [
          "KhaM-Med builds on Google's MedGemma family, open-weights clinical models that can legally run on servers in Dhaka, with published performance among the best open medical models at a fraction of frontier cost. The base knows board-exam medicine in English. KhaM-Med's work is the distance from there to Glyph's floor: Bangla and its dialects, the local prescription culture, local brand-to-generic mappings, the attendant-mediated encounter, local disease patterns, local report formats.",
          "The training corpus is what the network rightfully owns and licenses: consented, de-identified production encounters, every doctor-corrected note, every verified imaging read, alongside licensed and open medical literature. Only the network that owns the encounters can ever have that data, and everything the model learns stays in the country.",
          "Clinical safety gates everything. Drafts for verification, the doctor signs every note, escalation stays conservative, and no task moves to KhaM-Med until it matches the frontier baseline on locally built evaluation sets: real Bangladeshi films from real machines, real dialect transcripts, real chamber notes.",
        ],
      },
      {
        index: "03",
        heading: "The staged path",
        body: [
          "The path is staged honestly. Today frontier models carry the complex reasoning while every consented encounter builds the corpus. Next, fine-tuned models take the structured tasks and, most importantly, the sensitive flows move to in-country processing, the milestone the privacy constraints are waiting on. The target state routes the large majority of routine inference through KhaM-Med in Bangladesh, with frontier models retained for the rare and the complex. The name carries the family: KhaM is the initials of Khayer and Mamataj, and the model exists so that what twenty crore people teach it stays theirs.",
        ],
      },
    ],
    status: "Foundation laid: routing, prompts, and consent pipeline in production; the corpus accumulates with every Chamber encounter.",
    audience: "Health systems · Policy makers · Research partners",
  },
];

export function getProduct(slug: string): ProductContent | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}
