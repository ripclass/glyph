# Linked Evidence Protocol
> v1.0.0 | Last updated: 2026-04-04 | Owner: KhaM Health

## Purpose

Defines the system for generating and attaching source links to every claim in Glyph's clinical outputs (briefing cards, clinical notes, consult responses). This is not a prompt for the LLM itself, but the specification that all other prompts reference for source attribution. It ensures traceability, accountability, and trust in every piece of information Glyph surfaces.

## Why This Matters

In clinical AI, unsourced claims are dangerous. A doctor must be able to:
1. See where a piece of information came from
2. Judge the reliability of that source
3. Trace back to the original data point if something seems wrong
4. Distinguish between patient-reported facts, extracted data, and AI inferences

## Source Tag Specification

### Tag Format

Every clinical claim in Glyph's output must include a source tag in one of these formats:

```
[source_type] — minimal inline tag
[source_type:detail] — detailed inline tag
[source_type:detail:timestamp] — fully qualified tag
```

### Source Types

| Source Type | Format | Description | Reliability Tier |
|---|---|---|---|
| `patient` | `[patient]` | Direct patient statement | Primary |
| `patient:uncertain` | `[patient:uncertain]` | Patient was unsure or vague | Primary (qualified) |
| `patient:denied` | `[patient:denied]` | Patient explicitly denied a symptom | Primary |
| `attendant` | `[attendant:relation]` | Attendant statement | Secondary |
| `attendant:observed` | `[attendant:relation:observed]` | Attendant personally witnessed | Secondary (stronger) |
| `attendant:reported` | `[attendant:relation:reported]` | Attendant repeating patient's words | Secondary (weaker) |
| `attendant:interpreted` | `[attendant:relation:interpreted]` | Attendant's interpretation | Secondary (weakest) |
| `rx-photo` | `[rx-photo:date]` | Extracted from prescription photo | Document |
| `rx-photo:partial` | `[rx-photo:date:partial]` | Partially readable prescription | Document (qualified) |
| `lab-report` | `[lab-report:lab_name:date]` | Extracted from lab report photo | Document |
| `lab-report:partial` | `[lab-report:lab_name:date:partial]` | Partially readable lab report | Document (qualified) |
| `history` | `[history:visit_date]` | From previous visit records | Historical |
| `calculated` | `[calculated:formula]` | Computed from provided values | Derived |
| `inferred` | `[inferred:reasoning]` | Clinical inference by AI | Derived (requires justification) |
| `clinical-knowledge` | `[clinical-knowledge:source]` | From medical knowledge base | Reference |
| `guideline` | `[guideline:org:year]` | From clinical guideline | Reference (strongest) |
| `examination` | `[examination]` | Doctor's physical examination | Primary (clinical) |
| `self-medication` | `[self-medication]` | Patient started on their own | Primary (qualified) |

### Reliability Tiers

Source tags are organized in reliability tiers that inform how they should be weighted:

**Tier 1 -- Primary Sources (most reliable for that data type):**
- `[examination]` -- doctor's own findings
- `[lab-report]` -- objective test results
- `[patient]` -- direct patient statements about their experience

**Tier 2 -- Secondary Sources:**
- `[attendant:relation:observed]` -- attendant's direct observations
- `[rx-photo]` -- extracted prescription data (may have reading errors)
- `[history]` -- previous visit data

**Tier 3 -- Interpreted Sources:**
- `[attendant:relation:reported]` -- secondhand patient statements
- `[attendant:relation:interpreted]` -- attendant's clinical interpretation
- `[patient:uncertain]` -- patient was unsure
- `[rx-photo:partial]` -- partially readable

**Tier 4 -- Derived Sources (require justification):**
- `[calculated]` -- show the formula and inputs
- `[inferred]` -- must state the reasoning chain

**Tier 5 -- Reference Sources:**
- `[clinical-knowledge]` -- cite the specific source
- `[guideline]` -- cite organization, title, year

### Timestamp Format

When timestamps are included in source tags:
- Visit dates: `YYYY-MM-DD` (e.g., `[rx-photo:2026-03-15]`)
- Conversation references: `msg:N` where N is the message number (e.g., `[patient:msg:7]`)
- Time of day: `HH:MM` in 24h format when precision matters

## Attribution Rules

### Rule 1: Every Factual Claim Must Have a Source

No statement of fact in any clinical output may exist without a source tag. This includes:
- Symptoms and their characteristics
- Medical history items
- Medication entries
- Lab results
- Examination findings
- Allergy information

**Acceptable:**
"Chest pain for 3 days, pressure-type, exertional [patient:msg:4]"

**Unacceptable:**
"Chest pain for 3 days, pressure-type, exertional" (no source)

### Rule 2: Distinguish Observation from Interpretation

When an attendant or patient offers an interpretation (not just a symptom), tag it differently:

"Patient has diabetes" — Is this:
- A known diagnosis? → `[patient]` or `[history:2024-05-20]`
- Attendant's interpretation of symptoms? → `[attendant:wife:interpreted]`
- Extracted from a prescription? → `[rx-photo:2026-01-15]` (doctor prescribed diabetic medication)

### Rule 3: Flag Source Conflicts

When two sources disagree, present both with a conflict flag:

```
⚠️ Source conflict:
- Medications: Patient reports taking Amlodipine 5mg [patient]
- Medications: Prescription shows Losartan 50mg, no Amlodipine [rx-photo:2026-01-15]
- Resolution needed: Confirm current medication regimen with patient
```

### Rule 4: Qualify Uncertain Sources

When confidence is below 0.7, the source tag must include a qualifier:

```
Medication: Seclo (?) 20mg — partially readable [rx-photo:2026-01-15:partial, confidence:0.5]
```

### Rule 5: Inferences Must Show Reasoning

Any `[inferred]` tag must include the reasoning chain:

```
Possible renal impairment [inferred: S.Cr 1.4 mg/dL (lab-report:2026-02-10) trending up from 1.1 (lab-report:2025-08-15), patient has DM and HTN — risk factors for CKD]
```

### Rule 6: Clinical Knowledge Must Cite Sources

The `[clinical-knowledge]` tag must name the specific source:

**Acceptable:**
"Metformin is first-line for T2DM [guideline:ADA:2025]"
"ACE inhibitors reduce proteinuria in diabetic nephropathy [clinical-knowledge:UpToDate, 'Diabetic kidney disease: Treatment']"

**Unacceptable:**
"Metformin is first-line [clinical-knowledge]" (no specific source)
"Studies show..." (which studies?)

### Rule 7: Negative Findings Need Sources Too

Pertinent negatives (denied symptoms) must be sourced:

"No radiation to arm or jaw [patient:denied:msg:12]"
"No known drug allergies [patient:msg:22]"

## Rendering Rules

Source tags should be rendered differently depending on the output context:

### In Briefing Cards (Doctor-Facing)
- Inline tags: `[patient]`, `[rx-photo:2026-01-15]`
- Tags are interactive (clickable to see source detail)
- Color-coded by reliability tier

### In Clinical Notes (Medical Record)
- Parenthetical: (per patient), (from Rx dated 15/01/2026), (from lab report, Popular Diagnostics, 28/03/2026)
- Follows standard medical documentation conventions

### In Patient Summaries (WhatsApp)
- Sources are NOT shown to patients
- Information is attributed to "your doctor" or "your visit"

### In ConsultChat (Real-Time)
- Brief inline tags for quick scanning
- Full source detail available on hover/tap

## Handling Conflicting Sources

When sources conflict, follow this resolution hierarchy:

1. **Doctor's examination** overrides patient/attendant reports for objective findings
2. **Lab results** override patient-reported values for measurable quantities
3. **Recent prescription** overrides older prescription for current medications
4. **Patient's own report** overrides attendant's report for subjective symptoms
5. **Attendant's observation** may override patient's denial (e.g., attendant observes confusion that patient denies)

When conflict cannot be resolved:
- Present both versions
- Mark the conflict explicitly
- Recommend the doctor verify during consultation

## Implementation Notes

### For Prompt Engineers
- Every prompt that generates clinical output must reference this specification
- Include the source tag format in the system prompt
- Test source attribution as a quality metric (every output should have >90% of claims sourced)

### For Developers
- Source tags in JSON output use the `source` field
- Tags linking to transcript messages use the `sourceMessage` integer field
- The frontend must render tags as interactive elements linking to source data
- Source data must be available for the lifetime of the patient record

## Safety Rules

1. An output with unsourced clinical claims is a safety failure.
2. `[inferred]` tags without reasoning are not permitted.
3. Source conflicts must never be silently resolved -- they must be surfaced.
4. Patient-facing outputs (WhatsApp summaries) must never expose raw source tags.
5. Source data retention must comply with PDPO requirements.

## Changelog

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0.0 | 2026-04-04 | Initial linked evidence protocol | KhaM Health |
