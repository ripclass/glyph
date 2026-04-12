# Glyph AI Model Routing

> Last updated: April 2026

## Overview

Glyph uses a multi-model AI routing strategy. Each clinical task is assigned a primary model selected for the optimal balance of cost, latency, and accuracy for that specific task. Every task also has a fallback model for resilience.

The routing is implemented in the Supabase Edge Functions layer. The client never communicates directly with AI providers.

---

## Routing Table

| Task | Edge Function | Primary Model | Fallback Model | Max Latency | Accuracy Need |
|---|---|---|---|---|---|
| Speech-to-text (Bangla/English) | `transcribe-audio` | Google Speech-to-Text V2 | Whisper (OpenAI) | 2s per chunk | High |
| Intake conversation summarization | `intake-summarize` | Claude 3.5 Haiku | GPT-4o Mini | 4s | Medium |
| Prescription photo extraction | `extract-prescription` | Gemini 1.5 Flash | GPT-4o | 5s | Medium-High |
| Lab report photo extraction | `extract-lab-report` | Gemini 1.5 Flash | GPT-4o | 5s | Medium-High |
| Briefing card generation | `generate-briefing` | Claude 3.5 Sonnet | Claude 4 Sonnet | 10s | High |
| Clinical note drafting | `generate-note` | Claude 3.5 Sonnet | Claude 4 Sonnet | 10s | Very High |
| Red flag detection | `generate-briefing` (sub-task) | Claude 3.5 Sonnet | Claude 3 Opus | 3s (within briefing) | Critical |
| Doctor research query | `research-query` | Claude 3.5 Sonnet + Perplexity | Claude 4 Sonnet | 8s | High |
| UpToDate clinical lookup | `uptodate-lookup` | UpToDate Connect API | Perplexity (medical) | 3s | Very High |
| WhatsApp follow-up message | `followup-whatsapp` | Claude 3.5 Haiku | GPT-4o Mini | 3s | Medium |

---

## Detailed Rationale by Task

### 1. Speech-to-Text: Google Speech-to-Text V2

**Why Google?**
- Best-in-class Bangla (bn-BD) language support with medical vocabulary
- Supports streaming recognition for real-time transcription during consultation
- Handles code-switching (Bangla-English) common in Bangladeshi medical conversations
- Latency: typically under 2 seconds per audio chunk

**Why not Whisper?**
- Whisper has good Bangla support but requires batch processing (no streaming)
- Higher latency for real-time consultation transcription
- Whisper is the fallback for cases where Google Speech fails or for batch processing of recorded audio

**Cost**: ~$0.006 per 15 seconds of audio (Google) vs ~$0.006/min (Whisper)

---

### 2. Intake Summarization: Claude 3.5 Haiku

**Why Haiku?**
- The intake conversation is a structured Q&A — the summarization task is well-defined and does not require deep clinical reasoning
- Haiku is fast (sub-4-second response for typical intake summaries) and cheap ($0.001/$0.005 per 1K input/output tokens)
- The doctor will review all intake data via the briefing card, so perfect summarization is not required — it needs to be directionally correct
- Haiku handles Bangla text well

**Why not Sonnet?**
- Sonnet is 3x the cost and slower for this task
- The quality difference for structured summarization (extracting chief complaint, duration, severity from a conversation) is marginal

**Fallback**: GPT-4o Mini — comparable speed and cost, slightly different error profile

**Estimated cost per intake**: ~$0.003-0.008 (1K-3K input tokens, 500-1K output tokens)

---

### 3. Prescription/Lab Photo Extraction: Gemini 1.5 Flash

**Why Gemini Flash?**
- Exceptional price-to-performance ratio for visual document extraction ($0.000075/$0.0003 per 1K tokens)
- Handles the specific challenges of Bangladeshi prescriptions:
  - Handwritten Bengali/English mixed text
  - Non-standard prescription formats (each doctor has their own layout)
  - Poor photo quality from budget smartphone cameras
- The `1+0+1` medication dosage format common in South Asia is well-understood by Gemini
- Sub-5-second extraction from a single prescription image

**Why not Claude?**
- Claude's vision capabilities are strong but significantly more expensive for image-heavy tasks
- Gemini Flash's 1M token context window easily handles high-resolution prescription images
- For the specific task of structured extraction from medical documents, Gemini Flash matches Claude Sonnet quality at 1/40th the cost

**Fallback**: GPT-4o — more expensive but reliable multimodal extraction as a safety net

**Estimated cost per image**: ~$0.001-0.003

---

### 4. Briefing Card Generation: Claude 3.5 Sonnet

**Why Sonnet?**
- This is the highest-stakes AI output in the system — it is the first thing the doctor reads before seeing the patient
- Requires sophisticated clinical reasoning: synthesizing intake conversation, prescription history, lab results, and attendant information into a coherent clinical picture
- Must correctly identify red flags (potentially life-threatening findings)
- Must accurately attribute every claim to its source (patient voice, attendant, Rx photo, lab report)
- Sonnet provides the best balance of reasoning quality and speed for this task

**Why not Opus?**
- Opus is 5x the cost ($0.015/$0.075 per 1K tokens vs $0.003/$0.015)
- For a well-structured prompt with clear examples, Sonnet's output quality is within 5% of Opus for clinical summarization
- Opus latency (15-25s) exceeds the 10-second target for briefing generation
- Opus is reserved as a secondary fallback for complex differential diagnosis edge cases

**Why not Haiku?**
- Haiku lacks the clinical reasoning depth needed for reliable red flag detection
- Source attribution accuracy drops significantly with Haiku
- The briefing card is doctor-facing and must be trustworthy — Sonnet's quality premium is worth the cost here

**Estimated cost per briefing**: ~$0.02-0.05 (4K-8K input tokens, 1K-3K output tokens)

---

### 5. Clinical Note Drafting: Claude 3.5 Sonnet

**Why Sonnet?**
- The clinical note becomes part of the patient's medical record — accuracy is paramount
- Must generate notes in the specific Bangladesh prescription format (CC / O/E / Ix / Rx / Advice)
- Must correctly interpret medical terminology from the consultation transcript
- Must include appropriate differential diagnoses and evidence-based recommendations
- Every claim must be traceable to the consultation transcript (linked evidence)

**Quality requirements**:
- Medication names must be exact (generic and brand names used in Bangladesh)
- Dosage formats must follow the `1+0+1` convention
- Investigations must use standard abbreviations (CBC, RFT, HbA1c, etc.)
- Advice section must be culturally appropriate for Bangladeshi patients

**Estimated cost per note**: ~$0.03-0.08 (8K-15K input tokens including full transcript, 1K-3K output tokens)

---

### 6. Red Flag Detection: Claude 3.5 Sonnet (within briefing generation)

**Why embedded in briefing?**
- Red flag detection runs as a sub-task within `generate-briefing` to avoid an extra API call
- The same context needed for briefing generation is needed for red flag identification
- Extracting red flags separately would add latency and cost without quality benefit

**Why this is "Critical" accuracy**:
- Missing a red flag (e.g., "chest pain at rest" in a diabetic patient with CKD) could lead to delayed treatment
- False positives are acceptable (the doctor dismisses them) — false negatives are not
- The prompt includes an exhaustive list of red flag conditions with clinical reasoning templates

**Fallback for ambiguous cases**: If the confidence on a potential red flag is below 0.7, the system escalates to Claude 3 Opus for a second opinion before presenting to the doctor.

---

### 7. Doctor Research Query: Claude 3.5 Sonnet + Perplexity

**Why a dual-model approach?**
- Doctor queries during consultation are open-ended: "What is the latest evidence on SGLT2 inhibitors in CKD stage 3?"
- Claude Sonnet provides clinical reasoning and synthesis
- Perplexity provides real-time web search for the latest evidence and guidelines
- The Edge Function orchestrates both calls in parallel and merges results

**Flow**:
1. Doctor types or speaks a clinical question
2. Edge Function sends the query to both Claude Sonnet and Perplexity simultaneously
3. Perplexity returns relevant search results with citations
4. Claude Sonnet synthesizes the Perplexity results with its training knowledge
5. UpToDate Connect API is also queried for matching topics
6. Final response includes synthesized answer + citations + UpToDate recommendations

**Estimated cost per query**: ~$0.01-0.03 (Claude) + ~$0.005 (Perplexity) = ~$0.015-0.035

---

### 8. WhatsApp Follow-Up: Claude 3.5 Haiku

**Why Haiku?**
- The follow-up message is a template-based generation: summarize the visit and generate 2-3 follow-up questions in simple Bangla
- No deep clinical reasoning required — the approved note provides all clinical content
- Must be fast (message should be generated and queued within 3 seconds)
- Bangla text must be simple and understandable by patients with limited literacy

**Estimated cost per follow-up**: ~$0.001-0.003

---

## Cost Budget per Visit

| Phase | Tasks | Estimated Cost |
|---|---|---|
| Intake | Speech-to-text (3-5 min audio) + Summarization | $0.02-0.04 |
| Document extraction | 1-3 prescription/lab photos | $0.003-0.009 |
| Briefing generation | Briefing card + red flag detection | $0.02-0.05 |
| Consultation | Speech-to-text (5-10 min audio) | $0.02-0.04 |
| Research queries | 0-3 queries during consultation | $0.00-0.10 |
| Note generation | Clinical note drafting | $0.03-0.08 |
| Follow-up | WhatsApp message generation | $0.001-0.003 |
| **Total per visit** | | **$0.09-0.32** |

**Target**: Under $0.25 per visit for 90% of encounters.

**Monitoring**: Every API call is logged to `api_usage_log` with model, token counts, latency, and estimated cost. The `cost-tracker.ts` utility provides client-side cost estimation using the pricing table in `COST_PER_1K_TOKENS`.

---

## Fallback Logic

All Edge Functions implement a standardized fallback pattern:

```typescript
async function callWithFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  options: {
    timeoutMs: number;
    visitId: string;
    functionName: string;
  }
): Promise<T> {
  try {
    const result = await Promise.race([
      primary(),
      timeout(options.timeoutMs),
    ]);
    await logUsage(options.visitId, options.functionName, { wasFallback: false });
    return result;
  } catch (error) {
    console.warn(`Primary model failed for ${options.functionName}, using fallback`, error);
    const result = await fallback();
    await logUsage(options.visitId, options.functionName, { wasFallback: true });
    return result;
  }
}
```

**Fallback triggers**:
- Primary model returns HTTP 429 (rate limited) or 5xx (server error)
- Primary model exceeds the timeout threshold for the task
- Primary model returns a response that fails schema validation

**Monitoring fallback rates**: The `api_usage_log.was_fallback` column allows tracking how often fallbacks are triggered per model, per function. A sustained fallback rate above 5% triggers an alert.

---

## Model Update Policy

AI model pricing and capabilities change frequently. This routing table should be reviewed:

1. **Monthly**: Check for pricing changes across all providers
2. **On new model release**: Evaluate whether a new model should replace an existing one in the routing table
3. **On quality regression**: If a model update degrades quality for any task, update the routing table to use a different model or version pin

The pricing table in `web/src/lib/utils/cost-tracker.ts` must be updated whenever model prices change.
