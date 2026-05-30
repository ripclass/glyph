# GLYPH — Product Vision v3.1

**KhaMlabs Inc. · Dhaka, Bangladesh · April 2026**
**Document type: internal northstar / architectural blueprint. Single intended reader: the founder. Not written to persuade an external audience.**

> Thesis, stated once and not repeated: Glyph is not a clinical scribe. Glyph is the identity and credential layer underneath clinical interactions across Bangladesh and its diaspora. The scribe-style features are the entry point; the persistent clinical record is the product.

---

## How to read this document

This is a blueprint, not a pitch. It holds the **complete** intended architecture in view — including features that will not be built for two or three years — because decisions made now (the identifier schema, the credential model, the consent layer) must not foreclose what comes later. A feature appearing here is a commitment to *design-compatibility*, not a claim that it is running.

Throughout, three labels mark build status honestly:

- **[LIVE]** — exists in the codebase today, even if partially mocked.
- **[SCAFFOLDED]** — architecture defined, primitives adaptable from existing work (mainly the Enso Identity Network), not yet built into Glyph.
- **[RESERVED]** — intentional space in the design. Named so today's foundations stay compatible with it. Not scheduled.

Where this document previously asserted impact figures, market claims, or "nobody else can do this," those have been removed or replaced with what is actually defensible. A northstar that flatters its author is a compass with a magnet taped to it.

---

## SECTION 1 — Executive summary

Bangladesh has roughly 115,000 registered doctors for ~170 million people domestically, plus ~13 million citizens working abroad. The typical domestic consultation runs about seven minutes. The typical migrant worker has not seen a Bangladeshi doctor since departure. The typical garment worker has no functional healthcare at her workplace despite a legal mandate. The typical rural pregnant woman receives inconsistent antenatal care.

The plastic bag of paper prescriptions, the unread lab report, the attendant who speaks over the patient, the antibiotic dispensed without a prescription, the chronic disease ignored until emergency, the preventable maternal death — these are not failures of individual clinicians. They are the consequences of a country that has never had clinical infrastructure: no persistent thread connecting a patient's clinical events across time, place, and institution.

**What Glyph is.** A persistent decentralized identifier (`did:web`) for every patient, doctor, clinic, diagnostic centre, pharmacy, hospital, and factory medical room, anchored to one or more verified identity credentials (NID, passport, BMET registration, embassy attestation, birth certificate). Every clinical event becomes a Verifiable Credential signed by the entity authoritative for it. The patient holds the wallet. Applications consume the identity layer.

**What Glyph is not (and this matters for the operator who runs it).** It is *not* a trustless, ownerless network. KhaMlabs operates the registry, the resolution endpoint, the matching engine, and the application layer. The decentralization is in the *standards*, not the *operator*: open W3C primitives mean patients are not locked in, credentials remain verifiable by anyone holding an issuer's public key, and a successor could in principle continue the network if KhaMlabs ceased to exist. That last property is not automatic — it has to be built (see Section 5: succession and portability). Until it is, Glyph is a **single-operator network on portable open standards**, and the document will say so plainly everywhere.

**Why now, from Dhaka.** PDPO 2025 enforcement begins ~May 2027. Antimicrobial resistance is killing Bangladeshis at scale. 13 million migrant workers have no clinical continuity across borders. Several million garment workers have no workplace healthcare despite the law. Maternal mortality is roughly 156 per 100,000 live births — far better than two decades ago, still many times Western Europe's. The family-physician relationship that anchors primary care elsewhere does not exist for the populations that most need it.

**Honest statement of the build's nature.** This is being built by a solo founder, alongside a wider ecosystem (KhaM, the Enso Identity Network, RulHub, and others), with no institutional fallback. The hard cognitive work — architecture, clinical reasoning, the model layer — is done by the founder plus AI tooling, *by design*. Hiring is for operators and field/relationship roles, not for the senior engineers the local market cannot reliably supply (see Section 21). The single largest risk in this entire document is founder capacity, and it is treated as an architecture problem, not a motivational one.

---

## SECTION 2 — The problem: Bangladesh has no clinical identity layer

A patient in Mirpur has no persistent digital identity in the health system. A doctor in Chittagong writes on paper. A diagnostic centre in Sylhet produces a paper lab report. A pharmacy in Khulna dispenses what looks plausible from a handwritten note. A construction worker in Abu Dhabi cannot consult a Bangladeshi physician. A garment worker in Gazipur cannot see a doctor at the workplace the law says should employ one. A pregnant woman in rural Sunamganj attends her first antenatal visit already in the second trimester.

The same patient exists separately across every encounter — known to no one continuously, known to each provider only for one visit. A widely cited claim holds that a large share of clinical errors trace to incomplete information at the point of care; the precise figure is contested and frequently misattributed, so it is not relied on here. The qualitative point stands on its own: the information exists, but it sits in plastic bags, foreign medical files, audit-only factory rooms, and the memories of relatives who happen to be present. The missing piece is not more record-keeping. It is identity — the persistent thread connecting every clinical event to one patient across a lifetime, verifiable by any provider, owned by the patient.

### The regulatory wall

Bangladesh has passed a framework of health and data regulations that all demand the same verified data flowing through the same entities:

- **PDPO 2025 (enforcement ~May 2027).** Health data is sensitive personal data. Consent required at collection. Patient ownership established. De-identification required before external processing.
- **National Antimicrobial Resistance Action Plan (in force).** Calls for prescription enforcement and surveillance; lacks an operational mechanism. The Swedish model — prescription as record, not paper — is the named target.
- **BMDC Code of Conduct (in force).** Requires documented clinical reasoning, proper records, verified physician identity on prescriptions. Enforced inconsistently because verification infrastructure does not exist.
- **Bangladesh Labour Act 2006 (as amended).** Factories with 500+ workers must maintain a dispensary with a doctor and nurse; 5,000+ a hospital. Compliance is largely on paper.
- **Smart Bangladesh 2041 / Digital Health Strategy 2023–2027.** Names a unified health information system as a national priority; allocates no operational infrastructure to deliver it.
- **Overseas Employment and Migrants' Act 2013, BMET regulations.** Workers register before departure; no continuity-of-care mechanism connects them to Bangladeshi healthcare while abroad, and no structured handover on return.

Each demands the same underlying data — identified, signed, traceable, current. Each is addressed (where addressed at all) by isolated initiatives. The absent piece, always, is identity.

---

## SECTION 3 — The insight: the passport metaphor

The clinical record is not the product. The clinical identity network is the product; the record is one output of it. Most health-IT initiatives build a database, a digital form, or a clinical app. That is digitization, not infrastructure.

If every patient, doctor, clinic, diagnostic centre, pharmacy, and factory medical room held a persistent identifier with cryptographically signed Verifiable Credentials attached — BMDC registration, prescription, lab result, admission, vaccine, factory encounter, antenatal visit — then producing a medical history is not a database query. It is a graph walk that assembles the answer from credentials already signed by the entities authoritative for each claim. The history is portable across geography; the identifier persists across a lifetime.

**Think of a passport.** You don't re-prove who you are at every border; you present the book. Officials verify stamps issued by trusted authorities. The book travels with you; you hold it. A medical history should work the same way: BMDC stamps the physician credential once, the lab stamps the result once, the pharmacy stamps the dispensing once, the embassy stamps the citizen credential once. The patient carries the book and is the same person whether in Dhaka, Abu Dhabi, London, Kuala Lumpur, or back in the village.

**Where the metaphor breaks, stated honestly.** A passport's trust comes from sovereign states. Glyph's trust, at the start, comes from one company asking authorities to participate. The metaphor describes the *end state* the architecture is designed to reach, not day one. Section 13 (the issuer ecosystem) and Section 5 (trust bootstrap) deal with how trust is actually earned rather than assumed.

---

## SECTION 4 — Four things Glyph is not

"Clinical AI for Bangladesh" lands on four wrong mental models by default. Each must be fenced off.

**Not Abridge for South Asia.** Abridge, Nabla, Suki, DeepScribe are ambient scribes operating inside US/European hospitals running mature EHRs. A scribe needs an EHR to write the note into. Bangladesh has no EHR. Glyph is the identity and credential layer the scribe presupposes and that has never been built here.

**Not a chatbot for patients.** Consumer AI health products answer questions in a private session. Useful, not infrastructure. They do not connect a patient to a doctor, a doctor to a pharmacy, a lab to a hospital, or any of these to a regulator. Glyph's customer is the clinical ecosystem; the patient benefits but does not, on their own, drive adoption.

**Not another telemedicine platform.** Praava, DocTime, Shukhee, Maya are video-consultation platforms competing for patient acquisition and assuming the patient can take a scheduled video call. The migrant worker in a labour camp, the garment worker on a twelve-hour shift, the rural mother with three children often cannot. Glyph works inside whatever moment of access the patient can actually find — asynchronous, voice-first, offline-tolerant.

**Not a records-digitization project.** Donor and government EHR initiatives have repeatedly failed in low-resource systems: they ask doctors to type into screens, impose a workflow tax, and depend on top-down mandates adoption never follows. Glyph asks the doctor for nothing new in how they work; it captures structured data through speech, photographs, and extraction in the background. The doctor experiences benefit first; the structured record is the byproduct of being useful.

---

## SECTION 5 — What Glyph is: a clinical identity layer

Every patient, doctor, clinic, diagnostic centre, pharmacy, hospital, and factory medical room gets a permanent `did:web` identifier that resolves over HTTPS, owned by the entity, portable across provider relationships and borders.

Attached to that identity are cryptographically signed Verifiable Credentials. A BMDC-registered physician holds a credential signed by BMDC. A lab result is held by the patient, signed by the laboratory. A prescription is signed by the prescribing physician. A dispensing event is signed by the dispensing pharmacy. A factory encounter is signed by the factory's medical credential authority. A BMET registration is signed by BMET. An antenatal visit is signed by the attending OB-GYN. Signatures are Ed25519 — the same cryptography the Enso Identity Network uses for supply-chain credentials. Boring, auditable, portable, on purpose.

When any provider meets a patient for the first time and the patient consents, the provider's system does not query "the Glyph database." It queries the patient's DID and asks for the specific credentials needed for this encounter. The wallet returns only what was authorized. The briefing is assembled as a current-state view by walking the credential graph, not retrieved as a stored document.

### Architecture — three layers

| Layer | What it does | Standards | Status |
|---|---|---|---|
| **1 — Identity registry** | Every entity gets a persistent, portable DID. Multi-anchor verification (NID, passport, BMET, embassy, birth certificate). Entity holds the private key. Multi-path recovery. | W3C DID Core, `did:web` | [SCAFFOLDED] from EIN |
| **2 — Credential ecosystem** | Trusted issuers (BMDC, DGHS, DGDA, BMET, labs, hospitals, pharmacies, factory authorities, embassies) sign VCs. Each issuer signs only what it is authoritative for. Native revocation. | W3C VC 2.0, JSON-LD, Ed25519, JCS canonicalisation | [SCAFFOLDED] |
| **3 — Application layer** | Applications consume identity and credentials. Nine interfaces for distinct populations. | PDPO 2025, ICD-10, BD Rx format, RulHub | [LIVE] in part (Chamber) |

The identity and credential layers are intended as shared infrastructure; the application layer is where Glyph competes on quality. This separation is what could eventually make Glyph credible as a national clinical record rather than one private platform among many.

**Explicitly not blockchain.** `did:web` resolves over HTTPS. Credentials are signed with standard Ed25519. The append-only audit log lives in PostgreSQL with triggers preventing update or delete. The construction worker in Abu Dhabi with a basic Android phone does not manage seed phrases.

### Single-operator reality, and the succession/portability obligation [RESERVED but design-critical]

Because `did:web` resolves over a domain KhaMlabs controls (`glyph.health`), the network has a single point of failure today: if that domain or company disappears, every DID becomes unresolvable. This is the **same single-point-of-failure pattern Glyph exists to abolish elsewhere.** It is not acceptable to leave unaddressed, and the honest architectural answer is to build, before scale:

- **Resolution fallback** — published mirrors / a path to migrate resolution to a neutral or multi-party domain.
- **Signing-key continuity** — escrow or multi-party custody so issuer trust survives the operator.
- **Standing patient export** — every wallet exportable as portable W3C VCs at any time, so a patient's record outlives Glyph regardless.

Until these exist, the document does not claim Glyph is "owned by no one." It claims Glyph is a single-operator network *engineered for eventual portability*, and treats building that portability as a first-class obligation, not a footnote.

---

## SECTION 6 — Multi-anchor identity for a scattered nation

Bangladeshi citizens exist in many relationships to the state. The domestic resident with an active NID is the simplest case. A 65-year-old grandmother who never received an NID is harder. A construction worker eight years in Riyadh is harder still. A garment worker whose only formal document is a factory ID is different again. A newborn has none of these.

The Glyph DID is anchored through any of several verified credentials. The patient chooses which anchors to register; recovery strength depends on which are registered.

| Path | Population | Anchor | Status |
|---|---|---|---|
| A | Domestic resident with NID | NID via Election Commission verification (the path used for bank KYC). **Access to this verification is itself an institutional dependency, not a given.** | Targeted at launch |
| B | Diaspora with Bangladeshi passport | Passport via Dept. of Immigration & Passports; embassy attestation as supplement | Year 1 priority (Continuity) |
| C | Migrant worker via legal channels | BMET registration number verified via BMET; BMET becomes issuer at registration; worker departs with DID provisioned | Year 1 priority (BMET dependency) |
| D | Abroad with expired/no documents | Embassy/consulate issues citizenship attestation VC | [RESERVED] Year 2 |
| E | Child under 18 | Birth certificate via Registrar General; linked to parent DID, transitions at NID age | [RESERVED] Year 2 |
| F | Elderly without NID | Birth certificate + local UP/UN community attestation (lower-strength but valid) | [RESERVED] Year 2 |
| G | Stigmatized populations | Anonymous-mode DID with no linked anchors; patient holds the wallet absolutely | [RESERVED] Year 3 |
| H | Refugees / stateless | NGO-mediated identity (UNHCR/IOM/partners), structurally separate from national citizenship | [RESERVED] Year 3 |

The DID does not change with the anchor. The anchor is a credential; the DID is the persistent identifier. A citizen who registers abroad by passport and later adds NID at home does not get a new identity — they strengthen recovery on the existing one.

Recovery is multi-path. NID + passport + BMET = three independent recovery paths; NID only = one. v1 recovery is authority-mediated. Social recovery (designated family + a registered physician, no single party acting unilaterally) is [RESERVED] for a later iteration.

**Dependency note, stated plainly:** Paths A and C depend on government API access (Election Commission, BMET) that is controlled, political, and not guaranteed by writing it here. These are partnerships to be earned, with timelines outside the founder's unilateral control. The product must be able to deliver *some* value before any of them land (see Section 5 trust-bootstrap and Section 13).

---

## SECTION 7 — Nine interfaces on one record

Glyph is one identity network serving nine audiences. Each interface is a view onto the same credential graph. The graph creates the value; the interfaces are how populations contribute to and draw from it.

| Interface | Who uses it | What it does | Monetization | Status |
|---|---|---|---|---|
| **Chamber** | Chamber-practice doctors | Pre-visit intake; old Rx/lab photo reading; briefing card; cited clinical consult; note generation in BD Rx format | SaaS ৳8,000–10,000/mo per doctor; clinic tiers ৳15,000–25,000 | [LIVE] (wiring in progress) |
| **Lens** | Diagnostic centres, radiology/pathology techs | Receive structured orders; upload results as signed VCs; AI co-interpretation; remote radiologist verification | Per-report ৳50–100; subscription ৳15,000–25,000/mo | [SCAFFOLDED] |
| **Pharmacy** | Pharmacists | Query patient DID; see active prescription VCs; dispense only what a valid BMDC physician signed; interaction checks; sign dispensing VC | Free to participating pharmacies — the enforcement layer is the public good | [SCAFFOLDED] |
| **Hospital** | Institutional providers | Admission, ward management, referrals, discharge summaries, each a signed credential | Enterprise licensing ৳50,000+/mo per facility | [RESERVED] |
| **Pocket** | Patients (domestic) | Own the wallet; control access; plain-Bangla triage; WhatsApp follow-ups; export full record | Free domestic | [SCAFFOLDED] |
| **Continuity** | Migrant workers, diaspora, travellers | Asynchronous clinical **assessment and triage** across borders; vitals captured locally; voice symptoms in Bangla; matched BD physician; structured clinical handover (see Section 10 — *not* a cross-border prescribing service) | Per-consultation ৳200–500; premium tier via PKB/bKash; family co-pay from remittance | [SCAFFOLDED] |
| **Factory** | Garment workers, factory medical rooms, compliance officers | Factory-paid worker healthcare; vitals by a trained worker health assistant; specialist-matched BD physician; compliance documentation for buyer audits | Factory subscription ৳15,000–30,000/mo per facility (500–5,000+ workers) | [SCAFFOLDED] |
| **Maa** | Pregnant women, OB-GYNs, CHWs | Schedule-driven antenatal care; home BP monitoring; gestational timeline; skilled-birth-attendant coordination; postpartum follow-up; newborn registration | Free to women; funded by maternal-health donors | [RESERVED] Year 2 |
| **Bridge** | Cross-border specialists (India, Thailand, Singapore) | Receive a patient's structured credential bundle; video consult with translation; specialist opinion returns as a signed credential | ৳5,000–15,000 per consult; hospital revenue share | [RESERVED] |

---

## SECTION 8 — The populations Glyph is designed for

Glyph is designed for the populations Bangladeshi healthcare has structurally failed to reach. Naming them honestly is the starting point. Sizes below are approximate.

| Population | Size (approx.) | Access constraint | Interface |
|---|---|---|---|
| Domestic chamber patients | ~90M | 7-minute visit; paper-bag records; no continuity | Chamber, Pocket |
| Migrant workers | ~13M | No BD physician access; cannot afford foreign care; cannot consult during shifts | Continuity |
| Garment workers | ~4M (BGMEA) + 2–3M others | Factory healthcare exists in law, not practice; female-majority reproductive-health needs unaddressed | Factory |
| Pregnant women | ~3.5M/yr | Inconsistent ANC; schedule-driven needs an emergency-driven system doesn't serve | Maa |
| Rural elderly with chronic disease | ~10M | Adult children migrated; limited mobility; uncoordinated polypharmacy | Pocket (family linkage), Continuity |
| Urban slum residents | ~8M | Many lack NID; cost/distance/discrimination barriers | Pocket (alt anchors), Factory (informal economy) |
| CHT indigenous populations | ~1.5M | Distinct languages (Chakma, Marma, Tripura); poor relationship with state systems; different disease patterns | Pocket (language extension), chamber network |
| Rohingya refugees | ~950K | Stateless; no NID/passport; politically sensitive; NGO-provided care | [RESERVED] NGO-mediated; Glyph as infra to NGOs, not national identity |
| Climate-displaced | growing | Mobility destroys paper-based continuity | Pocket; records travel with the patient |
| Stigmatized populations | ~100K+ | Cannot use NID-linked systems; high STI/mental-health/violence burden | [RESERVED] anonymous-mode DID |
| Disability populations | ~15–16M | Physical and communication barriers; family support often required | Adapted interfaces (text-only, voice-only, family-supported with consent) |

Total addressable population: ~183 million Bangladeshis worldwide. The design intent is that no Bangladeshi is structurally excluded from clinical continuity because the architecture doesn't fit their life. **Intent, not present capability** — most of the above is [RESERVED].

---

## SECTION 9 — Why the family-physician model does not transfer

In Sweden, the UK, the US, and to a degree India, the family physician is institutional. You have one; they know your history; they are first contact for anything medical.

In Bangladesh this layer does not exist. A working-age man does not see a doctor unless something has clearly gone wrong. When he does, he goes to a hospital ER or a chamber doctor on recommendation, not on an established relationship. There is no "my doctor" — there is the next available doctor when the situation forces it.

This matters across every interface and most acutely for Continuity: the migrant worker in Abu Dhabi has never had a Bangladeshi doctor to reconnect to. Glyph cannot route him to "his doctor"; it has to *create* the relationship.

### The doctor-matching layer

When a patient requires a Bangladeshi physician, Glyph routes from a physician pool based on: clinical need; geographic preference (so future in-person follow-up is feasible); language fluency (Standard Bangla; Chittagonian/Sylheti/Noakhali where available; indigenous languages where relevant); gender preference (an honest acknowledgement that many specialties are gender-skewed and patients have legitimate preferences); doctor availability and opt-in to each modality; and relationship continuity (once a doctor has consulted, they are the default for that patient unless the patient requests change).

This matching layer is itself national infrastructure: Bangladesh has never had a mechanism to connect a patient to an appropriate doctor by actual clinical need. Glyph creates it as a byproduct of serving the populations who most need it.

---

## SECTION 10 — Glyph Continuity: the ~13 million abroad

13 million Bangladeshis work outside the country and send home over $25 billion in remittances annually (~5% of GDP). They are simultaneously the most economically important and the most clinically invisible demographic. They cannot afford foreign healthcare where they work, cannot maintain continuity with Bangladeshi care while abroad, and live in conditions that make conventional telemedicine unworkable.

Continuity is designed for them: asynchronous, voice-first, offline-tolerant, trusted-doctor-anchored, family-budget integrated.

### What Continuity is — and the hard legal boundary it respects

This is the most important correction in v3.1. Continuity is an **asynchronous clinical assessment, triage, and structured-handover service. It is not a cross-border prescribing or dispensing service.** A Bangladeshi physician reviewing vitals captured by an untrained co-worker and a voice note cannot lawfully or safely write a prescription to be dispensed in the UAE, Saudi Arabia, or most host jurisdictions — the physician is not licensed there, the host pharmacy generally cannot fill a foreign prescription for most drug classes, and a scaffolding-fall-treated-by-remote-antibiotics scenario is exactly how someone gets hurt. So Continuity provides:

1. A documented clinical assessment and risk triage from a matched BD physician.
2. A clear recommendation: self-care guidance where appropriate; "see a local licensed provider now / urgently / for this specific issue" where needed, with the assessment formatted as something the worker can *show* a local provider.
3. A signed clinical-opinion credential that enters the worker's wallet and travels home.
4. Continuity captured for the eventual in-country visit.

Where a prescription is genuinely appropriate and the destination country's law permits a pathway (e.g. via a locally licensed tele-prescribing partner), that is a *partnership-gated* feature, not a default, and is [RESERVED] pending real legal review per corridor. The earlier "Bangladeshi Rx → generic translation → take it to any pharmacy" flow is removed.

### The flow

1. **Pre-departure provisioning [SCAFFOLDED, BMET-dependent].** BMET becomes a Glyph issuer; every legal migrant registers before departure and is issued a DID with BMET-anchored credentials. The worker installs Pocket/Continuity before leaving — a wallet before a foreign address. *If BMET does not partner, see fallback below.*
2. **Vital capture abroad.** When care is needed, the worker reaches any accessible person (dispensary, clinic, camp medic, a pharmacy with a BP machine, or a co-worker) who follows guided capture: BP, blood sugar where available, temperature, pulse, weight; photographs of visible symptoms; a voice recording in the worker's own dialect.
3. **Asynchronous matching and review.** Routed to a BD physician matched on need, origin, language, gender. The physician reviews within normal hours — not at 2am, not interrupting domestic flow — and may request more information.
4. **Assessment and handover (see boundary above).** A documented opinion and triage recommendation returns to the worker's wallet.
5. **Continuity for return.** Every assessment enters the wallet; the BD doctor seen on return has the full picture from the moment the worker walks in.

### Use cases this genuinely serves

Confidential gynaecological assessment for a female domestic worker; mental-health consultation in the worker's own language for someone who cannot disclose to family or employer; early triage of worrying symptoms so a return trip can be planned around a real clinical opinion; a worker participating in a family member's care at home through a linked wallet; continuity preserved through sudden deportation. Note these are assessment/triage/continuity uses — which is what the service actually, safely, delivers.

### Funding pathway

Migrant health has dedicated funders: IOM, ILO, the Ministry of Expatriates' Welfare, Probashi Kallyan, Open Society, and researchers who have documented South Asian migrant invisibility as a global-health priority. A realistic *accessible* range for this component is on the order of low single-digit millions of dollars over several years — treated as a hypothesis to test, not a booked figure.

### Fallback if BMET partnership stalls

Direct diaspora-facing launch via embassies; partnership with pre-departure orientation NGOs; post-arrival enrolment through community networks. The product is designed to work without BMET, more slowly.

---

## SECTION 11 — Glyph Factory: the law that is not enforced

Bangladesh has ~4 million workers in BGMEA-registered factories and ~2–3 million more in non-BGMEA factories and informal workshops; roughly 60–65% are women. The Labour Act requires factories with 500+ workers to maintain a dispensary with a doctor and nurse. In practice most factories do not have functional healthcare — medical rooms exist for audits, doctors exist on paper, sick or injured workers work through it or seek care on their own time and money.

Needs cluster around: musculoskeletal injury from repetitive motion and long shifts; respiratory problems from cotton dust and dye chemicals; reproductive and gynaecological issues, often unaddressed; pregnancy care often hidden from employers; depression and anxiety; acute machine/chemical injuries; heat illness; communicable disease from dense conditions.

### The flow

1. **Factory enrolment.** Subscription ৳15,000–30,000/month by worker count. For 2,000 workers at ৳20,000/month, that is ~৳10 per worker per month — a fraction of a full-time doctor's cost. The factory gets compliance documentation, structured records, AI-assisted triage, physician consultation, and credentials usable in buyer audits.
2. **Worker health assistant.** The factory designates one worker (no medical credential required) trained in basic vitals, basic first aid, and the Glyph workflow — often a slightly more educated worker paid slightly more. The medical room is equipped with a tablet, BP cuff, thermometer, glucometer, first-aid supplies, and a basic medication stock for verified prescriptions.
3. **Worker access.** A worker visits on break or after work; the assistant captures vitals, photographs symptoms, records a Bangla voice description. Female workers needing gynaecological care can request a female physician with confidential routing — management sees only that care was received, never the clinical content.
4. **Specialist-matched remote consultation.** A matched BD physician (with gender matching where relevant) reviews within hours, prescribes from factory stock where appropriate, refers to an accessible chamber for follow-up where needed.
5. **Documentation and compliance.** Aggregated, anonymized factory-level metrics become part of the factory's compliance posture. Buyer auditors verify worker-healthcare provisioning cryptographically through the same VC infrastructure EIN uses for supply-chain compliance.

### The connection to EIN

A factory using EIN for supply-chain identity is the same factory that should use Glyph Factory for worker-health credentials — same identity layer, same verification, same Ed25519 signatures, same buyer compliance team. This is the unified compliance story across both ecosystems and a natural acquisition path: EIN-enrolled factories are warm Factory leads.

### The female-doctor requirement

With 60–65% women and many sensitive needs, Factory maintains a female-physician pool and prioritizes gender appropriateness over geographic or specialty fit when the situation calls for it. Bangladesh has a real supply of female OB-GYNs and dermatologists and a growing supply of female general-medicine specialists.

### Funding pathway

Direct subscriptions (primary), brand-funded compliance budgets, Better Work Bangladesh (ILO/IFC), Accord successor programs, labour-rights funders. Accessible funding is a hypothesis to test, not a booked figure; the forcing function is buyer compliance pressure, which is real and ongoing.

---

## SECTION 12 — Glyph Maa: maternal health

Bangladesh's maternal mortality ratio is approximately **156 per 100,000 live births** — far better than two decades ago, several times Western Europe's. Leading causes: postpartum haemorrhage, eclampsia, sepsis, obstructed labour, unsafe abortion. Most are preventable with adequate antenatal care, skilled birth attendance, and timely emergency intervention.

### Ground reality

About half of births are still attended by traditional birth attendants or family rather than skilled professionals. ANC attendance is improving (~80% have at least one visit) but consistent attendance across all four recommended visits is much lower. Care often starts late. Rural access is far worse than urban. Garment-worker pregnancies are often hidden until visible. Migrant-worker wives left in villages carry higher risk through limited support and an absent decision-making partner. Emergency obstetric care is concentrated in district hospitals and Dhaka. Private-hospital C-section rates are very high while timely emergency C-sections in public hospitals are often inadequate.

### Why Maa is different

Most healthcare is event-driven (something goes wrong, you seek care). Maternal care is schedule-driven (you should be doing X at gestational week Y). Maa is built around that distinction.

### The flow

1. **Early registration** — suspected pregnancy registered with low friction; test photographed; LMP entered; a timeline is created and proactive care triggered.
2. **Schedule-driven guidance** — gestational-week prompts for iron-folic acid, ANC visit timing, stage-specific labs, warning signs, nutrition and activity guidance, in plain Bangla via WhatsApp and in-app, with voice options.
3. **Home BP monitoring** — subsidized BP cuffs (donor-funded) for registered pregnancies; daily readings flow to the assigned OB-GYN; a sudden rise flags urgent consultation. This is the single highest-value mechanism, because preeclampsia is a leading cause of death and is detectable weeks earlier than through irregular visits.
4. **Skilled-birth-attendant coordination** — at labour onset, the system knows gestational week, risk factors, location, and nearest emergency facility, and coordinates a skilled attendant, transport, or hospital pre-alert as appropriate.
5. **Postpartum follow-up** — daily contact through the high-risk first six weeks; prompts on bleeding, mood, breastfeeding, infant weight; early catch of postpartum depression and haemorrhage warning signs.
6. **Newborn registration** — the baby gets a DID at birth, linked to the mother's, with a chosen paediatrician as first relationship; vaccinations, growth, and milestones become structured records from day one.

### Expected impact — corrected and bounded honestly

The previous version claimed 5,000–15,000 maternal deaths prevented per year. **This is arithmetically impossible:** at ~156 per 100,000 across ~3.5M births, Bangladesh has on the order of **~5,500 maternal deaths in total per year.** A single intervention cannot prevent more deaths than occur, and no intervention reaches 100% of the population or prevents 100% of deaths it touches.

A defensible framing: at *full national scale and high adoption*, an intervention combining early preeclampsia detection, ANC-schedule adherence, postpartum monitoring, and attendant coordination might realistically aim to prevent on the order of **several hundred to perhaps the low thousands** of maternal deaths per year — and even that is an optimistic ceiling contingent on real coverage of the highest-risk rural and hidden-pregnancy populations, which are the hardest to reach. The honest near-term target is measurable reduction in a defined pilot district, not a national death-toll headline. This number existing here in corrected form is the point: it stops the founder from over-weighting Maa against higher marginal-impact work.

### Funding pathway

Maternal health is among the most funded global-health priorities (UNICEF, UNFPA, WHO, Gates Foundation, MacArthur, Buffett, USAID MCH, FCDO, KfW, JICA), with Bangladesh a focus country for many. Accessible funding is a hypothesis to test.

---

## SECTION 13 — The issuer ecosystem and the trust-bootstrap problem

The credential ecosystem is the trust layer. Each authoritative entity signs only what it is authoritative for; no single organization owns the network's trust. Same pattern as EIN, applied to clinical and welfare authorities.

| Issuer | Signs | Priority |
|---|---|---|
| BMDC | Physician registration, specialty, CME credentials | Year 1 |
| Bangladesh Pharmacy Council | Pharmacist/pharmacy licence credentials | Year 1 |
| DGDA | Drug authorization, pharmacy operating licence, controlled-substance authority | Year 2 |
| DGHS | Hospital/clinic licences, vaccine administration, notifiable-disease confirmations | Year 2 |
| BMET | Migrant pre-departure registration; anchors diaspora DIDs | Year 1 (critical for Continuity) |
| Consulates abroad | Citizenship attestation for diaspora without NID/passport | Year 2 |
| Teaching hospitals (DMCH, CMCH, BSMMU, ICDDR,B) | Admission, discharge, specialty consultation within facility | Year 2 pilot |
| Diagnostic chains (Popular, Ibn Sina, Lab Aid, Praava, Medinova) | Lab results with reference ranges, abnormal flags, provenance | Year 1–2 pilot |
| Independent physicians | Prescription, visit, reasoning credentials | Live with first doctor |
| Pharmacies | Dispensing credentials | Year 2 (after Chamber mass) |
| Factory medical authorities | Worker-encounter credentials; aggregate metrics | Year 2 (with Factory) |
| Embassies abroad | Citizenship attestation for stateless/expired-document diaspora | Year 3 |
| Cox's Bazar NGOs (MSF, BRAC, UNHCR, IOM) | Refugee health encounters under humanitarian framework, separate from national identity | Year 3 |

### The chicken-and-egg, named honestly

This is the central adoption risk and the previous version glossed it. The loop: **credentials are only worth verifying once a real authority anchors them; authorities only engage once there is adoption; adoption needs verifiable credentials.** Listing "Year 1 / Year 2" priorities does not dissolve this — institutional engagement with BMDC, BMET, and the Election Commission is a multi-year political process largely outside the founder's unilateral control.

The graceful path through it:

1. **Self-issued, low-external-trust, immediately useful.** From the first doctor, prescriptions and notes are issued as VCs signed by that doctor's own key. Within Glyph (doctor → pharmacy → next visit) these are useful *today* even with no authority anchoring, because the value is continuity and interaction-checking, not external regulatory proof.
2. **Pairwise trust before institutional trust.** A pharmacy that trusts a specific known doctor can honour that doctor's signature without BMDC, building a local web of trust ahead of any central authority.
3. **Authority anchoring upgrades existing credentials.** When BMDC eventually signs physician identity, every prior self-issued prescription becomes retroactively verifiable against a real authority — anchoring strengthens the existing graph rather than requiring a restart.
4. **Adoption is the argument to authorities.** The pitch to BMDC/BMET is never "adopt our platform." It is "this network already runs at this scale with these participants; your signature makes your existing credentials portable across it." That conversation is only winnable *after* bottom-up adoption — which is why Chamber-first is non-negotiable.

This reframes the issuer table from a schedule into a *dependency map with a working-without-them fallback at each stage*.

---

## SECTION 14 — Current state of the product

As of April 2026, Glyph runs on Next.js 14 (PWA) + Supabase + multi-provider AI routing with a clean TypeScript build. The following is what exists now, not what is designed for the future.

**Infrastructure [LIVE].** PWA shell (manifest, service worker, 9 routes, first-load JS ~96–106 KB). Supabase Postgres with 8 tables, 11 indexes, row-level security on every table, triggers for visit auto-numbering and `updated_at`, append-only patterns ready for VC storage. Supabase Auth (phone OTP for doctors). Complete `.env.example` for Supabase, Google Cloud (Speech + AI Studio), Anthropic, OpenAI, Perplexity, UpToDate, WhatsApp Business. CI (GitHub Actions): lint, type-check, test, build.

**AI orchestration [LIVE].** 10 Supabase Edge Functions, all real implementations calling real APIs. `llm-router.ts` (585 lines): 5-provider routing (Gemini Flash; MedGemma 4B/27B via Vertex; Claude Sonnet/Haiku; OpenAI; Perplexity) with fallback-on-error for streaming and non-streaming. `deidentify.ts` (105 lines): BD phone/NID regex, Bangla name-block matcher, email/address stripping — **currently enforced only in `consult-query`; extension to all external-API functions is an open compliance task, and regex de-identification is not sufficient on its own (see Section 20).** `cost-logger.ts` (89 lines): per-call records with a 13-model pricing table.

**Application layer [LIVE, partially mocked].** 32 UI components including BriefingCard (312), ConsultChat (310), NoteEditor (329, BD/SOAP toggle), DocumentCapture (257, real `getUserMedia`), LabTrendChart (322, pure SVG), LinkedEvidence (237, source provenance), full shadcn primitives. 4 Zustand stores (auth, intake, consult, queue) — real. 6 hooks (`useVoiceInput`, `useAmbientRecording`, `useIntakeConversation`, `useConsultChat`, `usePatientHistory`, `useRealtimeQueue`) — real. 6 services (speech, ai, camera, patients, visits, whatsapp) — real. `/api/[...path]` proxy to Edge Functions. The 9 pages exist with polished UI but currently use `MOCK_*` constants for handlers; wiring is the ~40–60-hour critical path to first doctor demo (Section 25).

**Clinical knowledge [LIVE].** 18 prompt files, all real and Bangladesh-specific (~4,500 lines total): `glyph-core.md` (139), intake `conversation.md` (302) and `attendant-mode.md` (212), `prescription-reading.md` (313), `lab-report-reading.md` (310), `briefing-card.md` (290), `note-generation.md` (246, BD CC/H-O/O-E/Ix/Rx/Advice format), `bangla-medical-glossary.md` (263), `bd-drug-names.md` (212), `bd-diagnostic-centers.md` (284).

**Identity layer [SCAFFOLDED].** `did:web` schema for all entity types; multi-anchor verification design; Ed25519 keypairs with AES-256-GCM at rest (adapted from EIN's verify pattern); VC 2.0 schemas for physician registration, prescription, lab result, dispensing, admission, vaccination, factory encounter, ANC visit, migrant registration; DID Document publication at `/.well-known/did/<entity>/did.json` mirroring EIN.

**Population modules [SCAFFOLDED / RESERVED].** Continuity and Factory: architecture defined, build deferred. Maa: architecture defined, [RESERVED] for Year 2 alongside maternal-health funding.

---

## SECTION 15 — Personas

*(Retained as design anchors. The migrant-worker persona is renamed so it does not share the founder's name.)*

**Dr. Farhana — medicine specialist, Mirpur Road, Dhaka.** 3:47pm Tuesday; 31 patients seen, 14 waiting. With Chamber, an intake assistant has already interviewed the next patient and her son in the waiting room, tagged every clinical fact by source, photographed every paper in the bag, and prepared a briefing flagging a beta-blocker prescribed elsewhere three months ago. Farhana reads it in fifteen seconds and walks in knowing.

**Halima — patient, 68, Chittagonian speaker.** Seven doctors in three years. With Pocket she holds her own verified record for the first time, signed by every doctor and lab she has seen; continuity exists across visits, cities, and years.

**Md. Kamal — pharmacist, Mirpur.** Can't always read the prescription or verify the prescriber. With Pharmacy he queries the patient DID, sees a signed prescription credential, sees interactions flagged, and dispenses what is cryptographically authorized.

**Dr. Karim — certification officer, BMDC.** Today signs paper certificates nobody downstream can verify. With Glyph he signs registration credentials any pharmacy, lab, hospital, or regulator can verify instantly against BMDC's published public key.

**Selim — construction worker, 42, from Dinajpur, in Abu Dhabi.** Eight years in the Gulf; sends most of his salary home; hasn't seen a Bangladeshi doctor since departure. With Continuity he walks to a labour-camp dispensary, has vitals captured by a co-worker, and records a voice note in his dialect. A matched BD medicine specialist reviews within hours and returns a documented assessment and a clear recommendation to see a local provider for the specific issue, formatted so Selim can show it. The assessment enters his wallet. When he returns home, his BD doctor sees the full history from the first moment.

**Rashida — garment worker, 28, Gazipur.** Ten-hour shifts, six days a week; lower-back pain; can't stop work or afford an outside clinic; the factory medical room is locked except for audits. With Factory (her factory subscribes) she visits on break; a trained worker health assistant takes vitals, photographs posture, records her describing the pain; a female specialist reviews, prescribes anti-inflammatories from factory stock, and advises stretches she can do during shifts. Her employer sees compliance documentation, not clinical content.

**Khaleda — pregnant woman, 23, rural Sunamganj.** Lost her first child to complications she still doesn't fully understand. With Maa she registers at 7 weeks through a visiting CHW; Glyph provides a BP cuff; her husband in Riyadh follows her timeline; daily readings flow to her OB-GYN in Sylhet city. At 28 weeks her BP rises sharply, preeclampsia is detected, she is transferred to district hospital in time.

**Lars — specialist consultant, Apollo Hospitals, Chennai.** Receives BD second-opinion cases. Today the file is a manila folder of inconsistent translations; with Bridge the patient's credential bundle arrives as structured signed VCs, auto-translated, and his opinion returns as another signed credential.

**Karim — compliance officer, BGMEA factory, Narayanganj.** Has been failing buyer audits on worker healthcare for years; the factory can't afford a full-time doctor it is legally required to provide. With Factory at ৳20,000/month, 2,000 workers get real access, auditors verify provisioning cryptographically, and the factory holds its compliance posture without paying for a doctor who never showed up.

---

## SECTION 16 — How the clinical flow works

1. **Identity provisioning.** A new patient is registered at any connected entity. The system generates an Ed25519 keypair, encrypts the private key with AES-256-GCM, creates a DID, and publishes the DID Document. Verified anchors are attached as credentials.
2. **Credential issuance at point of care.** Encounter occurs; the physician approves the note; Glyph issues a VC signed by the physician's DID, bound to physician and patient, entering the wallet.
3. **Presentation and verification at next provider.** With consent, the next provider queries the DID; the wallet returns relevant credentials; signatures are verified Ed25519 against the issuer's public key; temporal validity is checked; interactions are evaluated via RulHub; the decision is cryptographically auditable.
4. **Briefing assembly.** The next encounter performs a credential graph walk and assembles a current-state briefing, reflecting all credentials current as of query time regardless of issuer or location.
5. **Ongoing verification and revocation.** A daily job scans for credentials expiring within 90 days (BMDC renewals, pharmacy licences, lab accreditations, prescription windows). Revocations — suspended licences, expired authorizations, withdrawn consent — propagate in real time.

---

## SECTION 17 — The sovereign AI stack: KhaM and KhaMed

Operating Bangladesh's clinical infrastructure entirely on foreign-controlled AI creates strategic dependencies the country should not accept indefinitely. The architecture begins foreign and is intended to become more sovereign over time.

| Layer | What it is | Approach | Trajectory |
|---|---|---|---|
| **KhaM** | A Bangla / Chittagonian / Sylheti / Noakhali language model with cultural context, used across KhaMlabs and Enso products | Open-weight base under KhaMlabs control, fine-tuned on owned and licensed data | Y1 foreign-heavy; Y2 shadow testing; Y3 handles a growing share of Bangla NLP |
| **KhaMed** | A clinical model for Bangladeshi clinical reasoning, BD formulary, BD Rx format, BMDC conventions | MedGemma base; fine-tuned on de-identified, **consented** BD clinical encounters | Y1 frontier-heavy; Y2 v1 takes a minority of traffic; Y3 majority, frontier for edge cases |
| **RulHub** | Deterministic regulatory rule substrate (22,000+ atomic rules, healthcare set in active build) | Hand-curated, schema-versioned rule objects with human review status | Continuously expanded |

Each layer feeds the others: Glyph collects de-identified, consented encounters → these improve KhaMed → more clinical work routes to KhaMed instead of foreign APIs → costs drop → economics support broader adoption → more encounters. The cycle compounds *if* the data-governance and consent foundations are real (Sections 20 and the caveat below).

### Two honest caveats the previous version omitted

- **Training-data legality.** Distilling outputs from frontier APIs (e.g. using a frontier model "as teacher") to train a model that competes with that provider generally violates those providers' terms of service. The sovereign-AI story must rest on **owned production-collected encounters (with proper consent and de-identification), licensed corpora, and open medical datasets** — not on distillation from the APIs Glyph is trying to become independent of. The "teacher" framing is dropped.
- **Consent for the training corpus.** Using patient encounters as a training corpus — even de-identified — is a consent and governance question that exists in Years 1–3 when the corpus is actually being built, not only at Year 5 "oversight." Patients must consent to training use specifically and separately, with anonymous-mode and sensitive flows excluded by default.

At sufficient scale and with clean governance, a clinical model trained predominantly on Bangladeshi encounters would be a genuine strategic asset, potentially licensable to similar markets (West Bengal, diaspora). Stated as an aspiration with preconditions, not a certainty.

---

## SECTION 18 — Why pharmacy closes the loop (the AMR thesis)

Bangladesh has among the world's highest rates of antimicrobial resistance — drug-resistant TB, typhoid, ESBL-producing bacteria, multi-drug-resistant pneumonia. A root cause is the absence of any enforcement mechanism between doctor and pharmacy: a paper prescription is a suggestion, the patient need not bring one, and anyone with cash can buy most antibiotics.

Sweden, Denmark, and the UK addressed this with prescription-as-record: the patient identifies at any pharmacy, the system shows what is authorized, and the pharmacy dispenses only that. Glyph delivers this structurally: a prescription exists as a signed credential the moment the doctor approves the note; the pharmacy queries the DID, verifies the signature against the prescriber's BMDC-anchored key, dispenses what is signed, and records dispensing as another credential. The patient cannot re-buy the same antibiotic next month without a new physician-signed credential.

Preconditions: Chamber must reach meaningful prescription volume; Pharmacy must be free to participating pharmacies; and DGDA must eventually mandate or strongly recommend participation for controlled substances. The pilot pattern mirrors EIN's supply-chain enforcement: deploy free in one administrative unit (thana/upazila), measure unprescribed dispensing over six months, publish transparently.

**On the impact figure.** Comparable interventions internationally have reported substantial reductions in inappropriate antibiotic dispensing, but the magnitude varies widely by context and the often-cited "40–60%" should be treated as *what has been reported elsewhere*, not a Glyph projection. The honest near-term claim is: measure the reduction in a defined pilot and let the real number speak. The mechanism is sound; the exact effect is to be demonstrated, not asserted.

---

## SECTION 19 — Adoption strategy: sequential build, overlapping pilots

The previous version framed adoption as nine "parallel waves," which a solo-founder reality cannot support and which obscured the dependency structure. The honest framing: **the build is sequential with overlapping pilot phases.** Everything in this document is in scope for *design*; only a narrow front is in active *build* at any time. Each population still has its own pathway and funding ecosystem, but they are sequenced, not simultaneous.

The non-negotiable wedge is **Chamber, in Dhaka, starting with one doctor** — because Chamber generates the prescription/credential volume that everything else (Pharmacy enforcement, the BMDC conversation, the credential graph's value) depends on. Nothing scales until the first doctor cannot imagine practicing without it.

| Phase | Front | Window (indicative) | Trigger to begin |
|---|---|---|---|
| 1 | **Chamber**, Dhaka → Chittagong, Sylhet | Months 0–12 | Word of mouth from the first doctor |
| 2a | **Continuity** (BMET pathway or fallback) | Months 6–18 | A working Chamber base + the BMET conversation or a fallback enrolment channel |
| 2b | **Factory** | Months 9–24 | Buyer-compliance pressure + EIN factory relationships as warm leads |
| 3a | Multi-doctor clinics / small private hospitals | Months 12–24 | Doctor evangelism compounds to facility-level adoption |
| 3b | **Lens** (diagnostic centres) | Months 12–24 | Volume of structured orders from Chamber doctors becomes a forcing function |
| 3c | **Maa** | Months 12–24 | Maternal-health donor partnership in hand |
| 4 | **Pharmacy** pilot in one administrative unit | Months 24–36 | Dense Chamber adoption in one area + DGDA conversation |
| 5 | **Hospital** + one government department (research partnership) | Months 24–36 | Ecosystem maturity proven; research partnership avoids procurement entirely |

KhaMlabs maintains operational independence from grant-driven cycles and government procurement. Revenue from Glyph subscriptions, population-specific mission grants, and cross-subsidy from the Enso commercial side (Kestrel, EIN, TRDR Hub, Enso Academy) funds the work. Government formalization, if it comes, is downstream of demonstrated adoption — "the network already runs at this scale; these authorities already participate" — not "buy our platform." This is the bKash pattern: it works because the system already works.

---

## SECTION 20 — Data governance under PDPO

PDPO 2025 enforcement begins ~May 2027. The intent is to be compliant by architecture rather than retrofit.

| Principle | How the architecture is intended to enforce it |
|---|---|
| Patient ownership | Patient holds the private key; consent withdrawal is cryptographic, not procedural; anonymous mode for stigmatized populations |
| Consent-first collection | Every credential entering the wallet requires a patient-signed consent record with timestamp, granting party, device info |
| De-identification for AI | Every external API call passes through `deidentify.ts`; identifiers re-applied on-device after response |
| Local data residency | Records hosted in Bangladesh where available; nearest regional jurisdiction under contractual data residency otherwise; migration to domestic hosting as BD cloud matures |
| Audit trail via RulHub | Every clinical decision traceable to specific rules, versions, and sources |
| Patient portability | Full wallet export anytime in standards-based W3C VCs; cross-border via embassy attestation |
| No data monetization | No raw patient data sold, ever; revenue from subscriptions, fees, and aggregate de-identified insights only |
| Population-specific protection | Clinical content invisible to employer (migrant, factory); anonymous-mode DIDs for stigmatized populations; refugees structurally separate from national identity |

### The de-identification gap, stated honestly — this is the soft underbelly

The entire PDPO-by-architecture claim currently rests on a **105-line regex** (`deidentify.ts`), enforced today in only one edge function. Regex de-identification of **free-text voice transcripts in dialect** will leak PII: uncommon names, village names, relational descriptors ("my brother-in-law in Comilla"), and the texture of a spoken complaint. The populations promised *absolute* protection — sex workers, depressed migrant workers, women with hidden pregnancies — are exactly the ones whose voice notes would be shipped to Claude/Gemini/OpenAI/Perplexity. As built, the privacy guarantee is weaker than the document promises.

What honest protection actually requires (and should gate the sensitive flows before they launch):

- **ML-based PII classification** over free text and transcripts, not regex alone.
- **On-device or in-country inference** for the most sensitive flows, so raw audio never leaves a trusted boundary.
- **KhaMed-only routing for sensitive categories** once it exists, removing foreign-API exposure for exactly the content that most needs protection.
- Until those exist, **the most sensitive flows (anonymous mode, mental health, reproductive health for at-risk women) should not route to foreign APIs at all** — better to offer less than to promise absolute privacy and not deliver it.

This gap is not a reason to stop; it is a precondition to honour before the populations who are promised the most are exposed to the most.

---

## SECTION 21 — Economics

These describe operating sustainability, not growth maximization. The objective is to keep the ecosystem alive and improving. Multiple population-specific funding streams that do not compete with each other.

### A note on the staffing model (correcting the v3 critique)

The low salary lines below are **not** "cheap engineers." They reflect a deliberate design: the hard cognitive work — architecture, clinical reasoning, the model layer — is done by the founder plus AI tooling. The good senior engineers who could do that work have largely left the country; betting on hiring them locally would be the fantasy. Hiring is therefore for **operators and field/relationship roles** — people who run rollouts, hold institutional relationships, manage factory and clinic onboarding, and keep operations running — at Dhaka market rates, which for these roles the numbers below support. The line items previously labelled "engineers" should be read as "operators / ops leads / field roles."

### Year 1 (pilot to early multi-population revenue)

| Category | Annual |
|---|---|
| Infrastructure (Supabase, Vercel, hosting) | $2,400 |
| Frontier AI API | $80,000 |
| Speech and ancillary | $20,000 |
| Salaries (founder + 1–2 operators + part-time advisors) | $30,000 |
| Compliance, legal, misc. | $18,000 |
| **Total Year 1 cost** | **~$150,000** |
| Revenue (Chamber 30–50 doctors + initial Continuity + first Factory pilot) | $40,000–60,000 |
| **Net funding gap** | **~$90,000–110,000** |

### Year 2 — read this with skepticism

The v3 figures showed AI cost jumping $80K → $2M (25×) and revenue ~$50K → ~$2.5M (~40–50×) on a team going from 3–4 to 10–12. **That is a hypergrowth profile, not an "operating posture," and the two framings contradict each other.** Either the Year 2 numbers are wrong or the philosophy is. The honest position: Year 2 should be modelled *conservatively*, as a continued pilot-to-early-scale year, not a 40× revenue leap. The table below is retained as the *optimistic* scenario, explicitly flagged, with a conservative counter-scenario beside it.

| Category | v3 optimistic | Conservative (planning basis) |
|---|---|---|
| Infrastructure | $30,000 | $15,000 |
| Frontier AI API | $2,000,000 | $300,000–500,000 |
| Speech and ancillary | $300,000 | $80,000 |
| Salaries (operators) | $150,000 | $120,000 |
| Compliance, legal, ops | $50,000 | $40,000 |
| **Total cost** | ~$2,530,000 | **~$560,000–760,000** |
| Revenue | $2,200,000–2,800,000 | **$300,000–600,000** |
| **Net gap** | ~$300,000–500,000 | **~$150,000–400,000** |

Plan against the conservative column. Treat the optimistic column as upside to be earned, not assumed. **If revenue slips even modestly against the optimistic plan, the real funding gap is multiples of the stated figure** — the planning basis must be the column that survives a bad year.

### Year 3 (only if Year 2 conservative targets are met)

Not modelled in detail here, because modelling Year 3 precisely while Year 2 is uncertain is false precision. Directionally: if KhaMed matures and takes a real share of clinical traffic, foreign API cost as a share of revenue falls and the ecosystem can approach self-sustaining across populations and regions. Revisit with real Year 1–2 numbers before committing to any Year 3 figure.

### Funding pathways by population (accessible *hypotheses*, not booked)

Migrant workers (IOM, ILO, MoEWOE, Probashi Kallyan, Open Society); garment workers (Better Work Bangladesh, ILO, Accord successors, brand compliance budgets); maternal health (UNICEF, UNFPA, WHO, Gates, MacArthur, Buffett, USAID MCH, FCDO, KfW, JICA); AMR (Wellcome, CDC Global AMR, WHO, UK FCDO, Gates); indigenous/minority (EU, UN human-rights funds); refugee health (UNHCR, IOM, ECHO); identity infrastructure (ID2020, Open Society, Omidyar). These do not compete because each donor cares about its specific population. **Every dollar figure here is a hypothesis to validate through actual conversations, not a number to plan spending against.**

---

## SECTION 22 — Competitive landscape

| Competitor | What they do | Where Glyph differs |
|---|---|---|
| Abridge | Ambient scribe for US hospitals on Epic | Requires an EHR to write into; none exists in BD; out of scope for intake, history, attendant dynamic, pharmacy enforcement, migrant continuity, factory access, maternal scheduling |
| Nabla, Suki, DeepScribe | Western ambient scribes | Same structural gap; cost structure built for Western markets; no multi-population architecture |
| Praava, DocTime, Shukhee, Maya | BD telemedicine / e-pharmacy / directory | Different business; complementary; partnership pathway possible |
| Consumer AI health products | Personal health Q&A | Different customer; not infrastructure |
| CMED Health, legacy BD EHR | Hospital/clinic information systems | Type-into-screens model; Glyph asks nothing new of doctor behaviour |
| MedMitra AI, HealthPlix (India) | AI clinical decision support for Indian doctors | Different country; BD-specific corpus, attendant protocol, and language coverage are the differences |
| ABDM / ABHA (India government) | National health stack, mandate-driven | Government-built, slow adoption; Glyph's bottom-up model is the alternative; could interoperate via W3C standards |
| WHO SMART Guidelines | Global health-worker guidance formats | Alignment opportunity — implement as credentialed protocols |
| UNICEF/UNFPA digital health | Maternal-health initiatives | Partnership opportunity for Maa, not competitor |

### Real advantages (stated without the "nobody else can" overclaim)

- **Location in Dhaka** — proximity to the populations, the regulatory wall, the garment cluster, the migrant source country.
- **RulHub substrate** — a compliance backbone (healthcare set in active build) not visible elsewhere in this space.
- **Identity primitives proven in EIN production** — transferable Ed25519 / `did:web` / W3C VC work, so the identity layer is adaptation rather than greenfield.
- **Multi-population design** — built for migrant + garment + maternal + domestic + stigmatized populations together, which others do not attempt.
- **Founder profile** — a cinematographer-turned-engineer combining clinical empathy with cryptographic precision; harder to replicate from a pure-engineering team.
- **Cross-subsidy from Enso commercial work** — funds the mission without dilutive capital.
- **Speed** — product already shipped; ~40–60 hours to first doctor demo.

The honest caveat: "nobody is building clinical identity for South Asia" is a *current* gap, not a permanent moat. The defensibility is execution, local depth, and the data/relationship graph that accrues — not the absence of competitors forever.

---

## SECTION 23 — Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Founder capacity** — solo founder building Glyph alongside Kestrel, EIN, Enso Academy, RulHub, KhaM | **High** | **High** | This is the top risk and is not solved by memory files. Honest mitigation: ruthless sequencing (Section 19); first operator hire after initial revenue; mission-aligned advisors before patient data flows at scale; and a deliberate decision about what is *not* built this year. Treated as an architecture problem — no single point of failure should include the founder's own body and attention. |
| **Single point of failure in the founder personally** | **High** | **High** | Document and externalize critical knowledge; build toward at least one trusted second person who could continue core operations; mirror the multi-path-recovery principle Glyph uses for identity onto the organization itself. Currently unmitigated and openly so. |
| **Cross-border clinical liability & licensure** (Continuity, Bridge) | Medium | High | **New row the v3 omitted.** Continuity is triage/handover, not cross-border prescribing (Section 10). Any prescribing pathway is partnership-gated with per-corridor legal review. Bridge specialist opinions are advisory credentials, not local prescriptions. |
| **De-identification insufficient for promised protection** | High | High | **New row.** Regex de-id leaks PII from voice/free text (Section 20); sensitive flows must use ML PII classification, on-device/in-country inference, or KhaMed-only routing — and must not route to foreign APIs until then. |
| **Trust bootstrap fails** — authorities don't anchor credentials | Medium | High | Self-issued credentials are useful within Glyph from day one; pairwise trust precedes institutional trust; adoption is the argument to authorities (Section 13). |
| **Bangla ASR fails for dialect cases** | High | High | Standard Bangla via Google Cloud Speech; dialect coverage improves via KhaM on collected data; text fallback always available |
| **PDPO enforcement creates friction** | Medium | High | De-identification (strengthened per Section 20); local residency; engage the Data Protection Authority during the draft phase |
| **Frontier API cost inflation / access restriction** | Medium | Medium | Multi-provider routing with fallback; KhaMed reduces dependency over time |
| **Identity complexity overwhelms the first-doctor pilot** | Medium | Medium | EIN-proven primitives; UX hides cryptography (patient sees "my health card," not DIDs) |
| **Government formalization stalls** | Low | Medium | Bottom-up adoption means independent viability; formalization is upside, not requirement |
| **BMET partnership fails** | Medium | Medium | Embassy-direct launch; pre-departure orientation NGOs; post-arrival community enrolment (Section 10 fallback) |
| **Factory adoption stalls** | Medium | Medium | Buyer compliance pressure is the forcing function; approach brands directly; EIN factories as warm leads |
| **Maternal-health donor funding doesn't materialize** | Low | Medium | Multiple donor pathways; Maa is [RESERVED] Year 2 and does not block the core |
| **Training-data legality (sovereign AI)** | Medium | Medium | **New row.** No distillation from frontier APIs; rely on owned consented encounters, licensed corpora, open datasets (Section 17) |
| **A global clinical-AI company enters South Asia** | Low | Medium | Foreign cost structures don't fit ৳8,000–10,000 pricing; foreign products don't handle attendant dynamics, paper Rx, Bangla, migrant continuity, factory access — but treat as a real future risk, not an impossibility |

---

## SECTION 24 — Five-year horizon

Stated as direction, not commitment. Years 3–5 are contingent on Years 1–2 actually working.

- **Year 1 — foundation.** Chamber in private chamber practice, Dhaka then Chittagong/Sylhet; 50–100 paying doctors as a *target, not a forecast*. Identity layer operational. First BMDC engagement. KhaMed pipeline begins collecting consented, de-identified encounters. First Continuity pilots (BMET or fallback). First Factory pilot (1–2 BGMEA factories). Team of 3–4.
- **Year 2 — careful expansion.** Chamber deepens. Lens launches with early diagnostic centres. Pocket launches for Chamber doctors' patients. Continuity and Factory scale within conservative bounds. Maa launches if maternal-health funding lands. First Hospital pilots. KhaMed v1 in shadow testing. First DGDA (AMR) and DGHS (digital-health alignment) conversations. Team of ~10–12 operators.
- **Year 3 — pharmacy enforcement and first regional step.** Pharmacy pilot in one administrative unit; AMR data published transparently. KhaMed handling a meaningful share of traffic. First West Bengal exploratory work (Bangla compatibility makes it the natural first regional step). Continuity into Western diaspora via embassies. Team of ~15–20.
- **Year 4 — KhaMed maturity.** KhaMed handles most clinical traffic; foreign API cost as a share of revenue falls; ecosystem approaches self-sustaining across interfaces. KhaMed published as a research artifact through academic collaboration. First licensing conversations.
- **Year 5 — public-health intelligence.** At scale, anonymized aggregate insights become a public-health utility: earlier outbreak detection, real-time AMR tracking, measurable maternal-mortality reduction, real-world evidence on underrepresented populations, first-ever migrant-worker health surveillance. The business sells insights, never raw data, under independent academic and governmental oversight — with patient consent to such use established from the start, not retrofitted.

The Enso Identity Network and Glyph operate as complementary halves of one thesis: regulated-industry identity for supply chains and clinical care, built from Dhaka on open W3C standards, with sovereign AI capability emerging in parallel. Both share RulHub as deterministic substrate, KhaM as language layer, and a commitment to standards-based portability over proprietary lock-in.

---

## SECTION 25 — What to build next (the next 90 days)

Critical path to first doctor demo: ~40–60 hours of focused work. No new architectural decisions — wiring existing services and hooks into existing UI components currently using mock data. **This is the most important section in the document, because it is the only narrow, concrete, immediately-actionable front, and Section 19 makes it the wedge everything else depends on.**

| # | Task | Hours |
|---|---|---|
| 1 | Auth: `/login` with Supabase OTP, route guards on `/doctor/*` and `/intake/*`, doctor profile from session | 6–8 |
| 2 | Doctor dashboard: replace `MOCK_PATIENTS` with `useRealtimeQueue`; enable Supabase Realtime subscription | 3–5 |
| 3 | Intake conversation: VoiceOrb → real mic via `useVoiceInput`; remove `setTimeout` fakes; wire `useIntakeConversation` for streaming | 10–14 |
| 4 | Create `AmbientRecorder` component (does not yet exist) wrapping `useAmbientRecording` | 2–4 |
| 5 | Briefing card: replace `MOCK_BRIEFING` with `usePatientHistory` + `ai.generateBriefing()`; stream into `BriefingCard` | 4–6 |
| 6 | Consult chat: wire `useConsultChat` into `ConsultChat` with source-tag parsing for Linked Evidence | 4–6 |
| 7 | Note generation/approval: connect `handleApprove` to `ai.generateNote()` and `visits.updateVisit()` | 4–6 |
| 8 | Intake summary submission: wire `handleSendToDoctor` to `ai.completeIntake()` + `visits.createVisit()` | 3–5 |
| 9 | Extend de-identification to `generate-briefing`, `generate-note`, `intake-start`, `intake-turn`, `intake-complete` — **and begin the ML-PII upgrade per Section 20, not regex-only** | 3–5 |
| 10 | Consent persistence: `ConsentPrompt` → `consent_records` table | 1–2 |

**Identity layer adaptation from EIN (parallel track, weeks 4–8):**

| # | Task | Effort |
|---|---|---|
| 11 | Lift Ed25519 / `did:web` / VC primitives from EIN into a shared library or duplicate into Glyph | 2–3 weeks |
| 12 | Patient DID generation at registration with multi-anchor schema (NID first; BMET/passport next) | in 11 |
| 13 | Convert prescriptions, lab_reports, visits tables to VC issuance/storage; keep JSON-column backward compatibility during transition | in 11 |
| 14 | Issuer portal for first BMDC engagement (clone EIN's `/issuer` pattern) | in 11 |
| 15 | Public credential verification API | in 11 |

**Population modules (parallel track, weeks 4–12) — note Continuity is triage/handover per Section 10:**

| # | Task | Effort |
|---|---|---|
| 16 | Continuity MVP: vital capture, voice recording, async physician-matching skeleton, structured-handover format (no cross-border dispensing) | 2–3 weeks |
| 17 | Factory MVP: factory onboarding, health-assistant vital-capture interface, worker access flow, compliance export | 2 weeks |
| 18 | Doctor-matching engine: physician pool, specialty/geographic/gender/language routing, availability scheduling | 1–2 weeks |

**At end of 90 days:** first doctor demo complete; identity layer operational; first BMDC engagement initiated; Continuity MVP testable with 1–2 migrant workers; Factory MVP testable with 1–2 factories.

---

## SECTION 26 — Closing

Built from Dhaka, by someone who has spent years in proximity to the populations the global clinical-AI industry has structurally ignored while optimizing for American hospital workflows most of the world does not have. Every scribe builds for an EHR; every chatbot for a consumer; every telemedicine platform for the patient who can take a video call. This is built for the patients who never had any of those.

The seven-minute consultation is the urgency. The absent identity layer is the opportunity. The migrant workers, the garment workers, the annual pregnancies, the domestic chamber patients, the indigenous and refugee and stigmatized and displaced populations — they deserve clinical continuity and currently do not have it. That nobody is building this from the supply side of all these populations at once is what created the window.

The product is shipping. The code is clean. The architecture is sound. The identity primitives are proven in adjacent production. The go-to-market is sequential and population-specific. The mission is durable.

What remains is execution, and honesty with oneself along the way — which is the entire reason this document exists in this corrected form. A northstar is only useful if, when reality sends a signal, the document is honest enough that the signal is heard rather than explained away.

One doctor at a time. One patient at a time. One worker in Abu Dhabi at a time. One garment worker in Gazipur at a time. One pregnant woman in rural Sunamganj at a time. One plastic bag at a time. One signed credential at a time. Until the bag is empty in a drawer somewhere, and the record is everywhere it needs to be.

---

**Prepared by**

Ripon Chowdhury
Founder, KhaMlabs Inc.
Dhaka, Bangladesh · April 2026 (v3.1)

*In memory of Khayer and Mamataj — who were nobody, in their own small world, and good.*
*For the populations the system was never built for.*
