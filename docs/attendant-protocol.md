# Glyph Attendant Protocol

> Last updated: April 2026

## Why Attendants Matter

In Bangladesh (and across South Asia), patients frequently arrive at clinics accompanied by family members who serve as **attendants**. This is not an edge case -- it is the norm for a significant portion of encounters:

- **Elderly patients**: Adult children (typically sons or daughters) accompany parents and often provide the primary clinical history because the patient may have difficulty communicating or may defer to the younger family member
- **Female patients**: In conservative communities, a husband or male family member may accompany the patient and may speak on her behalf, especially with male doctors
- **Children**: Parents provide all history
- **Patients with limited health literacy**: Family members who are more educated may translate the patient's experience into medical terminology
- **Patients with cognitive impairment**: Caregivers provide history
- **Cultural expectation**: In many Bangladeshi families, medical visits are a family affair. It is common and expected for the attendant to participate actively in the clinical encounter

### The Clinical Challenge

When an attendant provides history, the doctor must constantly assess:
1. **Is this information firsthand or secondhand?** The attendant may be reporting what the patient told them, not what they directly observed
2. **Is the attendant's interpretation accurate?** A son saying "my father has been feeling dizzy" may actually mean the father has been experiencing vertigo, lightheadedness, or syncope -- very different clinical entities
3. **Is there information the patient would share but the attendant would not?** Patients may withhold sensitive information (alcohol use, sexual history, mental health concerns) when a family member is present
4. **Are there discrepancies?** The patient may say one thing and the attendant another

Traditional clinical notes rarely capture this nuance. Glyph is designed to handle it explicitly.

---

## How Glyph Identifies and Tags Attendant-Provided Information

### Step 1: Role Selection at Intake Start

The intake begins with an explicit role selection (IntakeRolePage at `/intake`):

```
+-------------------------------------------+
|                                           |
|        আপনি কে?                           |
|        Who are you?                       |
|                                           |
|  +-------------------------------------+  |
|  |  [Person icon]                       |  |
|  |  আমি রোগী                           |  |
|  |  I am the patient                    |  |
|  +-------------------------------------+  |
|                                           |
|  +-------------------------------------+  |
|  |  [Two person icon]                   |  |
|  |  আমি সাথে এসেছি                     |  |
|  |  I am the attendant                  |  |
|  +-------------------------------------+  |
|                                           |
+-------------------------------------------+
```

If "attendant" is selected:
- The system records `visits.attendant_present = true`
- A follow-up asks for the attendant's name and relationship to the patient
- `visits.attendant_name` and `visits.attendant_relation` are populated

### Step 2: Persistent Attendant Banner

When an attendant is providing history, the `AttendantBanner` component renders at the top of every intake screen:

```
+-------------------------------------------+
| [Two person icon]                          |
| ইতিহাস প্রদানকারী: সাথে (ছেলে)           |
| History provider: Attendant (son)          |
+-------------------------------------------+
```

This banner uses an amber/yellow background (`bg-amber-50`, `border-amber-200`) to visually distinguish attendant-provided sessions from patient-provided ones. It is persistent -- it never scrolls away.

### Step 3: Per-Utterance Source Tagging

Every entry in `visits.intake_transcript` includes a `source` field:

```json
{
  "speaker": "user",
  "text": "আমার বাবার তিন দিন ধরে জ্বর",
  "timestamp": "2026-04-04T10:15:30Z",
  "language": "bn",
  "source": "attendant",
  "attendant_relation": "son"
}
```

This enables downstream AI processing to distinguish:
- `"source": "patient"` -- the patient said this directly
- `"source": "attendant"` -- the attendant said this, with the specific relationship

### Step 4: Mid-Conversation Handoff Detection

During the intake conversation, the AI intake assistant (Saara) is trained to detect mid-conversation handoffs -- moments when a different person starts speaking. Common patterns:

- The conversation starts with the attendant, then the patient wants to add something
- The attendant and patient have a brief side conversation in Bangla
- The patient corrects something the attendant said

When a handoff is detected, Saara asks: "এটা কি রোগী বলছেন নাকি সাথে আসা ব্যক্তি?" (Is the patient saying this or the attendant?)

---

## Source Attribution in the Briefing Card

Every clinical claim in the BriefingCard includes a `SourceTag` component that shows the information's provenance.

### SourceTag Types for Attendant Information

| SourceType | Color | Default Label | Example Label |
|---|---|---|---|
| `patient` | Blue (`bg-blue-100`) | "Per patient" | "Per patient" |
| `attendant` | Amber (`bg-amber-100`) | "Per attendant" | "Per attendant (son)" |
| `rx_photo` | Purple (`bg-purple-100`) | "From Rx photo" | "From Rx photo" |
| `lab_report` | Teal (`bg-teal-100`) | "From lab report" | "From lab report" |

When the attendant's relationship is known, the label is customized:
- "Per attendant (son)" -- `SourceTag type="attendant" label="Per attendant (son)"`
- "Per attendant (wife)" -- `SourceTag type="attendant" label="Per attendant (wife)"`
- "Per attendant (daughter)" -- `SourceTag type="attendant" label="Per attendant (daughter)"`

### Example Briefing Card with Mixed Sources

```
+----------------------------------------------------+
| CHIEF COMPLAINT                                     |
+----------------------------------------------------+
| * Fever for 3 days with cough   [Per attendant (son)] |
| * Reduced appetite for 1 week   [Per patient]        |
+----------------------------------------------------+

+----------------------------------------------------+
| HISTORY OF PRESENT ILLNESS                          |
+----------------------------------------------------+
| * Started with mild fever, progressively            |
|   increasing              [Per attendant (son)]     |
| * Cough productive with white sputum               |
|                           [Per patient]             |
| * No chest pain reported  [Per attendant (son)]     |
| * Father says he also feels weak                    |
|   and dizzy              [Per patient]              |
+----------------------------------------------------+

+----------------------------------------------------+
| CURRENT MEDICATIONS                                 |
+----------------------------------------------------+
| Metformin 500mg 1+0+1    [From Rx photo]           |
| Amlodipine 5mg 0+0+1    [From Rx photo]           |
| "Also takes some tablets  [Per attendant (son)]     |
|  from local pharmacy"                               |
+----------------------------------------------------+
```

The amber color of attendant tags immediately tells the doctor: "This information is secondhand. Consider verifying directly with the patient."

---

## Reliability Assessment

Glyph performs an AI-driven reliability assessment of attendant-provided information. This is stored in `visits.attendant_reliability_notes` and is visible to the doctor in the briefing card.

### Factors Assessed

1. **Consistency**: Does the attendant's account match the patient's account where both provide input?
2. **Specificity**: Does the attendant provide specific details (dates, frequencies, quantities) or vague descriptions?
3. **Clinical plausibility**: Does the attendant's description match known medical patterns for the patient's conditions?
4. **Observation vs. Interpretation**: Is the attendant reporting observations ("he has been coughing") or interpretations ("he has pneumonia")?

### Reliability Indicators

The briefing card may include notes like:
- "Attendant (son) provides detailed and specific history consistent with patient's known conditions"
- "Attendant's description of chest pain is vague -- consider direct patient assessment"
- "Discrepancy: attendant reports medication compliance, but HbA1c trend suggests otherwise"

---

## Discrepancy Handling

When the patient and attendant provide conflicting information, Glyph handles it explicitly rather than silently choosing one version.

### Detection

Discrepancies are detected during briefing generation by comparing:
- Statements from the patient vs. statements from the attendant on the same topic
- Attendant's verbal report vs. extracted prescription/lab data
- Current visit information vs. prior visit records

### Presentation

Discrepancies are surfaced in the briefing card as a special note within the relevant section:

```
+----------------------------------------------------+
| CURRENT MEDICATIONS                                 |
+----------------------------------------------------+
| Metformin 500mg 1+0+1    [From Rx photo]           |
|                                                     |
| NOTE: Attendant reports patient takes               |
| medication "regularly" but HbA1c has increased      |
| from 7.8% (Oct 2025) to 8.2% (Jan 2026),          |
| suggesting possible non-compliance.                 |
|                          [AI Assessment]            |
+----------------------------------------------------+
```

### Doctor Action

The discrepancy is presented as information, not a conclusion. The doctor decides:
- Which version to trust
- Whether to investigate further during the consultation
- How to document the discrepancy in the clinical note

---

## Cultural Sensitivity Considerations

### Respecting the Attendant's Role

Glyph does not treat the attendant as a problem to be solved. In Bangladeshi culture:

1. **The attendant is expected**: Asking "Why didn't the patient come alone?" would be culturally inappropriate. Glyph simply asks "Are you the patient or the attendant?" with equal weight given to both options

2. **Deference patterns**: It is common for a patient to defer to a son or husband during the medical encounter. Glyph does not try to override this -- it records the dynamic and surfaces it to the doctor

3. **The attendant often knows more**: For elderly patients with multiple chronic conditions, the attendant (usually an adult child) may have a better understanding of the medication regimen, specialist appointments, and test results than the patient. Glyph values this information appropriately

4. **Language accommodation**: The attendant may speak a different dialect or comfort level of Bangla than the patient. The intake conversation adapts to the active speaker

### Handling Sensitive Topics

Certain clinical information may be filtered or withheld when an attendant is present:

1. **Mental health**: The AI intake assistant does not ask detailed mental health questions when an attendant is providing history. Instead, it notes "Mental health screening deferred -- attendant present" in the briefing for the doctor to address privately during consultation

2. **Substance use**: Questions about alcohol, tobacco, and substance use are phrased carefully when an attendant is present. The briefing card may note: "Tobacco use history should be verified directly with patient"

3. **Sexual and reproductive health**: Not discussed in attendant-mediated intake

4. **Domestic concerns**: If indicators of domestic violence or abuse are detected, they are flagged as a red flag visible only to the doctor, never communicated to the attendant

### Gender Dynamics

In conservative communities:
- A female patient with a male attendant (husband/father) may have limited opportunity to share information independently
- Glyph's briefing card explicitly surfaces this dynamic so the doctor can create space for private conversation during the consultation
- The follow-up WhatsApp message goes directly to the patient's phone, providing a private channel for communication

---

## Data Model Support

The following database columns support the attendant protocol:

| Table | Column | Type | Purpose |
|---|---|---|---|
| `visits` | `attendant_present` | BOOLEAN | Whether an attendant is providing history |
| `visits` | `attendant_name` | TEXT | Attendant's name |
| `visits` | `attendant_relation` | TEXT | Relationship to patient (son, wife, etc.) |
| `visits` | `attendant_language` | TEXT | Attendant's preferred language |
| `visits` | `attendant_reliability_notes` | TEXT | AI-assessed reliability notes |
| `visits` | `intake_transcript[].source` | JSONB | Per-utterance source attribution |
| `consent_records` | `granted_by` | TEXT | Whether consent was given by patient, attendant, or guardian |

---

## Implementation Status

| Feature | Status |
|---|---|
| Role selection UI (IntakeRolePage) | Implemented |
| AttendantBanner component | Implemented |
| Per-utterance source tagging in transcript | Schema ready, Edge Function pending |
| SourceTag "attendant" type with relation label | Implemented |
| LinkedEvidence with attendant source type | Implemented |
| AI reliability assessment | Prompt designed, Edge Function pending |
| Discrepancy detection | Prompt designed, Edge Function pending |
| Sensitive topic filtering | Prompt designed, Edge Function pending |
| Mid-conversation handoff detection | Design phase |
