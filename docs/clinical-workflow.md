# Glyph Clinical Workflow

> Last updated: April 2026

## Overview

This document describes the end-to-end patient flow through Glyph, from the moment a patient arrives at the clinic to the automated follow-up 2-3 days later. Each step identifies the actor, device, UI components involved, and the data operations that occur.

---

## Workflow Summary

```
Patient Arrives
     |
     v
[1] Receptionist creates visit, hands tablet
     |
     v
[2] Patient/attendant selects role (IntakeRolePage)
     |
     v
[3] Voice-first intake conversation with Saara
     |   - Push-to-talk via VoiceOrb
     |   - Camera capture for Rx/lab photos
     |   - AttendantBanner shown if attendant
     |
     v
[4] Patient reviews intake summary
     |
     v
[5] AI generates briefing card (Edge Function)
     |
     v
[6] Doctor reviews briefing on phone (BriefingCard)
     |   - Red flags at top
     |   - Source-tagged claims
     |   - LinkedEvidence panel for verification
     |
     v
[7] Doctor starts consultation
     |   - AmbientRecorder captures audio
     |   - Doctor can query AI research chat
     |   - UpToDatePanel shows clinical evidence
     |
     v
[8] AI generates clinical note (Edge Function)
     |
     v
[9] Doctor reviews note in BD format (NoteFormatBD)
     |   - Edits tracked
     |   - Approves final version
     |
     v
[10] WhatsApp summary sent to patient
     |
     v
[11] Follow-up in 2-3 days
```

---

## Step-by-Step Detail

### Step 1: Patient Arrives at Clinic

**Actor**: Receptionist
**Device**: Clinic computer or tablet
**UI**: `/doctor` (Doctor Dashboard) or future receptionist view

**What happens**:
1. Patient walks into the clinic and registers at the front desk
2. Receptionist looks up or creates the patient record in the system:
   - **Returning patient**: Search by phone number (`idx_patients_phone`) or name
   - **New patient**: Create a new record with name, phone, age, gender, address
3. Receptionist creates a new visit:
   ```sql
   INSERT INTO visits (patient_id, doctor_id, clinic_id, status)
   VALUES ($patient_id, $doctor_id, $clinic_id, 'intake');
   ```
   - The `trg_visit_number` trigger automatically sets `visit_number` based on the patient's prior visits
4. The visit appears in the doctor's queue via Supabase Realtime (status: "Waiting")
5. Receptionist hands the clinic tablet to the patient or their attendant

**Data created**:
- `patients` row (if new patient)
- `visits` row with `status = 'intake'`

---

### Step 2: Patient/Attendant Selects Role

**Actor**: Patient or Attendant
**Device**: Clinic tablet
**UI**: `/intake` (IntakeRolePage)

**What happens**:
1. The tablet displays two large buttons in Bangla with English subtitles:
   - "আমি রোগী" (I am the patient) -- blue patient icon
   - "আমি সাথে এসেছি" (I am the attendant) -- amber attendant icon
2. The user taps their role
3. The selection is stored in the session:
   ```typescript
   sessionStorage.setItem("intake_role", role); // 'patient' or 'attendant'
   ```
4. If "attendant" is selected:
   - The `AttendantBanner` component appears at the top of all subsequent intake screens
   - A follow-up question asks for the attendant's relationship to the patient (son, daughter, wife, husband, other)
   - `visits.attendant_present` is set to `true`
   - `visits.attendant_name` and `visits.attendant_relation` are populated
5. Navigation proceeds to `/intake/history`

**Data updated**:
- `visits.attendant_present`, `visits.attendant_name`, `visits.attendant_relation` (if attendant)

**Cultural context**: In Bangladesh, patients frequently arrive with family members who serve as attendants. The attendant often provides the clinical history, especially for elderly patients, children, or patients with limited health literacy. See [attendant-protocol.md](./attendant-protocol.md) for details.

---

### Step 3: Voice-First Intake Conversation

**Actor**: Patient or Attendant
**Device**: Clinic tablet
**UI**: `/intake/conversation` (ConversationPage) with VoiceOrb, SaaraMessage, PatientMessage

**What happens**:
1. Saara, the AI intake assistant, greets the patient in Bangla:
   - "স্বাগতম! আজ কীভাবে সাহায্য করতে পারি?" (Welcome! How can we help you today?)
2. The patient speaks by pressing and holding the VoiceOrb (push-to-talk):
   - **VoiceOrb states**: idle (green circle) -> listening (pulsing, "শুনছি...") -> processing (spinner, "প্রক্রিয়া করছি...")
   - Audio is captured and sent to the `transcribe-audio` Edge Function
   - Google Speech-to-Text V2 transcribes Bangla/English audio
   - Transcript appears as a PatientMessage bubble in the conversation
3. Saara asks structured follow-up questions based on the chief complaint:
   - Duration: "কতদিন ধরে এই সমস্যা?" (How long have you had this problem?)
   - Severity: "কতটা কষ্ট হচ্ছে?" (How much pain/discomfort?)
   - Associated symptoms: "আর কোনো সমস্যা আছে?" (Any other problems?)
   - Past medical history, current medications, allergies
4. At appropriate points, Saara prompts for document capture:
   - "আপনার প্রেসক্রিপশন থাকলে ছবি তুলুন" (If you have a prescription, take a photo)
   - DocumentCapture component activates the camera
   - Photos are uploaded to Supabase Storage
   - Edge Functions extract structured data:
     - `extract-prescription`: Medications, dosages, diagnoses
     - `extract-lab-report`: Test results with reference ranges
   - Extracted data displayed via ExtractedRxCard or ExtractedLabCard for patient verification
5. Each conversation turn is appended to `visits.intake_transcript`:
   ```json
   {
     "speaker": "patient",
     "text": "তিন দিন ধরে জ্বর, কাশি হচ্ছে",
     "timestamp": "2026-04-04T10:15:30Z",
     "language": "bn",
     "source": "patient"
   }
   ```

**Duration**: Typically 3-8 minutes

**Data created/updated**:
- `visits.intake_transcript[]` -- appended per utterance
- `prescriptions` rows -- from document capture
- `lab_reports` rows -- from document capture
- `consent_records` rows -- recording consent, AI processing consent
- Supabase Storage objects in `rx-images` and `lab-images` buckets

---

### Step 4: Patient Reviews Intake Summary

**Actor**: Patient or Attendant
**Device**: Clinic tablet
**UI**: `/intake/summary` (SummaryPage)

**What happens**:
1. After the conversation, the `intake-summarize` Edge Function generates a structured summary from the transcript
2. The summary is displayed in simple Bangla with clear sections:
   - Chief complaint
   - Duration and severity
   - Current medications (from photos + conversation)
   - Allergies mentioned
3. The patient/attendant can:
   - Confirm the summary is accurate
   - Go back to add more information
   - Flag corrections
4. On confirmation:
   - `visits.intake_summary` is populated with the structured summary
   - `visits.intake_completed_at` is set to `now()`
   - `visits.intake_duration_seconds` is calculated
   - `visits.status` changes from `'intake'` to `'intake_complete'`
5. The tablet displays a "Thank you, please wait" screen
6. The tablet is returned to the receptionist for the next patient

**Data updated**:
- `visits.intake_summary`
- `visits.intake_completed_at`
- `visits.intake_duration_seconds`
- `visits.status = 'intake_complete'`

---

### Step 5: AI Generates Briefing Card

**Actor**: System (automated)
**Device**: Server (Edge Function)
**Trigger**: `visits.status` changes to `'intake_complete'`

**What happens**:
1. The `generate-briefing` Edge Function is triggered (via Supabase webhook or polling)
2. The function gathers all available data:
   - Intake transcript from `visits.intake_transcript`
   - Intake summary from `visits.intake_summary`
   - Patient demographics from `patients` (including known allergies and chronic conditions)
   - Extracted prescriptions from `prescriptions` (linked to this patient)
   - Extracted lab reports from `lab_reports` (linked to this patient)
   - Prior visit data from `visits` (if returning patient)
   - Attendant information (`attendant_present`, `attendant_relation`)
3. All data is de-identified before being sent to Claude 3.5 Sonnet
4. Claude generates a structured `BriefingData` object:
   - **Red flags**: Critical findings requiring immediate attention (e.g., "Chest pain at rest in patient with known IHD")
   - **Chief complaint**: Source-attributed claims
   - **HPI**: Detailed history with source tags (patient vs attendant)
   - **Past medical history**: From patient record + intake conversation
   - **Current medications**: Merged from prescription extraction and verbal report
   - **Recent labs**: With abnormal value flagging
   - **Allergies**: From patient record + intake mention
   - **Social history**: Occupation, habits
   - **Assessment**: Key clinical considerations
5. Every claim includes source attribution (SourceType) and linked evidence (EvidenceItem)
6. The result is stored in `visits.briefing_card`
7. `visits.briefing_generated_at` is set to `now()`

**Latency target**: Under 10 seconds from trigger to stored result

**Data updated**:
- `visits.briefing_card`
- `visits.briefing_generated_at`
- `api_usage_log` entry for the Claude call

---

### Step 6: Doctor Reviews Briefing

**Actor**: Doctor
**Device**: Doctor's phone
**UI**: `/doctor/briefing/[visitId]` with BriefingCard, SourceTag, LinkedEvidence, RedFlagAlert

**What happens**:
1. The doctor sees the patient appear in their queue (PatientQueue component) with status "Waiting"
   - Queue updates arrive via Supabase Realtime
2. The doctor taps the patient card to open the briefing
3. The BriefingCard renders sections in clinical priority order:
   - **Red Flags** (red banner, top of card) -- cannot be missed
   - **Chief Complaint** (green border, high priority)
   - **History of Present Illness** -- with inline SourceTags
   - **Past Medical History**
   - **Current Medications** -- name + dosage + source
   - **Recent Lab Results** -- with abnormal value highlighting (red background, bold, "!" indicator)
   - **Allergies** (amber border, medium priority)
   - **Social History**
   - **Assessment / Key Considerations** (green border, high priority)
4. Every claim has a color-coded SourceTag indicating its origin:
   - Blue: "Per patient" -- information from the patient directly
   - Amber: "Per attendant (son)" -- information from the attendant, with relationship
   - Purple: "From Rx photo" -- extracted from a prescription photograph
   - Teal: "From lab report" -- extracted from a lab report
5. Tapping any SourceTag opens the LinkedEvidence slide-in panel:
   - Shows the original source content (transcript excerpt, raw OCR text)
   - Displays confidence level (High/Medium/Low with color coding)
   - Shows full surrounding context
   - Includes timestamp
6. The doctor reviews the briefing to prepare for the consultation
7. Red flags can be acknowledged/dismissed by the doctor (state tracked locally)

**No data is written** during this step -- it is purely informational.

---

### Step 7: Doctor Starts Consultation

**Actor**: Doctor and Patient
**Device**: Doctor's phone
**UI**: `/doctor/consult/[visitId]` with AmbientRecorder, UpToDatePanel

**What happens**:
1. The doctor taps "Start Consultation"
2. `visits.status` changes to `'in_consultation'`
3. `visits.consultation_started_at` is set to `now()`
4. The AmbientRecorder component activates:
   - Minimal dark bar at the bottom of the screen
   - Red dot (pulsing when active, static when paused)
   - Duration counter (MM:SS or HH:MM:SS)
   - Subtle waveform visualization (12 bars)
   - Pause/Resume button
   - **Design principle**: The recording UI is deliberately invisible -- it should not interfere with the doctor-patient interaction
5. Audio is continuously captured and streamed to the `transcribe-audio` Edge Function
6. During the consultation, the doctor can:
   - **Query the AI research chat**: Type or dictate a clinical question
     - Example: "What is the latest guideline for metformin in CKD stage 3?"
     - The `research-query` Edge Function calls Claude Sonnet + Perplexity + UpToDate
     - Results appear with citations and evidence grades
   - **View UpToDate recommendations**: The UpToDatePanel displays relevant clinical decision support content:
     - Topic title
     - Key recommendations with evidence grades (1A through 2C, color-coded)
     - Link to full article
     - "Powered by UpToDate" attribution
   - **Review the briefing card**: Scroll up to re-check intake findings
7. The doctor ends the consultation:
   - Taps "End Consultation"
   - `visits.consultation_ended_at` is set to `now()`
   - `visits.status` changes to `'note_review'`
   - Audio recording stops

**Data updated**:
- `visits.status = 'in_consultation'`
- `visits.consultation_started_at`
- `visits.consultation_transcript` (continuously updated during consultation)
- `visits.consultation_queries[]` (appended per research query)
- `visits.consultation_ended_at`
- `visits.status = 'note_review'`
- `api_usage_log` entries for transcription and research queries

---

### Step 8: AI Generates Clinical Note

**Actor**: System (automated)
**Device**: Server (Edge Function)
**Trigger**: `visits.status` changes to `'note_review'`

**What happens**:
1. The `generate-note` Edge Function is triggered
2. The function gathers:
   - Consultation transcript from `visits.consultation_transcript`
   - Briefing card from `visits.briefing_card`
   - Patient demographics and history
   - Research queries and responses from `visits.consultation_queries`
   - Doctor's preferred note format (`'bd'`)
3. Claude 3.5 Sonnet generates a clinical note in Bangladesh format (BDNote):
   - **C/C** (Chief Complaint): Concise reason for visit
   - **O/E** (On Examination): Physical examination findings from the consultation
   - **Ix** (Investigations): Labs and imaging ordered
   - **Rx** (Prescription): Medications with Bangladesh dosage format (`1+0+1`)
   - **Advice**: Lifestyle guidance, follow-up instructions in appropriate language
4. Each section element is linked to source evidence from the consultation transcript
5. The result is stored in `visits.generated_note`

**Latency target**: Under 10 seconds

**Data updated**:
- `visits.generated_note`
- `api_usage_log` entry

---

### Step 9: Doctor Reviews and Approves Note

**Actor**: Doctor
**Device**: Doctor's phone or review station (desktop)
**UI**: `/doctor/review/[visitId]` with NoteFormatBD

**What happens**:
1. The generated note is displayed via the NoteFormatBD component:
   - Five clearly labeled sections: C/C, O/E, Ix, Rx, Advice
   - Professional clinical typography with serif font
   - Section labels with full names (e.g., "C/C -- Chief Complaint")
   - Left border accent for content blocks
   - Dashed dividers between sections
2. The doctor reviews each section:
   - Can tap to edit any text inline
   - Edits are tracked as a delta in `visits.doctor_edits`
   - Can re-order or remove medications
   - Can add investigation orders
3. The doctor approves the final note:
   - Taps "Approve Note"
   - `visits.approved_note` is set to the final version (generated + edits)
   - `visits.approved_at` is set to `now()`
   - `visits.status` changes to `'completed'`
4. The approved note can be:
   - Printed for the patient (Bangladesh prescription format)
   - Saved as a PDF
   - Sent digitally to the patient

**Data updated**:
- `visits.doctor_edits`
- `visits.approved_note`
- `visits.approved_at`
- `visits.status = 'completed'`

---

### Step 10: WhatsApp Summary Sent to Patient

**Actor**: System (automated)
**Device**: Server (Edge Function)
**Trigger**: `visits.status` changes to `'completed'`

**Prerequisite**: Patient has a phone number on file AND has granted `whatsapp_followup` consent.

**What happens**:
1. The `followup-whatsapp` Edge Function checks consent:
   ```sql
   SELECT granted FROM consent_records
   WHERE patient_id = $patient_id
   AND consent_type = 'whatsapp_followup'
   AND granted = true
   AND withdrawn_at IS NULL;
   ```
2. If consent is active, Claude 3.5 Haiku generates a visit summary message in simple Bangla:
   - Brief summary of the visit
   - Medications prescribed (in simple language)
   - Key advice points
   - Next appointment information
3. The message is sent via the WhatsApp Business API:
   - Uses the clinic's WhatsApp Business phone number
   - Message format follows WhatsApp template requirements
4. `visits.followup_scheduled_at` is set to 2-3 days from now

**Data updated**:
- `visits.followup_scheduled_at`

---

### Step 11: Follow-Up (2-3 Days Later)

**Actor**: System (automated) + Patient
**Device**: Server (Edge Function) + Patient's phone (WhatsApp)

**What happens**:
1. A scheduled job checks for visits where `followup_scheduled_at` has passed and `followup_sent_at` is null
2. The `followup-whatsapp` Edge Function generates a follow-up message:
   - "আপনার অবস্থা কেমন?" (How are you feeling?)
   - Specific questions based on the chief complaint and treatment:
     - "জ্বর কমেছে কি?" (Has the fever reduced?)
     - "ওষুধগুলো নিয়মিত খাচ্ছেন তো?" (Are you taking the medications regularly?)
3. The message is sent via WhatsApp Business API
4. `visits.followup_sent_at` is set to `now()`
5. `visits.status` changes to `'followup_sent'`
6. If the patient responds:
   - The response is captured via WhatsApp webhook
   - `visits.followup_response` is populated
   - `visits.followup_response_at` is set
   - If the response indicates concern, the doctor is notified in their queue

**Data updated**:
- `visits.followup_sent_at`
- `visits.status = 'followup_sent'`
- `visits.followup_response` (if patient responds)
- `visits.followup_response_at` (if patient responds)

---

## Timing Summary

| Phase | Duration | Device | Primary Model |
|---|---|---|---|
| Receptionist creates visit | 1-2 minutes | Desktop/tablet | - |
| Role selection | 10 seconds | Patient tablet | - |
| Intake conversation | 3-8 minutes | Patient tablet | Google Speech, Claude Haiku |
| Summary review | 1-2 minutes | Patient tablet | - |
| Briefing generation | 5-10 seconds | Server | Claude Sonnet |
| Doctor reviews briefing | 1-3 minutes | Doctor phone | - |
| Consultation | 5-15 minutes | Doctor phone | Google Speech, Claude Sonnet |
| Note generation | 5-10 seconds | Server | Claude Sonnet |
| Note review/approval | 1-3 minutes | Doctor phone/desktop | - |
| WhatsApp summary | Immediate | Server | Claude Haiku |
| Follow-up | 2-3 days later | Server | Claude Haiku |

**Total AI-augmented visit time**: 15-35 minutes (comparable to a standard visit, but with significantly richer documentation and clinical decision support)
