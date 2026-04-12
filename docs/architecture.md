# Glyph System Architecture

> Last updated: April 2026

## Overview

Glyph is a clinical AI progressive web application (PWA) built by KhaM Health for Bangladeshi doctors. It augments the doctor-patient encounter with AI-powered intake, real-time briefing generation, ambient consultation recording, clinical note drafting, and automated follow-up — all designed for low-bandwidth environments and culturally appropriate workflows.

---

## High-Level System Diagram

```
+-----------------------------------------------------------------------+
|                           CLIENT LAYER (PWA)                          |
|                                                                       |
|  +--------------------+  +-------------------+  +------------------+  |
|  |  Patient Tablet    |  |  Doctor Phone     |  |  Review Station  |  |
|  |  (Intake UI)       |  |  (Consultation)   |  |  (Desktop)       |  |
|  |                    |  |                   |  |                  |  |
|  |  - Voice-first     |  |  - Briefing card  |  |  - Patient queue |  |
|  |  - Bangla primary  |  |  - Ambient record |  |  - Note review   |  |
|  |  - Camera capture  |  |  - AI chat        |  |  - Lab trends    |  |
|  |  - Large touch     |  |  - Quick notes    |  |  - Full history  |  |
|  +--------+-----------+  +--------+----------+  +--------+---------+  |
|           |                       |                      |            |
+-----------+-----------------------+----------------------+------------+
            |                       |                      |
            v                       v                      v
+-----------------------------------------------------------------------+
|                     NEXT.JS 14 APP ROUTER (Vercel)                    |
|                                                                       |
|  /intake/*           /doctor/*            /doctor/review/*            |
|  Server Components   Client + Server      Server Components           |
|  PWA service worker  Realtime subscriptions                           |
|  Zustand state       Zustand state                                    |
+-------------------------------+---------------------------------------+
                                |
                                v
+-----------------------------------------------------------------------+
|                     SUPABASE PLATFORM                                 |
|                                                                       |
|  +------------------+  +------------------+  +---------------------+  |
|  |  Supabase Auth   |  |  Supabase        |  |  Supabase Realtime  |  |
|  |  (Phone OTP)     |  |  PostgreSQL 15   |  |  (Queue updates)    |  |
|  +------------------+  +------------------+  +---------------------+  |
|                                                                       |
|  +------------------+  +----------------------------------------------+
|  |  Supabase        |  |  Supabase Edge Functions                     |
|  |  Storage         |  |  (Deno, API orchestration layer)             |
|  |  (Rx/lab images) |  |                                              |
|  +------------------+  |  - intake-summarize    - generate-briefing   |
|                        |  - extract-prescription - extract-lab-report |
|                        |  - transcribe-audio     - generate-note      |
|                        |  - research-query       - followup-whatsapp  |
|                        +----------------------------------------------+
|                                                                       |
+-------------------------------+---------------------------------------+
                                |
                                v
+-----------------------------------------------------------------------+
|                     EXTERNAL AI & DATA SERVICES                       |
|                                                                       |
|  +------------------+  +------------------+  +---------------------+  |
|  |  Anthropic       |  |  Google Cloud    |  |  OpenAI             |  |
|  |  Claude API      |  |  Speech-to-Text  |  |  GPT-4o (fallback) |  |
|  |  (primary AI)    |  |  Gemini Flash    |  |                     |  |
|  +------------------+  +------------------+  +---------------------+  |
|                                                                       |
|  +------------------+  +------------------+  +---------------------+  |
|  |  UpToDate        |  |  Perplexity      |  |  WhatsApp Business  |  |
|  |  Connect API     |  |  (research)      |  |  (follow-up msgs)   |  |
|  +------------------+  +------------------+  +---------------------+  |
+-----------------------------------------------------------------------+
```

---

## Core Components

### 1. Next.js 14 PWA (Vercel)

The frontend is a single Next.js 14 application deployed to Vercel, configured as a Progressive Web App via `next-pwa`. It serves three distinct client contexts from a single codebase using route-based layouts.

**Key technologies:**
- **React 18** with Server Components and Client Components
- **Tailwind CSS** with custom `glyph` (green) and `clinical` color palettes
- **Zustand** for client-side state management (visit context, recording state, queue)
- **@supabase/ssr** for server-side Supabase client creation
- **next-pwa** for service worker registration, offline caching, and installability
- **Noto Sans Bengali** font family for Bangla text rendering

**Route structure:**
```
/                     Landing page (doctor login / patient intake entry)
/intake/              Patient role selection (patient vs attendant)
/intake/history       Voice conversation with Saara (AI intake assistant)
/intake/conversation  Active conversation UI
/intake/summary       Intake summary review before sending to doctor
/doctor/              Doctor dashboard with patient queue
/doctor/briefing/[id] Briefing card for a specific visit
/doctor/consult/[id]  Active consultation with ambient recording
/doctor/review/[id]   Note review and approval
/doctor/settings      Doctor preferences
/doctor/patients      Patient directory
/doctor/schedule      Schedule management
```

### 2. Supabase Edge Functions (API Orchestration Layer)

Edge Functions serve as the API orchestration layer between the frontend and external AI services. They run on Deno at the edge, providing:

- **AI model routing**: Selecting the right model for each task based on cost, latency, and accuracy requirements
- **De-identification**: Stripping PII before sending data to external AI APIs
- **Cost tracking**: Logging every API call's token usage and estimated cost to `api_usage_log`
- **Fallback handling**: Automatic failover to secondary models when primary models are unavailable or slow
- **Rate limiting**: Per-clinic and per-doctor rate limits to control costs

**Edge Function inventory:**

| Function | Purpose | Primary Model |
|---|---|---|
| `transcribe-audio` | Speech-to-text for Bangla/English audio | Google Speech-to-Text |
| `intake-summarize` | Summarize intake conversation into structured claims | Claude 3.5 Haiku |
| `extract-prescription` | OCR + extraction from prescription photos | Gemini 1.5 Flash |
| `extract-lab-report` | OCR + extraction from lab report photos | Gemini 1.5 Flash |
| `generate-briefing` | Create structured briefing card from all intake data | Claude 3.5 Sonnet |
| `generate-note` | Draft clinical note from consultation transcript | Claude 3.5 Sonnet |
| `research-query` | Answer doctor's clinical questions during consult | Claude 3.5 Sonnet + Perplexity |
| `uptodate-lookup` | Fetch UpToDate clinical decision support content | UpToDate Connect API |
| `followup-whatsapp` | Send follow-up message via WhatsApp Business API | WhatsApp Business API |

### 3. Supabase PostgreSQL 15

The primary data store. All clinical data — patients, visits, prescriptions, lab reports, consent records, and API usage logs — lives in a single PostgreSQL 15 database with Row-Level Security (RLS) enforced on every table.

Key design decisions:
- **JSONB for flexible clinical data**: `intake_transcript`, `briefing_card`, `consultation_transcript`, `generated_note`, `evidence_links`, and `medications` are stored as JSONB to accommodate evolving clinical data structures without schema migrations
- **Visit as the central entity**: The `visits` table is the hub of the data model, linking patients, doctors, clinics, and all encounter data
- **Audit-grade timestamps**: Every table has `created_at`; mutable tables have `updated_at` with automatic trigger-based updates

### 4. Supabase Auth (Phone OTP)

Authentication uses Supabase Auth with phone OTP as the sole authentication method. This is deliberate:

- Bangladeshi doctors universally have phone numbers but email adoption is inconsistent
- Phone OTP requires no password management
- The `doctors` table uses `auth.users(id)` as its primary key, establishing a 1:1 relationship between auth identity and doctor profile
- Patient-facing intake views are unauthenticated (the tablet is clinic-controlled)

### 5. Supabase Storage

Supabase Storage handles binary assets:

- **Bucket: `rx-images`** — Prescription photographs uploaded during intake
- **Bucket: `lab-images`** — Lab report photographs uploaded during intake
- **Bucket: `audio-recordings`** — Consultation audio recordings (temporary, deleted after transcription)

Images are served via Supabase's CDN with signed URLs. The Next.js image configuration allows remote patterns from `*.supabase.co/storage/v1/object/public/**`.

### 6. Supabase Realtime

Realtime is used for a single critical feature: **live patient queue updates**. When a visit's status changes (e.g., `intake` -> `intake_complete`), the doctor's queue view updates immediately without polling.

The `PatientQueue` component subscribes to `postgres_changes` on the `visits` table, filtered by the doctor's `clinic_id`.

---

## Data Flow: End-to-End Patient Encounter

```
1. PATIENT ARRIVES
   Receptionist creates visit -> visits.status = 'intake'
   Hands tablet to patient/attendant

2. INTAKE (Patient Tablet)
   Patient selects role (patient/attendant)
   -> Voice recording via VoiceOrb (push-to-talk)
   -> Audio sent to Edge Function: transcribe-audio
   -> Google Speech-to-Text returns transcript
   -> Each utterance stored in visits.intake_transcript[]
   -> Photos of prescriptions/labs captured via DocumentCapture
   -> Edge Functions: extract-prescription, extract-lab-report
   -> Gemini 1.5 Flash extracts structured data
   -> Results stored in prescriptions[], lab_reports[]
   -> Patient reviews summary
   -> visits.status = 'intake_complete'

3. BRIEFING GENERATION (Edge Function)
   On status change to 'intake_complete':
   -> Edge Function: generate-briefing
   -> Claude 3.5 Sonnet synthesizes all intake data
   -> Generates structured BriefingData with source attribution
   -> Red flags identified and prioritized
   -> Result stored in visits.briefing_card
   -> visits.briefing_generated_at = now()

4. DOCTOR REVIEWS BRIEFING (Doctor Phone)
   Doctor sees patient appear in queue (Realtime)
   -> Opens BriefingCard component
   -> Scans sections in clinical priority order
   -> Taps SourceTag to verify claims via LinkedEvidence panel
   -> Starts consultation
   -> visits.status = 'in_consultation'
   -> visits.consultation_started_at = now()

5. CONSULTATION (Doctor Phone)
   AmbientRecorder captures audio (minimal UI)
   -> Continuous transcription via Google Speech-to-Text
   -> Doctor can query AI research chat mid-consultation
   -> Edge Function: research-query
   -> Claude 3.5 Sonnet + Perplexity + UpToDate
   -> Queries stored in visits.consultation_queries[]
   -> Doctor ends consultation
   -> visits.consultation_ended_at = now()

6. NOTE GENERATION (Edge Function)
   On consultation end:
   -> Edge Function: generate-note
   -> Claude 3.5 Sonnet drafts note in BD format (CC/OE/Ix/Rx/Advice)
   -> Every claim linked to source evidence
   -> Result stored in visits.generated_note

7. NOTE REVIEW (Review Station or Doctor Phone)
   -> Doctor reviews generated note via NoteFormatBD
   -> Edits tracked in visits.doctor_edits
   -> Doctor approves
   -> visits.approved_note = final version
   -> visits.approved_at = now()
   -> visits.status = 'completed'

8. FOLLOW-UP (Automated, 2-3 days later)
   -> Edge Function: followup-whatsapp
   -> Sends summary + follow-up questions via WhatsApp Business API
   -> Patient response recorded in visits.followup_response
   -> visits.status = 'followup_sent'
```

---

## Three Client Contexts

Glyph serves three distinct user contexts from a single PWA codebase, differentiated by route and layout:

### Patient Tablet (`/intake/*`)

- **Device**: Clinic-owned Android tablet, typically 8-10 inch
- **User**: Patient or their attendant (family member)
- **Language**: Bangla primary, English secondary (toggleable)
- **Design principles**:
  - Voice-first interaction via VoiceOrb (120px touch target)
  - Large text (`text-lg` base, `text-2xl`+ for headings)
  - Minimal UI chrome — no navigation menus or settings
  - Camera integration for prescription/lab photo capture
  - AttendantBanner shown when attendant is providing history
  - Full-height layout using `min-h-[100dvh]` for mobile viewports

### Doctor Phone (`/doctor/*`)

- **Device**: Doctor's personal smartphone, any screen size
- **User**: Authenticated doctor (phone OTP)
- **Language**: Bangla or English per doctor preference
- **Design principles**:
  - Dense, clinical information display optimized for scanning
  - Professional slate/neutral color scheme
  - Sticky top navigation bar (h-14) with compact layout
  - Ambient recording bar at bottom of consultation view (AmbientRecorder)
  - Briefing card with source-attributed claims (SourceTag + LinkedEvidence)
  - Real-time queue updates via Supabase Realtime

### Review Station (`/doctor/review/*`)

- **Device**: Clinic desktop or laptop
- **User**: Authenticated doctor
- **Design principles**:
  - Sidebar navigation visible on `lg+` screens (w-56)
  - Full note review with BD format sections
  - Lab trend visualization
  - Patient history across multiple visits
  - Print-friendly note layout

---

## Authentication Architecture

```
+-------------------+     +--------------------+     +------------------+
|  Doctor enters    | --> |  Supabase Auth     | --> |  OTP sent via    |
|  phone number     |     |  phone.signInWith  |     |  Twilio/custom   |
|  on login page    |     |  OTP()             |     |  SMS provider    |
+-------------------+     +--------------------+     +------------------+
                                    |
                                    v
                          +--------------------+
                          |  Doctor enters OTP |
                          |  auth.verifyOtp()  |
                          +--------------------+
                                    |
                                    v
                          +--------------------+
                          |  JWT issued        |
                          |  Stored in cookie  |
                          |  via @supabase/ssr |
                          +--------------------+
                                    |
                                    v
                          +--------------------+
                          |  RLS policies      |
                          |  enforce clinic    |
                          |  data isolation    |
                          +--------------------+
```

**Key points:**
- Patient-facing intake views (`/intake/*`) do not require authentication — the tablet is a clinic-controlled device
- All doctor-facing views (`/doctor/*`) require a valid Supabase Auth session
- The `doctors` table primary key is `auth.users(id)`, directly linking auth identity to doctor profile
- RLS policies use `auth.uid()` to scope all data access to the doctor's clinic
- JWT tokens are stored in HTTP-only cookies via `@supabase/ssr` for server-side rendering

---

## AI Model Routing Strategy

Glyph uses a multi-model strategy to optimize for cost, latency, and accuracy across different clinical tasks. See [api-routing.md](./api-routing.md) for the full routing table and rationale.

**Core principles:**
1. **Right-size the model**: Use the smallest model that meets accuracy requirements for each task
2. **Speed over perfection for intake**: Intake extraction uses fast models (Gemini Flash, Claude Haiku) because the doctor will review the output
3. **Accuracy for clinical reasoning**: Briefing generation and note drafting use Claude Sonnet for higher clinical reasoning quality
4. **Fallback chains**: Every task has a fallback model to ensure availability
5. **Cost tracking**: Every API call is logged with token counts and estimated cost for per-visit cost monitoring

---

## Network and Offline Considerations

- **Service worker** (`public/sw.js`) caches static assets and the app shell for offline access
- **PWA manifest** configures standalone display mode with `any` orientation
- **Optimistic UI**: Queue updates are applied optimistically before server confirmation
- **Audio buffering**: Voice recordings are buffered locally and uploaded in chunks to handle intermittent connectivity
- **Image compression**: Prescription and lab photos are compressed client-side before upload to reduce bandwidth usage

---

## Security Architecture

1. **RLS on every table**: All tables have Row-Level Security enabled. Policies scope data to the doctor's clinic
2. **De-identification**: PII is stripped before sending data to external AI APIs (see [pdpo-compliance.md](./pdpo-compliance.md))
3. **Encrypted at rest**: Supabase provides AES-256 encryption at rest for database and storage
4. **Encrypted in transit**: All connections use TLS 1.2+
5. **Signed URLs**: Storage assets use time-limited signed URLs
6. **No client-side secrets**: API keys for AI services are stored only in Edge Function environment variables, never exposed to the browser
7. **Consent-gated features**: Recording, AI processing, and WhatsApp follow-up require explicit patient consent tracked in `consent_records`
