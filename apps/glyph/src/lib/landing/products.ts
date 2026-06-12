/**
 * @fileoverview Editorial content for the product landing pages
 * (khamhealth.com/<slug>). Written for policy, government, and donor
 * readers — long-form narration, Bangladesh-grounded, honest about
 * status. Figures are drawn from KhaM Health's vision documentation
 * (glyph-vision-v3.1) — verify before citing in formal submissions.
 *
 * The company page (/) deliberately carries NO status labels; status
 * lives here, in prose, where there is room for honesty.
 */

export interface ProductSection {
  /** Mono index shown above the heading, e.g. "01" */
  index: string;
  heading: string;
  /** Paragraphs — rendered as editorial body text */
  body: string[];
  /** Optional pull-quote rendered large between paragraphs */
  pullQuote?: string;
}

export interface ProductContent {
  slug: string;
  /** Short name used on cards and in navigation */
  name: string;
  /** Internal module name from the vision doc, shown as a small annotation */
  codename: string;
  /** Editorial H1 — sentence case */
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
    slug: "network",
    name: "Clinical Identity Network",
    codename: "the spine",
    headline: "A country's clinical memory, rebuilt as infrastructure",
    standfirst:
      "Bangladesh has roughly 115,000 registered doctors for 170 million people, and no thread connecting a patient's clinical events across time, place, and institution. The Clinical Identity Network is that thread: a permanent identifier for every patient and provider, and a cryptographic signature on every clinical event.",
    image: "/landing/network.webp",
    imageAlt: "Layered translucent records catching pale light",
    sections: [
      {
        index: "01",
        heading: "The missing layer",
        body: [
          "The same patient exists separately across every encounter — known to each provider for one visit, known to no one continuously. Her history sits in a plastic bag of paper prescriptions, an unread lab report, a foreign medical file, and the memory of whichever relative came along. This is not a record-keeping failure by individual clinicians. It is the absence of clinical infrastructure: no persistent identity, no verifiable record, no continuity.",
          "Telemedicine platforms, hospital management systems, and health apps have all been tried. Each builds its own silo, because the layer they all presuppose — identity — has never existed here.",
        ],
        pullQuote:
          "The missing piece is not more record-keeping. It is identity.",
      },
      {
        index: "02",
        heading: "What the network is",
        body: [
          "Every patient, doctor, clinic, diagnostic centre, pharmacy, hospital, and factory medical room receives a permanent did:web identifier — an address on the open web, owned by the entity it names, portable across provider relationships and borders.",
          "Attached to that identity are cryptographically signed Verifiable Credentials. A physician's registration is signed by the medical council. A lab result is signed by the laboratory. A prescription is signed by the prescribing physician; its dispensing, by the pharmacy. An antenatal visit is signed by the attending clinician. Each issuer signs only what it is authoritative for — and a tampered record simply fails verification.",
          "Producing a medical history stops being a database query against a silo someone else owns. It becomes a graph walk over credentials the patient already holds.",
        ],
      },
      {
        index: "03",
        heading: "Identity for everyone, not just the documented",
        body: [
          "A national ID holder is the simple case. The network is designed for the hard ones: the grandmother who never received an NID, the construction worker eight years in Riyadh, the garment worker whose only formal document is a factory card, the newborn with nothing at all. Multiple identity anchors — NID, passport, BMET registration, embassy attestation, birth certificate — can each anchor the same persistent clinical identity.",
        ],
      },
      {
        index: "04",
        heading: "The policy context",
        body: [
          "The Personal Data Protection Ordinance 2025 places health data in its most protected category, with enforcement expected from 2027. The network is built for that regime rather than against it: consent is recorded before any processing, identifiable data passes a fail-closed gate before any computation, and every disclosure lands in an append-only audit log.",
          "The issuer model maps onto existing authority: BMDC for physicians, DGHS and DGDA where their mandates apply, BMET for migrant workers, laboratories and hospitals for their own results. The network does not ask any institution to surrender authority — it makes each institution's authority portable and verifiable.",
        ],
      },
      {
        index: "05",
        heading: "Where it stands",
        body: [
          "The cryptographic core is real and running: physician identities, signed visit notes, and signed prescriptions are live in production, and a pharmacy counter can verify or catch a revoked prescription today. Interoperability with the wider W3C Verifiable Credentials ecosystem is on the roadmap; the schemas are designed for it.",
        ],
      },
    ],
    status:
      "Core network live in production; pilot operating in Dhaka.",
    audience: "Regulators · Health systems · Standards bodies",
  },
  {
    slug: "glyph",
    name: "Glyph",
    codename: "the chamber copilot",
    headline: "A copilot for the seven-minute consultation",
    standfirst:
      "A Bangladeshi doctor sees fifty to a hundred patients a day, about seven minutes each. Glyph gives those minutes back to the patient: it takes the history in Bangla before the patient walks in, briefs the doctor on what matters, researches while they talk, and writes the note in the format Bangladeshi medicine actually uses.",
    image: "/landing/glyph.webp",
    imageAlt: "A doctor listening to a patient in a softly lit chamber",
    sections: [
      {
        index: "01",
        heading: "The seven minutes",
        body: [
          "With one doctor for roughly every 1,400 people, volume is not a choice — it is the condition of practice. History-taking, the part of medicine that needs unhurried listening, is the first casualty. Patients rarely come alone: a family attendant speaks for them, over them, and sometimes instead of them. The doctor reconstructs a clinical story from fragments, under time pressure, dozens of times a day.",
        ],
      },
      {
        index: "02",
        heading: "Before the patient walks in",
        body: [
          "On the clinic's tablet, Glyph takes the patient's history in spoken Bangla — and it understands the attendant reality. Every fact is tagged with who said it: the patient, the attendant translating, the attendant observing. The family's plastic bag of old prescriptions and lab reports is photographed and read, handwriting and ১+০+১ dosing included.",
          "By the time the patient sits down, the doctor has a one-glance briefing: the story, the medications, the relevant history — and the red flags on top.",
        ],
        pullQuote: "Every fact knows who said it.",
      },
      {
        index: "03",
        heading: "In the chamber, and after",
        body: [
          "During the consultation, Glyph listens ambiently — with recorded consent — and answers the doctor's clinical questions with cited evidence drawn from the medical literature, in seconds rather than after the clinic closes.",
          "Afterwards it drafts the note the way Bangladeshi doctors write: CC, O/E, Ix, Rx, Advice — not an imported format. The doctor reviews, edits, and approves; approval produces a digitally signed prescription. Two or three days later, the patient receives a plain-Bangla summary on WhatsApp: which medicine, when, and which symptoms mean come back now.",
        ],
      },
      {
        index: "04",
        heading: "Drawn lines",
        body: [
          "Glyph never diagnoses and never prescribes; the clinical decision belongs to the clinician. Nothing identifiable leaves the clinic — names and numbers are stripped at a fail-closed gate before any AI processing, every disclosure is logged immutably, and consent can be withdrawn at any moment with immediate effect. Only BMDC-registered physicians can hold accounts.",
        ],
      },
      {
        index: "05",
        heading: "Where it stands",
        body: [
          "Glyph is live, operating in pilot chambers in Dhaka — the complete loop, from Bangla voice intake to the signed prescription to the WhatsApp follow-up.",
        ],
      },
    ],
    status: "Live in pilot — Dhaka chambers onboarding via waitlist.",
    audience: "Doctors · Chambers · Clinics",
  },
  {
    slug: "prescription",
    name: "Prescription",
    codename: "the Rx network",
    headline: "A prescription that can prove itself",
    standfirst:
      "In Bangladesh an antibiotic is routinely dispensed without a valid prescription, and antimicrobial resistance is already killing at scale. A paper script cannot be verified, cannot be revoked, and cannot say who wrote it. A signed one can.",
    image: "/landing/prescription.webp",
    imageAlt: "A pharmacist's hands at a counter",
    sections: [
      {
        index: "01",
        heading: "Paper cannot protect anyone",
        body: [
          "The prescription is the control point of safe medicine — and in practice it controls nothing. Illegible scripts are guessed at. Expired ones are reused. Forged ones are indistinguishable from real ones. The pharmacy counter, where dispensing decisions are actually made, has no way to check any of it.",
          "Antimicrobial resistance is the visible cost: when antibiotics flow without verifiable authorization, stewardship is unenforceable no matter what the guidelines say.",
        ],
      },
      {
        index: "02",
        heading: "What changes when a prescription is signed",
        body: [
          "Every prescription approved through the network carries the prescribing physician's cryptographic signature. At any pharmacy, a counter clerk looks the patient up by phone number and sees the prescription verified in seconds: who wrote it, when, for whom — and whether it has been revoked. Dispensing itself becomes a signed event, so the loop closes: prescribed, verified, dispensed, on the record.",
          "A doctor who stops a medication revokes its prescription, and the revocation reaches every counter instantly. No paper can do that.",
        ],
        pullQuote: "Prescribed, verified, dispensed — on the record.",
      },
      {
        index: "03",
        heading: "The policy context",
        body: [
          "Verifiable prescriptions make pharmaceutical scheduling enforceable in practice rather than on paper, and give antimicrobial stewardship a mechanism instead of a slogan. The dispensing record creates, for the first time, a population-level view of what is actually being consumed — the evidence base AMR policy currently lacks.",
        ],
      },
      {
        index: "04",
        heading: "Where it stands",
        body: [
          "Live in production: prescriptions issued through Glyph are signed at approval, and the pharmacy verification loop — including revocation reaching the counter — is operating in pilot.",
        ],
      },
    ],
    status: "Live — signed issuance and pharmacy verification in pilot.",
    audience: "Pharmacies · Doctors · Drug regulators",
  },
  {
    slug: "lab",
    name: "Lab",
    codename: "Lens",
    headline: "Results that arrive signed, and never get lost",
    standfirst:
      "Diagnostic results in Bangladesh travel as paper, in a dozen formats, and vanish into the same plastic bag as everything else. Tests get repeated because results get lost — in a country where three-quarters of health spending comes out of the patient's own pocket.",
    image: "/landing/lab.webp",
    imageAlt: "A laboratory technician holding a test tube to the light",
    sections: [
      {
        index: "01",
        heading: "The diagnostic gap",
        body: [
          "A CBC from one diagnostic centre, an X-ray report from another, an HbA1c from a third — each in its own layout, each interpreted once and filed nowhere. The ordering doctor may never see the result; the next doctor certainly will not. Repeat testing is the default, and the patient pays for it each time, out of pocket.",
        ],
      },
      {
        index: "02",
        heading: "What Lab is",
        body: [
          "Lab gives diagnostic centres a simple loop: structured orders in, signed results out. A result issued through the network is signed by the laboratory itself, attaches permanently to the patient's identity, and is readable by any authorized clinician the patient ever sees — this year or in ten years.",
          "AI co-interpretation flags abnormalities and trends for the reporting clinician, and remote specialist verification extends scarce radiology and pathology expertise to centres that have equipment but not specialists.",
        ],
      },
      {
        index: "03",
        heading: "Where it stands",
        body: [
          "In design. The groundwork is already live: Glyph reads existing paper lab reports from photographs today, and the result schemas the network uses are built to receive signed laboratory data the day a diagnostic centre connects.",
        ],
      },
    ],
    status: "In design — schemas live, partner conversations open.",
    audience: "Diagnostic centres · Radiologists · Pathologists",
  },
  {
    slug: "mother",
    name: "Mother",
    codename: "Maa",
    headline: "Care that follows the calendar, not the emergency",
    standfirst:
      "Bangladesh has cut maternal mortality dramatically in two decades — and it still stands at roughly 156 deaths per 100,000 live births, many times Western Europe's. The difference is rarely exotic medicine. It is consistent, scheduled, boring antenatal care that never happens.",
    image: "/landing/mother.webp",
    imageAlt: "A health worker checking a pregnant woman's blood pressure at home",
    sections: [
      {
        index: "01",
        heading: "An emergency-driven system, a schedule-driven need",
        body: [
          "Pregnancy is the one clinical condition with a known timetable: specific checks, at specific weeks, with specific warning signs. Bangladesh's roughly 3.5 million pregnancies a year meet a system that responds to emergencies but does not run calendars. Antenatal visits happen inconsistently or not at all; a dangerous blood pressure is discovered in week 36 instead of week 28; the skilled birth attendant is arranged after labour begins.",
        ],
      },
      {
        index: "02",
        heading: "What Mother is",
        body: [
          "A gestational timeline that runs itself: scheduled antenatal checks, home blood-pressure monitoring by a community health worker, escalation the moment readings cross a line, skilled-birth-attendant coordination before the due date, and postpartum follow-up after it.",
          "Every visit becomes a signed credential in the mother's record — and the newborn's first credential is its birth registration, an identity from day one for a child who would otherwise begin life undocumented.",
        ],
        pullQuote: "The newborn's first credential is its birth.",
      },
      {
        index: "03",
        heading: "For funders",
        body: [
          "Mother is designed to be free to women, funded by maternal-health donors rather than by the families least able to pay. Because every encounter is a verifiable record, funders see exactly what their money produced — visits that demonstrably happened, blood pressures that were demonstrably taken — rather than self-reported aggregates.",
        ],
      },
      {
        index: "04",
        heading: "Where it stands",
        body: [
          "In design, scheduled for the network's second year. The identity and credential layer it builds on is live today.",
        ],
      },
    ],
    status: "In design — seeking maternal-health funding partners.",
    audience: "Mothers · OB-GYNs · CHWs · Maternal-health donors",
  },
  {
    slug: "factory",
    name: "Factory",
    codename: "the dispensary",
    headline: "The dispensary the law already requires",
    standfirst:
      "Bangladesh's Labour Act requires factories with 500 workers to maintain a dispensary with a doctor and nurse. Compliance is largely on paper. The roughly four million garment workers — most of them young women — have a legal right to workplace healthcare that mostly does not exist.",
    image: "/landing/factory.webp",
    imageAlt: "A garment worker, dignified, with the sewing floor behind her",
    sections: [
      {
        index: "01",
        heading: "A right that exists on paper",
        body: [
          "The legal architecture is already there: the Labour Act 2006 mandates medical facilities scaled to workforce size. What is missing is the delivery mechanism — and the verification. A factory can show an auditor a room and a logbook; nobody can show that care actually happened, for real workers, with real outcomes. A workforce that is majority female has reproductive-health needs that an audit-day dispensary will never meet.",
        ],
      },
      {
        index: "02",
        heading: "What Factory is",
        body: [
          "A working dispensary, run on the network: a trained worker health assistant takes vitals on the floor; a matched Bangladeshi physician consults remotely within the worker's shift; prescriptions are signed and verifiable; every encounter becomes a credential in the worker's own record — which follows her when she changes factories, because it belongs to her, not to the employer.",
          "For the factory and its buyers, the same credentials produce something audits never had: compliance documentation that is cryptographically verifiable rather than performative. Care that demonstrably happened, signed by the clinicians who delivered it.",
        ],
        pullQuote:
          "Compliance you can verify, because care actually happened.",
      },
      {
        index: "03",
        heading: "Where it stands",
        body: [
          "In design. The clinical loop it reuses — remote consultation, signed prescriptions, verifiable encounters — is live in the network today; the factory-specific layer (worker health assistants, shift-compatible scheduling, buyer-facing compliance reporting) is being specified with industry input.",
        ],
      },
    ],
    status: "In design — in conversation with manufacturers and buyers.",
    audience: "Garment workers · Manufacturers · Brands · Compliance auditors",
  },
  {
    slug: "migrant",
    name: "Migrant",
    codename: "Continuity",
    headline: "Thirteen million patients the system lost",
    standfirst:
      "Around thirteen million Bangladeshis work abroad. The typical migrant worker has not seen a Bangladeshi doctor since the day he left — he cannot afford care where he works, and cannot take a scheduled video call from a labour camp. His health simply waits for his return.",
    image: "/landing/migrant.webp",
    imageAlt: "A migrant worker holding a phone, distant city blurred behind",
    sections: [
      {
        index: "01",
        heading: "Continuity that ends at the airport",
        body: [
          "The state registers every legal migrant worker through BMET before departure — and then the connection ends. The Overseas Employment and Migrants' Act 2013 creates the registration but no continuity-of-care mechanism while abroad, and no structured handover when the worker returns with eight years of untreated hypertension and a folder of foreign-language medical papers no one in Dhaka can use.",
        ],
      },
      {
        index: "02",
        heading: "What Migrant is",
        body: [
          "Asynchronous clinical assessment built around the worker's actual life: symptoms spoken in Bangla into a phone, whenever the shift allows; vitals captured locally where partners exist; a matched Bangladeshi physician who reviews and responds across the time difference; a structured, signed clinical record that accumulates instead of evaporating.",
          "It is deliberately an assessment-and-triage service with structured handover — not a cross-border prescribing operation. When the worker lands in Dhaka, his doctor starts from his record, not from zero.",
        ],
        pullQuote: "His doctor starts from his record, not from zero.",
      },
      {
        index: "03",
        heading: "The policy context",
        body: [
          "BMET registration is the natural identity anchor: the worker departs with his clinical identity already provisioned, and BMET becomes an issuer in the network at the moment it already meets every legal migrant. Families remit; a remittance-linked co-pay keeps the service affordable without donor dependence.",
        ],
      },
      {
        index: "04",
        heading: "Where it stands",
        body: [
          "In design, as a first-year priority of the network roadmap — the population is too large, and too completely abandoned, to wait.",
        ],
      },
    ],
    status: "In design — Year-1 roadmap priority.",
    audience: "Migrant workers · Families · BMET · Embassies",
  },
  {
    slug: "connect",
    name: "Connect",
    codename: "Bridge",
    headline: "A second opinion that travels as evidence",
    standfirst:
      "Every year Bangladeshi patients carry photocopied files to specialists in Chennai, Bangkok, and Singapore — and bring opinions home as PDFs nobody can verify or build on. The expertise crosses borders; the clinical record never really does.",
    image: "/landing/connect.webp",
    imageAlt: "A senior physician in a video consultation",
    sections: [
      {
        index: "01",
        heading: "Medicine by photocopy",
        body: [
          "The cross-border patient journey runs on paper bags and trust: films are re-shot because the originals are at home, histories are reconstructed from memory in a second language, and the returning opinion — often excellent — arrives as an unverifiable document that the next doctor must take on faith or ignore.",
        ],
      },
      {
        index: "02",
        heading: "What Connect is",
        body: [
          "A patient's verified credential bundle — the signed history, results, and imaging reports the network already holds — shared with a cross-border specialist under the patient's consent. The consultation happens with translation support; the specialist's opinion returns as a signed credential that joins the patient's record with the same standing as any domestic record.",
          "The receiving hospital gets a history it can actually trust; the patient gets an opinion that remains usable for every doctor after.",
        ],
      },
      {
        index: "03",
        heading: "Where it stands",
        body: [
          "Reserved on the roadmap. The credential bundle it depends on is accumulating in the network today; Connect switches on when the records exist to send.",
        ],
      },
    ],
    status: "Roadmap — depends on network adoption.",
    audience: "Patients · Specialist hospitals · Insurers",
  },
];

export function getProduct(slug: string): ProductContent | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}
