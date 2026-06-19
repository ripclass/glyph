/**
 * @fileoverview Content for khamhealth.com/writing — the company's
 * thought-leadership hub. Modeled on the founder's sister product
 * RulHub (rulhub.com/writing): one thesis up front, then two tiers
 * (white papers and numbered essays), each a title and a declarative
 * one-line tagline.
 *
 * The first paper, "Anatomy of a Plastic Bag", and its nine essays are
 * about the clinical identity layer beneath Glyph. The identity
 * architecture is deliberately open (it is the trust pitch, not the
 * moat). MOAT DISCIPLINE: never frame the consented-encounter corpus
 * behind KhaM-Med as a proprietary/defensible asset, and keep the
 * go-to-market sequence and issuer-acquisition tactics out. The moat
 * is the data that accrues from the network running, and the issuer
 * incumbency. Neither belongs in public writing.
 *
 * Voice rules (founder, 2026-06-12): no em dashes, no AI cadence.
 * Short declarative sentences. Specific numbers. Status in prose.
 *
 * Brand architecture: KhaM Labs is the house. KhaM Health operates the
 * infrastructure. Glyph is what a doctor or patient touches. KhaM-Med
 * is the clinical model underneath.
 */

export interface WritingSection {
  /** Mono index shown above the heading, e.g. "01". Omit for flowing prose. */
  index?: string;
  /** Section heading. Omit (essays) to render body as continuous prose. */
  heading?: string;
  body: string[];
  /** Optional fenced code/JSON block rendered monospace after the body. */
  code?: string;
  pullQuote?: string;
}

export interface WritingPiece {
  slug: string;
  /** "paper" = foundational long-form; "essay" = one sharp idea */
  kind: "paper" | "essay";
  /** Sequential number for essays, e.g. "01". Papers omit it. */
  number?: string;
  /** Title, sentence case */
  title: string;
  /** Declarative one-line tagline. The idea, not the topic. */
  tagline: string;
  /** Estimated read time in minutes. Shown only when published. */
  readMinutes?: number;
  /** Publication date label. Shown only when published. */
  date?: string;
  /** Until true, the piece is listed but not linked or rendered. */
  published: boolean;
  /** Magazine-style lede, present only when published. */
  standfirst?: string;
  /** Body sections, present only when published. */
  sections?: WritingSection[];
}

/** The single argument every piece on the page serves. */
export const WRITING_THESIS =
  "Essays on what health software owes the people it serves. One argument runs through all of them. A patient's record should belong to the patient, travel with the patient, and be verifiable by anyone. The model should sharpen the clinician's judgment, never replace it, and never leave the country.";

const PLASTIC_BAG_PRESCRIPTION_JSON = `{
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  "type": ["VerifiableCredential", "PrescriptionCredential"],
  "issuer": "did:web:khamhealth.com:doctor:bmdc-A-54219",
  "credentialSubject": {
    "id": "did:web:khamhealth.com:patient:01HQXR7E9N",
    "diagnosis": "Hypertension; Type-2 Diabetes Mellitus",
    "medications": [
      { "generic": "Amlodipine", "dose": "5mg", "frequency": "1+0+0", "days": 30 }
    ]
  },
  "issuanceDate": "2026-04-22T15:47:00+06:00",
  "proof": {
    "type": "Ed25519Signature2020",
    "verificationMethod": "did:web:khamhealth.com:doctor:bmdc-A-54219#key-1"
  }
}`;

export const WRITING_PIECES: WritingPiece[] = [
  /* ── White paper ────────────────────────────────────────────── */
  {
    slug: "anatomy-of-a-plastic-bag",
    kind: "paper",
    title: "Anatomy of a plastic bag",
    tagline:
      "The records are not missing. They are in the bag. What is missing is identity, the thread that would make one patient one person for a lifetime.",
    readMinutes: 12,
    date: "June 2026",
    published: true,
    standfirst:
      "A white paper on the clinical identity layer beneath Glyph. Bangladesh's healthcare failures are not failures of record-keeping. They are failures of identity, and this is the work of building the thread that fixes them.",
    sections: [
      {
        index: "01",
        heading: "The object every patient carries",
        body: [
          "Every patient in Bangladesh carries the same thing. A plastic bag, knotted at the top. Inside it: prescriptions on different pads in different hands, lab reports from three diagnostic centers, a discharge summary from a hospital admission two years ago, an X-ray in an envelope too big for the bag. The patient has waited two hours for the visit. The doctor has, on average, forty-eight seconds. He cannot read the bag in forty-eight seconds, so he writes anyway, on what the patient can tell him and what he can guess.",
          "For ten years the country has tried to fix this by digitizing the bag. Scan the papers. Build an app. Give the patient a portal. Every health-IT project has been a version of this, and every one has produced a database a few thousand people log into and the rest forget. The bag outlives all of them.",
          "The bag is not the problem. The bag is the symptom. This paper is about the disease.",
        ],
      },
      {
        index: "02",
        heading: "What is actually broken",
        body: [
          "The problem is that the patient in the bag is a different person at every visit. Known to the Mirpur doctor for one encounter. Known to the Chittagong doctor for one encounter. Known to the pharmacy for the length of one sale. Nothing connects these encounters into one continuous person, verifiable by the next provider, owned by the patient.",
          "The information is not missing. It is in the bag. What is missing is identity: a persistent, verifiable thread that says this is the same person, here is what is true about them, signed by the people who would know.",
          "Once you see that, the failures of Bangladeshi healthcare stop looking like separate problems and start looking like one problem in different clothes.",
          "The antibiotic sold without a prescription, somewhere between half of all courses and ninety-two percent of dispensers depending on which study you read. That looks like a pharmacy problem. Underneath it is identity. The counter cannot verify that a real, registered doctor authorized this drug for this person, so a customer with cash and a patient with a prescription look exactly alike.",
          "The migrant worker invisible to every doctor at home for eight years, one of fifteen million who send back twenty-four billion dollars a year. That looks like a distance problem. Underneath it is identity. His history does not travel, because it was never tied to a portable identifier, so the man who comes home is a stranger to the system he funded.",
          "The mother who reached a clinic and died anyway. Preeclampsia is back to a quarter of all maternal deaths, most of them rural, most of them women who sought care and were met as strangers at every door they reached. That looks like a treatment problem. Underneath it is identity. She arrived with no thread a provider could read in the one minute that decided whether she lived.",
          "The forged certificate. The lab report no one can trace to a lab. The patient handed four prescriptions by four doctors who each saw a fragment of the bag. The medical council that admitted, in 2024, that it cannot tell a licensed doctor from a forged one, with thirty-six thousand registrations unrenewed and an unknown number fake.",
          "Different surfaces, one thing broken underneath all of them. There is no persistent, verifiable identity connecting a person to the claims made about them. So every encounter starts at zero, every claim is unverifiable, and every history is a bag.",
        ],
      },
      {
        index: "03",
        heading: "What a record is, when it is built right",
        body: [
          "A record, in most systems, is a row. A prescription is a row in a prescriptions table. The row belongs to the institution that wrote it, lives in that institution's database, and dies at the door, because the next institution cannot reach it and would not trust it if it could.",
          "A record built right is not a row. It is a credential: a signed, verifiable claim, bound to a person, issued by whoever had the authority to make it.",
          "Here is the shape, from one ordinary visit. A prescription, after the doctor approves the note:",
        ],
        code: PLASTIC_BAG_PRESCRIPTION_JSON,
      },
      {
        body: [
          "The claim sits in one place. Who made it sits in another. The proof that no one altered it sits in a third. The patient's identifier resolves over ordinary HTTPS to a document holding their public key. The doctor's resolves to his. A pharmacy in Khulna can check the signature against the doctor's published key without a KhaM Health account, without asking permission, without trusting KhaM Health at all. It needs the key, and the key is public.",
          "Do this once and you have a verifiable prescription. Do it for every clinical event a person collects, each signed by whoever was authoritative for it, and something changes in kind. The row becomes a claim. The pile becomes a person. The bag becomes a wallet that proves itself.",
          "And the claims start to talk to each other. A doctor about to prescribe can walk the patient's full set of active credentials and see the beta-blocker another doctor started three months ago before he adds a second one. A pharmacy can see the antibiotic course dispensed last week before it hands over another. The value is not one record. It is the graph the records form once they share an identity, and the safety that graph makes possible. A pile of paper cannot be walked. A set of signed claims can.",
          "The cryptography under all of this is deliberately dull. Ed25519 is the signature in SSH, in Signal, in the lock icon on every bank login in the country. did:web resolves over the same web as everything else. No blockchain. No token. No seed phrase for a grandmother to lose. National health infrastructure should be the most boring thing in the room.",
        ],
      },
      {
        index: "04",
        heading: "Who the patient is",
        body: [
          "Before a person can hold a credential, the system has to know who they are. In Bangladesh this is harder than it sounds, and a single national ID number is not the answer, because the people who need this most are the people a national ID serves worst.",
          "So identity here is anchored from many directions, not one. A national ID where it exists. A passport. A pre-departure registration for the worker going abroad. An embassy attestation for the man whose papers are in a drawer in a labor camp. A birth certificate for the newborn who has no other document yet. A person's identity is built from whichever anchors they have, checked against each other, and strengthened as more arrive. A worker who starts with a passport and a pre-departure record can add a national ID later, and the thread does not break while he waits.",
          "For some people the safest anchor is none at all. A woman hiding a pregnancy from a factory that fires pregnant women. A patient with a stigmatized diagnosis. A refugee for whom a government-linked record is a danger, not a convenience. For them the network supports an anonymous mode, reached through a trusted intermediary, where the care is real and the identity points nowhere. The same machinery that proves a doctor's registration to a pharmacy can prove just enough about a patient to treat them and nothing more. An identity layer that cannot serve the person with the most to lose is not infrastructure. It is a club for the people who were already safe.",
        ],
      },
      {
        index: "05",
        heading: "The keys belong to the patient",
        body: [
          "There is a line in this design that decides everything above it. The keys belong to the patient.",
          "The record is not the doctor's, not the factory's, not the ministry's, not KhaM Health's. It is the patient's, held in a wallet on a cheap phone, and nothing in it is readable by anyone the patient has not allowed. This is enforced by cryptography, not by a promise in a privacy policy. A shielded consultation is invisible to a factory-owned device because the factory does not hold the key, not because an app agreed to hide it.",
          "Patient-held keys are what let one system serve two opposite people. The mother who wants her husband to get every reminder, and the mother who must not let him get any. The worker whose family watches over his blood pressure from four thousand kilometers, and the worker whose health status, in the wrong hands, is a reason to cancel his permit and put him on a plane. A database decides who sees. A wallet lets the patient decide, and lets them take the decision back. For these people that difference is measured in firings, in deportations, in safety.",
        ],
        pullQuote: "A database decides who sees. A wallet lets the patient decide.",
      },
      {
        index: "06",
        heading: "Why one layer serves every case",
        body: [
          "One identity layer can serve a chamber doctor, a migrant worker, a pregnant woman, a pharmacist, and a patient who must stay anonymous, because of a single move. Each authoritative entity signs the thing it alone is authoritative for. It signs once, and the signature travels everywhere the patient goes.",
          "The medical council signs a doctor's registration once. That credential is now verifiable inside every prescription he writes, every pharmacy that checks his authority, every consultation across a border. The council does not adopt a platform. It becomes an issuer, and its stamp becomes portable across the whole system. A portable stamp is worth more than a stamp locked in one registry, and that is the only argument an institution actually answers.",
          "A diagnostic center signs a result once, and the result carries its origin for the rest of the patient's life, so a result from a known chain weighs differently from one off a roadside shop, and the signature carries the difference. A pharmacy signs a dispensing event once, and the patient cannot come back next month for the same antibiotic without a fresh signed prescription. The pre-departure office signs a worker's registration once, and the worker carries a verifiable clinical identity into the Gulf and home again, across the border that used to erase him.",
          "The stamps reinforce each other. Each authoritative signature makes the next check cheaper and the whole network more trustworthy. Trust here belongs to the issuers, not to KhaM Health, spread across the institutions that were already authoritative in the physical world. No one organization owns it.",
        ],
      },
      {
        index: "07",
        heading: "Where the application stops and the identity begins",
        body: [
          "None of this is the product a doctor sees. The product a doctor sees is an application: a chamber workflow, a diagnostic center's upload screen, a pharmacist's verification check, a patient's wallet on a cheap Android phone. There will be many of these, and KhaM Health builds the first ones. But the applications sit on top of the identity layer. They do not own it. That line is the whole architecture.",
          "The identity layer is public-good infrastructure: the persistent identifier for every patient, doctor, clinic, lab, and pharmacy, and the credentials the issuers sign onto it. The application layer is where anyone, including KhaM Health, competes on being good. A future government application could be built on the same identifiers without depending on KhaM Health at all. A competing clinical product in five years could read the same wallet, because the patient owns the wallet and the standards are open. KhaM Health wins by building the best application, not by trapping the record.",
          "This is what lets the eventual conversation with the state be one it can say yes to. Not trust this private company with the nation's health data. Instead: the identity layer already runs on open W3C standards, already serves these patients and these doctors, the authorities already issue their own credentials onto it, and the state can formalize that without locking the country to anyone.",
        ],
      },
      {
        index: "08",
        heading: "Single operator, said plainly",
        body: [
          "One claim has to be made carefully, because the easy version of it is a lie.",
          "This is not a decentralized, trustless network. did:web resolves over a domain one operator maintains. If that operator disappears, the identifiers stop resolving. Anyone who says otherwise is selling the blockchain version of this, which the country does not need and a grandmother cannot use.",
          "What is true is smaller and stronger. The network is single-operator, on open standards. The wallet exports. The credentials are W3C standard. The signatures verify against published keys with no dependence on KhaM Health staying alive or staying good. The honest claim is portability, not trustlessness, with a succession obligation written into the structure so the operator's mortality is not the network's. One person holds the registry today. The standards are built so one person does not have to hold it forever.",
          "That is a smaller promise than decentralization, and it survives an audit. That is the only kind worth making for a thing a country's health depends on.",
        ],
        pullQuote:
          "The honest claim is portability, not trustlessness. That is a smaller promise. It survives an audit.",
      },
      {
        index: "09",
        heading: "What this is",
        body: [
          "It is the identity layer: the persistent, verifiable thread beneath every clinical claim, that turns a bag of unverifiable paper into a person who is the same person everywhere, carrying credentials that verify themselves against the institutions that signed them. Owned by the patient. Portable by standard. Traceable to the issuer. Honest about the one operator who holds the registry.",
          "Bangladesh's healthcare failures were never failures of record-keeping. The records exist. They are in the bag. The failures were failures of identity, of the missing thread that would have made one patient one person across a lifetime. This is the work of building that thread, so a doctor can trust what he reads, a pharmacy can verify what it dispenses, a mother is not a stranger when she arrives, and a worker is not erased at the border.",
          "The bag was never the problem. The bag was the symptom.",
        ],
      },
    ],
  },
  {
    slug: "sovereign-by-necessity",
    kind: "paper",
    title: "Sovereign by necessity",
    tagline:
      "Every intelligent moment in Glyph runs today on a foreign frontier model. That is the right way to start, and an impossible way to finish.",
    readMinutes: 10,
    date: "June 2026",
    published: true,
    standfirst:
      "A white paper on KhaM-Med and the case for a clinical model that runs on Bangladeshi terms: its languages, its law, its soil. Why the intelligence behind a country's health system cannot stay on loan, and the staged, honest path off it.",
    sections: [
      {
        index: "01",
        heading: "Where the intelligence lives today",
        body: [
          "Every intelligent moment in the Glyph network runs today on a foreign frontier model. The briefing card the doctor reads before the patient walks in. The plain-Bangla triage that tells a shopkeeper whether his chest pain is a pharmacy problem or an emergency. The draft read of a chest film at a district diagnostic center. All of it, today, is a call to a model trained and hosted in another country.",
          "That is the correct way to start. Building a national clinical model before you know which tasks matter, on which inputs, at what accuracy, is how you spend three years training the wrong thing. The frontier models are good, they are available now, and they let the network learn what it actually needs before it commits to building its own.",
          "It is also an impossible way to finish. National health infrastructure whose intelligence lives behind another company's terms of service is infrastructure on loan. The terms can change. The price can change. The access can be revoked over a policy dispute the country was never party to. The 4am triage answer for a mother in Mymensingh should not depend on a billing argument in San Francisco.",
        ],
        pullQuote:
          "The 4am triage answer for a mother in Mymensingh should not depend on a billing argument in San Francisco.",
      },
      {
        index: "02",
        heading: "Four reasons it cannot stay there",
        body: [
          "Four reasons compound, and each on its own would be enough.",
          "Cost. Frontier inference on every consultation cannot support free care for patients at national scale. The mission depends on routine traffic costing almost nothing to serve, and a per-call fee to a foreign provider, however small, stops being almost nothing once it is multiplied by a country.",
          "Law. The Personal Data Protection Ordinance of 2025 treats health data as a specially protected category and points toward keeping it in the country. The honest fix for sensitive voice data, a patient describing her symptoms in her own words, is not better redaction before it is shipped abroad. It is not shipping it abroad.",
          "Language. Frontier models are competent in standard written Bangla and effectively unusable in the speech that matters: Sylheti, Chittagonian, Noakhali, the dialects in which Glyph's actual patients describe their actual symptoms. A model built for an English-speaking clinician in a Western clinic does not become a model for a sixty-eight-year-old in Mymensingh, and no amount of prompting closes that gap.",
          "Dependency. The first three are practical. The last is structural. A health system is not a thing a country should rent, and the intelligence inside it is the part most worth owning, because it is the part that decides what the system can do and who it can do it for.",
        ],
      },
      {
        index: "03",
        heading: "What KhaM-Med is",
        body: [
          "KhaM-Med is the clinical model the network is building so the intelligence can come home. It builds on open-weights clinical models, the MedGemma family, that can legally run on servers in Dhaka, with published performance among the best open medical models at a fraction of frontier cost.",
          "The base already knows board-exam medicine in English. The work is the distance from there to the floor Glyph actually stands on: Bangla and its dialects, the local prescription culture and its 1+0+1 dosing, the brand-to-generic mapping a Bangladeshi doctor carries in his head, the attendant-mediated encounter where a son answers for his mother, the local disease patterns, the report formats of the local diagnostic chains.",
          "It learns this from consented, de-identified encounters and from licensed and open medical literature, and everything it learns stays in the country. The record belongs to the patient, and what a patient's care teaches the model belongs, in the end, to the people whose care it was. A model trained on the medicine of twenty crore people should serve those people first, and stay theirs.",
        ],
      },
      {
        index: "04",
        heading: "Safety gates the handover",
        body: [
          "Nothing moves to KhaM-Med because it is cheaper, or because it is ours. A task moves only once it has been shown to match the frontier baseline on evaluation sets built from the real thing: real Bangladeshi films from real machines, real dialect transcripts, real chamber notes. The model earns each task. It is not handed them.",
          "And the clinical safety rules do not change with the model underneath. KhaM-Med drafts; it does not decide. It produces a briefing for a doctor to read, a triage routing for a patient to act on, a draft read for a radiologist to confirm. The licensed human signs. Escalation stays conservative, because the cost of a missed red flag is not symmetric with the cost of one extra referral. The model that runs in Dhaka is held to exactly the standard the foreign model was, and crosses over only when it meets it.",
        ],
        pullQuote: "The model earns each task. It is not handed them.",
      },
      {
        index: "05",
        heading: "The staged path, said plainly",
        body: [
          "The path is staged, and the staging is honest, the same way the identity layer builds trust in declared phases rather than claiming it all at once.",
          "Today, frontier models carry the complex reasoning while every consented encounter builds toward the model that will one day carry it. Next, fine-tuned models take the structured, high-volume tasks, and the sensitive flows move to in-country processing, which is the milestone the privacy constraints have been waiting on. In the target state, the large majority of routine inference runs through KhaM-Med on Bangladeshi infrastructure, with frontier models retained for the genuinely rare and the genuinely hard.",
          "No stage pretends to be a later one. While a task is still served by a foreign model, the network says so. When it crosses to KhaM-Med, it crosses because it earned it. The country is told the truth about where its intelligence lives at every step, because a system that lies about that has already given away the thing sovereignty was supposed to protect.",
        ],
      },
      {
        index: "06",
        heading: "Sovereign, by necessity",
        body: [
          "Sovereignty here is not a slogan and not nationalism. It is a list of practical things that all happen to point the same direction. The answer that arrives at 4am should not be revocable by a foreign vendor. The voice of a woman describing her symptoms should not have to leave the country to be understood. The dialect she speaks should be one the model was built to hear. The cost of serving her should be low enough that her care can be free. And the medicine of a people should belong to those people.",
          "KhaM is the initials of Khayer and Mamataj. The model carries the name on purpose. It exists so that what twenty crore people teach it stays theirs, in their language, under their law, on their soil. That is not an ideological position. For a national health system, it is the only durable one. Sovereign, by necessity.",
        ],
      },
    ],
  },
  {
    slug: "where-the-model-belongs",
    kind: "paper",
    title: "Where the model belongs",
    tagline:
      "Glyph drafts, briefs, and flags. It never diagnoses and never prescribes. The doctor decides and signs, and that line is built so it cannot blur.",
    readMinutes: 10,
    date: "June 2026",
    published: true,
    standfirst:
      "A white paper on the division of labor between the model, the doctor, and the signature. Where a clinical AI belongs in a country with one doctor for every fifteen hundred people, and why the most useful thing it can do is refuse to be the doctor.",
    sections: [
      {
        index: "01",
        heading: "The line that cannot blur",
        body: [
          "A clinical model in Bangladesh is dropped into one of the most overloaded medical systems on earth. One doctor for every fifteen hundred people, ninety patients in a day, forty-eight seconds a visit. The temptation, for anyone building software into that gap, is obvious: let the machine do more of the deciding. There is so much demand and so little doctor that handing the model the decision looks like mercy.",
          "It is the one thing the model must never do. Glyph does not diagnose. It does not prescribe. It does not decide. It drafts, it briefs, it flags, it remembers, and then it hands all of that to a licensed human who decides. That is not a legal line at the bottom of a screen. It is the line the whole system is built around, and the engineering exists to make sure it cannot blur.",
          "Everything that follows is an argument for why that restraint is not timidity. In high-stakes work the model that refuses to decide is the more useful one, and the more honest one, and in the end the only one a doctor can safely lean on.",
        ],
        pullQuote:
          "Handing the model the decision looks like mercy. It is the one thing it must never do.",
      },
      {
        index: "02",
        heading: "What the model is for",
        body: [
          "Refusing to decide is not refusing to work. The model in Glyph works constantly, and all of its work is the kind a forty-eight-second visit has no room for.",
          "Before the patient walks in, it takes the history, in Bangla, unhurried, in the dialect the patient actually speaks, and reads the plastic bag of old papers into a structured record. It hands the doctor a briefing, red flags first, with the current medications already cross-checked. During the consultation it answers a clinical question with a cited source in seconds, so the doctor does not have to choose between looking something up and seeing the next patient. Afterward it drafts the note in the format Bangladeshi medicine uses, and a plain-Bangla summary for the patient. At a diagnostic center it offers a draft read of a film for a radiologist to confirm.",
          "Every one of those is preparation and drafting, handed to a human who decides. None of it is the decision. The model is not there to replace the doctor's judgment. It is there to give him back the attention to use it, by doing the reading and the writing and the remembering that the volume has been stealing from him for years.",
        ],
      },
      {
        index: "03",
        heading: "Why ninety-five percent accurate is a liability",
        body: [
          "There is a number that sells clinical AI and should worry anyone who understands it. Ninety-five percent accurate. In ordinary software that is an excellent result. In a setting where the output is a clinical decision, it describes a machine that produces a confident, plausible error once in every twenty answers.",
          "The danger is not the five percent. It is the confidence. The model does not flag its wrong answers as wrong. It delivers them in the same fluent, certain voice as the right ones, and nineteen correct answers in a row train the tired doctor at the end of a ninety-patient day to trust the twentieth. An error that announced itself would be safe. A confident error inside a stream of correct ones is the dangerous kind, because the system around it has stopped checking.",
          "This is why accuracy, however high, is necessary and never sufficient. A model that is right ninety-five or ninety-nine percent of the time is still a model that must never be the last word, because the cases where it is wrong are exactly the cases no one will catch if the model is trusted to decide. The fix is not a better number. It is a human who signs.",
        ],
        pullQuote:
          "An error that announced itself would be safe. A confident error inside a stream of correct ones is the dangerous kind.",
      },
      {
        index: "04",
        heading: "Decision support is not the decision",
        body: [
          "The whole design rests on a distinction that is easy to state and easy to erode: support is not the decision. The briefing informs the doctor; the doctor decides. The triage routes the patient toward care; the patient and the clinician decide. The draft read flags a likely finding; the radiologist decides.",
          "Hold that line and something useful follows. The model can be wrong and the system stays safe, because the model never acts. Its mistakes are caught at the step where a human reviews them, the way a first draft's mistakes are caught by the editor. The harm from a model error only escapes when the model is allowed to act with no human in the path, and the architecture's first job is to make sure that path does not exist.",
          "So the line is enforced, not requested. The model has no key. It cannot issue a credential, cannot sign a prescription, cannot complete a diagnosis. Those acts are reserved, in the system itself, to a human holding a key only that human holds. A doctor can ignore the briefing, override the draft, reject the suggested note. What he cannot do is let the model sign in his place, because the model has nothing to sign with.",
        ],
      },
      {
        index: "05",
        heading: "The signature is the accountability",
        body: [
          "When a doctor approves a note in Glyph, he is not approving the model. He is taking responsibility. He signs the prescription with his own cryptographic key, and in that moment the decision stops being a draft a machine produced and becomes a clinical act a named, licensed human stands behind.",
          "This is the hinge between this paper and the identity layer. The signature that makes a prescription verifiable at a pharmacy in Khulna is the same signature that makes the AI safe to use in the chamber. They are one act. The doctor's key turns a draft into a decision and a decision into something the rest of the network can trust, and both of those depend on a human having chosen to put his name on it.",
          "The model drafts a thousand notes a day. Not one of them becomes a prescription until a doctor signs it, and when he does, the accountability is his, traceable, and his alone. That is not a burden the design apologizes for. It is the point. A clinical act with no accountable human behind it is exactly the thing a health system cannot allow, and the signature is how the system guarantees there always is one.",
        ],
        pullQuote:
          "The doctor's key turns a draft into a decision. The model has nothing to sign with.",
      },
      {
        index: "06",
        heading: "Conservative by design",
        body: [
          "One more rule follows from where the model sits, and it shapes every output: the model is tuned to be conservative, because the costs of its two kinds of error are not symmetric.",
          "Sending a well patient to a doctor wastes a visit. Reassuring a sick one can cost a life. Those are not equivalent mistakes, and a model that treated them as equivalent, optimizing for raw accuracy, would be optimizing for the wrong thing. So Glyph leans the other way on purpose. A triage that cannot be sure escalates. A briefing surfaces the red flag even when it is probably nothing. The model would rather be the cause of one unnecessary referral than the reason one warning went unspoken.",
          "This is the same instinct as the safest answer a verification system can give, which is to admit it could not check. A clinical model that says see a doctor, I cannot be sure is not failing. It is doing the most responsible thing a tool in its position can do, which is to route the uncertainty to the human who is allowed to resolve it.",
        ],
      },
      {
        index: "07",
        heading: "Where the model belongs",
        body: [
          "Put all of it together and the answer is precise. The model belongs underneath the doctor, not in his chair. It belongs in the forty-eight seconds before the visit and the minutes after, doing the reading and the drafting and the remembering the visit has no room for. It belongs as the second reader, never the signer. As the draft, never the decision. As the tool that hands a prepared, flagged, cited picture to a human and then steps back.",
          "The most useful thing a clinical model can do in a country with one doctor for every fifteen hundred people is not to be a doctor. It is to give the overwhelmed doctor who already exists the attention to be one. Glyph does that by doing everything around the decision and never the decision itself. That is where the model belongs, and the system is built so it cannot drift anywhere else.",
        ],
      },
    ],
  },

  /* ── Essays ─────────────────────────────────────────────────── */
  {
    slug: "the-grandmother-and-the-seed-phrase",
    kind: "essay",
    number: "01",
    title: "The grandmother and the seed phrase",
    tagline:
      "Put a sixty-eight-year-old in Mymensingh on a blockchain and you have handed her a seed phrase to lose. The answer is did:web, and the reason is her.",
    readMinutes: 5,
    date: "June 2026",
    published: true,
    standfirst:
      "Why a national health identity runs on did:web, and not on a blockchain.",
    sections: [
      {
        body: [
          "Every few months someone asks why this is not on a blockchain. The question is fair. Identity, ownership, a record no one can forge: it sounds like the thing blockchains were invented for. The answer is a woman in a village in Mymensingh, sixty-eight years old, who has never owned an email address, and who is the patient this has to work for.",
          "Put her on a blockchain and you have handed her a seed phrase. Twelve or twenty-four words that are the only way back into her own health record. Lose them and the record is gone, permanently, with no one to call. There is no help desk for a private key. There is no reset. A teenager in San Francisco who loses a seed phrase loses some money. She would lose the only proof that her heart condition was ever diagnosed.",
          "That reason would be enough on its own. There are more. A blockchain is expensive to write to, and slow, and its cost moves with a token price set by speculation on the other side of the world. A prescription should not cost a fluctuating gas fee to issue. A village clinic with intermittent electricity should not depend on a global consensus network being reachable to record that a woman came in with high blood pressure.",
          "And the thing blockchains are genuinely good at, distributing trust across thousands of strangers who do not know each other, is a problem Bangladesh's health system does not have. The trustworthy parties already exist. The medical council. The diagnostic chains. The pre-departure office. They are known, named, and authoritative. The job is not to invent trust among strangers. It is to let the trust that already exists travel.",
        ],
        pullQuote: "There is no help desk for a private key. There is no reset.",
      },
      {
        body: [
          "So the identifier is did:web. It resolves the way the rest of the web resolves. An identifier like did:web:khamhealth.com:doctor:bmdc-A-54219 is a document sitting at a known address over HTTPS, holding a public key. To check a doctor's signature, you fetch his key and verify. No chain, no token, no global network that has to be reachable. The same protocol that loads a news site loads a clinical identity.",
          "The signature underneath is Ed25519. It is not exotic. It is the signature in SSH, the thing engineers use to log into servers every day. It is in Signal. It is in modern TLS, which means it is in the lock icon on every bank login in the country. It is fast enough to run on a cheap phone and old enough to be trusted. Choosing it was the opposite of clever, and clever is the enemy here.",
          "This honesty has a cost, and the cost has to be said out loud. did:web is not decentralized. The identifiers resolve over a domain one operator maintains. If that operator vanishes, the identifiers stop resolving. A blockchain would not have that single point of failure. This is the real trade, made with eyes open: a system one operator must keep alive that a grandmother can actually use, over a trustless system she cannot. The mitigation is boring and institutional, not a token. The credentials are W3C standard and the wallet exports, so the records survive the operator even when the resolver does not. A succession obligation is written into the structure, so the registry can pass to another keeper. Portability is the answer to single-operator risk.",
          "The grandmother never sees any of this. She sees a card on a phone, or a number an assistant holds for her. She holds no seed phrase, because a system that asks a sixty-eight-year-old to safeguard twenty-four words has already failed her. The cryptography is real and the cryptography is hidden, and both of those are the point. The most important property of national health infrastructure is that the person it serves never has to understand it to be protected by it.",
        ],
      },
    ],
  },
  {
    slug: "thirty-six-thousand-doctors-no-one-can-verify",
    kind: "essay",
    number: "02",
    title: "Thirty-six thousand doctors no one can verify",
    tagline:
      "In 2024 the medical council admitted it cannot tell a licensed doctor from a forged one. A signature that verifies itself can, at the counter, in seconds.",
    readMinutes: 5,
    date: "June 2026",
    published: true,
    standfirst:
      "What it means that the medical council cannot vouch for its own register.",
    sections: [
      {
        body: [
          "In November 2024 the Bangladesh Medical and Dental Council said something a regulator almost never says out loud. It admitted it did not know who its doctors were.",
          "The numbers it gave: roughly 134,568 registered physicians. About 36,000 of them practicing on registrations never renewed. An unknown number registered with forged documents, unknown not as a turn of phrase but because the council cannot tell. And no count at all of the people practicing with no registration whatsoever. The body whose entire job is to say who is a doctor told the country it could not reliably say who is a doctor.",
          "Sit with what that does to a piece of paper. A prescription in Bangladesh is signed, and the signature is supposed to mean a licensed physician stands behind it. But if the register itself cannot separate the licensed from the lapsed from the forged, the signature means whatever the person holding the pen wants it to mean. The honest doctor with thirty years of training and the man who bought a stamp produce the same artifact: a name, a scrawl, a prescription. At the point of care, nothing tells them apart.",
          "This is not the doctor's failure. It is a verification failure, and it sits underneath almost everything else that is broken. The pharmacy cannot refuse an antibiotic with confidence, because it cannot confirm the prescription came from a real prescriber. The patient cannot trust the specialist, because the registration on the wall could be anything. The hospital admitting a transfer cannot check the referring doctor. Every one of these is the same hole: the prescriber's legitimacy does not travel with the prescription, and the registry that should settle it cannot be trusted and often cannot be reached.",
        ],
        pullQuote:
          "The honest doctor and the man who bought a stamp produce the same artifact. At the point of care, nothing tells them apart.",
      },
      {
        body: [
          "The instinct is to fix the registry. Clean the list, renew the lapsed, hunt the forgeries. That work matters, and it is slow, and even a perfect list does not solve the problem, because a list sitting in the council's office does nothing for the pharmacist in the Lakshmipur bazaar at nine at night. He is not going to phone Dhaka. He needs the answer at the counter, in seconds, and the list cannot come to the counter.",
          "A signature that verifies itself can come to the counter. Give the doctor a cryptographic identity, an identifier that resolves to a public key, and his prescription is now signed with a key only he holds. Anyone can check it against his published key without calling anyone: the pharmacy, the hospital, the next doctor, the patient. The forged prescription fails the check. The lapsed registration shows as lapsed. The real doctor's signature verifies every time. The legitimacy travels with the prescription instead of waiting in a registry no one trusts.",
          "The bootstrap is the honest part. On day one the council is not yet issuing these credentials, so the first version is weaker: a doctor's identity is self-asserted, with its provenance disclosed plainly. This is a doctor who signed up and showed his registration number, not yet a doctor the council has vouched for. As institutions begin to issue, the same identity grows stronger without the doctor changing anything. A hospital confirms he is on staff. Eventually the council itself signs his registration, and the credential reaches its full weight. The trust is built in layers, from self-asserted to institution-vouched to council-anchored, and no layer pretends to be a later one.",
          "There is a doctor at the center of this, and it is worth ending on him. Today his real registration is indistinguishable from a forged one, which means the forgery costs him something. It cheapens the thing he earned. A verifiable identity is the first time his legitimacy becomes legible at the point of care. He is no longer asking the pharmacy to take his word, the same word a forger could offer. He is offering proof. Thirty-six thousand unverifiable registrations is not a scandal to be managed. It is the clearest statement anyone has made of why the identity layer has to exist. The council named the hole. This fills it.",
        ],
      },
    ],
  },
  {
    slug: "the-patient-who-must-not-be-named",
    kind: "essay",
    number: "03",
    title: "The patient who must not be named",
    tagline:
      "Build a system that identifies everyone perfectly and you have built the perfect tool for finding the people who must not be found. So this one can decline to.",
    readMinutes: 5,
    date: "June 2026",
    published: true,
    standfirst:
      "Why an identity system has to be able to not identify someone.",
    sections: [
      {
        body: [
          "An identity network has an obvious failure mode, and it is not a technical one. It is that the system works too well. Build something that knows exactly who every patient is, binds every diagnosis to a verified name, and makes it all portable and permanent, and you have also built the most efficient tool ever made for finding the people who most need not to be found.",
          "The woman hiding a pregnancy from a factory that fires pregnant women. The man with a diagnosis that would cost him his housing or his marriage. The teenager who needs a test her family must never see. The Rohingya refugee for whom a government-linked record is a danger rather than a convenience. For these people a perfectly verified identity is a threat, and a health system that can only serve the fully identified has drawn a line and left them on the far side of it.",
          "So the test of this identity layer is not how well it identifies. It is whether it can deliberately decline to. And it can, using the same machinery, because the thing that makes a credential trustworthy is the signature, not the name. A prescription is valid because a verifiable doctor signed it, and that fact holds no matter how little the system knows about the patient. You can prove a doctor authorized a treatment without proving who received it. You can carry a real, signed clinical record under an identity anchored to nothing: no national ID, no passport, no name a factory or a family or a ministry could pull. The record is real. The link to a legal identity is the part that is absent, on purpose.",
        ],
        pullQuote:
          "The thing that makes a credential trustworthy is the signature, not the name.",
      },
      {
        body: [
          "This is anonymous mode, and it is not a lesser tier bolted on for awkward cases. It is reached through a trusted intermediary, an NGO or a clinic or a counselor, who stands between the patient and the system, so that someone with the most to lose can hold a verifiable record without exposing themselves to acquire it. The pregnancy consultation, the stigmatized diagnosis, the test that must stay invisible: shielded categories, visible to the patient and the clinicians she chooses and to no one else, because the keys are hers and the identity beneath them points nowhere.",
          "The factory worker is the sharpest version, because the same system serves her employer and must still protect her from it. The factory pays for the medical room. The factory wants proof the room is used. The architecture gives it that proof, in aggregates and compliance, the room is staffed and working, and gives it nothing about her. Her early-pregnancy consultation writes to her wallet, under her key, on a device the factory cannot read, in a category management cannot see. The system the employer paid for is the system that hides her from the employer. That is not a contradiction the design tolerates. It is the design.",
          "There is a deeper point about what owning a record means. A record the patient owns is one she can also withhold. If the only way to receive care is to be fully and permanently identified into a system someone else controls, she does not own anything. She has been enrolled. Patient-held keys are what make refusal possible, and refusal includes the choice to let no one see her legal identity at all. For the people in this essay that difference is measured in whether she keeps her job, her housing, her safety.",
          "It would be easier to build the system that only serves the fully identified. It would cover most people, demo cleanly, and raise no hard questions about edge cases. But the edge is where the need is sharpest. The measure of this network is not that it can prove who you are. It is that when proving who you are would hurt you, it can still prove what you need and keep the rest. An identity system worth building has to be able to not identify someone. This one is built to.",
        ],
      },
    ],
  },
  {
    slug: "the-row-that-dies-at-the-door",
    kind: "essay",
    number: "04",
    title: "The row that dies at the door",
    tagline:
      "Every project that digitized the bag built a database a few thousand people log into and the rest forget. A record built right is a credential, not a row.",
    readMinutes: 5,
    date: "June 2026",
    published: true,
    standfirst:
      "Why a decade of digitizing the bag kept producing databases the country forgot.",
    sections: [
      {
        body: [
          "For ten years the fix has looked the same. Scan the papers, build an app, hand the patient a portal. Each project digitized the bag and called it progress, and each produced a database a few thousand people log into and the rest forget. The bag outlived all of them.",
          "The reason is in the shape of what they built. A record, in those systems, is a row. A prescription is a row in a prescriptions table. The row belongs to the institution that wrote it. It lives in that institution's database. It dies at the door, because the next institution cannot reach it and would not trust it if it could.",
          "A row is a claim about a patient that only its author can read. Stack a hundred of them across a hundred institutions and you have a hundred islands, each holding a fragment, none able to speak to the next. The patient is the only thing that travels between them, carrying the paper, because the paper is the one format every island can open. The bag is not a failure of technology. It is the rational response to a hundred databases that do not connect.",
        ],
        pullQuote: "A row cannot be walked. A set of signed claims can.",
      },
      {
        body: [
          "A record built right is a credential, not a row. A signed, verifiable claim, bound to a person, issued by whoever had the authority to make it. The difference is where it lives and who can read it. A credential lives in the patient's wallet, not the institution's server. It carries its own proof of who made it. The next provider can verify it without an account on the system that issued it, without permission, without trusting the issuer's database at all. It needs the issuer's public key, and the key is public.",
          "That single change is what turns a pile into a person. The institution stops being the owner of a fragment and becomes one signer among many, each adding a verifiable claim to a record the patient holds for life. Walk the set and the interactions are visible, the duplicate test is visible, the history is visible, in seconds, because the claims share an identity and can finally be read together.",
          "This is also why the identity layer is not another health-IT project, even though it will look like one from the outside. The thing underneath the applications is not a better database. It is the absence of a database as the owner of the record. The patient owns it. The institutions sign it. Nobody has to log into anybody else's system for the record to be read.",
          "The graveyard is full of portals that asked the country to move its records into one more place. This asks for the opposite. Leave the records where they are made, sign them where they are made, and let the signature travel. The bag was the workaround. A wallet that proves itself is the thing the bag was always trying to be.",
        ],
      },
    ],
  },
  {
    slug: "eight-doors-one-person",
    kind: "essay",
    number: "05",
    title: "Eight doors, one person",
    tagline:
      "A single national ID cannot be the key, because the people who need a health identity most are the ones it serves worst. So identity is anchored from many directions at once.",
    readMinutes: 5,
    date: "June 2026",
    published: true,
    standfirst:
      "Why a single national ID cannot be the key to a health identity, and what to use instead.",
    sections: [
      {
        body: [
          "The obvious way to give every patient an identity is to use the one the state already issues. A national ID number, one per citizen, the key to the record. It is obvious, and it is wrong, because the people who need a health identity most are the people a national ID serves worst.",
          "The day laborer who never collected his card. The woman whose ID lists a husband she has left. The migrant whose papers are in a drawer in a labor camp two thousand kilometers away. The Rohingya refugee who has no national ID and for whom a government-linked record is a danger, not a key. The newborn with a birth certificate and nothing else yet. Build identity on a single document and every one of them falls through, which means the system fails exactly where the need is sharpest.",
          "So identity here is anchored from many directions at once. A national ID where it exists. A passport. A pre-departure registration for the worker going abroad. An embassy attestation for the man whose papers are unreachable. A birth certificate for the newborn. A vouching by a trusted institution for the person who has none of these. A patient's identity is assembled from whichever anchors they have, checked against each other, and strengthened as more arrive.",
        ],
        pullQuote:
          "Identity is not a gate you pass once. It is a thread that gathers strength over a life.",
      },
      {
        body: [
          "The important property is that the thread does not break while it is incomplete. A worker who starts with a passport and a pre-departure record holds a real, usable identity that day. When he adds a national ID a year later, it attaches to the same thread. He does not start over. The record he built in the meantime is still his, still verifiable, now anchored a little more firmly.",
          "Every credential also carries the provenance of its anchor, so a verifier always knows what was actually checked. A prescription signed against a council-confirmed registration weighs more than one signed against a self-asserted number, and the credential says which it is. Nobody has to pretend a weak anchor is a strong one. The system states what it knows and how it knows it, and lets the verifier decide.",
          "This is the difference between identity as exclusion and identity as inclusion. A single-document system draws one line and sorts the country into the inside and the outside. A multi-anchor system has many doors, and the test is not which document you hold but whether enough can be assembled to tell, with stated confidence, that you are the same person who was here before. For most people that is easy. For the person with one fragile document, or none, it is the whole point.",
          "An identity layer that only works for the fully documented is not infrastructure for Bangladesh. It is infrastructure for the half of Bangladesh that was already easy to serve. The eight doors exist because the other half is the half a health system keeps losing.",
        ],
      },
    ],
  },
  {
    slug: "when-the-records-start-talking",
    kind: "essay",
    number: "06",
    title: "When the records start talking",
    tagline:
      "One verifiable record is a nice thing. The reason it matters is what happens when many of them share an identity and can finally be read together.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "The value was never one record. It is the graph the records form once they share an identity.",
    sections: [
      {
        body: [
          "A single verifiable prescription is a nice thing. It proves a real doctor authorized a real drug for a real person. But one verifiable record, on its own, is not why this matters. The reason is what happens when a person has collected many of them, each signed by whoever was authoritative for it, all bound to the same identity.",
          "They start to talk to each other. A doctor about to prescribe can walk the patient's full set of active credentials and see the beta-blocker another doctor started three months ago before he adds a second one. A pharmacist can see the antibiotic course dispensed last week before handing over another. A record that was scattered across four institutions, unreadable as a whole, becomes a single set of claims that can be checked against each other in seconds.",
          "A pile of paper cannot do this. You can hold a bag of prescriptions and still miss the interaction, because reading the bag means reading every page, in forty-eight seconds, in different hands, some of them illegible. The information was always there. What was missing was the ability to read it together.",
        ],
        pullQuote:
          "The information was always there. What was missing was the ability to read it together.",
      },
      {
        body: [
          "This is where the safety lives. Not in any single clever check, but in the fact that the checks have something complete to run against. A medication list that spans every prescriber, not just the one in the room. A history that includes the lab result from the center across town. The graph of a person's signed claims is the substrate, and the substrate is what was never available before, because the records lived on islands and the only index was the patient's memory and a knotted bag.",
          "The patient owns the graph, which is the part that keeps it honest. The records talk to each other inside her wallet, under her key, with her consent, and nothing reads them that she has not allowed. The doctor sees the active credentials because she presented them, not because a central system handed him a dossier. The same property that makes the graph useful keeps it from becoming surveillance. It is assembled at the point of care, by the patient, for the encounter in front of her.",
          "A prescription that proves itself is the first brick. The graph is the wall. Once a person's clinical claims share an identity and can be read together, the question stops being what is in the bag and becomes what does this person's record, taken as a whole, say is true right now. That question has never had an answer in Bangladesh. It does now, and the answer is owned by the patient.",
        ],
      },
    ],
  },
  {
    slug: "a-stamp-that-travels",
    kind: "essay",
    number: "07",
    title: "A stamp that travels",
    tagline:
      "An institution does not adopt this by joining a platform. It becomes an issuer of its own credentials, and its stamp stops dying at the door.",
    readMinutes: 5,
    date: "June 2026",
    published: true,
    standfirst:
      "Why an institution joins not by adopting a platform, but by becoming an issuer.",
    sections: [
      {
        body: [
          "The hardest part of building shared health infrastructure is never the technology. It is getting institutions that already work, in their own way, to change what they do. The medical council, the diagnostic chains, the pre-departure office. Each is authoritative over something. Each has a stamp the physical world already respects. The mistake most systems make is asking them to adopt a platform.",
          "This does not ask that. An institution does not adopt anything. It becomes an issuer of its own credentials. The medical council signs a doctor's registration once, with a key the council holds. That signed registration is now verifiable inside every prescription the doctor writes, at every pharmacy that checks his authority, in every consultation across a border. The council did not move its registry into someone else's database. It put its existing stamp into a form that travels.",
          "The argument that lands with an institution is not about technology or public good. It is about reach. A stamp locked in one registry is worth what that registry can be reached for, which in Bangladesh, at nine at night, in a bazaar in Lakshmipur, is nothing. A stamp that travels with the document is worth the same everywhere the document goes. The council's authority becomes portable without the council doing anything except signing, which is the thing it already does.",
        ],
        pullQuote:
          "A stamp locked in one registry is worth what that registry can be reached for. A stamp that travels is worth the same everywhere the document goes.",
      },
      {
        body: [
          "The same move works for every authoritative party. A diagnostic center signs a result, and the result carries its origin for the rest of the patient's life, so a report from a known chain weighs differently from one off a roadside shop, and the difference travels with it. A pharmacy signs a dispensing event, and the patient cannot return next month for the same antibiotic without a fresh signed prescription. Each signer signs only the thing it alone is authoritative for. Nobody is asked to vouch for anything outside their authority.",
          "Because each institution issues independently, no single party owns the trust. It is spread across the signers, each one authoritative in its own domain, exactly as it was in the physical world, only now legible to a verifier who never has to phone any of them. The network does not concentrate authority. It lets existing authority travel, which is a smaller and far more achievable thing than building a new authority everyone agrees to trust.",
          "This is why the eventual conversation with the state is one it can have on its own terms. The authorities are not being asked to hand their stamp to a company. They are being asked to issue their own credentials onto an open standard, keep their own keys, and let the stamp they already control reach the counter it could never reach before. The institution stays the institution. Its stamp just stops dying at the door.",
        ],
      },
    ],
  },
  {
    slug: "on-top-of-not-in-charge-of",
    kind: "essay",
    number: "08",
    title: "On top of, not in charge of",
    tagline:
      "The company that builds the applications must not own the identity layer beneath them. A system the patient can leave is the only kind she can safely stay in.",
    readMinutes: 5,
    date: "June 2026",
    published: true,
    standfirst:
      "Why the company that builds the applications must not own the layer beneath them.",
    sections: [
      {
        body: [
          "There is a line in this design that decides everything, and it is easy to miss because it is a line of restraint rather than capability. The applications sit on top of the identity layer. They do not own it. KhaM Health builds the first applications, and it does not own the layer they stand on either.",
          "The product a doctor sees is an application. A chamber workflow. A diagnostic center's upload screen. A pharmacist's verification check. A patient's wallet on a cheap phone. These are where a company competes on being good, and they should be as good as anyone can make them. But underneath them is the identity layer: the persistent identifier for every patient, doctor, clinic, lab, and pharmacy, and the credentials the issuers sign onto it. That layer is public-good infrastructure, and treating it as a company asset would poison the thing that makes it work.",
          "The reason is trust, and trust here is structural, not promised. If the records are portable and the standards are open, a future government application could be built on the same identifiers without depending on KhaM Health at all. A competing clinical product in five years could read the same wallet, because the patient owns the wallet and the standard is public. The company cannot trap the record even if it wanted to, and that is the point.",
        ],
        pullQuote:
          "A system the patient can leave is the only kind a patient can safely stay in.",
      },
      {
        body: [
          "This also changes the conversation a company can have with the state. The unwinnable version is trust this private company with the nation's health data. Nobody should say yes to that, and a careful state never will. The winnable version is different. The identity layer already runs on open standards. It already serves these patients and these doctors. The authorities already issue their own credentials onto it and hold their own keys. The state can formalize that arrangement without locking the country to anyone, including KhaM Health.",
          "A company that owned the layer would have every incentive to make leaving expensive. A company that only builds on the layer has the opposite incentive: to make the applications so good that nobody wants to leave, while keeping the door open so they always could. The first is a trap dressed as a platform. The second is how infrastructure earns the right to be relied on.",
          "So the restraint is not generosity. It is the condition that makes the whole thing trustworthy enough to become national. KhaM Health wins by building the best application on an open layer it does not control. Any other arrangement would win a smaller game and lose the one that matters.",
        ],
      },
    ],
  },
  {
    slug: "consent-you-can-take-back",
    kind: "essay",
    number: "09",
    title: "Consent you can take back",
    tagline:
      "Consent in a health system has to be specific, revocable, and enforced by cryptography rather than policy. A consent you cannot take back was never consent.",
    readMinutes: 5,
    date: "June 2026",
    published: true,
    standfirst:
      "Why consent has to be specific, revocable, and enforced by cryptography rather than policy.",
    sections: [
      {
        body: [
          "Most systems treat consent as a checkbox at the start. Agree once, on signup, to a paragraph nobody reads, and the system is free thereafter. For ordinary software that is sloppy. For health data in Bangladesh it is dangerous, because the cost of the wrong person seeing the wrong record is measured in firings, evictions, and cancelled work permits.",
          "So consent here is not a checkbox. It is specific, per provider and per category. It is revocable, and revoking it actually stops the next use rather than logging a preference. And it is enforced by the architecture rather than by a promise, because a promise is only as good as the company that made it, and infrastructure a country relies on cannot rest on a company's good behavior.",
          "Specific means the consent the patient gives to share a blood-pressure reading with her doctor is not consent to share her early-pregnancy consultation with a factory. Different categories, different grants, different keys. The system cannot quietly widen a narrow consent, because the thing standing between a record and a reader is not a rule in the software. It is whether the reader holds the key, and the patient decides who holds the key.",
        ],
        pullQuote:
          "A consent that cannot be taken back was never consent. It was a one-time surrender.",
      },
      {
        body: [
          "Revocable means the grant runs in one direction and can be pulled back. The daughter abroad who watches her father's readings sees them because he allowed it, and stops seeing them the moment he withdraws it. Withdrawal is not a request the system may honor later. It is the removal of access, and the next attempt to read fails.",
          "Enforced by cryptography means the guarantee does not depend on KhaM Health being honest or even being alive. A shielded consultation is invisible to a factory-owned device because the factory does not hold the key, not because an app agreed to hide it. This matters most for the people the system exists to protect, because their safety cannot be left resting on a policy that a future owner, or a court order, or a breach could quietly set aside.",
          "The Personal Data Protection Ordinance of 2025 says, in law, that the citizen owns her personal data, that health data is specially protected, and that consent must be explicit. The law arrives with force around 2027. This architecture is that law rendered in cryptography instead of policy, built before the enforcement date, so that compliance is not a feature added under deadline but the shape of the thing from the start. A patient who can grant narrowly, revoke completely, and rely on the keys rather than the company is a patient the ordinance describes and the architecture already serves.",
        ],
      },
    ],
  },
  {
    slug: "the-4am-answer",
    kind: "essay",
    number: "10",
    title: "The 4am answer",
    tagline:
      "The intelligence a country relies on at 4am cannot be revocable by a vendor it never sat across a table from.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "Why the availability of a health system's intelligence is a question of sovereignty, not uptime.",
    sections: [
      {
        body: [
          "A mother in Mymensingh wakes at 4am with her child burning up. She opens the wallet on a shared phone and asks, in her own Bangla, whether this is something to watch through the night or something to move on now. An answer comes back: the fever pattern, the danger signs to check, whether the pharmacy will do or a hospital is needed now. For that one minute, the most important thing in her house is a model's reply.",
          "Today that reply travels to a server in another country and back. Most nights it works. The question sovereignty asks is not whether it works most nights. It is who decides whether it works at all.",
          "A foreign frontier model is a product, sold under terms the buyer does not write and cannot appeal. The price can move. The rate limits can tighten. Access can be cut over a sanctions reading, a policy change, or a billing dispute between two companies on the other side of the planet. None of those events have anything to do with the mother in Mymensingh, and every one of them can reach into her 4am.",
        ],
        pullQuote:
          "The question is not whether it works most nights. It is who decides whether it works at all.",
      },
      {
        body: [
          "A health system is allowed to depend on electricity, on roads, on the mobile network, because those are things the country can, in principle, govern. It should not depend, at the layer that decides whether a sick child is sent to hospital, on a contract it is not a party to. That is the difference between infrastructure and a subscription.",
          "This is why the intelligence has to come home, even where the foreign model is, today, better. Better is worth a great deal. It is not worth building the country's 4am on a foundation someone else can remove. A model that runs on Bangladeshi servers can be a step behind the frontier and still be the right one, because it answers to the country that depends on it. Availability you control beats capability you rent, at the layer where someone is waiting for an answer in the dark.",
        ],
      },
    ],
  },
  {
    slug: "the-dialect-the-model-cannot-hear",
    kind: "essay",
    number: "11",
    title: "The dialect the model cannot hear",
    tagline:
      "A model built for an English-speaking clinic does not become a model for a sixty-eight-year-old in Sylhet. Language is the floor, not a feature.",
    readMinutes: 5,
    date: "June 2026",
    published: true,
    standfirst:
      "Why frontier models fluent in Bangla still fail the patients who need them most.",
    sections: [
      {
        body: [
          "Ask a frontier model a medical question in clean, written Bangla and it answers well. This is the demo that convinces people the language problem is solved. It is not, because the language the demo uses is not the language Glyph's patients speak.",
          "A patient does not describe her chest pain in textbook Bangla. She describes it in Sylheti, or Chittagonian, or the Noakhali her village speaks, in half-sentences, with the word for a symptom that only exists in her district, mediated by a son who is translating as he goes. The distance between that and standard written Bangla is not an accent. It is a different problem, and frontier models trained mostly on English and a thin slice of formal Bangla fall off it completely.",
          "The failure is quiet, which makes it worse. The model does not announce that it misheard. It produces a confident, fluent answer to the question it thought it heard, and a confident wrong answer in a triage is more dangerous than no answer at all.",
        ],
        pullQuote:
          "The model does not announce that it misheard. It answers the question it thought it heard.",
      },
      {
        body: [
          "This is why dialect is not a feature to add later. It is the floor the whole thing stands on. A clinical model for Bangladesh that cannot follow a woman describing her symptoms in the speech she actually uses is not a clinical model for Bangladesh. It is a clinical model for the small, urban, formally literate slice of it, which is the slice that was already best served.",
          "Closing that gap is most of what building KhaM-Med actually is. Not new medicine, the base already knows board-exam medicine. The work is teaching it to hear the country: the dialects, the local words for pain and fever and dizziness, the way an attendant speaks for a patient, the way a real symptom arrives wrapped in worry and idiom. A model can only learn that from the speech itself, and that speech lives here, in these districts, in these patients' own words. It has to be learned where it is spoken. That is the deepest reason the model has to be built where the patients are.",
        ],
      },
    ],
  },
  {
    slug: "free-has-a-cost-structure",
    kind: "essay",
    number: "12",
    title: "Free has a cost structure",
    tagline:
      "Free care at national scale needs inference that costs almost nothing. A per-call fee to a foreign vendor is not almost nothing once you multiply it by a country.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "Why care that is free for the patient forces a model the country owns.",
    sections: [
      {
        body: [
          "Pocket is free for patients, permanently. Maa is free to mothers. Pharmacy verification is free at the counter. These are not pricing decisions that can be revisited. They are load-bearing, because the people the system exists for are the people any fee would exclude first, and a health system that prices out the poorest has failed at the one thing it was for.",
          "Free for the patient does not mean free to run. Every triage answer, every briefing, every draft read costs something to compute. When that computation is a call to a foreign frontier model, it carries a per-call fee. The fee is small. It is also multiplied by a country, every day, forever, and small times a country is not small.",
        ],
        pullQuote: "Small, times a country, every day, forever, is not small.",
      },
      {
        body: [
          "This is the economic reason the model has to come home, and it is not a rounding error. A mission funded to serve tens of millions of free interactions cannot rest on a marginal cost that scales linearly with use and is set by a vendor abroad. The arithmetic does not close. Either the free promise breaks, or the cost of one more answer has to fall toward zero, and the only way it falls toward zero is a model the network runs on its own infrastructure, where the marginal cost of one more answer is electricity, not a metered call.",
          "So the free promise and the sovereign model are the same decision seen from two sides. You cannot keep care free at national scale on rented intelligence, and you cannot justify owning the intelligence without the scale that free access creates. KhaM-Med is what lets the free promise survive contact with the bill.",
        ],
      },
    ],
  },
  {
    slug: "dont-redact-it-dont-send-it",
    kind: "essay",
    number: "13",
    title: "Don't redact it, don't send it",
    tagline:
      "The honest answer to a woman's voice describing her symptoms is not to redact it before shipping it abroad. It is not to ship it abroad.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "Why the honest fix for sensitive health data is not better scrubbing.",
    sections: [
      {
        body: [
          "Every system that sends health data to a foreign model has a slide about de-identification. Names stripped, phone numbers masked, identifiers removed before the data leaves. It is real work and it is worth doing, and it is not the same thing as safety.",
          "A woman describing her symptoms in a voice note is not a row with a name field to blank out. Her voice is identifying. Her dialect places her. The details of her complaint, the village clinic she mentions, the relative who brought her, reassemble into a person no matter how many fields are masked. Free text and recorded speech are the hardest things to de-identify and the easiest to re-identify, and the most sensitive health disclosures arrive in exactly that form.",
        ],
        pullQuote:
          "Free text and recorded speech are the hardest things to de-identify and the easiest to re-identify.",
      },
      {
        body: [
          "The Personal Data Protection Ordinance of 2025 treats health data as a specially protected category and points toward keeping it in the country. Read honestly, that is not a rule that better redaction satisfies. It is a rule about where the data goes.",
          "So the honest fix is the blunt one. The most sensitive flows, the recorded voice, the free-text symptom story, the stigmatized consultation, do not get scrubbed harder and shipped. They get processed in the country, on infrastructure under the country's law, by a model that does not phone abroad. De-identification stays the floor for what must briefly leave. But the milestone KhaM-Med exists to reach is the one where the sensitive data does not leave at all, because the only data you can be certain was not mishandled abroad is the data that never went.",
        ],
      },
    ],
  },
  {
    slug: "infrastructure-on-loan",
    kind: "essay",
    number: "14",
    title: "Infrastructure on loan",
    tagline:
      "A health system is not a thing a country should rent. The intelligence inside it is the part most worth owning.",
    readMinutes: 5,
    date: "June 2026",
    published: true,
    standfirst:
      "Why dependency, not capability, is the deepest reason to build the model at home.",
    sections: [
      {
        body: [
          "The cost argument, the language argument, and the privacy argument are all practical. Each could, in principle, be answered another way: negotiate a better rate, fine-tune harder, redact more. The last argument cannot be answered another way, because it is not practical. It is structural.",
          "When a health system's intelligence runs on a foreign vendor, the vendor holds a lever on the system, whether or not it ever pulls it. The lever is the terms of service: a document the country did not write, that can be changed without its consent, and that governs the layer deciding what care millions of people receive. A single page on a company's website becomes a single point of failure for a nation's health.",
        ],
        pullQuote:
          "A terms-of-service page becomes a single point of failure for a nation's health.",
      },
      {
        body: [
          "Countries already know this instinct elsewhere. They do not run the power grid on a generator they cannot service, or the payment system on rails they cannot govern. Health was slower to see as infrastructure because for so long it was paper and people, with no central thing to depend on or lose. The moment intelligence becomes the thing the system leans on, the same rule applies: the part you lean on is the part you must be able to keep.",
          "This is why owning the model is not a luxury to reach for once everything else works. It is the point at which a clinical AI stops being a clever product and becomes infrastructure a country can build on. A rented mind can be a fine way to start, to prove what works and learn what the country needs. It is not a thing to found a health system on, because the one property infrastructure must have, that it stays, is the one property a rental can never promise.",
        ],
      },
    ],
  },
  {
    slug: "the-model-earns-its-tasks",
    kind: "essay",
    number: "15",
    title: "The model earns its tasks",
    tagline:
      "A task crosses to the home-built model only when it matches the frontier on real Bangladeshi films, transcripts, and notes. The model earns each one.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "Why nothing moves to KhaM-Med because it is cheaper or because it is ours.",
    sections: [
      {
        body: [
          "There is an obvious way to ruin a sovereign-model project: move tasks to your own model because it is yours, before it is ready, and call the downgrade independence. A cheaper, worse answer in a triage is not a sovereignty win. It is a patient harmed in the name of a principle, which is the worst way to harm one.",
          "So the rule is the opposite, and it is strict. A task moves from a frontier model to KhaM-Med only once KhaM-Med has been shown to match the frontier on that task, measured on evaluation sets built from the real thing: real Bangladeshi films from the actual machines in the actual centers, real dialect transcripts from real intakes, real chamber notes a real doctor wrote and corrected. Not benchmarks borrowed from abroad. The country's own work, scored honestly.",
        ],
        pullQuote:
          "A cheaper, worse answer is not a sovereignty win. It is a patient harmed in the name of a principle.",
      },
      {
        body: [
          "This is slower than flipping a switch, and it is meant to be. It means some tasks stay on a foreign model for a long time, because that is where they perform best for now, and the patient comes before the principle every time the two are in tension. Sovereignty is the destination. Safety is the constraint that sets the pace.",
          "It also means that when a task does cross over, the claim attached to it is real: KhaM-Med reads this film as well as the frontier did, on films like the ones it will actually see. That is a sentence the network can stand behind, because it was earned on the country's own evidence, not asserted because the model wears the right flag. A home-built model that has to earn each task is worth more than one that was simply trusted, and it is the only kind that deserves to be.",
        ],
      },
    ],
  },
  {
    slug: "the-staged-truth",
    kind: "essay",
    number: "16",
    title: "The staged truth",
    tagline:
      "The country is told the truth about where its intelligence lives at every step. A system that lies about that has already given away what sovereignty was for.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "Why the migration to a sovereign model is declared in phases, and no phase pretends to be a later one.",
    sections: [
      {
        body: [
          "It is tempting to announce a sovereign clinical model as a finished thing, because the finished thing is the inspiring one, and because admitting that most of the intelligence still runs abroad sounds like an admission of failure. It is not. It is the truth, and the truth is the whole asset here.",
          "So the path is stated in declared phases, the same way the identity layer builds a doctor's credential from self-asserted to council-anchored without ever pretending an early phase is a late one. Today, frontier models carry the hard reasoning while the home model is built toward. Next, the structured, high-volume tasks move in-country, and with them the sensitive flows. In the target state, the bulk of routine inference runs on Bangladeshi infrastructure, with frontier models kept for the genuinely rare and hard.",
        ],
        pullQuote: "The truth is the whole asset here.",
      },
      {
        body: [
          "What makes this honest is the rule that holds across all of it: while a task is still served by a foreign model, the network says so. It does not let a sovereignty claim run ahead of the engineering. A funder, a regulator, or a doctor can ask where any given answer is computed today and get a straight answer, including the ones still abroad.",
          "This matters more than it seems, because sovereignty is a claim about trust, and an exaggerated claim about trust does more damage than no claim at all. If the country is told its data stays home and then learns it did not, the loss is not just that one breach. It is the credibility of every future assurance. A staged path told plainly is slower to boast about and impossible to be caught lying about, and for infrastructure a country's health depends on, the second property is the one that counts.",
        ],
      },
    ],
  },
  {
    slug: "open-weights-on-purpose",
    kind: "essay",
    number: "17",
    title: "Open weights, on purpose",
    tagline:
      "A model you can legally host in Dhaka beats a better one you can only reach by sending the country's health data out to use it.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "Why KhaM-Med is built on open weights, and why that choice is the boring kind.",
    sections: [
      {
        body: [
          "KhaM-Med builds on the MedGemma family, open-weights clinical models. The word that matters is open. Open weights mean the model itself can be downloaded, inspected, and run on servers the network controls, inside the country, under the country's law. A closed frontier model, however capable, can only be reached by sending data to someone else's servers to be answered there.",
          "For most applications that distinction is academic. For national health infrastructure it is the whole game. A model you can host is a model whose data path you govern, whose availability you own, whose cost is your electricity rather than someone's invoice. A model you can only call is, by definition, a dependency you cannot remove.",
        ],
        pullQuote:
          "A model you can host is a model whose data path you govern. A model you can only call is a dependency you cannot remove.",
      },
      {
        body: [
          "Choosing open weights over the most capable closed model is the same kind of choice as did:web over a blockchain, or Ed25519 over something exotic. It trades a little raw capability for control, for hostability, for the ability to keep the thing running without anyone's permission. It is the boring choice, and boring is the right instinct for infrastructure.",
          "The published performance of the open clinical models is already strong, among the best open medical models, at a fraction of frontier cost, and the gap to the closed frontier is real but narrowing. It is also the wrong thing to optimize for. The right thing is a model good enough for the task that the country can actually own. KhaM-Med starts from open weights because a model you can hold in your own hands, in your own country, under your own law, is worth more than a better one you can only borrow.",
        ],
      },
    ],
  },
  {
    slug: "what-the-people-teach-it-stays-theirs",
    kind: "essay",
    number: "18",
    title: "What the people teach it stays theirs",
    tagline:
      "The record belongs to the patient. What a patient's care teaches the model belongs, in the end, to the people whose care it was.",
    readMinutes: 5,
    date: "June 2026",
    published: true,
    standfirst:
      "Why the medicine of twenty crore people should belong to those people.",
    sections: [
      {
        body: [
          "Every other essay in this set is an argument from necessity: cost, language, law, availability, control. This one is an argument from ownership, and it is the reason the others are worth the trouble.",
          "A clinical model learns from care. It gets better because real encounters, with consent, teach it what real medicine in this country looks like: how a fever presents here, how a prescription is written here, what a chest film from a district machine actually shows. The learning is real, and the question no one usually asks out loud is who it belongs to.",
          "The answer this network gives is the same as its answer for the record itself. The record belongs to the patient. And what a patient's care teaches the model belongs, in the end, to the people whose care it was. A model built on the medicine of twenty crore people is, in a real sense, theirs, and it should serve them first.",
        ],
        pullQuote:
          "A model built on the medicine of twenty crore people is, in a real sense, theirs.",
      },
      {
        body: [
          "This is why everything the model learns stays in the country, and why the data behind it is consented and de-identified rather than quietly taken. Not as a compliance posture, but because the alternative, a model trained on a people's medicine and then owned somewhere else, answering to someone else, priced by someone else, is exactly the dependency the whole project exists to refuse.",
          "Sovereignty, in the end, is not about flags. It is this: that the knowledge a country's own sickness and care produce should accrue to that country, in its language, under its law, on its soil, and serve the next patient who walks into the next chamber. KhaM carries the names of two people. The model exists so that what twenty crore more teach it stays theirs.",
        ],
      },
    ],
  },
];

export const WRITING_PAPERS = WRITING_PIECES.filter((p) => p.kind === "paper");
export const WRITING_ESSAYS = WRITING_PIECES.filter((p) => p.kind === "essay");

export function getWritingPiece(slug: string): WritingPiece | undefined {
  return WRITING_PIECES.find((p) => p.slug === slug);
}
