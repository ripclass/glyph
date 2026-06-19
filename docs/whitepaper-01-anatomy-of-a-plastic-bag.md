# Anatomy of a Plastic Bag

### A white paper on clinical identity infrastructure for Bangladesh

**KhaM Health · Dhaka · June 2026**

---

## The object every patient carries

Every patient in Bangladesh carries the same thing. A plastic bag, knotted at the top. Inside it: prescriptions on different pads in different hands, lab reports from three diagnostic centers, a discharge summary from a hospital admission two years ago, an X-ray in an envelope too big for the bag. The patient has waited two hours for the visit. The doctor has, on average, forty-eight seconds. He cannot read the bag in forty-eight seconds. He writes anyway, on what the patient can tell him and what he can guess.

For ten years the country has tried to fix this by digitizing the bag. Scan the papers. Build an app. Give the patient a portal. Every health-IT project has been a version of this, and every one has produced a database a few thousand people log into and the rest forget. The bag outlives all of them.

The bag is not the problem. The bag is the symptom. This paper is about the disease.

---

## What is actually broken

The problem is that the patient in the bag is a different person at every visit. Known to the Mirpur doctor for one encounter. Known to the Chittagong doctor for one encounter. Known to the pharmacy for the length of one sale. Nothing connects these encounters into one continuous person, verifiable by the next provider, owned by the patient.

The information is not missing. It is in the bag. What is missing is identity. A persistent, verifiable thread that says this is the same person, here is what is true about them, signed by the people who would know.

Once you see that, the failures of Bangladeshi healthcare stop looking like separate problems and start looking like one problem in different clothes.

The antibiotic sold without a prescription, somewhere between half of all courses and ninety-two percent of dispensers depending on which study you read. That looks like a pharmacy problem. Underneath it is identity. The counter cannot verify that a real, registered doctor authorized this drug for this person, so a customer with cash and a patient with a prescription look exactly alike.

The migrant worker invisible to every doctor at home for eight years, one of fifteen million who send back twenty-four billion dollars a year. That looks like a distance problem. Underneath it is identity. His history does not travel, because it was never tied to a portable identifier, so the man who comes home is a stranger to the system he funded.

The mother who reached a clinic and died anyway. Preeclampsia is back to a quarter of all maternal deaths, most of them rural, most of them women who sought care and were met as strangers at every door they reached. That looks like a treatment problem. Underneath it is identity. She arrived with no thread a provider could read in the one minute that decided whether she lived.

The forged certificate. The lab report no one can trace to a lab. The patient handed four prescriptions by four doctors who each saw a fragment of the bag. The medical council that admitted, in 2024, that it cannot tell a licensed doctor from a forged one, with thirty-six thousand registrations unrenewed and an unknown number fake.

Different surfaces. One thing broken underneath all of them. There is no persistent, verifiable identity connecting a person to the claims made about them. So every encounter starts at zero, every claim is unverifiable, and every history is a bag.

---

## What a record is, when it is built right

A record, in most systems, is a row. A prescription is a row in a prescriptions table. The row belongs to the institution that wrote it, lives in that institution's database, and dies at the door, because the next institution cannot reach it and would not trust it if it could.

A record built right is not a row. It is a credential. A signed, verifiable claim, bound to a person, issued by whoever had the authority to make it.

Here is the shape, from one ordinary visit. A prescription, after the doctor approves the note:

```json
{
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  "type": ["VerifiableCredential", "PrescriptionCredential"],
  "issuer": "did:web:glyph.health:doctor:bmdc-A-54219",
  "credentialSubject": {
    "id": "did:web:glyph.health:patient:01HQXR7E9N",
    "diagnosis": "Hypertension; Type-2 Diabetes Mellitus",
    "medications": [
      { "generic": "Amlodipine", "dose": "5mg", "frequency": "1+0+0", "days": 30 }
    ]
  },
  "issuanceDate": "2026-04-22T15:47:00+06:00",
  "proof": {
    "type": "Ed25519Signature2020",
    "verificationMethod": "did:web:glyph.health:doctor:bmdc-A-54219#key-1"
  }
}
```

The claim sits in one place. Who made it sits in another. The proof that no one altered it sits in a third. The patient's identifier resolves over ordinary HTTPS to a document holding their public key. The doctor's resolves to his. A pharmacy in Khulna can check the signature against the doctor's published key without a KhaM Health account, without asking permission, without trusting KhaM Health at all. It needs the key, and the key is public.

Do this once and you have a verifiable prescription. Do it for every clinical event a person collects, each signed by whoever was authoritative for it, and something changes in kind. The row becomes a claim. The pile becomes a person. The bag becomes a wallet that proves itself.

And the claims start to talk to each other. A doctor about to prescribe can walk the patient's full set of active credentials and see the beta-blocker another doctor started three months ago before he adds a second one. A pharmacy can see the antibiotic course dispensed last week before it hands over another. The value is not one record. It is the graph the records form once they share an identity, and the safety checks that graph makes possible. A pile of paper cannot be walked. A set of signed claims can.

The cryptography under all of this is deliberately dull. Ed25519 is the signature in SSH, in Signal, in the lock icon on every bank login in the country. did:web resolves over the same web as everything else. No blockchain. No token. No seed phrase for a grandmother to lose. National health infrastructure should be the most boring thing in the room.

---

## Who the patient is

Before a person can hold a credential, the system has to know who they are. In Bangladesh this is harder than it sounds, and a single national ID number is not the answer, because the people who need this most are the people a national ID serves worst.

So identity here is anchored from many directions, not one. A national ID where it exists. A passport. A pre-departure registration for the worker going abroad. An embassy attestation for the man whose papers are in a drawer in a labor camp. A birth certificate for the newborn who has no other document yet. A person's identity is built from whichever anchors they have, checked against each other, strengthened as more arrive. A worker who starts with a passport and a pre-departure record can add a national ID later. The thread does not break while he waits.

And for some people the safest anchor is none at all. A woman hiding a pregnancy from a factory that fires pregnant women. A patient with a stigmatized diagnosis. A refugee for whom a government-linked record is a danger, not a convenience. For them the network supports an anonymous mode, reached through a trusted intermediary, where the care is real and the identity points nowhere. The same machinery that proves a doctor's registration to a pharmacy can prove just enough about a patient to treat them and nothing more. An identity layer that cannot serve the person with the most to lose is not infrastructure. It is a club for the people who were already safe.

---

## The keys belong to the patient

There is a line in this design that decides everything above it. The keys belong to the patient.

The record is not the doctor's. Not the factory's. Not the ministry's. Not KhaM Health's. It is the patient's, held in a wallet on a cheap phone, and nothing in it is readable by anyone the patient has not allowed. This is not a promise in a privacy policy. It is cryptography. A shielded consultation is invisible to a factory-owned device because the factory does not hold the key, not because an app agreed to hide it.

Patient-held keys are what let one system serve two opposite people. The mother who wants her husband to get every reminder, and the mother who must not have him get any. The worker whose family watches over his blood pressure from four thousand kilometers, and the worker whose health status, in the wrong hands, is a reason to cancel his permit and put him on a plane. A database decides who sees. A wallet lets the patient decide, and lets them take the decision back. For these people that difference is not privacy in the abstract. It is measured in firings, in deportations, in safety.

---

## Why one layer serves every case

One identity layer can serve a chamber doctor, a migrant worker, a pregnant woman, a pharmacist, and a patient who must stay anonymous, because of a single move. Each authoritative entity signs the thing it alone is authoritative for. It signs once. The signature travels everywhere the patient goes.

The medical council signs a doctor's registration once. That credential is now verifiable inside every prescription he writes, every pharmacy that checks his authority, every consultation across a border. The council does not adopt a platform. It becomes an issuer, and its stamp becomes portable across the whole system. A portable stamp is worth more than a stamp locked in one registry, and that is the only argument an institution actually answers.

A diagnostic center signs a result once, and the result carries its origin for the rest of the patient's life. A result from a known chain weighs differently from one off a roadside shop, and the signature carries the difference, so trust becomes a thing you compute instead of a thing you guess. A pharmacy signs a dispensing event once, and the patient cannot come back next month for the same antibiotic without a fresh signed prescription. The pre-departure office signs a worker's registration once, and the worker carries a verifiable clinical identity into the Gulf and home again, across the border that used to erase him.

The stamps reinforce each other. Each authoritative signature makes the next check cheaper and the whole network more trustworthy. Trust here is not a property of KhaM Health. It is a property of the issuers, spread across the institutions that were already authoritative in the physical world. No one organization owns it.

---

## Where the application stops and the identity begins

None of this is the product a doctor sees. The product a doctor sees is an application. A chamber workflow. A diagnostic center's upload screen. A pharmacist's verification check. A patient's wallet on a cheap Android phone. There will be many of these, and KhaM Health builds the first ones. But the applications sit on top of the identity layer. They do not own it. That line is the whole architecture.

The identity layer is public-good infrastructure: the persistent identifier for every patient, doctor, clinic, lab, and pharmacy, and the credentials the issuers sign onto it. The application layer is where anyone, including KhaM Health, competes on being good. A future government application could be built on the same identifiers without depending on KhaM Health at all. A competing clinical product in five years could read the same wallet, because the patient owns the wallet and the standards are open. KhaM Health wins by building the best application, not by trapping the record.

This is what lets the eventual conversation with the state be one it can say yes to. Not "trust this private company with the nation's health data." Instead: the identity layer already runs on open W3C standards, already serves these patients and these doctors, the authorities already issue their own credentials onto it, and the state can formalize that without locking the country to anyone.

---

## Single operator, said plainly

One claim has to be made carefully, because the easy version of it is a lie.

This is not a decentralized, trustless network. did:web resolves over a domain one operator maintains. If that operator disappears, the identifiers stop resolving. Anyone who says otherwise is selling the blockchain version of this, which the country does not need and a grandmother cannot use.

What is true is smaller and stronger. The network is single-operator, on open standards. The wallet exports. The credentials are W3C standard. The signatures verify against published keys with no dependence on KhaM Health staying alive or staying good. The honest claim is portability, not trustlessness, with a succession obligation written into the structure so the operator's mortality is not the network's. One person holds the registry today. The standards are built so one person does not have to hold it forever.

That is a smaller promise than decentralization. It survives an audit. That is the only kind worth making for a thing a country's health depends on.

---

## What this is

It is the identity layer. The persistent, verifiable thread beneath every clinical claim, that turns a bag of unverifiable paper into a person who is the same person everywhere, carrying credentials that verify themselves against the institutions that signed them. Owned by the patient. Portable by standard. Traceable to the issuer. Honest about the one operator who holds the registry.

Bangladesh's healthcare failures were never failures of record-keeping. The records exist. They are in the bag. The failures were failures of identity, of the missing thread that would have made one patient one person across a lifetime. This is the work of building that thread, so a doctor can trust what he reads, a pharmacy can verify what it dispenses, a mother is not a stranger when she arrives, and a worker is not erased at the border.

The bag was never the problem. The bag was the symptom.

---

*KhaM Health builds clinical identity infrastructure for Bangladesh. The clinical interface, Glyph, is live, and every product on the network can be reached today, some in production and the rest shipping. This paper describes the identity layer, not the applications above it. The credentials are the asset, and they belong to the patient.*

*In memory of Khayer and Mamataj.*
*Dhaka, June 2026.*
