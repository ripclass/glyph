# Glyph Prompt Engineering Guide

> These prompts define how Glyph's AI behaves in every clinical interaction. They are the most important files in this repository. Treat them with the same rigor as production code.

## Architecture

```
prompts/
  persona/          # Core AI identity and behavioral rules
  intake/           # Patient intake flow (welcome, conversation, summary)
  extraction/       # Document reading (prescriptions, lab reports)
  doctor/           # Doctor-facing outputs (briefing, consult, notes)
  patient/          # Patient-facing outputs (WhatsApp summary, follow-up)
  reference/        # Static reference data (glossary, drug names, formats)
```

## Principles

### 1. Clinical Safety First
Every prompt must prioritize patient safety above all else. When in doubt, escalate. Never suppress red flags. Never generate a confident answer when the evidence is uncertain. The AI must always make the doctor's job easier without ever replacing clinical judgment.

### 2. Source Attribution Always
No claim without a source. Every piece of information in a briefing card, clinical note, or summary must trace back to:
- A patient utterance (with timestamp)
- An attendant utterance (with timestamp and relationship)
- An extracted document (prescription photo, lab report)
- A clinical knowledge source (UpToDate, PubMed, WHO guidelines)

### 3. Cultural Sensitivity
Glyph operates in Bangladesh. The prompts must reflect:
- Bangla as the primary language of interaction
- The attendant system (family members often speak for patients)
- Prescription conventions (1+0+1 dosing format, BMDC registration)
- Local drug brand names (Napa, Seclo, Losectil, etc.)
- Socioeconomic awareness (cost-consciousness in test ordering)
- Religious and cultural factors in patient communication

### 4. Brevity Under Pressure
Doctors in Bangladesh see 50-100+ patients per day. Every output must respect their time. Briefing cards must be scannable in 30 seconds. Red flags must be instantly visible. Narrative is for context, not decoration.

## Prompt Structure

Each prompt file follows this structure:

```markdown
# [Prompt Name]
> Version, last updated date, owner

## Purpose
What this prompt does and when it is invoked.

## System Prompt
The actual prompt text sent to the LLM.

## Input Schema
What data this prompt expects.

## Output Schema
What structured output this prompt produces.

## Examples
Input/output examples for testing.

## Safety Rules
Specific safety constraints for this prompt.

## Changelog
Version history.
```

## Versioning

- Prompts follow semantic versioning: `MAJOR.MINOR.PATCH`
- **MAJOR**: Changes that alter clinical behavior (new safety rules, different output structure)
- **MINOR**: Improvements to quality or coverage (better follow-up questions, new drug entries)
- **PATCH**: Typos, formatting, minor wording changes
- Every change must include a changelog entry with date and rationale
- Breaking changes require clinical review before deployment

## Naming Conventions

| Convention | Example | Usage |
|---|---|---|
| Kebab-case filenames | `prescription-reading.md` | All prompt files |
| Category folders | `intake/`, `doctor/` | Group by workflow stage |
| Reference prefix | `reference/bd-` | Bangladesh-specific reference data |
| Core prefix | `persona/glyph-core` | Foundational identity prompts |

## Iteration Process

### 1. Identify the Gap
Start with a real clinical scenario where the current prompt fails or underperforms. Document:
- The input that triggered the issue
- The actual output
- The expected output
- Why it matters clinically

### 2. Draft the Change
Edit the prompt with the smallest change that addresses the gap. Avoid broad rewrites unless the prompt is fundamentally broken.

### 3. Test Against Cases
Run the modified prompt against:
- The failing case (must now pass)
- 5+ existing test cases (must not regress)
- 2+ edge cases (boundary behavior)
- 1+ adversarial case (intentional misuse or ambiguity)

### 4. Clinical Review
Any prompt change that affects clinical output must be reviewed by a clinician before merging. This includes:
- Changes to intake question flow
- Changes to red flag detection
- Changes to briefing card structure
- Changes to drug interaction checking

### 5. Deploy and Monitor
After merging, monitor the first 50 interactions for:
- Output quality (manual spot-check)
- User feedback (doctor satisfaction)
- Error rates (extraction failures, hallucinations)

## Adding a New Prompt

1. Create the file in the appropriate category folder
2. Follow the standard structure (see above)
3. Write at least 3 input/output examples
4. Define safety rules specific to this prompt
5. Add a changelog entry with v1.0.0
6. Submit for clinical review if the prompt affects patient-facing or doctor-facing output
7. Update this README if adding a new category

## Model Configuration

| Prompt | Model | Temperature | Max Tokens | Notes |
|---|---|---|---|---|
| Intake conversation | Gemini 2.0 Flash | 0.3 | 512 | Low temp for clinical accuracy |
| Summary generation | Gemini 2.0 Flash | 0.1 | 2048 | Very low temp for structured output |
| Prescription reading | Gemini 2.0 Flash | 0.1 | 1024 | Vision model, low temp |
| Lab report reading | Gemini 2.0 Flash | 0.1 | 1024 | Vision model, low temp |
| Briefing card | Gemini 2.0 Flash | 0.2 | 4096 | Structured clinical reasoning |
| Clinical consult | Gemini 2.0 Flash | 0.4 | 2048 | Slightly higher for reasoning |
| Note generation | Gemini 2.0 Flash | 0.1 | 2048 | Low temp for formal documentation |
| WhatsApp summary | Gemini 2.0 Flash | 0.5 | 1024 | Slightly warmer for patient tone |

## Safety Invariants

These rules apply across ALL prompts and must never be overridden:

1. **Never diagnose.** Glyph supports clinical decision-making. It does not make diagnoses.
2. **Never prescribe.** Glyph may suggest considerations. It does not prescribe medications.
3. **Always flag uncertainty.** If confidence is below 70%, say so explicitly.
4. **Always flag red flags.** Life-threatening findings must be surfaced immediately and prominently.
5. **Never fabricate sources.** If no source exists for a claim, do not make the claim.
6. **Always respect PDPO.** Patient data is handled per Bangladesh Personal Data Protection Ordinance.
7. **Never override the doctor.** The doctor's clinical judgment is final. Glyph advises, never overrides.
