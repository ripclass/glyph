# Glyph Data Model

> Last updated: April 2026

## Overview

Glyph uses a single PostgreSQL 15 database managed by Supabase. The schema is designed around the clinical visit lifecycle, with the `visits` table as the central entity linking patients, doctors, clinics, and all encounter data.

All tables have Row-Level Security (RLS) enabled. Data access is scoped to the authenticated doctor's clinic.

---

## Entity-Relationship Diagram

```
+-------------------+       +-------------------+       +-------------------+
|     clinics       |       |     doctors       |       |   auth.users      |
|-------------------|       |-------------------|       |-------------------|
| id (PK)           |<------| clinic_id (FK)    |       | id (PK)           |
| name              |       | id (PK, FK) ------+------>|                   |
| address           |       | name              |       |                   |
| district          |       | name_bn           |       +-------------------+
| phone             |       | speciality        |
| created_at        |       | bmdc_reg_no       |
+-------------------+       | phone             |
        |                   | email             |
        |                   | preferred_language|
        |                   | preferred_note_   |
        |                   |   format          |
        |                   | settings (JSONB)  |
        |                   | created_at        |
        |                   +-------------------+
        |                           |
        |                           |
        v                           v
+-------------------+       +-------------------+
|     patients      |       |      visits       |
|-------------------|       |-------------------|
| id (PK)           |<------| patient_id (FK)   |
| clinic_id (FK) ---|------>| doctor_id (FK) ---|-------> doctors
| name              |       | clinic_id (FK) ---|-------> clinics
| name_bn           |       | visit_date        |
| phone             |       | visit_number      |       +-------------------+
| age               |       | status            |       |  prescriptions    |
| date_of_birth     |       |                   |       |-------------------|
| gender            |       | attendant_present |       | id (PK)           |
| blood_group       |       | attendant_name    |<------| visit_id (FK)     |
| address           |       | attendant_relation|       | patient_id (FK) --+-> patients
| primary_language  |       | attendant_language|       | source            |
| emergency_contact |       | attendant_        |       | image_path        |
|   _name           |       |   reliability_    |       | prescribing_      |
| emergency_contact |       |   notes           |       |   doctor_name     |
|   _phone          |       |                   |       | prescription_date |
| known_allergies   |       | intake_transcript |       | diagnosis         |
|   (JSONB)         |       |   (JSONB)         |       | diagnosis_icd10   |
| chronic_conditions|       | intake_summary    |       | medications       |
|   (JSONB)         |       |   (JSONB)         |       |   (JSONB)         |
| created_at        |       | intake_duration_  |       | investigations_   |
| updated_at        |       |   seconds         |       |   ordered (JSONB) |
+-------------------+       | intake_completed_ |       | advice            |
        |                   |   at              |       | raw_extraction    |
        |                   |                   |       | extraction_       |
        |                   | briefing_card     |       |   confidence      |
        |                   |   (JSONB)         |       | verified_by_doctor|
        |                   | briefing_         |       | created_at        |
        |                   |   generated_at    |       +-------------------+
        |                   |                   |
        |                   | consultation_     |       +-------------------+
        |                   |   started_at      |       |   lab_reports     |
        |                   | consultation_     |       |-------------------|
        |                   |   ended_at        |       | id (PK)           |
        |                   | consultation_     |<------| visit_id (FK)     |
        |                   |   transcript      |       | patient_id (FK) --+-> patients
        |                   |   (JSONB)         |       | source            |
        |                   | consultation_     |       | image_path        |
        |                   |   queries (JSONB) |       | lab_name          |
        |                   |                   |       | report_date       |
        |                   | generated_note    |       | test_category     |
        |                   |   (JSONB)         |       | results (JSONB)   |
        |                   | doctor_edits      |       | raw_extraction    |
        |                   |   (JSONB)         |       | extraction_       |
        |                   | approved_note     |       |   confidence      |
        |                   |   (JSONB)         |       | verified_by_doctor|
        |                   | note_format       |       | created_at        |
        |                   | approved_at       |       +-------------------+
        |                   |                   |
        |                   | evidence_links    |       +-------------------+
        |                   |   (JSONB)         |       | consent_records   |
        |                   |                   |       |-------------------|
        |                   | followup_         |       | id (PK)           |
        |                   |   scheduled_at    |<------| visit_id (FK)     |
        |                   | followup_sent_at  |       | patient_id (FK) --+-> patients
        |                   | followup_response |       | consent_type      |
        |                   | followup_         |       | granted           |
        |                   |   response_at     |       | granted_by        |
        |                   |                   |       | granted_at        |
        |                   | api_costs (JSONB) |       | withdrawn_at      |
        |                   | created_at        |       | device_info       |
        |                   | updated_at        |       | ip_address        |
        |                   +-------------------+       +-------------------+
        |                           |
        |                           |
        |                           v
        |                   +-------------------+
        |                   |  api_usage_log    |
        |                   |-------------------|
        |                   | id (PK)           |
        +------------------>| visit_id (FK)     |
                            | edge_function     |
                            | model_used        |
                            | was_fallback      |
                            | input_tokens      |
                            | output_tokens     |
                            | latency_ms        |
                            | estimated_cost_usd|
                            | error             |
                            | created_at        |
                            +-------------------+
```

---

## Table Definitions

### `clinics`

The clinic or practice location. Multi-clinic support is built into the data model from day one.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | Unique clinic identifier |
| `name` | TEXT | NOT NULL | Clinic name (e.g., "Dr. Rahman Clinic") |
| `address` | TEXT | nullable | Full street address |
| `district` | TEXT | nullable | Administrative district (e.g., "Mirpur") |
| `phone` | TEXT | nullable | Clinic phone number |
| `created_at` | TIMESTAMPTZ | default `now()` | Record creation time |

**RLS Policy**: `own_clinic` -- doctors can only see clinics they belong to.

---

### `doctors`

Registered clinicians. The primary key directly references `auth.users(id)`, establishing a 1:1 relationship with Supabase Auth.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, FK -> `auth.users(id)` | Doctor ID = Supabase Auth user ID |
| `clinic_id` | UUID | FK -> `clinics(id)` | The clinic this doctor belongs to |
| `name` | TEXT | NOT NULL | Full name in English |
| `name_bn` | TEXT | nullable | Full name in Bangla |
| `speciality` | TEXT | nullable | Medical specialization |
| `bmdc_reg_no` | TEXT | nullable | Bangladesh Medical & Dental Council registration number |
| `phone` | TEXT | UNIQUE, NOT NULL | Phone number (also used for OTP login) |
| `email` | TEXT | nullable | Email address |
| `preferred_language` | TEXT | default `'bn'` | UI language preference (`bn` or `en`) |
| `preferred_note_format` | TEXT | default `'bd'` | Clinical note format (currently only `'bd'`) |
| `settings` | JSONB | default `'{}'` | Extensible settings (notification preferences, AI behavior tweaks, etc.) |
| `created_at` | TIMESTAMPTZ | default `now()` | Record creation time |

**RLS Policy**: `own_doctor` -- doctors can only read/update their own row.

---

### `patients`

Patient demographics and contact information. Patients belong to a clinic and can have multiple visits.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | Unique patient identifier |
| `clinic_id` | UUID | FK -> `clinics(id)`, NOT NULL | The clinic this patient is registered at |
| `name` | TEXT | NOT NULL | Full name in English |
| `name_bn` | TEXT | nullable | Full name in Bangla |
| `phone` | TEXT | nullable | Patient's phone number (for WhatsApp follow-up) |
| `age` | INTEGER | nullable | Age in years |
| `date_of_birth` | DATE | nullable | Date of birth (more precise than age) |
| `gender` | TEXT | CHECK `('male','female','other')` | Patient gender |
| `blood_group` | TEXT | nullable | Blood group (e.g., "B+", "O-") |
| `address` | TEXT | nullable | Residential address |
| `primary_language` | TEXT | default `'bn'` | Patient's preferred language |
| `emergency_contact_name` | TEXT | nullable | Emergency contact name |
| `emergency_contact_phone` | TEXT | nullable | Emergency contact phone |
| `known_allergies` | JSONB | default `'[]'` | Array of known allergies (e.g., `["Penicillin", "NSAIDs"]`) |
| `chronic_conditions` | JSONB | default `'[]'` | Array of chronic conditions (e.g., `["Type 2 Diabetes", "Hypertension"]`) |
| `created_at` | TIMESTAMPTZ | default `now()` | Record creation time |
| `updated_at` | TIMESTAMPTZ | default `now()` | Last update time (auto-updated via trigger) |

**RLS Policy**: `doctors_own_clinic` -- doctors can only see patients from their clinic.

**Indexes**:
- `idx_patients_phone` on `phone` -- lookup by phone number
- `idx_patients_clinic` on `clinic_id` -- filter patients by clinic

---

### `visits`

The central entity of the data model. Tracks the full lifecycle of a clinical encounter from intake to follow-up. Every other clinical entity links back to a visit.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | Unique visit identifier |
| `patient_id` | UUID | FK -> `patients(id)`, NOT NULL | The patient being seen |
| `doctor_id` | UUID | FK -> `doctors(id)`, NOT NULL | The treating doctor |
| `clinic_id` | UUID | FK -> `clinics(id)`, NOT NULL | The clinic where the visit occurs |
| `visit_date` | DATE | default `CURRENT_DATE` | Date of the visit |
| `visit_number` | INTEGER | default 1 | Auto-incremented visit count for this patient (via trigger) |
| `status` | TEXT | CHECK (see below), default `'intake'` | Current lifecycle status |
| **Attendant Fields** | | | |
| `attendant_present` | BOOLEAN | default `false` | Whether an attendant is providing information |
| `attendant_name` | TEXT | nullable | Name of the attendant |
| `attendant_relation` | TEXT | nullable | Relationship to patient (e.g., "son", "wife", "daughter") |
| `attendant_language` | TEXT | nullable | Language the attendant speaks |
| `attendant_reliability_notes` | TEXT | nullable | AI-assessed notes on attendant reliability |
| **Intake Data** | | | |
| `intake_transcript` | JSONB | default `'[]'` | Array of transcript entries `{speaker, text, timestamp, language}` |
| `intake_summary` | JSONB | nullable | Structured summary of intake conversation |
| `intake_duration_seconds` | INTEGER | nullable | Total intake duration |
| `intake_completed_at` | TIMESTAMPTZ | nullable | When intake was completed |
| **Briefing Card** | | | |
| `briefing_card` | JSONB | nullable | Structured briefing data matching `BriefingData` interface |
| `briefing_generated_at` | TIMESTAMPTZ | nullable | When briefing was generated |
| **Consultation** | | | |
| `consultation_started_at` | TIMESTAMPTZ | nullable | When the doctor started the consultation |
| `consultation_ended_at` | TIMESTAMPTZ | nullable | When the consultation ended |
| `consultation_transcript` | JSONB | nullable | Transcribed consultation audio |
| `consultation_queries` | JSONB | default `'[]'` | Array of research queries made during consultation |
| **Clinical Note** | | | |
| `generated_note` | JSONB | nullable | AI-generated clinical note |
| `doctor_edits` | JSONB | nullable | Delta of doctor's edits to the generated note |
| `approved_note` | JSONB | nullable | Final approved note (generated + edits) |
| `note_format` | TEXT | default `'bd'` | Format of the note (currently `'bd'` for Bangladesh format) |
| `approved_at` | TIMESTAMPTZ | nullable | When the doctor approved the note |
| **Evidence** | | | |
| `evidence_links` | JSONB | default `'{}'` | Map of claim IDs to source evidence items |
| **Follow-Up** | | | |
| `followup_scheduled_at` | TIMESTAMPTZ | nullable | When follow-up is scheduled |
| `followup_sent_at` | TIMESTAMPTZ | nullable | When follow-up message was sent |
| `followup_response` | TEXT | nullable | Patient's response to follow-up |
| `followup_response_at` | TIMESTAMPTZ | nullable | When response was received |
| **Internal** | | | |
| `api_costs` | JSONB | default `'{}'` | Aggregated API cost breakdown for this visit |
| `created_at` | TIMESTAMPTZ | default `now()` | Record creation time |
| `updated_at` | TIMESTAMPTZ | default `now()` | Last update time (auto-updated via trigger) |

**Visit Status Lifecycle**:
```
intake -> intake_complete -> in_consultation -> note_review -> completed -> followup_sent
```

| Status | Meaning |
|---|---|
| `intake` | Patient/attendant is completing intake on the tablet |
| `intake_complete` | Intake finished, briefing card is being generated |
| `in_consultation` | Doctor is actively seeing the patient |
| `note_review` | Consultation ended, doctor is reviewing the generated note |
| `completed` | Note approved, visit complete |
| `followup_sent` | Follow-up message sent via WhatsApp |

**RLS Policy**: `visits_own_clinic` -- doctors can only see visits from their clinic.

**Indexes**:
- `idx_visits_patient` on `patient_id` -- patient visit history
- `idx_visits_doctor` on `doctor_id` -- doctor's visit list
- `idx_visits_date` on `visit_date DESC` -- recent visits first
- `idx_visits_status` on `status` -- queue filtering
- `idx_visits_clinic_date` on `(clinic_id, visit_date DESC)` -- clinic daily view

---

### `prescriptions`

Prescription records captured from photographs or generated by the system. Multiple prescriptions can be linked to a single visit (historical prescriptions brought by the patient).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | Unique prescription identifier |
| `patient_id` | UUID | FK -> `patients(id)`, NOT NULL | The patient this prescription belongs to |
| `visit_id` | UUID | FK -> `visits(id)`, nullable | The visit during which this was captured (null for pre-existing) |
| `source` | TEXT | CHECK `('photo_historical','photo_current','generated')`, NOT NULL | How this prescription was captured |
| `image_path` | TEXT | nullable | Supabase Storage path to the prescription photo |
| `prescribing_doctor_name` | TEXT | nullable | Name of the doctor who wrote this prescription |
| `prescription_date` | DATE | nullable | Date on the prescription |
| `diagnosis` | TEXT | nullable | Diagnosis text from the prescription |
| `diagnosis_icd10` | TEXT | nullable | ICD-10 code if identifiable |
| `medications` | JSONB | default `'[]'` | Array of medication objects (see below) |
| `investigations_ordered` | JSONB | default `'[]'` | Array of investigations ordered |
| `advice` | TEXT | nullable | Advice text from the prescription |
| `raw_extraction` | TEXT | nullable | Raw OCR/AI extraction text for debugging |
| `extraction_confidence` | REAL | nullable | AI confidence score (0.0 to 1.0) |
| `verified_by_doctor` | BOOLEAN | default `false` | Whether the doctor verified the extraction |
| `created_at` | TIMESTAMPTZ | default `now()` | Record creation time |

**Medication JSONB structure**:
```json
{
  "name": "Metformin",
  "generic_name": "Metformin",
  "dose": "500mg",
  "unit": "mg",
  "frequency": "1+0+1",
  "duration": "30 days",
  "route": "oral"
}
```

The `frequency` field uses the South Asian dosage notation: `morning+afternoon+night` (e.g., `1+0+1` means one tablet morning, none afternoon, one at night).

**Source types**:
- `photo_historical`: A prescription photo the patient brought from a previous visit
- `photo_current`: A prescription written during or immediately before this visit
- `generated`: A prescription generated by the system as part of the clinical note

**RLS Policy**: `prescriptions_own_clinic` -- scoped through patient -> clinic chain.

**Index**: `idx_prescriptions_patient` on `patient_id`

---

### `lab_reports`

Laboratory and diagnostic report records. Structured extraction from photographs or digital results.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | Unique report identifier |
| `patient_id` | UUID | FK -> `patients(id)`, NOT NULL | The patient this report belongs to |
| `visit_id` | UUID | FK -> `visits(id)`, nullable | The visit during which this was captured |
| `source` | TEXT | CHECK `('photo_historical','photo_current','digital')`, NOT NULL | How this report was captured |
| `image_path` | TEXT | nullable | Supabase Storage path to the report photo |
| `lab_name` | TEXT | nullable | Name of the laboratory (e.g., "Popular Diagnostics") |
| `report_date` | DATE | nullable | Date of the report |
| `test_category` | TEXT | nullable | Category of tests (e.g., "RFT", "HbA1c", "CBC", "LFT") |
| `results` | JSONB | default `'[]'` | Array of result objects (see below) |
| `raw_extraction` | TEXT | nullable | Raw OCR/AI extraction text for debugging |
| `extraction_confidence` | REAL | nullable | AI confidence score (0.0 to 1.0) |
| `verified_by_doctor` | BOOLEAN | default `false` | Whether the doctor verified the extraction |
| `created_at` | TIMESTAMPTZ | default `now()` | Record creation time |

**Results JSONB structure**:
```json
{
  "name": "HbA1c",
  "value": "8.2",
  "unit": "%",
  "range": "<7.0",
  "isAbnormal": true,
  "severity": "moderate"
}
```

**RLS Policy**: `lab_reports_own_clinic` -- scoped through patient -> clinic chain.

**Indexes**:
- `idx_lab_reports_patient` on `patient_id`
- `idx_lab_reports_category` on `(patient_id, test_category)` -- enables trend queries per test type

---

### `consent_records`

Granular consent tracking for regulatory compliance (PDPO 2025). Each consent type is recorded separately, and consent can be granted by the patient, an attendant, or a legal guardian.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | Unique consent record identifier |
| `patient_id` | UUID | FK -> `patients(id)`, NOT NULL | The patient this consent belongs to |
| `visit_id` | UUID | FK -> `visits(id)`, nullable | The visit during which consent was collected |
| `consent_type` | TEXT | CHECK (see below), NOT NULL | Type of consent granted |
| `granted` | BOOLEAN | NOT NULL | Whether consent was granted (`true`) or denied (`false`) |
| `granted_by` | TEXT | CHECK `('patient','attendant','guardian')`, NOT NULL | Who provided the consent |
| `granted_at` | TIMESTAMPTZ | default `now()` | When consent was granted |
| `withdrawn_at` | TIMESTAMPTZ | nullable | When consent was withdrawn (null = still active) |
| `device_info` | TEXT | nullable | Device user-agent string for audit trail |
| `ip_address` | INET | nullable | IP address for audit trail |

**Consent types**:
| Type | Description |
|---|---|
| `recording` | Consent to record the intake conversation and consultation audio |
| `data_storage` | Consent to store personal health information in the system |
| `ai_processing` | Consent for AI-assisted analysis of health data |
| `image_capture` | Consent to photograph prescriptions and lab reports |
| `whatsapp_followup` | Consent to receive follow-up messages via WhatsApp |
| `data_sharing` | Consent to share de-identified data for research |

**RLS Policy**: `consent_own_clinic` -- scoped through patient -> clinic chain.

**Index**: `idx_consent_patient` on `patient_id`

---

### `api_usage_log`

Tracks every AI API call for cost monitoring, debugging, and performance analysis.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | Unique log entry identifier |
| `visit_id` | UUID | FK -> `visits(id)` | The visit this API call was made for |
| `edge_function` | TEXT | NOT NULL | Name of the Edge Function (e.g., `generate-briefing`) |
| `model_used` | TEXT | NOT NULL | Model identifier (e.g., `claude-3-5-sonnet`) |
| `was_fallback` | BOOLEAN | default `false` | Whether a fallback model was used |
| `input_tokens` | INTEGER | nullable | Number of input tokens consumed |
| `output_tokens` | INTEGER | nullable | Number of output tokens generated |
| `latency_ms` | INTEGER | nullable | End-to-end latency in milliseconds |
| `estimated_cost_usd` | REAL | nullable | Estimated cost in USD |
| `error` | TEXT | nullable | Error message if the call failed |
| `created_at` | TIMESTAMPTZ | default `now()` | When the API call was made |

**RLS Policy**: `api_log_own_visits` -- scoped through visit -> clinic chain.

**Index**: `idx_api_usage_visit` on `visit_id`

---

## Database Functions and Triggers

### `set_visit_number()` Trigger

Automatically increments the `visit_number` for each patient. When a new visit is inserted, the trigger queries the maximum `visit_number` for that patient and sets the new visit's number to `max + 1`.

```sql
CREATE TRIGGER trg_visit_number
  BEFORE INSERT ON visits
  FOR EACH ROW EXECUTE FUNCTION set_visit_number();
```

This gives doctors a quick reference: "This is the patient's 3rd visit."

### `update_timestamp()` Trigger

Automatically sets `updated_at = now()` on every UPDATE to the `patients` and `visits` tables.

```sql
CREATE TRIGGER trg_patients_updated
  BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_visits_updated
  BEFORE UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION update_timestamp();
```

---

## Row-Level Security (RLS) Summary

All tables have RLS enabled. The policy pattern is consistent: data is scoped to the authenticated doctor's clinic.

| Table | Policy Name | Rule |
|---|---|---|
| `clinics` | `own_clinic` | Doctor can see clinics where their `clinic_id` matches |
| `doctors` | `own_doctor` | Doctor can only see their own row (`id = auth.uid()`) |
| `patients` | `doctors_own_clinic` | Patients whose `clinic_id` matches the doctor's `clinic_id` |
| `visits` | `visits_own_clinic` | Visits whose `clinic_id` matches the doctor's `clinic_id` |
| `prescriptions` | `prescriptions_own_clinic` | Prescriptions whose patient belongs to the doctor's clinic |
| `lab_reports` | `lab_reports_own_clinic` | Lab reports whose patient belongs to the doctor's clinic |
| `consent_records` | `consent_own_clinic` | Consent records whose patient belongs to the doctor's clinic |
| `api_usage_log` | `api_log_own_visits` | API logs for visits in the doctor's clinic |

**Note on intake views**: Patient-facing intake views do not authenticate as a user. These views use the Supabase anon key with specific RLS policies (not yet implemented) that allow limited INSERT access for intake data, scoped to the visit ID provided in the session.

---

## JSONB Schema Conventions

Several columns use JSONB for flexible, evolving data structures. The conventions are:

1. **Arrays** default to `'[]'::jsonb` (never `null` for array fields)
2. **Objects** default to `'{}'::jsonb` (never `null` for object fields)
3. **TypeScript types** in `web/src/lib/supabase/types.ts` mirror the JSONB structure using `Record<string, unknown>` or typed arrays
4. **Schema validation** happens in the Edge Function layer before writing to the database

---

## Seed Data

The `supabase/seed.sql` file provides development data:

- 1 clinic: "Dr. Rahman Clinic" in Mirpur, Dhaka
- 5 patients with varied demographics and medical histories:
  - **Abdul Karim** (62M): Complex case with Type 2 Diabetes, Hypertension, CKD Stage 3, Penicillin allergy. Includes historical lab reports (RFT, HbA1c) and prescriptions.
  - **Fatema Begum** (45F): Hypothyroidism
  - **Mohammad Hasan** (28M): Young patient, Sulfa drug allergy, no chronic conditions
  - **Rashida Akter** (55F): Rheumatoid Arthritis, Hypertension
  - **Nurul Islam** (70M): Elderly with COPD, IHD, Type 2 Diabetes, NSAID allergy

Doctor records cannot be seeded directly because they require matching `auth.users` IDs. Create doctors via Supabase Auth first, then update the seed file with the correct UUIDs.
