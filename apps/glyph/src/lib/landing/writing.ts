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
  {
    slug: "meeting-the-clinic-that-exists",
    kind: "paper",
    title: "Meeting the clinic that exists",
    tagline:
      "Western clinical AI is built for a fifteen-minute solo visit with an EHR. Bangladesh has forty-eight seconds, an attendant, and a paper pad. Build for that, or build for no one.",
    readMinutes: 10,
    date: "June 2026",
    published: true,
    standfirst:
      "A white paper on designing for the clinic that exists: the forty-eight-second consultation, the family attendant who speaks for the patient, the paper prescription pad, and the plastic bag. Why a clinical AI for Bangladesh has to meet the real encounter, not the one in the pitch deck.",
    sections: [
      {
        index: "01",
        heading: "The clinic in the brief is not the clinic that exists",
        body: [
          "Most clinical AI is built for a clinic that does not exist in Bangladesh. The brief assumes a fifteen-minute consultation, a doctor alone with a patient who speaks for herself, an electronic record to write into, and an insurer deciding what gets paid. Every one of those assumptions is false here, and a product built on them does not underperform in Bangladesh. It simply does not fit.",
          "The clinic that exists is different in every particular. The consultation is forty-eight seconds. The patient is accompanied by a relative who answers for her. The doctor writes on a paper pad and has never used an EHR. The record is a plastic bag. The patient pays cash, out of her own pocket, for everything. These are not problems to be fixed before the software can work. They are the conditions the software has to work inside, exactly as they are.",
          "Building for the real clinic is not a compromise. It is the whole design discipline. Every choice in Glyph traces back to a fact about the encounter as it actually happens, and the ones that matter most are the ones a Western brief would never think to ask about.",
        ],
        pullQuote:
          "These are not problems to fix before the software works. They are the conditions it has to work inside.",
      },
      {
        index: "02",
        heading: "Forty-eight seconds",
        body: [
          "The number that defines the Bangladeshi consultation is forty-eight seconds. The largest international review of consultation length ever assembled, covering one hundred seventy-nine studies and twenty-eight and a half million consultations, put Bangladesh at the bottom of the table: an average primary-care visit of roughly forty-eight seconds, against twenty-two and a half minutes in Sweden. A single doctor may see more than ninety patients in a day, in a country with one doctor for every fifteen hundred people.",
          "You cannot take a history in forty-eight seconds. You cannot read three years of paper in forty-eight seconds. The visit is not failing at these things; there is simply no room in it to attempt them. So the design does not ask the visit to do what it cannot. It moves the history out of the forty-eight seconds entirely, into the time the patient spends waiting, and hands the doctor the result.",
          "This is also why Glyph demands nothing of the doctor. A doctor running ninety consultations a day has no slack to learn software, and any product that asks for some of that slack has already lost. His only new actions are reading a card and tapping approve. Everything else happens around him, before and after the forty-eight seconds, so the scarcest resource in the system is the one thing the product refuses to spend.",
        ],
        pullQuote:
          "His attention is the scarcest resource in the system, and the one thing the product refuses to spend.",
      },
      {
        index: "03",
        heading: "The attendant is not an edge case",
        body: [
          "In a Western consultation the patient speaks for herself, and an attendant in the room is unusual enough to note. In Bangladesh the accompanied visit is the default. An elderly woman comes with the son who manages her care. A patient who speaks a dialect comes with a relative who translates. A great deal of what the doctor hears about the patient does not come from the patient.",
          "This breaks the core assumption of clinical AI built elsewhere, that the voice in the room is the patient's. Glyph is built the other way, around the attendant as the normal case. The first thing it resolves is who is holding the device. From there, every clinical fact is tagged with its source: patient-reported, attendant-reported, attendant-translated, attendant-observed. When the patient's account and the attendant's diverge, the difference is surfaced for the doctor rather than flattened into one story.",
          "This is not a feature bolted onto a solo-encounter design. It is a different starting assumption, and it is the kind of thing that only gets built by someone who has watched the actual encounter, where the son answers before his mother can, and the doctor has to know which words were hers.",
        ],
        pullQuote:
          "A great deal of what the doctor hears about the patient does not come from the patient.",
      },
      {
        index: "04",
        heading: "Augment the paper, do not replace it",
        body: [
          "Bangladeshi doctors write on paper. Not because they are behind, but because the paper pad is faster than any software for a doctor with forty-eight seconds, and because the whole system around them, the pharmacy, the patient, the next clinic, runs on paper too. A product that begins by asking the doctor to abandon the pad has misread the room.",
          "So Glyph does not replace the prescription. It augments it. The note is drafted in the format Bangladeshi medicine actually uses, CC, O/E, Ix, Rx, Advice, never the SOAP format of Western training unless the doctor explicitly asks for it. The doctor reviews what was drafted, edits it, and approves. The paper prescription still exists, still goes in the patient's hand. What changes is that when the doctor approves, the prescription is also signed with his cryptographic identity, which is the thing that makes it verifiable later at a pharmacy or a hospital.",
          "The pad is not the enemy of the record. It is the record's oldest form, and the design works with it rather than against it: keep the paper the patient trusts, and add the signature the system needs. Fighting the pad would have cost the doctor's goodwill on day one. Signing it instead is how the paper becomes something more, without the doctor changing a single habit.",
        ],
      },
      {
        index: "05",
        heading: "Cost is a clinical fact",
        body: [
          "In Bangladesh, seventy-three percent of health spending comes straight out of the patient's pocket, the highest share in South Asia, and health costs push four and a half percent of the population into poverty every year. For most patients, the price of a test or a drug is not a billing detail handled by someone else. It is a decision about whether the family eats as well this month.",
          "This makes cost a clinical variable, not an administrative one, and a tool that ignores it is giving advice the patient cannot afford to take. Glyph treats cost as part of the medicine: prefer the cheapest investigation that actually answers the question, and reach for the Bangladeshi brand and generic names the patient can find and afford, Napa rather than Tylenol, the local generic rather than the imported brand, not the Western defaults a foreign-trained model reaches for first.",
          "None of this is the model deciding to be frugal on the patient's behalf. It is the model surfacing the options and their costs so the doctor, who knows this patient and this family, can make the call. In a system that runs on out-of-pocket cash, leaving cost out of the clinical picture is not neutral. It is a way of being wrong that happens to look tidy.",
        ],
        pullQuote:
          "For most patients, the price of a test is a decision about whether the family eats as well this month.",
      },
      {
        index: "06",
        heading: "Meeting the clinic that exists",
        body: [
          "Put it together and a pattern shows. Every real design choice in Glyph is the shape of a fact about the encounter that actually happens. The history moves out of the visit because the visit is forty-eight seconds. The source-tagging exists because the attendant speaks. The note is paper-format and signed because the doctor writes on a pad and the system needs proof. The drug names are local and the tests are cheap because the patient pays cash. None of these came from a brief. They came from the chamber.",
          "This is the difference between software built for Bangladesh and software ported to it. Ported software treats the country's conditions as friction to be overcome on the way to the design it already had. Software built here treats those conditions as the design. The clinic that exists, with its volume and its attendants and its paper and its poverty, is not the obstacle the product has to survive. It is the thing the product is for. Meet it as it is, or do not bother coming.",
        ],
      },
    ],
  },
  {
    slug: "the-anonymous-us",
    kind: "paper",
    title: "The anonymous us",
    tagline:
      "On the road, with no 911 and no loved one near, your life is in the hands of strangers who owe you nothing and stop anyway. Name that. Then give it hands.",
    readMinutes: 11,
    date: "June 2026",
    published: true,
    standfirst:
      "A white paper on emergency care in a country with no working dispatch: the uncredited generosity of strangers as Bangladesh's real first response, and how a scannable identity turns it into something that routes, alerts, and remembers, without ever handing a stranger your health.",
    sections: [
      {
        index: "01",
        heading: "The thing we rely on and never name",
        body: [
          "A man goes down on a street in Dhaka. A mother collapses in a bus. A rider is hit at a junction. No siren is coming, because the number you would call does not reliably answer. What happens next is the same thing that happens a thousand times a day across the country: strangers stop. They lift him. They find a car, a rickshaw, a CNG. They carry him to whichever hospital someone half-remembers, with their own hands, on their own time, for a person they have never met and will never see again.",
          "Every Bangladeshi knows this is true. Most of us have been on one side of it, and many on both. And yet there is no name for it, no line in a budget, no box on an org chart. The country's real emergency system is not the ambulance and not the hotline. It is the uncredited, unorganized, reflexive generosity of strangers. Call it the anonymous us.",
          "The kindness of strangers is not a sentiment here. It is infrastructure. The question this paper asks is small and practical: if that is the system we actually have, what is the least we can do to help it work?",
        ],
        pullQuote:
          "The country's real emergency system is the uncredited generosity of strangers. The kindness of strangers is not a sentiment here. It is infrastructure.",
      },
      {
        index: "02",
        heading: "What the anonymous us is flying blind on",
        body: [
          "The strangers who stop are not short on willingness. They are short on information, and they always have been. Three things they do not know, and cannot find out, in the minute that matters.",
          "Where to take him. The nearest hospital may be the wrong one, or jammed behind traffic, or shut. The helper guesses, and a guess on a bad road can cost the patient the hour that decided whether he lived.",
          "Who to tell. The man's wife does not know. His family does not know. He arrives alone, and the people who could speak for him, who know his heart condition and his medicines, are unreachable, because no one has their number and he cannot give it.",
          "What is wrong with him. He arrives at the hospital as a stranger to the hospital too. The duty doctor starts from zero, at night, in a corridor, on a body that cannot answer. The record that would have warned them is in a plastic bag at home, if it exists at all.",
          "So the generosity is real and the outcome is still a coin toss, because willingness without information is just a faster way to the wrong door.",
        ],
      },
      {
        index: "03",
        heading: "A code that turns a bystander into a dispatcher",
        body: [
          "The patient is already carrying the one thing that could close all three gaps: a phone. So the fix is a small, scannable emergency code, sitting on the phone's lock screen and on a printed card in the wallet, readable without unlocking anything.",
          "A stranger scans it. Not to read the record. To act. In the seconds after that scan, three things happen at once: the helper is told where to run, nearby hospitals are told someone is coming, and the family is told it happened. The bystander who stopped, with no training and no authority, becomes the dispatcher the country never built.",
          "This is the whole idea. The country was always going to be saved by strangers. This hands them a map, a phone line, and a destination, in the moment they have already decided to help.",
        ],
        pullQuote:
          "A stranger scans it. Not to read the record. To act. The bystander becomes the dispatcher the country never built.",
      },
      {
        index: "04",
        heading: "One scan, and what each person gets",
        body: [
          "The design turns on a single distinction: the same scan tells different people different things, and the stranger is told the least.",
          "To the stranger, the scan shows a destination and a thank-you, and no medical data at all. Nearest hospital, directions, a line that says the hospitals and the family have been alerted, and the words: thank you for stopping. The helper does not need the diagnosis to save the life. He needs to know where to run.",
          "To nearby hospitals, the scan sends a brief, time-boxed alert with only the basics, so the emergency room can begin to prepare before the patient is through the door. And it does not bet on one hospital. It lights up several at once, because the closest one may be unreachable behind a jam while the second-closest is clear. Whichever can respond, responds.",
          "To the family, the scan fires a message to the contacts the patient chose in advance: an emergency code was scanned, near here, at this time. Within minutes a relative is reachable, and the person who arrived alone is no longer alone.",
          "And every scan is logged and the patient is told it happened, so the system is accountable to the one person it is about.",
        ],
        pullQuote:
          "The helper does not need the diagnosis to save the life. He needs to know where to run.",
      },
      {
        index: "05",
        heading: "Why the stranger sees nothing",
        body: [
          "It would be easier to make the scan show everything, and it would be a catastrophe. A code on a phone that displayed a person's blood type, diagnoses, and medicines to anyone who pointed a camera at it would be a gift to every thief, blackmailer, and curious passerby. The most identifying thing a person owns cannot be the most exposed.",
          "So the stranger is shown a destination, and nothing else. The clinical basics travel only to the hospitals and the family, in a minimal form, for a few hours, audited, and the patient is notified each time. This is the same rule the rest of the network runs on: the record belongs to the patient and is locked to keys the patient holds. An emergency scan does not open the record. It pages for help. The lock never comes off, even at the worst moment, because the worst moment is exactly when the wrong person is most likely to be holding the phone.",
        ],
      },
      {
        index: "06",
        heading: "What it is, said honestly",
        body: [
          "This is a help layer, not a miracle, and the honesty is part of the safety. The basics are what the patient entered themselves, so every screen that shows them says, plainly, self-reported, verify on arrival. A stale allergy or an old medication list that is trusted blindly could harm rather than help, so nothing here asks a clinician to trust it blindly.",
          "The routing says directions to the nearest hospital, never this hospital will treat you, because the nearest hospital may be closed, or full, or unable to handle what is wrong. And this is not a 911. It dispatches no ambulance. What it does is make the ambulance the country already has, which is strangers and the phones in their pockets, better aimed and less alone.",
          "It also reaches only the hospitals that have joined the network, and only works if the patient is carrying their code. On the day it launches, in a given place, that may be very few hospitals and very few patients. The honest claim is not coverage. It is that a person who is found by a stranger is no longer found by a stranger with nothing.",
        ],
      },
      {
        index: "07",
        heading: "Name it, and give it hands",
        body: [
          "Return to the man on the road. He will never know who scanned his code, and the stranger will usually never learn whether he lived, unless they leave a number for the one message worth sending afterward: the person you helped is okay, thank you. That message is small and it is the whole point. It closes a loop that has been open in this country for as long as strangers have been stopping for strangers.",
          "We are not inventing the rescuer. The rescuer already exists, on every road, unpaid and unthanked. What has been missing is everything around the act: where to go, who to tell, what to know, and a word of gratitude at the end. Name the anonymous us, the thing we have always relied on and never credited, and give it the smallest possible set of tools to do well what it was already doing for free. That is the work. The strangers will keep stopping. This just makes sure that when they do, they are no longer carrying someone into the dark.",
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
  {
    slug: "glyph-never-prescribes",
    kind: "essay",
    number: "19",
    title: "Glyph never prescribes",
    tagline:
      "In the most doctor-starved system on earth, letting the model prescribe looks like mercy. It is the line the whole design refuses to cross.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "The one sentence that governs everything the model does, and why the temptation to break it is strongest exactly where it matters most.",
    sections: [
      {
        body: [
          "Of all the things a clinical model could be allowed to do, one is forbidden absolutely: Glyph does not prescribe. It does not diagnose, it does not decide, and no amount of confidence in its output changes that. The rule is short, and it is the most important sentence in the system.",
          "The temptation to break it is real, and it is strongest exactly where the need is greatest. Bangladesh has one doctor for every fifteen hundred people. There are villages a doctor reaches rarely and patients who will never see one for the complaint they have. In that gap, a model that could just write the prescription looks like mercy, not overreach. Why make a sick person wait for a human when the machine already knows the answer?",
          "Because the machine does not know the answer. It produces an answer, fluently, whether or not it is right, and it produces the wrong ones in the same confident voice as the right ones. A prescription is an action with consequences a model cannot be accountable for, and accountability is not a nicety in medicine. It is the thing that makes the act permissible at all.",
        ],
        pullQuote:
          "In the gap where no doctor reaches, a model that could just prescribe looks like mercy. It is the line the design refuses to cross.",
      },
      {
        body: [
          "So the model stops short of the act, every time, by design rather than by reminder. It can suggest what a doctor might consider. It can surface an interaction, draft a note, flag a danger. What it cannot do is turn any of that into a prescription, because the step that makes a prescription real, a signature, is reserved to a licensed human and the model has no way to take it.",
          "This is not Glyph being cautious about liability. It is Glyph being correct about what a prescription is. A prescription is a person, a named and trained and accountable person, taking responsibility for a drug going into a body. Remove the person and you do not have a faster prescription. You have a guess with a dosage. The model's refusal to prescribe is not the limit of its usefulness. It is the precondition for being allowed to be useful at all.",
        ],
      },
    ],
  },
  {
    slug: "the-doctor-signs",
    kind: "essay",
    number: "20",
    title: "The doctor signs",
    tagline:
      "When the doctor approves, he is not approving the model. He is taking responsibility, with a key only he holds.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "What actually happens at the moment a doctor approves a note, and why that single act is what makes the AI safe to use.",
    sections: [
      {
        body: [
          "Everything the model does in a consultation is a draft until one thing happens: the doctor signs. The briefing, the suggested note, the flagged interaction, all of it sits in the category of proposal until a licensed human reviews it and puts his name on the result. The signing is not a formality at the end. It is the event the whole workflow exists to produce.",
          "And signing here is literal. The doctor approves the note and it is signed with his cryptographic key, the same key that identifies him across the network. In that moment two things happen at once. The draft becomes a decision, and the decision becomes traceable to a specific accountable human. Those are the same act, and neither can happen without him choosing it.",
        ],
        pullQuote:
          "The signing is not a formality at the end. It is the event the whole workflow exists to produce.",
      },
      {
        body: [
          "This is why the signature is the safety mechanism, not a feature beside it. A clinical AI is safe to use precisely to the degree that nothing it produces becomes an action without a human deciding to sign. Glyph is built so the model's output is always, structurally, a draft, and the doctor's key is the only thing that can promote a draft to a decision. The model cannot reach around him, because it has no key to sign with.",
          "It also means the accountability is never diffuse. When a Glyph prescription is questioned later, there is no shrugging at the algorithm. A named doctor signed it, with his own key, and the record proves it. That is heavier for the doctor than an anonymous paper scrawl, and it is meant to be. A system where a clinical act traces to an accountable human is the only kind that deserves trust, and the signature is how Glyph guarantees there is always one.",
        ],
      },
    ],
  },
  {
    slug: "the-confident-wrong-answer",
    kind: "essay",
    number: "21",
    title: "The confident wrong answer",
    tagline:
      "The danger is not the error. It is that the model delivers its wrong answers in the same certain voice as its right ones, to a doctor too tired to tell which is which.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "Why a clinical model that is right most of the time can be more dangerous than one that is right less often.",
    sections: [
      {
        body: [
          "There is a failure mode in human-machine teams that has nothing to do with the machine's accuracy and everything to do with its confidence. It is called automation complacency, and it is the reason a more accurate model can be more dangerous than a less accurate one.",
          "Picture the doctor at the end of a ninety-patient day. The model has been right ninety times. Each correct answer, delivered fluently and fast, has taught him a little more to trust it, until checking the output feels like wasted motion on a tool that is always right. Then comes the answer that is wrong, in the same calm confident voice as the ninety before it, and he is exactly as primed to accept it as he was the others. The ninety right answers did not make the system safer. They lowered his guard for the wrong one.",
        ],
        pullQuote:
          "Ninety right answers do not make the system safer. They lower the doctor's guard for the wrong one.",
      },
      {
        body: [
          "This is why accuracy is the wrong thing to optimize for past a point, and why Glyph treats every output as a draft no matter how good the model gets. A model that earns trust by being right is, by the same token, eroding the very checking that catches it when it is wrong. The only durable answer is structural: keep the human in a position where reviewing is required, not optional, so complacency cannot quietly remove the last line of defense.",
          "Practically, that means Glyph never presents an output as settled. It shows its sources so the doctor can check rather than trust. It flags its own uncertainty instead of smoothing it into fluent prose. It is built to keep the doctor deciding, because the moment he stops deciding and starts rubber-stamping, the model's confidence becomes the system's blind spot. The goal is not a model so good it is never doubted. It is a workflow where doubt never switches off.",
        ],
      },
    ],
  },
  {
    slug: "a-second-reader-never-the-signer",
    kind: "essay",
    number: "22",
    title: "A second reader, never the signer",
    tagline:
      "Bangladesh has about four radiologists per million people. The model's job is not to be the four-millionth-and-first. It is to make the four go further.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "How a model multiplies a scarce specialist instead of replacing him, in a country with four radiologists per million people.",
    sections: [
      {
        body: [
          "Bangladesh has roughly seven hundred radiologists for more than one hundred seventy million people, about four per million, almost all of them in Dhaka. A film taken in a district town can wait days for a read. The obvious thing for a capable vision model to do is read the film itself and skip the wait. It is also the wrong thing.",
          "Glyph's role at a diagnostic center is not radiologist replacement. It is co-interpretation. The model offers a draft observation, a likely finding, an urgency flag, to the technologist who took the film, and that draft routes to a remote radiologist who verifies and signs. The model reads first; the licensed human reads last and signs. The scarce specialist's hour is spent confirming structured drafts from many centers instead of reading cold films one at a time for one.",
        ],
        pullQuote: "The model reads first. The licensed human reads last, and signs.",
      },
      {
        body: [
          "The difference between replacement and co-interpretation is the difference between a report no one will trust and one that travels. A film read only by a machine is an unsigned guess, and the country has already learned what happens to diagnostic reports no accountable human stands behind. A film drafted by the model and signed by a radiologist is the radiologist's read, made faster. The scarcity is eased without the signature being cheapened, because a licensed human still puts his name on every report.",
          "This is where the model belongs in imaging: as the second reader that makes the first reader reachable, not as a substitute for the reader the country does not have enough of. It multiplies the four-per-million instead of pretending to be the four-million-and-first. The specialist stays in the loop, because his signature is the thing that makes the read worth anything, and the model's gift is to spend his scarce attention only where it counts.",
        ],
      },
    ],
  },
  {
    slug: "what-the-model-gives-back",
    kind: "essay",
    number: "23",
    title: "What the model gives back",
    tagline:
      "The model's product is not decisions. It is the attention a forty-eight-second visit had taken away from the doctor who has to make them.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "The case for clinical AI stated in the positive: not what it takes over, but what it returns to an overwhelmed doctor.",
    sections: [
      {
        body: [
          "Most of the argument for where the model belongs is stated in the negative: it does not diagnose, does not prescribe, does not decide. That restraint is right, but it can make the model sound like a tool defined by what it refuses to do. The positive case is simpler and more important. The model's job is to give the doctor back the one thing the system has been stealing from him: attention.",
          "A doctor with forty-eight seconds and ninety patients is not short on knowledge. He is short on time and attention, spent before he reaches each patient by the history he has no room to take, the bag he has no time to read, the note he has to write while the next patient waits. Every one of those is work the model can do around the visit, so the doctor walks into the forty-eight seconds already knowing what matters and walks out without losing the next minute to paperwork.",
        ],
        pullQuote:
          "The doctor is not short on knowledge. He is short on the attention the system spends before he reaches the patient.",
      },
      {
        body: [
          "Seen this way, the restraint and the usefulness are the same design. The model does everything around the decision precisely so the human has the attention to make the decision well. It is not competing with the doctor's judgment. It is clearing the ground so his judgment has room to operate, in a system that had crowded it out.",
          "This is the quiet reason the boundary holds in practice and not just in policy. A doctor does not resent a tool that hands him a prepared patient and takes the paperwork off his hands; he relies on it, and relying on it, he stays the decider. The model that tried to decide for him would meet resistance and deserve it. The model that gives him back his attention is welcomed, and earns the right to sit underneath his judgment by making that judgment possible at the pace the country demands.",
        ],
      },
    ],
  },
  {
    slug: "demand-nothing-of-the-doctor",
    kind: "essay",
    number: "24",
    title: "Demand nothing of the doctor",
    tagline:
      "A doctor running ninety consultations a day has no slack to learn software. Any product that asks for some has already lost.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "Why the first design law for software in a forty-eight-second clinic is that it asks the doctor to learn nothing.",
    sections: [
      {
        body: [
          "There is a design law for clinical software in Bangladesh that sounds like a constraint and is really the whole strategy: demand nothing of the doctor. A doctor seeing ninety patients in a day has no spare minutes, no patience for a tutorial, no appetite for a workflow that adds a step. Any product that asks him to learn it, change for it, or work around it has lost before it starts, no matter how good it is underneath.",
          "This rules out most of what clinical software usually does. No new system to log into in the middle of a visit. No fields to fill that the paper pad did not already have. No training day the clinic cannot spare. The bar is brutal and clarifying: if using Glyph costs the doctor attention during the forty-eight seconds, Glyph has taken the one thing it was supposed to give back.",
        ],
        pullQuote:
          "If using it costs the doctor attention during the forty-eight seconds, it has taken the one thing it was meant to give back.",
      },
      {
        body: [
          "So Glyph reduces the doctor's new behaviors to two: read a card, tap approve. The intake happened before he walked in. The briefing is already on the screen, red flags first. The note is already drafted in his format. His judgment is the only thing asked of him, and the act of recording it is a single tap. Everything else, the history, the reading, the writing, the signing machinery, runs around him.",
          "This is why Glyph can enter a chamber without a rollout. There is nothing to roll out. The doctor does on day one what he did before, sees patients and decides, and the software arranges itself around that instead of asking him to arrange himself around it. Demanding nothing is not a limitation the product apologizes for. It is the only way software ever survives contact with a ninety-patient day.",
        ],
      },
    ],
  },
  {
    slug: "the-history-happens-in-the-waiting-room",
    kind: "essay",
    number: "25",
    title: "The history happens in the waiting room",
    tagline:
      "The visit is forty-eight seconds and cannot take a history. So the history happens where the time actually is: the waiting room.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "The single move that makes everything else possible: taking the history before the visit, not during it.",
    sections: [
      {
        body: [
          "The forty-eight-second consultation has one unavoidable consequence: the visit cannot take a history. There is no version of forty-eight seconds that includes asking a patient about her symptoms, her past, her medications, and her family, and still leaves room to examine and decide. Every clinical system that assumes the history happens in the visit is assuming a visit Bangladesh does not have.",
          "So Glyph moves the history out of the visit and into the place where the time actually is: the waiting room. While the patient waits, often a long time, the intake happens, in Bangla, unhurried, voice-first, on a tablet. The questions a doctor would never have forty-eight seconds to ask get asked here, and the answers reach the doctor as a structured summary before the patient walks in.",
        ],
        pullQuote:
          "Every system that assumes the history happens in the visit is assuming a visit Bangladesh does not have.",
      },
      {
        body: [
          "This single relocation is what makes the rest of Glyph possible. The briefing exists because the history was taken in the waiting room. The red flags can be surfaced because someone, the model, had the time to look for them that the doctor never will. The plastic bag could be read because the reading happened before the visit, not during it. The waiting room, dead time in every clinic, becomes the part of the encounter where the listening happens.",
          "It also changes what the forty-eight seconds are for. Freed from taking the history, the visit becomes what it should be: the doctor, already briefed, spending his scarce attention on examining, deciding, and speaking to the patient, rather than on data collection a tablet could have done. The visit does not get longer. It gets better, because the work that never fit inside it has moved to the one place in the clinic that had time to spare.",
        ],
      },
    ],
  },
  {
    slug: "whose-words-were-those",
    kind: "essay",
    number: "26",
    title: "Whose words were those",
    tagline:
      "When a son answers for his mother, the doctor needs to know which words were hers. A symptom's source is part of the symptom.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "Why the most important question in a Bangladeshi consultation is who is speaking, and what it costs a doctor not to know.",
    sections: [
      {
        body: [
          "In a Bangladeshi consultation, the patient is often not the one talking. A son speaks for his elderly mother. A husband relays his wife's complaint. A relative translates a dialect the doctor does not share. By the time a symptom reaches the doctor, it may have passed through one or two other people, each of whom added, dropped, or reframed something without meaning to.",
          "This is not noise to filter out. The source of a symptom is part of the symptom. My mother has chest pain is a different clinical fact from my mother clutched her chest and would not say why, and a doctor who cannot tell which one he is hearing is reasoning on a story he cannot fully trust. In the accompanied visit, who said what is clinical information, and losing it is losing data.",
        ],
        pullQuote:
          "My mother has chest pain is a different clinical fact from my mother clutched her chest and would not say why.",
      },
      {
        body: [
          "So Glyph treats the speaker as a field, not an assumption. The intake resolves who is holding the device, and tags every claim with its origin: patient-reported, attendant-reported, attendant-translated, attendant-observed. When the patient's own account and the attendant's diverge, the divergence is kept and shown to the doctor, not smoothed into a single tidy narrative that hides the seam.",
          "A clinical AI built for a Western solo encounter has no place to put this, because it assumes the voice it hears is the patient's. That assumption is wrong here often enough to be dangerous, and getting it right is not a translation feature. It is a different model of what a consultation is: not one person describing herself, but a small group assembling an account, in which the doctor's job includes knowing who contributed which part. Glyph is built for that consultation, because that is the one that actually happens.",
        ],
      },
    ],
  },
  {
    slug: "the-pad-is-not-the-enemy",
    kind: "essay",
    number: "27",
    title: "The pad is not the enemy",
    tagline:
      "The paper pad is faster than any software for a doctor with forty-eight seconds. Fight it and you lose. Sign it and the paper becomes something more.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "Why every attempt to replace the paper prescription failed, and what it means to augment it instead.",
    sections: [
      {
        body: [
          "A decade of health-IT in Bangladesh has a common grave, and the headstone reads: it asked the doctor to stop using the pad. The electronic record that replaced the prescription was slower to fill than paper, in a visit with no time to spare, so the doctor kept the pad and abandoned the software. The pad won every time, and it won for a good reason.",
          "The paper prescription is faster than any form. It has no login, no fields, no latency, no dependence on the clinic's intermittent power or network. For a doctor with forty-eight seconds it is the most efficient interface ever devised, and the whole system around him, the pharmacy, the patient, the next clinic, already reads it. A product that treats the pad as the problem has mistaken the most successful tool in the building for the obstacle.",
        ],
        pullQuote:
          "A decade of health-IT shares one grave. The headstone reads: it asked the doctor to stop using the pad.",
      },
      {
        body: [
          "Glyph does the opposite. It augments the pad instead of replacing it. The doctor still produces a prescription; what changes is that on approval it is drafted in the format he already uses and signed with his cryptographic key, so the paper in the patient's hand now has a verifiable twin the rest of the network can check. He does not give up the speed of paper. He gains the proof paper never had.",
          "This is the difference between fighting a habit and building on it. The pad is not behind the times; it is the record's oldest and most reliable form, and the right move is to keep it and add what it lacks, which is a signature that travels. A patient who trusts the paper keeps the paper. A pharmacy that needs proof gets the signature. Nobody is asked to change, and the record becomes verifiable anyway. That is what it means to meet the clinic that exists instead of the one a vendor wishes it were.",
        ],
      },
    ],
  },
  {
    slug: "cost-is-a-dose",
    kind: "essay",
    number: "28",
    title: "Cost is a dose",
    tagline:
      "Seventy-three percent of Bangladeshi health spending is out of pocket. The unaffordable correct answer is, for that patient, a wrong one.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "Why in a system that runs on out-of-pocket cash, the correct treatment a patient cannot afford is a wrong answer.",
    sections: [
      {
        body: [
          "In Bangladesh seventy-three percent of health spending comes straight from the patient's pocket, and health costs push four and a half percent of the population into poverty every year. In that system, the price of a test or a drug is not an administrative detail. It is part of whether the treatment happens at all. A correct prescription the patient cannot afford is not a correct prescription. It is advice that will not be followed, which is the same as no advice, at a cost the family still pays in worry.",
          "This makes cost a clinical variable, as real as a lab value. A clinical tool that recommends the textbook-best investigation without regard to its price is giving an answer that looks right on paper and fails at the pharmacy counter. The right answer in this system is the cheapest one that actually resolves the question, and that is a medical judgment, not a budgeting one.",
        ],
        pullQuote:
          "A correct prescription the patient cannot afford is not a correct prescription. It is advice that will not be followed.",
      },
      {
        body: [
          "So Glyph carries cost the way it carries any clinical fact. It reaches for Bangladeshi brand and generic names a patient can find and afford, Napa rather than Tylenol, the local generic rather than the imported brand, instead of the Western defaults a foreign-trained model offers first. It prefers the investigation that answers the question at a price the patient can pay over the one a wealthier system would order by reflex. And it surfaces these as options, with their costs, for the doctor to weigh.",
          "None of this is the model deciding to economize for the patient. It is the model refusing to pretend that cost is somebody else's department. In a system with insurance and gatekeepers, a doctor can leave price to the back office. In a system that runs on cash from a day laborer's pocket, leaving cost out of the clinical picture is not neutrality. It is a way of being confidently, tidily wrong about what this patient can actually do.",
        ],
      },
    ],
  },
  {
    slug: "pocket-the-record-in-her-own-hand",
    kind: "essay",
    number: "29",
    title: "Pocket: the record in her own hand",
    tagline:
      "Every credential the network signs has to land somewhere the patient actually holds. That somewhere is Pocket, and it is the spine made visible.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "Why the patient's wallet is not a new product, but the patient-owned record finally placed in the patient's hand.",
    sections: [
      {
        body: [
          "For most Bangladeshis the front door of the health system is the pharmacy, not the doctor. A Dhaka study of people seeking care for respiratory illness found only one in ten had seen any other provider first. Self-medication runs as high as eighty-eight percent in some surveys, guided by an old prescription, a relative's advice, the internet. The reason is rational: the pharmacy is near, the doctor is far, and no one keeps the patient's story anyway.",
          "But the phone is already in the house. The national statistics bureau counts mobile phones in ninety-nine percent of households and smartphones in seventy-two percent, and the Surokkha vaccination platform reached roughly sixty million people, proof that Bangladeshis adopt a digital health credential when it is simple and necessary. The story has nowhere to live, and the device to hold it is already in hand.",
        ],
        pullQuote:
          "The patient's story has nowhere to live, and the device to hold it is already in her hand.",
      },
      {
        body: [
          "Pocket is not a new idea bolted onto Glyph. It is the patient-owned record from the white paper, finally given a place to sit. Every credential the network signs, a prescription from a chamber, a result from a lab, a dispensing from a pharmacy, a discharge from a hospital, lands in the patient's wallet, signed by whoever issued it. The patient can photograph the old paper too, turning the existing plastic bag into the opening balance of a record that now proves itself.",
          "Once you have decided the record belongs to the patient and is portable by standard, Pocket is what that decision looks like in a hand: free, in Bangla, built for a shared family phone and thin data. It is the spine made visible to the person it was always for. Everything else in the network issues claims; Pocket is where the person who owns them keeps them, and where, before she walks to the pharmacy, she can finally ask a question of a record that knows her.",
        ],
      },
    ],
  },
  {
    slug: "pharmacy-the-prescription-becomes-a-control",
    kind: "essay",
    number: "30",
    title: "Pharmacy: the prescription becomes a control",
    tagline:
      "Between half and ninety-two percent of antibiotics are sold with no prescription. The signature is what lets a counter tell a real one from a hunch.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "How a signed credential turns the most ignored rule in Bangladeshi healthcare into one a counter can actually enforce.",
    sections: [
      {
        body: [
          "Bangladesh's antibiotics are rationed at the drug-shop counter, by sales instinct, not clinical judgment. The studies escalate rather than disagree: a WHO-linked classification found half of antibiotic courses sold without a registered physician's prescription; a 2024 study across two hundred forty-six Dhaka pharmacies found only thirty-six percent sold against one; a survey of pharmacy staff found ninety-two percent dispensing antibiotics without a prescription at all. The dispenser is usually not a pharmacist, and when asked why, the answer is economic: ninety-nine percent of rural dispensers feared losing the customer.",
          "The law against over-the-counter antibiotic sale exists. Enforcement does not, because at the counter a real prescription, a forged one, and no prescription at all look exactly alike. There is nothing to check against.",
        ],
        pullQuote:
          "The law against selling antibiotics over the counter exists. The thing to check it against does not.",
      },
      {
        body: [
          "Glyph Pharmacy is the same spine, pointed at the counter. The prescription the chamber doctor signed with his key is verifiable by anyone, including a dispenser on a basic phone. With the patient's consent, the wallet returns the active prescription: what was prescribed, by whom, when, and for how long, signed by a real BMDC-anchored identity. The forged prescription fails the check. The antibiotic bought on a hunch has nothing to return. The dispensing itself is written back as a signed credential, so a course abandoned on day three becomes visible to the prescriber.",
          "Nothing here is new machinery. It is the signed credential from the identity layer, checked at a counter instead of trusted on paper. Sweden and Denmark brought antibiotic dispensing under control the same way, by making the prescription a system record rather than a slip of paper, and Pharmacy is that loop adapted to a counter staffed by a non-pharmacist. The prescription stops being a thing a salesperson can ignore and becomes a control the network can verify. That control falls straight out of the signature.",
        ],
      },
    ],
  },
  {
    slug: "lens-a-result-worth-its-signature",
    kind: "essay",
    number: "31",
    title: "Lens: a result worth its signature",
    tagline:
      "The country has four radiologists per million people and reports signed by doctors who never saw the film. The fix is the same signature the prescription already uses.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "Why a lab result becomes trustworthy the same way a prescription does, by carrying the signature of whoever stands behind it.",
    sections: [
      {
        body: [
          "Bangladesh has about four radiologists per million people, almost all in Dhaka, and a film taken in a district town can wait days for a read. Worse than the wait is the trust. The health directorate's 2022 crackdown closed over eleven hundred illegal facilities in its first days, and sector reporting describes reports printed over the names of physicians who never saw the image. The country has already seen what happens when reports lose credibility: during COVID, after a fake-certificate scandal, daily testing nearly halved because people stopped believing the results.",
          "The regulator reached for the obvious fix with the only tool it had, ordering every facility to display a QR code on its signboard. That instinct, verification, was right. A sticker on a wall was not the way to deliver it.",
        ],
        pullQuote: "A report is only worth what its signature is worth.",
      },
      {
        body: [
          "Lens is the same spine, applied to the diagnostic report. A result leaves the center as a credential signed by the center and by the professional who verified it, landing in the patient's wallet with its reference ranges and its provenance intact. The report over a radiologist's name now requires that radiologist's actual key, so the ghost-signed report dies at a participating center. And because the model reads first and a licensed human signs last, the four-per-million specialist is multiplied rather than bypassed, exactly the boundary the model essays describe.",
          "The QR sticker and the signed credential are after the same thing: a report you can trust without knowing the lab. The difference is that a sticker proves nothing and a signature proves the things that matter, who made this claim and whether it was altered. Lens is not a new trust mechanism invented for imaging. It is the prescription's signature, pointed at a lab result, so a report from a known chain finally weighs more than one off a roadside shop, and the difference travels with it.",
        ],
      },
    ],
  },
  {
    slug: "hospital-the-stranger-at-2am",
    kind: "essay",
    number: "32",
    title: "Hospital: the stranger at 2am",
    tagline:
      "A man arrives unconscious at 2am and the duty doctor starts from zero. The record that would have known him is the one the patient already carries.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "Why the continuity layer a ward needs is the patient-owned record, not another hospital information system.",
    sections: [
      {
        body: [
          "A medicine ward built for forty beds holds sixty-three. A fifty-eight-year-old arrives at 2am, unconscious, brought by relatives who know only that he takes gas tablets and something for pressure. There is no referral note, because no one referred him. The duty doctor starts from zero on a stranger, at night, in a corridor. The inpatient prescribing study that found six hundred ninety-two medication problems in two hundred orders was run in exactly this setting, and the errors begin with not knowing what the patient was already taking.",
          "Eleven days later he leaves with a few handwritten lines that go into the plastic bag and are never seen by another clinician. Admission starts from nothing; discharge ends in nothing. Both are information failures, at the two moments information matters most.",
        ],
        pullQuote:
          "Admission starts from nothing. Discharge ends in nothing. Both are failures of a record that should have traveled.",
      },
      {
        body: [
          "Hospital is deliberately not another hospital information system; the graveyards are full of those. It is the continuity layer, the same spine made institutional. At admission, the patient or the relative holding her phone presents the wallet, and with consent, or through a break-glass protocol that is read-only, time-boxed, and audited, the duty doctor sees in thirty seconds what no Bangladeshi admission has ever had: the active medications, the allergies, the recent labs, the chamber visit two weeks ago where the warning already appeared. At discharge, the summary leaves as a signed credential in the wallet, not a slip that dies at the door.",
          "The hospital does not adopt a new database it has to fill. It becomes one more issuer signing onto a record the patient already owns, and one more reader of it. That is the whole move: the institution stops being an island and becomes a node in the patient's record. Admission with a history, discharge that travels, referral that arrives before the ambulance, none of these are new systems. They are the portable record from the white paper, finally reaching the ward at 2am.",
        ],
      },
    ],
  },
  {
    slug: "continuity-the-worker-the-border-erased",
    kind: "essay",
    number: "33",
    title: "Continuity: the worker the border erased",
    tagline:
      "Health status abroad is a deportation weapon, so the worker hides his symptoms. A record only he can unlock is the difference between care and self-incrimination.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "Why patient-held keys are what let fifteen million migrant workers carry a health record their employer can never see.",
    sections: [
      {
        body: [
          "Roughly fifteen million Bangladeshis work abroad and send home nearly twenty-four billion dollars a year. The work is dangerous at documented rates, and the wall between the worker and care is not only distance and cost. It is that health status, in the wrong hands, ends a livelihood. A positive tuberculosis result at permit renewal can cancel the permit, which teaches the worker to hide symptoms and arrive home, years later, mid-disease.",
          "So a health record for this worker has a hard requirement most systems never face. It must be useful to him and invisible to his employer and the destination state. A record they can reach is not a convenience for him. It is a file that can be used against him.",
        ],
        pullQuote:
          "For the migrant worker, a record his employer can reach is not a convenience. It is a self-incrimination file.",
      },
      {
        body: [
          "This is where patient-held keys stop being a principle and become the product. Because the record is encrypted to keys the worker holds, it is unreadable to anyone he has not allowed, including the people who could deport him for what it says. That is the same property the identity layer gives the factory worker hiding a pregnancy, pointed across a border. Continuity provisions his wallet before he leaves, on the pre-departure registration rail he already has to stand on, and anchors him to a Bangladeshi physician who reviews his voice notes in his own dialect, on his own schedule, invisibly.",
          "Continuity is not telemedicine invented for migrants. It is the same spine: a portable, patient-owned, patient-locked record, with the keys doing the one job that matters most for this population. The worker carries a clinical identity into the Gulf and home again, across the border that used to erase him, and the only person who can open it is the person it belongs to. Take the keys away from the patient and there is no version of this that is safe. Leave them with him, and the record that would have been a danger becomes the thing that finally follows him home.",
        ],
      },
    ],
  },
  {
    slug: "karigor-the-room-that-hides-her",
    kind: "essay",
    number: "34",
    title: "Karigor: the room that hides her",
    tagline:
      "The factory pays for the medical room and wants proof it is used. The worker needs it to hide her pregnancy. One record does both, because the keys are hers.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "How the same architecture serves a garment factory and protects the worker from it at the same time.",
    sections: [
      {
        body: [
          "Bangladesh's garment industry employs about three million workers, a slim majority of them women, and the law already mandates a medical room scaled to the workforce. The published assessment is consistent: the rooms exist on paper, for the buyer audit, and the workers do not use them. The reasons are documented, and the sharpest is this. Pregnancy concealment is a known exit driver, because women have watched what happens to those who tell. A worker will buy Panadol and keep sewing rather than walk into a room she does not trust.",
          "So the factory medical room has a contradiction at its heart. The factory pays for it and wants proof it is used. The worker will only use it if what she says inside cannot reach the factory. A normal record cannot satisfy both. A factory-readable health record, in a sector where pregnancy discrimination drives women out, is a weapon aimed at the people it claims to serve.",
        ],
        pullQuote:
          "A factory-readable health record, where pregnancy drives women out, is a weapon aimed at the people it claims to serve.",
      },
      {
        body: [
          "Karigor resolves the contradiction with the spine, not a policy promise. The room is staffed by a trained health assistant with a tablet, and every encounter writes to the worker's own wallet, under her key, on a device the factory cannot read. Her early-pregnancy consultation is a shielded category, visible to her and the clinicians she chooses and to no one else. What management receives is what it actually needs and the buyer audits: signed compliance credentials and de-identified aggregates, the room is staffed, the encounters are happening, never an individual record.",
          "This is the patient who must not be named, given a place to work. The same machinery that hides her from her employer is the machinery the employer paid for, and that is not a contradiction the design tolerates; it is the design. And when she leaves at thirty-five, her decade of occupational health history leaves with her, because it was always hers. Karigor is not a special confidential product. It is patient-held keys, pointed at the one place a health record is most likely to be turned against the patient.",
        ],
      },
    ],
  },
  {
    slug: "maa-not-a-stranger-at-the-third-door",
    kind: "essay",
    number: "35",
    title: "Maa: not a stranger at the third door",
    tagline:
      "The mothers who died of preeclampsia sought care, at more than one facility, and were met as strangers at every door. The record that knows them is the whole intervention.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "Why the maternal deaths the system has stopped preventing are routing failures the portable record is built to fix.",
    sections: [
      {
        body: [
          "Bangladesh's maternal mortality fell for a decade and then plateaued, and the stalled cause is the detectable one. Deaths from preeclampsia and eclampsia stopped falling and now make up about a quarter of maternal deaths, three-quarters of them rural. The condition announces itself through blood pressure, weeks before it kills, with a reading a trained neighbor can take with a cheap cuff. This is not a treatment gap. It is a surveillance gap.",
          "And the finding that defines the product: the verbal autopsies show that almost all the women who died had left home and sought care, most at more than one facility. Each facility met the dying woman as a stranger, with no history, no blood-pressure trend, no warning she was coming. These are routing and information deaths, the same disease the plastic bag has, at the moment it is most lethal.",
        ],
        pullQuote:
          "The women who died sought care. The system met them as strangers at every door they reached.",
      },
      {
        body: [
          "Maa is the portable record, pointed at pregnancy. Every contact, a community health worker, a pharmacy corner, a factory room, captures a blood-pressure reading into the mother's wallet, and the trend, not the single value, is watched. A climbing trajectory escalates under national protocol, and the receiving facility, where connected, sees her record and her warning before she arrives. The woman who today reaches her third facility as a stranger arrives instead as an expected patient at the right first one.",
          "Nothing in Maa is a new kind of record. It is the same patient-owned, portable, signed record that turns a bag of paper into a person, applied to the one history whose absence is measured in lives. The surveillance is the spine doing what it always does, carrying a verifiable history to the next provider, except here the next provider is an emergency obstetric ward and the history is a blood-pressure trend that arrives in time. Maa detects and routes; it does not treat. But the stranger at the third door is exactly the failure a record that travels was built to end.",
        ],
      },
    ],
  },
  {
    slug: "bridge-dont-believe-the-paper-verify-the-signature",
    kind: "essay",
    number: "36",
    title: "Bridge: don't believe the paper, verify the signature",
    tagline:
      "Families fly abroad because nobody trusts the local report, the machine, or the signature. A credential a foreign specialist can verify is the cheapest thing that keeps them home.",
    readMinutes: 4,
    date: "June 2026",
    published: true,
    standfirst:
      "Why the billions Bangladesh spends on overseas treatment are a trust gap, and trust is what verifiable credentials manufacture.",
    sections: [
      {
        body: [
          "Bangladeshis spend an estimated four to five billion dollars a year on overseas medical treatment, more than the government's entire health budget, with India alone recording close to half a million Bangladeshi medical travelers in a single year. When Dhaka's own commercial establishment examined why, the answer was not a technology gap; Dhaka has the scanners. The named drivers were lack of trust, doubts over the diagnosis, and fear of counterfeit medicine.",
          "The cost of that mistrust is paid twice. The family spends years of a pension on a trip taken mostly to confirm a diagnosis, and the foreign oncologist spends the first two days re-doing tests, because she cannot read or trust what came out of the shopping bag. The outflow is a trust gap, and trust is precisely what a verifiable credential manufactures.",
        ],
        pullQuote:
          "The outflow is not a technology gap. It is a trust gap, and trust is what a verifiable credential manufactures.",
      },
      {
        body: [
          "Bridge is the spine, pointed across the border. From the patient's wallet, with consent, it assembles a specialist-ready dossier: history, medications by generic name, labs and imaging as signed credentials, every item verifiable against its issuer's published key, translated into clinical English with the Bangla originals attached. The two days of re-testing exist because the bag is unreadable and untrustworthy. The bundle is neither. The foreign specialist's opinion returns as a signed credential to the patient's Bangladeshi doctor, because the same line the model essays drew holds here between humans: the foreign specialist informs, the locally licensed doctor decides.",
          "Bridge invents no new trust. It takes the credentials the network already signs and lets a specialist in Chennai or Bangkok check them against the issuers' keys, exactly as a pharmacy in Khulna does. The instruction the product gives the family is the instruction the whole network is built on: do not believe the paper, verify the signature. For the family weighing thirty thousand dollars and a visa, a verifiable second opinion is often the thing that proves the trip was never necessary, and that proof falls out of the same spine that signs a prescription.",
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

/**
 * Essay clusters shown on the index, in order. Each groups a contiguous
 * run of essays under the paper (or theme) they follow from, so the long
 * flat list reads as four clusters plus the module series.
 */
export interface EssayCluster {
  title: string;
  blurb: string;
  /** The paper this cluster follows from, linked from the heading. */
  paperSlug?: string;
  /** Inclusive essay-number range belonging to this cluster. */
  range: [number, number];
}

export const WRITING_ESSAY_CLUSTERS: EssayCluster[] = [
  {
    title: "Anatomy of a plastic bag",
    blurb: "The identity layer, turned every way.",
    paperSlug: "anatomy-of-a-plastic-bag",
    range: [1, 9],
  },
  {
    title: "Sovereign by necessity",
    blurb: "Why the clinical model has to come home.",
    paperSlug: "sovereign-by-necessity",
    range: [10, 18],
  },
  {
    title: "Where the model belongs",
    blurb: "The line between the model, the doctor, and the signature.",
    paperSlug: "where-the-model-belongs",
    range: [19, 23],
  },
  {
    title: "Meeting the clinic that exists",
    blurb: "Designing for the forty-eight-second visit.",
    paperSlug: "meeting-the-clinic-that-exists",
    range: [24, 28],
  },
  {
    title: "One spine, every setting",
    blurb: "How each Glyph surface falls out of the same record.",
    range: [29, 36],
  },
];

/** Essays belonging to a cluster, in order. */
export function essaysInCluster(cluster: EssayCluster): WritingPiece[] {
  return WRITING_ESSAYS.filter((e) => {
    const n = e.number ? parseInt(e.number, 10) : 0;
    return n >= cluster.range[0] && n <= cluster.range[1];
  });
}
