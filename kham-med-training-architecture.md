# KhaM-Med — Training Architecture
### The Sovereign Clinical AI Behind Glyph
### KhaM Labs Inc. · Working Document · June 2026

---

This consolidates everything decided across prior sessions about how KhaM-Med is
trained. It is a northstar engineering document for one reader, not an external
pitch. Where earlier drafts overclaimed, the corrected position is stated plainly.

It supersedes nothing in `feature-11-kham-med.md` — it expands the training
sections of it and pulls in the scattered "Sovereign AI Stack" reasoning from the
vision documents (v2 §11, v3 §12) into one place.

---

## 1. Why a sovereign clinical model at all

Four grounds, in priority order. Only the first two are load-bearing today; the
other two are real but slower-burning.

**Cost.** At the per-encounter volumes Glyph is built for, frontier API spend on
every clinical turn is the line item that breaks the unit economics. A doctor on a
৳8,000–10,000/month subscription cannot be served by ৳120–360/month of frontier
inference per seat and leave margin for everything else. Routing the routine
cognitive work to a locally-run model is what makes the economics survive at scale.

**Law.** PDPO 2025 (gazetted Nov 2025, key provisions ~May 2027) treats health data
as sensitive personal data and pushes toward localization. A model that can run
on-premise or in-country is the structural answer to "where does the data go," not a
promised one. This is the same reason the Supabase Singapore → in-country migration
is a dated critical-path item, not a someday item.

**Language.** The dialect clinical data — Chittagonian, Sylheti, Noakhali,
code-switched Bangla-English as actually spoken in a chamber — is data only Glyph
will hold at meaningful volume. No frontier lab will ever optimize for it. Over
time this is the only genuinely defensible moat, because it cannot be bought or
copied; it accrues one consented encounter at a time.

**Dependency.** Operating national clinical infrastructure on models controlled by
foreign companies is a strategic exposure the country should not carry permanently.
This is the weakest of the four as a *near-term* argument and should not be
oversold — but it is real on a five-year horizon.

---

## 2. The honest position on "distillation" — read this first

Earlier framing said: *Claude is the teacher, KhaM-Med is the student, via
teacher-student distillation.* **That framing has a legal problem and is corrected
here.**

Anthropic's commercial terms and Google's Gemini terms both restrict using model
outputs to train competing models. Strict distillation — using frontier outputs as
direct training targets for a model that competes with them — is not something
KhaM-Med does.

What KhaM-Med actually trains on:

- **Glyph's own consented, de-identified production encounters.** This is the core
  corpus and the part nobody else can replicate. Every encounter that becomes
  training data carries its provenance cryptographically (the credential layer makes
  the corpus auditable to the credential level — no one can later claim it was
  fabricated or contaminated).
- **Licensed medical corpora** — properly licensed clinical text, formularies,
  guideline sets.
- **Open datasets and open-weight base models** (MedGemma family, openly licensed).
- **Doctor-corrected ground truth** — when a Glyph doctor edits an AI-drafted note,
  that correction is a high-value, legitimately-owned training signal.

Where frontier models *are* used in the pipeline, it is for things their terms
permit: **evaluation, labeling, and quality-grading** of Glyph's own data — not as
distillation targets for a competing clinical model.

The correct conversation with Anthropic is therefore not "we're using Claude to
train our model." It is: *"we'd like to structure our use of Claude in our pipeline
in a way that respects your terms while bootstrapping a sovereign clinical model for
a market you don't serve — what does that arrangement look like?"* That is a more
sophisticated and more fundable ask.

---

## 3. The two models, and what each is

These are distinct and should not be conflated.

**KhaM** — the national *language* model. Foundation for Bangla and its dialects,
cultural context, code-switching. Shared across KhaM Labs and Enso Intelligence
products. Built on an open-weight base under full KhaM Labs control.

**KhaM-Med** — the *clinical specialist*, built on a medical base (MedGemma 27B as
the reasoning tier; MedGemma 4B for on-device and image tasks; MedSigLIP-class
vision for documents). It carries Bangladeshi clinical reasoning, the BD formulary,
the BD prescription format (CC / O-E / Ix / Rx / Advice — never SOAP), and BMDC
conventions. It is the only clinical model trained on Bangladeshi clinical reality.

KhaM-Med is the engine inside Glyph. Glyph is the clinical interface; KhaM-Med is
what it increasingly runs on.

---

## 4. Base model choice

**MedGemma 27B** as the primary reasoning tier. Rationale on the record: strong
MedQA performance (~87.7% at 27B), open weights under Google's HAI-DEF terms,
on-premise-capable — which is exactly what the law and cost arguments require. Open
weights matter beyond cost: they are the fallback if commercial API access is ever
restricted.

**MedGemma 4B (multimodal)** for two jobs: on-device / edge inference where
connectivity or privacy demands local processing, and document/image reading
(prescriptions, lab reports). The 4B's ability to run locally is what makes the
most sensitive flows (see §6) possible.

Fine-tuning method: **QLoRA** adapters over the base, not full retraining. This is
what makes iteration affordable on the available compute and keeps each fine-tune
auditable and revertible. Adapters are versioned alongside the eval sets they
passed.

---

## 5. The data flywheel — stated without the hype

The compounding loop, in plain terms:

> Glyph runs consultations on frontier models early → encounters are de-identified
> and, with consent, retained → they become the training corpus for KhaM-Med →
> KhaM-Med handles more of the routine clinical work → frontier API cost per
> encounter drops → better economics support broader adoption → broader adoption
> produces more encounters → the loop tightens.

After a few years at meaningful scale, KhaM-Med is the only clinical model trained
on a large corpus of real Bangladeshi clinical encounters. That is a national asset,
not just a product advantage.

**The honest caveat:** the flywheel only turns if (a) consent is real and
documented, (b) de-identification is actually sufficient (it is not yet — see §6),
and (c) each task only moves to local inference *after* it passes the eval gate (see
§7). The loop is a plan, not a guarantee; the gates are what keep it honest.

---

## 6. De-identification is the soft underbelly — and a KhaM-Med job

This is the sharpest unresolved technical problem, and the training plan has to own
it.

Today's `deidentify.ts` is ~105 lines of regex (BD phone, NID, Bangla name blocks,
email/address), enforced only on the consult-query path. **Regex is insufficient for
the data KhaM-Med will actually train on:** free-text dialect voice transcripts full
of relational descriptors and place names, and document *images*. The populations
promised the strongest protection — stigmatized populations, depressed migrant
workers, women with concealed pregnancies — are exactly the ones whose voice content
would otherwise be shipped to a foreign API after only regex scrubbing. That is
unacceptable and the document must not pretend otherwise.

Real protection requires the architecture to mature, and several pieces *are*
KhaM-Med tasks:

- **Structured intake** that minimizes free-text PII surface in the first place.
- **On-device transcription** for sensitive flows (local STT, not cloud speech), so
  the rawest content never leaves the device.
- **ML-based PII classification** for entity recognition in transcripts — a KhaM-Med
  capability that replaces the regex stopgap.
- **Local-only routing** for the most sensitive populations: their encounters route
  to local KhaM-Med inference and *never* to a foreign API, even de-identified.

So de-identification is not only a compliance control — building a competent BD-aware
PII classifier is itself one of the first valuable things KhaM-Med learns to do, and
it gates what data can safely enter the rest of the training corpus.

---

## 7. Sovereignty timeline — gated, not scheduled

The progression frontier-heavy → mostly-local is real, but it is **gated by
evaluation, not by the calendar.** No clinical task moves from frontier to KhaM-Med
until KhaM-Med matches the frontier baseline on a locally-built eval set for that
specific task. The percentages below are direction, not promises.

**Year 1 — frontier-heavy.** Frontier models do the clinical reasoning. Glyph
collects the first wave of consented, de-identified encounters. The first
locally-built eval sets are constructed (this is itself a deliverable — you cannot
gate on evals you don't have). First KhaM-Med fine-tunes begin in the second half,
in shadow mode only.

**Year 2 — first real handoffs.** KhaM-Med v1 takes the tasks it has demonstrably
passed: likely the bounded, structured ones first (note generation in BD format, PII
classification, document extraction) before open-ended reasoning. A local sensitive
tier comes online so the most private flows stop touching foreign APIs. Frontier
still carries the hard reasoning.

**Year 3 — local-majority.** KhaM-Med handles the majority of routine clinical
traffic; frontier becomes the specialist consultant for genuine edge cases. ~90% is
the aspiration, contingent on the gates having been passed task by task — not a
date-driven commitment.

The discipline: **a task that hasn't passed its eval stays on frontier, however long
that takes.** Cost pressure is not allowed to override the clinical baseline.

---

## 8. Compute in Bangladesh

The localization argument is hollow if the inference still runs abroad. The
constraint to design around: KhaM-Med inference needs to run in-country (or
on-device for the 4B tier) to satisfy both the cost and the law arguments. This
couples to the Supabase Singapore → in-country data migration — the data and the
model that processes it should land in the same jurisdiction before May 2027
enforcement, not after. Treat in-country inference capacity as a dated dependency,
sequenced with the data-residency migration, not as an afterthought.

---

## 9. What is true today vs. designed

Stated honestly, because the rest of the document is forward-looking.

**Exists:** a real clinical-AI scribe layer — the 585-line `llm-router.ts` routing
across Gemini Flash, MedGemma 4B/27B via Vertex, Claude, GPT, and Perplexity with
fallback; ~4,500 lines of BD-specific prompts; `cost-logger.ts` tracking per-call
spend against a pricing table.

**Does not exist yet:** any KhaM-Med fine-tune, any QLoRA adapter, any locally-built
eval set, any ML PII classifier, any on-device STT, any in-country inference. The
training pipeline described here is the plan; none of it is built. The MedGemma
integration in the current code also still uses a static key where Vertex requires
OAuth — a prerequisite bug to fix before any real MedGemma work begins.

The gap between the mature scribe layer and the zero-state training layer is the
honest starting point. Everything in §3–§8 is sequencing for closing it.

---

## 10. The corrected positions, collected

For quick reference, the things earlier drafts got wrong and this document fixes:

- **Not** strict teacher-student distillation on frontier outputs. Own consented
  encounters + licensed/open corpora; frontier used only for eval/labeling within
  terms.
- **Not** "Claude as teacher" as a casual claim. The ToS-respecting arrangement is an
  explicit conversation to have with Anthropic, not an assumption.
- **Not** regex de-identification as a sufficient compliance story. It is a stopgap;
  ML PII classification + on-device STT + local-only routing for sensitive flows is
  the real answer, and part of it is KhaM-Med's own first job.
- **Not** a calendar-driven sovereignty timeline. Eval-gated, task by task; cost
  pressure never overrides the clinical baseline.
- **Not** sovereign in name only. In-country inference is a real dated dependency
  coupled to data residency.

---

*KhaM-Med · the engine inside Glyph · KhaM Labs Inc.*
*In memory of Khayer and Mamataj.*
