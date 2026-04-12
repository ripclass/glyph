# PDPO 2025 Compliance Design

> Last updated: April 2026

## Overview

The **Bangladesh Personal Data Protection Ordinance 2025 (PDPO 2025)** is Bangladesh's first comprehensive data protection law. It establishes requirements for the collection, processing, storage, and transfer of personal data, with heightened protections for **sensitive personal data** -- a category that explicitly includes health data.

Glyph processes sensitive personal health data at every stage of the clinical encounter. This document details how Glyph's architecture and data practices comply with the PDPO 2025.

---

## Data Inventory

### What Data Glyph Collects

| Data Category | Specific Data | PDPO Classification | Purpose | Storage Location |
|---|---|---|---|---|
| **Patient identity** | Name (English + Bangla), phone, age, DOB, gender, blood group, address | Personal data | Patient identification, record matching | `patients` table |
| **Emergency contacts** | Name, phone number | Personal data | Emergency communication | `patients` table |
| **Clinical history** | Known allergies, chronic conditions | Sensitive personal data (health) | Clinical decision support | `patients` table |
| **Voice recordings** | Intake conversation audio, consultation audio | Sensitive personal data (health + biometric) | Speech-to-text transcription | Supabase Storage (temporary) |
| **Conversation transcripts** | Intake transcript, consultation transcript | Sensitive personal data (health) | Clinical documentation | `visits` table (JSONB) |
| **Clinical summaries** | Intake summary, briefing card, clinical note | Sensitive personal data (health) | Clinical workflow | `visits` table (JSONB) |
| **Prescription data** | Medications, dosages, diagnoses, ICD-10 codes | Sensitive personal data (health) | Clinical history, drug interaction checking | `prescriptions` table |
| **Lab results** | Test names, values, reference ranges, abnormal flags | Sensitive personal data (health) | Clinical assessment, trend analysis | `lab_reports` table |
| **Medical images** | Prescription photos, lab report photos | Sensitive personal data (health) | OCR extraction, clinical record | Supabase Storage |
| **Doctor identity** | Name, phone, email, BMDC registration, speciality | Personal data | Authentication, attribution | `doctors` table |
| **Consent records** | Consent type, granted/denied, who granted, timestamp, device info, IP | Personal data | Regulatory compliance audit trail | `consent_records` table |
| **AI interaction logs** | Model used, tokens, latency, cost | Operational data | Cost monitoring, debugging | `api_usage_log` table |
| **Attendant information** | Name, relationship to patient | Personal data | Source attribution | `visits` table |

### What Data Glyph Does NOT Collect

- National ID (NID) numbers
- Financial information (bank accounts, payment details)
- Biometric data beyond voice (no fingerprints, facial recognition)
- Location tracking / GPS data
- Social media identifiers
- Religious or political information

---

## Consent Collection

### PDPO 2025 Requirements

The PDPO 2025 requires:
1. **Free, specific, informed, and unambiguous consent** for processing personal data
2. **Explicit consent** for processing sensitive personal data (including health data)
3. Consent must be **granular** -- data subjects must be able to consent to specific processing activities independently
4. Consent must be **withdrawable** at any time
5. Records of consent must be maintained

### Glyph's Consent Implementation

Consent is collected at the beginning of the intake process, before any data processing begins. The `consent_records` table tracks each consent type independently.

**Consent types and their scope:**

| Consent Type | What It Covers | Required For | Can Be Declined? |
|---|---|---|---|
| `recording` | Recording intake conversation and consultation audio | Voice features | Yes -- text-only intake available |
| `data_storage` | Storing personal health information in the system | Using Glyph at all | No -- core requirement (patient can choose not to use Glyph) |
| `ai_processing` | AI-assisted analysis of health data | AI features (briefing, note generation) | Yes -- manual workflow available |
| `image_capture` | Photographing prescriptions and lab reports | Document extraction | Yes -- manual data entry available |
| `whatsapp_followup` | Receiving follow-up messages via WhatsApp | Automated follow-up | Yes -- no follow-up sent |
| `data_sharing` | Sharing de-identified data for research | Research participation | Yes -- no research data shared |

**Consent collection flow:**

1. Consent screens are presented in Bangla (primary) with English translation
2. Each consent type is presented individually with:
   - Clear description of what the patient is consenting to
   - What happens if they decline
   - Simple "I agree" / "I do not agree" buttons
3. The identity of who provides consent is recorded:
   - `patient` -- the patient themselves
   - `attendant` -- a family member/attendant (with their relationship recorded)
   - `guardian` -- a legal guardian (for minors or incapacitated patients)
4. Consent records include device information and IP address for audit purposes
5. Consent can be withdrawn at any time via the doctor's interface

**Consent record structure:**

```sql
INSERT INTO consent_records (
  patient_id, visit_id, consent_type,
  granted, granted_by, device_info, ip_address
) VALUES (
  $patient_id, $visit_id, 'recording',
  true, 'attendant', 'Mozilla/5.0 Android Tablet...', '103.25.x.x'
);
```

---

## Data Storage

### Encryption at Rest

All data stored in Supabase is encrypted at rest using AES-256 encryption. This applies to:
- PostgreSQL database (all tables)
- Supabase Storage (all buckets: `rx-images`, `lab-images`, `audio-recordings`)
- Backups

### Encryption in Transit

All data in transit uses TLS 1.2 or higher:
- Client (PWA) to Supabase: HTTPS
- Supabase to Edge Functions: Internal TLS
- Edge Functions to AI providers: HTTPS
- WhatsApp Business API: HTTPS

### Data Isolation

Row-Level Security (RLS) ensures that:
- Each doctor can only access data from their own clinic
- Cross-clinic data access is impossible even with a valid authentication token
- Patient-facing views have minimal write-only access

### Geographic Data Residency

Supabase project is configured with a region appropriate for Bangladesh data processing. The database and storage are hosted in a single region. Data does not leave this region except when sent to external AI APIs (see De-identification below).

---

## AI Processing Disclosure

### PDPO 2025 Requirements

The PDPO 2025 requires that data subjects be informed when their data is processed by automated systems, particularly for decisions that may affect them.

### Glyph's Disclosure Approach

1. **Pre-processing consent**: The `ai_processing` consent type explicitly informs the patient that their health data will be analyzed by AI systems before any AI processing occurs

2. **Visible AI attribution**: The briefing card and clinical note display source tags showing which information was AI-generated vs. directly captured from the patient

3. **Doctor in the loop**: All AI-generated clinical content (briefing cards, clinical notes) requires explicit doctor review and approval before becoming part of the patient's medical record. The AI assists; the doctor decides.

4. **No automated clinical decisions**: Glyph does not make automated clinical decisions. Red flags are surfaced as alerts, but the doctor decides the clinical response. This is consistent with PDPO 2025 Article 9 (restrictions on automated decision-making).

---

## Data Retention Policies

| Data Type | Retention Period | Justification | Deletion Method |
|---|---|---|---|
| Voice recordings (audio files) | 24 hours after transcription | Needed only for speech-to-text; no clinical value once transcribed | Automated deletion from Supabase Storage |
| Conversation transcripts | Duration of clinical record | Part of the clinical encounter documentation | Manual deletion on patient request |
| Clinical notes | Duration of clinical record | Legal medical record | Manual deletion on patient request |
| Prescription photos | Duration of clinical record | Clinical documentation | Manual deletion on patient request |
| Lab report photos | Duration of clinical record | Clinical documentation | Manual deletion on patient request |
| Consent records | Indefinite | Regulatory audit trail | Not deletable (regulatory requirement) |
| API usage logs | 1 year | Cost monitoring and debugging | Automated purge after 1 year |
| Patient demographic data | Duration of clinical relationship + 5 years | Medical record retention | Manual deletion on request, after retention period |

### Audio Recording Lifecycle

Voice recordings receive special treatment due to their sensitive nature (biometric data):

```
Audio captured -> Uploaded to Supabase Storage -> Sent to Speech-to-Text API
                                                       |
                                                       v
                                              Transcript stored in
                                              visits.intake_transcript
                                                       |
                                                       v
                                              Audio file deleted
                                              (within 24 hours)
```

Audio files are **never** sent to AI language models. Only the text transcript is used for clinical processing.

---

## Patient Rights

### Right of Access

Patients can request access to all data Glyph holds about them. The doctor's interface provides a "Patient Data Export" feature that generates a complete record including:
- Demographic information
- All visit records with transcripts and notes
- Prescription and lab report data
- Consent history
- AI processing log (which models processed their data)

Export format: PDF for clinical records, JSON for machine-readable data.

### Right of Correction

Patients can request corrections to their data through the treating doctor. Corrections are tracked with a modification history (the `updated_at` trigger maintains an audit trail).

### Right of Deletion

Patients can request deletion of their data ("right to be forgotten"). Implementation:

1. **Soft delete**: Patient record is marked as deleted, data is retained in an encrypted archive for the legally required retention period
2. **Hard delete**: After the retention period, data is permanently deleted from all storage (database + Storage buckets)
3. **Exceptions**: Consent records are not deletable (regulatory audit trail requirement)
4. **AI model impact**: Deletion ensures the patient's data is not used in any future AI processing. Since Glyph uses third-party AI APIs (not fine-tuned models), no model retraining is needed.

### Right of Portability

Patients can request their data in a portable format. Glyph supports export in:
- JSON (machine-readable, including all structured data)
- PDF (human-readable clinical records)

---

## De-Identification Before External AI APIs

### The Challenge

Glyph sends clinical data to external AI APIs (Anthropic Claude, Google Gemini, OpenAI GPT, Perplexity) for processing. These are third-party services that may process data outside Bangladesh. PDPO 2025 requires adequate protection for cross-border data transfers.

### De-Identification Process

Before sending data to any external AI API, the Edge Functions strip all personally identifiable information:

**Fields removed before AI processing:**

| Field | Replacement |
|---|---|
| Patient name | "Patient" or "[PATIENT]" |
| Patient phone | Removed |
| Patient address | Removed |
| Date of birth | Age only (e.g., "62-year-old male") |
| Emergency contacts | Removed |
| Doctor name | "Treating physician" |
| Doctor phone | Removed |
| Clinic name | "Clinic" |
| Clinic address | Removed |
| Attendant name | "Attendant ([relation])" |
| Prescription doctor name | "Previous physician" |
| Lab facility name | "Laboratory" |

**Fields retained (clinical necessity):**

| Field | Justification |
|---|---|
| Age and gender | Essential for clinical reasoning |
| Chief complaint and history | Core clinical data needed for AI processing |
| Medications and dosages | Drug interaction checking |
| Lab results and values | Clinical assessment |
| Chronic conditions | Clinical context |
| Allergies | Patient safety |

**Example de-identification:**

Before:
```
Abdul Karim, 62-year-old male from Mirpur-10, Dhaka. Phone: +8801811111001.
Seen by Dr. A. Rahman at Dr. Rahman Clinic. Son (Tariq Karim) reports
that his father has had increasing shortness of breath for 2 weeks.
Previous labs from Popular Diagnostics show HbA1c 8.2%.
```

After de-identification:
```
62-year-old male patient. Attendant (son) reports that the patient
has had increasing shortness of breath for 2 weeks. Previous labs
show HbA1c 8.2%.
```

### Re-Identification on Return

When the AI response is received, the Edge Function re-associates the clinical content with the patient's record using the visit ID. The AI never receives or returns patient-identifying information.

---

## WhatsApp Communication Consent

### Special Considerations

WhatsApp follow-up messages require additional consent considerations:

1. **Explicit opt-in**: The `whatsapp_followup` consent type is separate from other consent types. Patients must specifically agree to receive WhatsApp messages.

2. **Phone number verification**: Follow-up messages are sent only to the phone number registered in the patient's record. The patient confirms this is their personal phone (not a shared family phone) during consent collection.

3. **Content limitations**: WhatsApp messages contain:
   - Brief visit summary (no detailed clinical information)
   - General follow-up questions
   - No sensitive diagnoses or test results
   - No medication details (to protect privacy if someone else reads the message)

4. **Opt-out mechanism**: Every WhatsApp message includes an opt-out option. If the patient responds with "STOP", the `whatsapp_followup` consent is automatically withdrawn:
   ```sql
   UPDATE consent_records
   SET withdrawn_at = now()
   WHERE patient_id = $patient_id
   AND consent_type = 'whatsapp_followup'
   AND withdrawn_at IS NULL;
   ```

---

## Compliance Checklist

| PDPO 2025 Requirement | Glyph Implementation | Status |
|---|---|---|
| Lawful basis for processing | Explicit consent for all processing types | Implemented |
| Consent must be free and specific | Per-type consent with individual accept/decline | Implemented |
| Consent must be informed | Bangla-language explanation of each consent type | Implemented |
| Consent must be withdrawable | Withdrawal tracked via `withdrawn_at` column | Implemented |
| Consent records maintained | `consent_records` table with full audit trail | Implemented |
| Purpose limitation | Each consent type tied to specific processing purpose | Implemented |
| Data minimization | Only clinically necessary data collected | Implemented |
| Storage limitation | Retention policies with automated/manual deletion | Designed |
| Integrity and confidentiality | AES-256 at rest, TLS in transit, RLS | Implemented |
| Data subject rights (access) | Patient data export feature | Designed |
| Data subject rights (correction) | Doctor-mediated corrections with audit trail | Designed |
| Data subject rights (deletion) | Soft delete + hard delete after retention period | Designed |
| Data subject rights (portability) | JSON and PDF export | Designed |
| Automated decision-making safeguards | Doctor-in-the-loop for all clinical decisions | Implemented |
| Cross-border transfer protections | De-identification before external API calls | Implemented |
| Data breach notification | Monitoring and notification pipeline | Planned |
| Data Protection Officer appointment | To be designated | Planned |
| Privacy impact assessment | This document serves as the initial assessment | In progress |
