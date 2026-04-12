# Abridge-Inspired Patterns in Glyph

> Last updated: April 2026

## Overview

[Abridge](https://www.abridge.com) is a US-based clinical AI company that pioneered ambient clinical documentation. Their product records doctor-patient conversations and generates structured clinical notes automatically. Abridge was acquired by a major health system and has become the benchmark for clinical AI UX.

Glyph learned four key patterns from Abridge and adapted each for the Bangladesh context. This document explains what each pattern is, why it matters, and how Glyph implements it differently.

---

## Pattern 1: Ambient Invisibility

### What Abridge Does

Abridge's recording interface is deliberately minimal. Once a doctor starts a session, the recording indicator shrinks to a small, non-intrusive element. The philosophy: **the technology should disappear during the clinical encounter**. The patient should feel they are talking to a doctor, not to a microphone.

Abridge achieves this through:
- A small floating indicator (red dot + timer) that stays out of the conversation's visual field
- No "recording" pop-ups or warnings during the encounter
- Audio processing happens entirely in the background
- The doctor never has to "manage" the recording during the visit

### How Glyph Adapts This

Glyph's `AmbientRecorder` component follows the same principle but is adapted for a phone-based (not desktop-based) clinical workflow:

**Implementation** (`web/src/components/doctor/AmbientRecorder.tsx`):
- Dark bar anchored to the bottom of the consultation view (`bg-slate-900`)
- Small red dot (2x2 px) that pulses when active, turns yellow when paused
- Monospaced duration counter (`font-mono text-xs`) -- MM:SS format
- Subtle 12-bar waveform visualization (4px collapsed, 6-24px when active)
- Single pause/resume button with minimal chrome
- **Entire bar is 40px tall** -- the absolute minimum needed for functionality

```
+------------------------------------------------------------+
| [red dot]  03:45  REC  |||||||||||||||  [Pause]            |
+------------------------------------------------------------+
```

**Bangladesh-specific adaptations**:

1. **Phone form factor**: Unlike Abridge (used on desktop/tablet), Glyph runs on the doctor's personal phone. Screen real estate is at a premium. The ambient bar uses a single row layout instead of a floating element.

2. **No always-on mic**: Bangladesh clinic environments are noisy -- multiple patients in adjacent rooms, street noise, ceiling fans. Instead of always-on ambient recording, Glyph uses a manual start/stop model with pause capability. This gives the doctor control over what is captured.

3. **Consent visibility**: In Bangladesh, where AI-in-healthcare is still novel, having a visible (but minimal) recording indicator builds patient trust. The bar is small enough to not distract but visible enough that a patient can see recording is active.

4. **Offline resilience**: Audio is buffered locally on the phone and uploaded in chunks. If connectivity drops mid-consultation, no audio is lost. Abridge assumes stable US hospital WiFi; Glyph assumes intermittent 4G.

---

## Pattern 2: Linked Evidence

### What Abridge Does

Abridge's most innovative UX feature is **Linked Evidence**. Every claim in a generated clinical note is linked back to the specific moment in the conversation transcript where that information was stated. Doctors can tap any sentence in the note and see the corresponding transcript excerpt, highlighted and timestamped.

This solves a fundamental trust problem: **doctors will not use AI-generated notes if they cannot verify the source**. Linked Evidence provides a "trust but verify" mechanism that lets doctors quickly confirm accuracy without re-reading the entire transcript.

### How Glyph Adapts This

Glyph extends the Linked Evidence pattern beyond conversation transcripts to include multiple source types. This is necessary because Glyph's intake process collects information from more channels than a typical Abridge encounter.

**Implementation** (`web/src/components/doctor/LinkedEvidence.tsx` and `web/src/components/doctor/SourceTag.tsx`):

**SourceTag** -- inline provenance indicator on every claim:
- Color-coded pill showing the information source
- Six source types: patient (blue), attendant (amber), rx_photo (purple), lab_report (teal), uptodate (orange), pubmed (gray)
- Tappable to open the LinkedEvidence panel

**LinkedEvidence** -- slide-in detail panel:
- Slides in from the right (`translate-x-0/translate-x-full` transition)
- Backdrop with `bg-black/20 backdrop-blur-sm`
- Shows:
  - Source type with color-coded label
  - Timestamp of when the evidence was captured
  - Confidence level (High/Medium/Low) with dot indicator
  - Original source content in a blockquote
  - Full surrounding context (if available)
- Closes on backdrop tap or Escape key

**Bangladesh-specific adaptations**:

1. **Multi-source attribution**: Abridge links notes only to conversation transcripts. Glyph links to four distinct source types:
   - **Patient/Attendant voice**: Transcript excerpts from the intake conversation
   - **Prescription photos**: OCR extraction from photographed prescriptions (purple tags)
   - **Lab report photos**: Extracted lab values from photographed reports (teal tags)
   - **Clinical references**: UpToDate recommendations or PubMed citations (orange/gray tags)

2. **Attendant distinction**: Abridge does not distinguish between speakers in the patient encounter. Glyph explicitly separates patient-provided and attendant-provided information with different color codes, because the reliability assessment differs (see [attendant-protocol.md](./attendant-protocol.md)).

3. **Confidence display**: Glyph shows extraction confidence levels because some data sources (handwritten prescriptions, low-quality photos) have inherently lower reliability than conversation transcripts. A "low confidence" indicator on a prescription extraction tells the doctor to verify the medication list directly.

4. **Evidence across the encounter**: In Abridge, evidence links only connect the note to the consultation. In Glyph, evidence links also connect the briefing card to intake data. The doctor can verify intake findings before the consultation even begins.

---

## Pattern 3: Instant Output

### What Abridge Does

Abridge generates clinical notes within seconds of the consultation ending. They use streaming output so the doctor sees the note being written in real-time. The target is **sub-10-second time-to-first-token** -- the note starts appearing almost immediately.

This speed is critical for clinical adoption:
- Doctors will not wait 2 minutes for a note to generate
- Streaming output gives the perception of speed even before the full note is complete
- The doctor can start reviewing early sections while later sections are still generating

### How Glyph Adapts This

Glyph applies the instant output principle to two stages:

**Briefing Card Generation** (after intake):
- Target: Under 10 seconds from intake completion to briefing card availability
- The briefing card is generated as soon as `visits.status` changes to `intake_complete`
- If the doctor opens the briefing before generation is complete, the `LoadingStream` component shows a shimmer skeleton

**Note Generation** (after consultation):
- Target: Under 10 seconds to first visible content
- Streaming output via Server-Sent Events from the Edge Function
- The NoteFormatBD component renders sections as they arrive:
  1. C/C (Chief Complaint) appears first
  2. O/E (On Examination) appears next
  3. Ix, Rx, Advice follow
- The doctor can begin reviewing and editing the Chief Complaint while later sections are still generating

**Implementation** (`web/src/components/shared/LoadingStream.tsx`):
- Shimmer animation for loading state (`animate-shimmer`)
- Section-by-section reveal as streamed content arrives
- Smooth transition from skeleton to content

**Bangladesh-specific adaptations**:

1. **Network awareness**: Bangladesh 4G networks can be inconsistent. Glyph's streaming implementation is resilient to connection drops -- partial content is preserved and generation resumes when connectivity returns.

2. **BD note format**: The note structure (CC/OE/Ix/Rx/Advice) is specific to Bangladesh clinical practice. Abridge generates notes in US formats (SOAP, H&P). Glyph's streaming order follows the BD format sections.

3. **Cost-optimized generation**: Abridge can afford to use the highest-quality model for every note (US healthcare billing covers the AI cost). Glyph uses Claude Sonnet (not Opus) to keep per-note costs under $0.08, targeting an overall per-visit AI cost under $0.25.

---

## Pattern 4: Recording + Review Separation

### What Abridge Does

Abridge separates the **recording experience** (during the consultation) from the **review experience** (after the consultation). These happen on different screens with different UI priorities:

- **Recording**: Minimal indicator, ambient, no interaction required
- **Review**: Rich, detailed, full-screen note with editing capabilities

This separation is deliberate. The recording UI is designed to disappear; the review UI is designed for careful scrutiny.

### How Glyph Adapts This

Glyph takes this separation further by using **different devices** for different phases of the encounter:

| Phase | Device | Layout | UI Priority |
|---|---|---|---|
| Intake (recording) | Patient tablet | Large, voice-first, Bangla | Simplicity, accessibility |
| Briefing (review) | Doctor phone | Dense, clinical, data-rich | Information density |
| Consultation (recording) | Doctor phone | Ambient bar at bottom | Invisibility |
| Note review | Doctor phone or desktop | BD format, editable | Accuracy, completeness |

**Implementation**:

- **Intake layout** (`web/src/app/intake/layout.tsx`): Full-height, large text, warm colors, language toggle. Optimized for non-technical users holding a tablet.

- **Doctor layout** (`web/src/app/doctor/layout.tsx`): Compact top bar (h-14), optional sidebar (lg+ screens), professional slate color scheme. Optimized for a doctor scanning information quickly on their phone.

- **BriefingCard** (`web/src/components/doctor/BriefingCard.tsx`): Dense clinical layout with 9 sections in priority order. Every claim has a SourceTag. Red flags are rendered as prominent red banners that cannot be missed.

- **NoteFormatBD** (`web/src/components/doctor/NoteFormatBD.tsx`): Professional clinical typography with serif font, section labels, left border accents, and dashed dividers. Designed to match the mental model of a hand-written Bangladesh prescription.

**Bangladesh-specific adaptations**:

1. **Two-device workflow**: Abridge uses a single device (doctor's desktop). Glyph uses the clinic tablet for intake and the doctor's phone for review. This means:
   - The patient/attendant never sees the doctor's view
   - The doctor can review the briefing while the patient is still in the waiting room
   - The intake can happen concurrently with a previous patient's consultation

2. **Language switching**: The intake tablet defaults to Bangla with a language toggle. The doctor view defaults to the doctor's preferred language (configurable). Abridge is English-only.

3. **Three form factors**: Tablet (intake) vs. phone (consultation/briefing) vs. desktop (review station). Each layout is optimized for its device and use case through responsive design:
   - Intake: `min-h-[100dvh]`, `text-lg` base
   - Doctor phone: `min-h-screen`, compact typography
   - Review station: Sidebar visible on `lg+` screens (`hidden lg:block w-56`)

---

## Summary: Abridge vs. Glyph

| Dimension | Abridge (US) | Glyph (Bangladesh) |
|---|---|---|
| **Market** | US hospitals and health systems | Bangladesh private clinics |
| **Users** | US doctors, English-speaking patients | Bangladeshi doctors, Bangla-speaking patients/attendants |
| **Devices** | Doctor's desktop/workstation | Patient tablet + Doctor phone + Review station |
| **Language** | English only | Bangla primary, English secondary |
| **Attendant handling** | Not a distinct concept | First-class feature with source attribution |
| **Evidence sources** | Conversation transcript only | Transcript + Rx photos + Lab reports + UpToDate + PubMed |
| **Note format** | SOAP, H&P (US standards) | CC/OE/Ix/Rx/Advice (Bangladesh standard) |
| **Recording model** | Always-on ambient | Manual start/stop with pause |
| **Cost model** | Premium (US healthcare billing) | Cost-optimized (per-visit budget under $0.25) |
| **Network assumption** | Stable hospital WiFi | Intermittent 4G with offline resilience |
| **Consent model** | Implied (US hospital consent forms) | Granular, per-type, PDPO 2025 compliant |
| **Follow-up** | None (handled by EHR) | WhatsApp automated follow-up |
| **AI models** | Proprietary fine-tuned | Multi-model routing (Claude, Gemini, GPT) |
