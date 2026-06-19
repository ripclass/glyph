# KhaM-Med
## Bangladesh's Sovereign Clinical AI

**Glyph by KhaM Health · Product Document 11 of 11 · June 2026 · Dhaka**

*KhaM-Med is the engine named in all ten preceding documents. The name carries
the family: KhaM Labs is the house; KhaM is the Bangladeshi language model;
KhaM-Med is its clinical specialist; KhaM Health operates the infrastructure;
Glyph is what a doctor or patient touches. KhaM is the initials of Khayer and
Mamataj. The hyphen is load-bearing: spoken as two beats — "KhaM Med" — so the
name underneath is never swallowed.*

---

## 1. The dependency this exists to end

Every intelligent behavior described in this series — the Chamber briefing
card, Pocket's plain-Bangla triage, Lens's draft reads, Continuity's
structured handovers, Maa's escalation logic — runs today through foreign
frontier APIs: Claude, GPT, Gemini, Perplexity, with UpToDate for clinical
reference. This is the correct way to start and an impossible way to finish,
for four reasons that compound:

**Cost.** Frontier routing prices a Chamber visit at $0.10-0.30 of inference.
A doctor seeing 40 patients a day generates $120-360/month in AI cost against
a ৳8-10K (~$67-85) subscription — underwater on every solo doctor, before
Pocket's free tier serves a single patient. At the program's stated ambitions
(millions of encounters), frontier-only inference is not a margin problem; it
is a structural impossibility. The mission's economics require near-zero
marginal inference for routine traffic.

**Privacy and law.** PDPO 2025 (gazetted November 2025, key provisions
effective ~May 2027) treats health data as a specially protected category with
localization requirements. The technical audit's finding stands: regex-based
de-identification cannot reliably scrub a free-text Chittagonian voice note
naming a village, an employer, a husband. The honest fix is not better regex;
it is *not sending the data out* — sensitive flows processed by a model
running in Bangladesh, eventually on the device itself. Until then, those
flows run restricted (the standing constraint in Chamber §6, Continuity §6,
Maa §6).

**Language.** The frontier models are competent in standard Bangla and
useless in Sylheti, Chittagonian, and Noakhali dialect speech — the languages
in which Glyph's actual patients describe their actual symptoms. No one else
will train this capability, because no one else will ever hold the data: the
consented, corrected, dialect-rich clinical corpus that only a working
Bangladeshi clinical network generates.

**Dependency.** An API key can be repriced, rate-limited, or revoked. National
health infrastructure whose intelligence lives behind another country's
terms-of-service is infrastructure on loan. The point of sovereignty is not
pride; it is that the 4am triage answer for a mother in Mymensingh should not
depend on a billing dispute in San Francisco.

## 2. The foundation: why MedGemma, and what the frontier teachers are for

**The base.** KhaM-Med builds on Google's MedGemma family — open-weights
models released under the Health AI Developer Foundations terms, explicitly
runnable on-premise and fine-tunable. The published numbers justify the
choice: MedGemma 27B (text) scores 87.7% on MedQA — within ~3 points of
DeepSeek R1 at roughly one-tenth the inference cost, among the best open
models under 50B parameters — with a 27B multimodal variant adding EHR and
longitudinal-record interpretation, a 4B multimodal variant strong on chest
X-ray, dermatology, histopathology, and ophthalmology, and MedSigLIP (a 400M
image-text encoder) sized for edge deployment. Published results also show
fine-tuned variants cutting EHR information-retrieval errors by up to half.
This is a serious clinical foundation that can legally live on servers in
Dhaka — which is the entire point.

**The gap the base cannot close alone.** MedQA is American board-exam
medicine in English. The distance from there to Glyph's floor is exactly the
distance this series has documented: Bangla and dialect; the CC/O-E/Ix/Rx
local prescription culture; local brand-generic mappings (Napa, not
acetaminophen); the attendant-mediated encounter with source-tagging; local
disease epidemiology (dengue panels, TB burdens); the formats of Popular and
Ibn Sina lab reports; the 48-second consultation's brutal brevity standards.
Closing that gap is KhaM-Med's actual work.

**The teachers — and the honest position on how teaching works.** Claude (via
Claude for Healthcare) and the other frontier models serve as *teachers* in
the operational sense: they carry Glyph's hardest live traffic today, and
their role shrinks as KhaM-Med's grows. On training, the position is stated
plainly because an earlier draft was sloppier and was corrected: frontier
providers' terms restrict using their outputs to train competing models, and
KhaM-Med's training pipeline is designed to respect that. The corpus is built
from what Glyph rightfully owns and licenses: **consented, de-identified
production encounters** — every doctor-corrected note, every verified Lens
read, every triage conversation a patient consents to contribute — plus
licensed and open medical corpora, public-domain clinical literature, and the
Bangla medical glossary and prompt assets already built. The flywheel, not
the teacher's homework, is the moat: doctor corrections are exactly the
supervised signal that fine-tuning needs, and only the network that owns the
encounters can ever have them. Where frontier-assisted data work is used
(e.g., translation scaffolding, evaluation), it is used within each
provider's terms, and the program's counsel reviews the pipeline before each
training run. If that discipline slows the timeline, the timeline slows.

## 3. What KhaM-Med does across the network

One model family, surfaced eleven ways: Chamber's red-flag-first briefing and
note generation in the local Rx format; Pocket's comprehension-leveled Bangla
triage with conservative escalation; Pharmacy's plain-language dispenser
counseling; Lens's draft-for-verification image reads (the 4B/MedSigLIP edge
path matters here — a draft read should eventually run *inside* the
diagnostic center); Continuity's and Maa's structured handovers; Apa's guided
floor encounters; Hospital's admission briefings and reconciliation; Bridge's
clinical-grade Bangla-English translation; and underneath the matching engine,
the triage that maps a presenting complaint to the right specialty. The
de-identification service itself becomes a KhaM-Med task — a local model
redacting before anything ever reaches a frontier API, replacing the regex
stopgap with something that actually understands what a Dinajpur place-name
looks like inside a symptom narrative.

## 4. The sovereignty timeline, honestly staged

**Year 1 — frontier-heavy, instrumented.** Claude and peers carry complex
reasoning; MedGemma-on-Vertex carries structured extraction and drafts (once
the audited OAuth fix lands); every encounter is logged, consented, and
corrected — the corpus accumulates from the first Chamber pilot. Routing
already exists in code (the 585-line multi-provider router); Year 1's job is
making the logged data trainable.

**Year 2 — first fine-tunes, local routing for the sensitive tier.**
QLoRA-class fine-tuning of MedGemma 27B on the accumulated corpus; KhaM-Med
v1 takes structured tasks (extraction, note formatting, briefing assembly)
and the de-identification gateway in-country. Dialect STT enters serious
training as voice data accumulates. The restricted sensitive flows
(Continuity voice notes, Maa narratives, anonymous-mode consultations) begin
moving to the local path — this milestone, not any benchmark, is the one that
matters most, because it is the one the privacy constraints are waiting on.

**Year 3 — local-majority.** Target: on the order of 90% of routine inference
on KhaM-Med in Bangladesh, with frontier models retained for the long tail —
rare presentations, complex multi-system reasoning, second-reader
disagreement — and for continuing evaluation. The 4B/edge path puts draft
reads in diagnostic centers and basic triage on-device. Marginal inference
cost on routine traffic approaches power-and-depreciation, which is what
makes Pocket-free-forever and Pharmacy-free-forever arithmetic instead of
hope.

The percentages are targets, not promises; what is promised is the direction
and the gating: no task moves to KhaM-Med until it matches the frontier
baseline on locally-built evaluation sets for that task — Bangladeshi films
from old machines, dialect transcripts, real chamber notes — because (per the
Lens correction) published benchmarks are not Bangladeshi ground truth.

## 5. Why this is a national asset, stated carefully

A clinical model fluent in Bangla and its dialects, tuned on the country's
actual disease burden and prescription culture, running under Bangladeshi
law on Bangladeshi infrastructure, owned by a mission company with a
succession obligation (document 10 §5) — that is health infrastructure in
the same sense the identity layer is, and it compounds the same way: every
encounter makes it better, and everything it learns stays in the country.
The claim stops there. KhaM-Med is not "Bangladesh's answer to GPT"; it is a
specialist tool with a defensible niche — the niche being twenty crore
people's clinical language and context, which the frontier labs will never
prioritize and never possess the data to serve.

## 6. Honest constraints

- **The corpus does not exist yet.** The flywheel starts at zero and turns
  only as fast as Chamber adoption. Year-2 fine-tuning presumes Year-1
  encounter volume; if adoption lags, sovereignty lags, and the frontier
  bill runs longer. The dependency is stated, not hidden.
- **Clinical safety gates everything.** Draft-for-verification,
  doctor-signs-everything, conservative escalation — the rules from every
  interface paper bind the model that powers them. A sovereign model that
  hallucinates in Bangla is worse than a foreign one that doesn't; local
  evaluation sets and staged rollout per task are the discipline.
- **HAI-DEF terms govern the base.** MedGemma's license permits exactly what
  KhaM-Med does with it, and that compliance is reviewed as the terms evolve;
  the program does not own its foundation and says so.
- **Dialect data is scarce, sensitive, and slow.** The most valuable training
  data (dialect voice) is precisely the restricted category; it accumulates
  only with consent, only as the local processing path matures — a deliberate
  chicken-and-egg the timeline absorbs rather than shortcuts.
- **Compute in Bangladesh is a real constraint.** Training runs can rent
  foreign GPUs (on de-identified data, within PDPO's cross-border rules);
  inference sovereignty requires in-country serving capacity that must be
  budgeted and built — a line item, not a footnote, in every funding plan.
- **Naming hygiene.** The model ships as KhaM-Med everywhere (kham-med.ai
  secured; "Khamed" rejected because it swallows the name the company exists
  to carry).

## 7. Build status (June 2026)

What exists: the 585-line multi-provider router (Claude, GPT, Gemini,
Perplexity, MedGemma 4B/27B via Vertex) with fallback; 18 Bangladesh-specific
prompt files (~4,500 lines) including the Bangla medical glossary, attendant
source-tagging protocol, and local extraction formats — these prompts are,
in effect, KhaM-Med's specification written in natural language; the
de-identification stopgap (regex, consult-query only, known insufficient);
and the consent schema. What is broken: the Vertex/MedGemma path needs OAuth
(static-key bug from the audit). What does not exist: the corpus, the
training pipeline, the evaluation sets, the local serving infrastructure, and
the model itself. KhaM-Med is therefore the program's longest arc — begun on
day one (because logging consented encounters *is* the work) and finished
last. The first Chamber consultation in a Dhanmondi chamber and the
sovereign model three years later are the same project; one is just the
other, grown up.

---

*Sources relied on in Sections 1-2: MedGemma model cards and HAI-DEF terms
(Google for Developers; Hugging Face google/medgemma-27b-text-it and
-27b-it); Google Research blog, "MedGemma: our most capable open models for
health AI development" (87.7% MedQA, cost comparison, MedSigLIP);
MarkTechPost and GoPenAI technical coverage (EHR error-reduction,
edge-deployment, QLoRA fine-tuning); PDPO 2025 gazette status and
localization provisions (document 10 sources); per-visit frontier cost and
router/prompt inventory from the Glyph technical audit (documents 01 and 10);
training-data and ToS position per the v3.1 critical-review corrections.*

*Glyph by KhaM Health · KhaM Labs Inc. · In memory of Khayer and Mamataj.*
