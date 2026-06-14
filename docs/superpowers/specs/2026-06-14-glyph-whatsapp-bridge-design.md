# Glyph WhatsApp Bridge — design spec

**Design spec · 2026-06-14 · approved by founder (doctor nudge in, self-registration deferred)**

The patient (and doctor) relationship, run on WhatsApp. Glyph meets people
where they already live — a Bangla-first thread — and escalates to the Pocket
web wallet only when chat can't render something (a signed record, the full
timeline). This reuses the proven WhatsApp channel from the Juugadu project
(360dialog BSP, inbound webhook, voice STT + Bangla TTS, reminder cron) as a
thin I/O layer, and routes all clinical "thinking" through Glyph's existing
egress-gated edge functions.

## Design thesis (the non-negotiables)

1. **WhatsApp is the runtime of the relationship; Pocket-web is the escalation
   viewport.** We are not adding WhatsApp to Pocket — we are building the
   relationship on WhatsApp, with Pocket as its formal-record window. Anything
   chat does better (reminders, quick Q&A, check-ins) does NOT belong in the
   wallet.
2. **The anchor is the verified patient (Glyph's did:web / bearer-token
   identity), NOT the phone number.** The WhatsApp number is a *linked,
   revocable transport* bound to a patient — never the primary key. This is the
   single most important correction: in Bangladesh one phone serves a
   household, SIMs are recycled, and the family phone is often controlled by one
   person. Number-as-identity leaks health data across people. We design the
   binding and its revocation explicitly.
3. **The bridge never calls an LLM directly.** Every inbound free-text, image,
   or voice payload is Tier B egress and MUST route through Glyph's gated edge
   functions (`triage`, `extract-document`, intake) which already enforce the
   chokepoint, de-identification, and consent. Unlike Juugadu (which calls
   Claude from its handler), the Glyph bridge is pure I/O + routing.
4. **Window-opening is a first-class mechanic.** WhatsApp forbids free-form
   business-initiated messages outside the 24-hour customer-service window;
   those must be pre-approved templates. So every proactive touch is a *minimal
   template whose job is to get the patient to reply* — the reply opens the
   window and Glyph becomes warm and free-form, for free.
5. **Channel survival is a safety requirement.** Meta scrutinizes health
   content; a bot that sounds like it diagnoses can get the whole WABA banned,
   taking down the entire patient channel at once. The triage safety contract
   is not just clinical hygiene — it is how the number stays alive.

## Scope

### In (v1)
- **Identity binding**: link a WhatsApp number to a verified patient; revocable;
  family-phone disambiguation.
- **Consent-first onboarding**: first contact runs a Bangla PDPO consent
  exchange before any processing.
- **Wallet access from WhatsApp**: patient messages Glyph → reply with their
  Pocket link (the link then lives in their thread forever).
- **In-thread triage**: symptom (text or voice) → red-flag pre-screen → the
  `triage` edge function → routed answer. Re-entrant across long gaps.
- **Pre-chamber upload**: image / document sent before a visit →
  `extract-document` → pre-built briefing. A spoken/typed symptom is
  transcribed into a pre-visit note (not full conversational intake — see
  flows).
- **Proactive follow-up**: a template nudge ("কেমন আছেন?") that opens the
  window into a warm check-in.
- **Appointment reminders**: scheduled template sends via a reminder cron
  (delivery engine; see Dependencies for the scheduling source).
- **Doctor nudge**: briefing-ready and note-approval nudges to the doctor's own
  WhatsApp thread.
- **Voice both ways**: Whisper STT in, Bangla TTS out (reused from Juugadu).

### Out (deferred)
- **Self-registration / unaffiliated patients** (deliberately deferred, possibly
  indefinitely): an unaffiliated self-registered patient with no doctor is a
  liability sink and drags Glyph toward the crowded, low-trust consumer
  symptom-checker category and away from its moat — the verifiable record born
  of a real doctor encounter. WhatsApp stays bound to patients who *have* a
  doctor.
- A full appointments/scheduling product (only a minimal source for reminders
  is in scope — see Dependencies).
- Group chats, payments, marketing broadcasts.

## Architecture

### Layering
```
WhatsApp (360dialog BSP)
        │  inbound webhook (signed)            ▲ outbound (text / voice / template)
        ▼                                      │
Next.js API route  ──persist+ack 200──▶  inbound queue (Supabase)
        │  after() + sweeper cron
        ▼
Router (pure-ish)  ──identity bind? consent? which flow?──▶  conversation store
        │  (NEVER calls an LLM itself)
        ▼  service-to-service, egress-gated
Glyph Deno edge functions:  triage · extract-document · intake   (Tier A/B/C gate)
        ▼
Reply builder  ──window-open? free-form : template──▶  send (channel module)
```

### Where it lives (stack fit)
- **Reused, ported into Glyph** as `apps/glyph/src/lib/whatsapp/*` and
  `lib/audio/*` (the Juugadu channel + audio modules are framework-agnostic,
  fetch-based plain TS): `provider` (360dialog), `parse` (text/audio/image/
  document), `send` (text/audio), `media`, `verify` (X-Hub-Signature-256).
  **New addition:** `sendTemplate()` for proactive messages.
- **Webhook + router + crons** as Next.js API routes + Vercel cron in the Glyph
  app (one deployment, reuses Glyph env/Supabase).
- **Clinical LLM stays in the Deno edge functions** — the bridge calls them
  server-to-server with a shared secret, because it has no user JWT (it acts for
  a patient with no auth). `triage` already supports this (`TRIAGE_SHARED_SECRET`,
  `--no-verify-jwt`). `extract-document` and intake are called today with a
  doctor JWT via the proxy, so each needs the **same service-to-service entry
  added** (a `--no-verify-jwt` deploy + a `WHATSAPP_BRIDGE_SECRET` check, mirroring
  triage). That small addition is part of Legs C/D, not a rewrite.
- **New 360dialog number/channel for Glyph** (separate from Juugadu's personal
  assistant number) — founder provisions it in the 360dialog Hub.

### Webhook reliability
WhatsApp expects a fast 200. The webhook route: (1) verifies the signature,
(2) dedupes by `provider_message_id`, (3) persists the inbound row
(`status='received'`), (4) returns 200 immediately. Processing is kicked via
Next.js `after()` for low latency; a **sweeper cron** (every minute) retries any
inbound stuck in `received`, so nothing is lost on a cold start or crash. This
mirrors Juugadu's idempotent `workflow_state` pattern and handles the async
reality (replies hours later, out of order, concurrent threads).

## Data model (new Supabase migrations)

- **`whatsapp_links`** — the identity binding. `id`, `wa_id` (E.164 no `+`),
  `patient_id → patients`, `verified_at`, `revoked`, `created_at`. Unique active
  `wa_id` per patient. A `wa_id` may map to multiple patients (family phone) →
  disambiguation at routing time. RLS deny-all (service-role only).
- **`wa_conversations`** — durable, re-entrant session state per thread.
  `wa_id`, `patient_id`, `active_flow` (`idle|onboarding|triage|intake|upload`),
  `flow_state jsonb` (e.g. the triage message array + consentId),
  `window_expires_at` (24h from last inbound — the window mechanic),
  `updated_at`. RLS deny-all.
- **`wa_messages`** — inbound/outbound log + idempotency + read receipts.
  `provider_message_id` (unique, dedupe), `direction`, `wa_id`, `patient_id?`,
  `kind` (text/audio/image/document/template), `status` (received/processing/
  done/failed + delivered/read for outbound), `payload jsonb`, `created_at`.
  RLS deny-all. This is also the audit trail (PDPO).
- **`scheduled_messages`** — the proactive send queue (generalizes Juugadu's
  `workflow_state`). `kind` (`followup|appointment_reminder|doctor_nudge`),
  `patient_id?` / `doctor_id?`, `to_wa_id`, `template_name`, `template_vars
  jsonb`, `fire_at`, `state` (`pending|running|completed|failed`), `result
  jsonb`. Drained by the reminder cron (idempotent, race-safe claim — copied
  from Juugadu).

One small column added: **`visits.next_appointment_at`** (nullable
`timestamptz`, set by the doctor) — the seed for appointment reminders (a row
in `scheduled_messages` is created from it). Otherwise no existing tables change
shape. `consent_records` already has the `whatsapp_followup` and `ai_processing`
/ `image_capture` types we need.

## Key flows

**Identity binding (the front gate).** At a clinic visit the patient's phone is
already on `patients.phone`. To activate WhatsApp, the doctor's tablet shows a
`wa.me/<glyph-number>?text=<one-time-code>` QR (or the patient texts the number).
Inbound: capture `wa_id`, match the one-time code → bind to that specific patient
(handles the family phone — we bind the *initiator at the visit*, not "whoever
owns the number"), record `whatsapp_followup` consent. Revoke from the doctor UI
or by the patient texting a stop word. If an unbound/unknown `wa_id` messages,
the only path offered is "ask your clinic for your link" — never auto-create a
patient (self-registration is deferred).

**Wallet access.** Bound patient sends anything wallet-ish → reply with their
Pocket link (issue/find token via the existing `/api/wallet` logic). Opens the
window.

**In-thread triage.** Symptom (typed or a voice note → Whisper) → deterministic
`screenRedFlags` → `triage` edge fn (Tier B, `consentId` resolved as today) →
routed answer (pharmacy/doctor/urgent), urgent rendered firmly. `flow_state`
holds the message array so follow-ups survive long gaps. Reuses everything we
shipped in Pocket v2.

**Pre-chamber upload.** Image/document → `media` download → `image_capture` +
`ai_processing` consent gate → `extract-document` (Tier B) → prescriptions/labs
rows → ack ("পেয়েছি, ডাক্তার দেখার আগে প্রস্তুত থাকবে"). The doctor's briefing
is pre-populated from the extracted documents. **Note on spoken symptoms:**
Glyph's intake is a streamed, multi-turn, visit-bound conversation (the
`intake-*` edge functions) — not a fit for sporadic, async WhatsApp turns. So
v1 pre-chamber capture is **document-first**; a spoken/typed symptom is
transcribed and stored as a *pre-visit note* attached to the patient's next
visit (surfaced in the briefing), NOT run through the full conversational
intake. Full WhatsApp-native conversational intake is a later, separate piece.

**Proactive follow-up.** Cron enqueues a `followup` template 2–3 days post-visit
("কেমন আছেন? ভালো হলে 👍, সমস্যা হলে লিখুন"). The patient's reply opens the
window → warm conversation, optionally into triage.

**Appointment reminder.** `appointment_reminder` template fired from
`scheduled_messages` at `fire_at` (utility category — cheaper, better approval).

**Doctor nudge.** On `visits.status → intake_complete` (briefing ready), enqueue
a `doctor_nudge` template to the doctor's WhatsApp ("পরের রোগী প্রস্তুত —
ব্রিফিং দেখুন" + link). On note generated, an approval nudge. Doctors adopt
without opening a dashboard.

## Window-opening guard (the send layer)

A single `sendReply()` chokepoint decides template vs free-form: if
`now < window_expires_at` → free-form `sendText`/`sendAudio`; else → the
relevant approved **template** only. Inbound always refreshes
`window_expires_at = now + 24h`. This is enforced in one place so no flow can
accidentally send a non-template message into a closed window (a policy
violation that risks the ban).

## Safety / channel survival

- Clinical replies only ever come from the gated engines; the bridge never
  authors medical content.
- The triage persona's hard rules (never diagnose, never name a drug,
  conservative escalation, the not-a-doctor line) are the channel's survival
  contract.
- Templates are **utility** category (appointment/follow-up/nudge), not
  marketing — better approval odds, lower cost, fewer policy traps.
- A global kill switch: a flag that flips all outbound to a safe static "your
  clinic will contact you" if the WABA is flagged.

## Build sequence

- **A — skeleton (no clinical):** port channel + audio modules; webhook route +
  signature verify; inbound queue + dedupe + `after()`/sweeper; conversation
  store; identity binding + consent-first onboarding. Smoke: a round-trip echo
  on the sandbox number.
- **B — patient core:** wallet-link reply; in-thread triage (reuse the v2
  engine); the window-opening guard + `sendTemplate`.
- **C — capture:** pre-chamber image/document → `extract-document` (+ its
  service-to-service entry); spoken/typed symptom → transcribed pre-visit note.
- **D — proactive + doctor:** follow-up template + reminder cron; appointment
  reminders; doctor briefing/approval nudges.

Each leg lands with unit tests (router, window guard, identity binding — all
pure logic) and a `scripts/smoke-whatsapp-*.mjs` against the sandbox number,
mirroring Glyph's verification culture. The clinical calls are already covered
by the existing egress smokes.

## Dependencies / founder actions

- **New BD WhatsApp sender number** — a fresh SIM (any operator; coverage is
  irrelevant, the number lives in 360dialog's cloud after one OTP). **No
  registered BD business is needed to start:** create a Meta Business Portfolio
  as yourself and run the number in the **unverified tier** (~250
  business-initiated conversations/24h, unlimited patient-initiated within the
  24h window) — ample for the pilot. Meta **business verification** + the
  green-tick display name (needs a legal entity) gate *scale and trust*, not
  getting started, and proceed **in parallel**. The number's country and the
  legal entity's country need not match.
- **Engineering is never blocked on the paperwork.** Build and test the whole
  bridge against the **360dialog sandbox / a test number**; swap in the
  production BD number + API key once it clears. The legal-entity track and the
  code track are independent.
- **Template drafting + Meta approval** (follow-up, appointment reminder, doctor
  nudge — all *utility* category) — a few business days lead time — founder + me.
- **Appointment source:** the doctor sets `visits.next_appointment_at`; that
  seeds the reminder. No full scheduling product in v1.
- Env: `WHATSAPP_PROVIDER`, `DIALOG360_API_KEY`, `DIALOG360_API_BASE`,
  `DIALOG360_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `DIALOG360_WEBHOOK_SECRET`
  (names match Juugadu) + a `WHATSAPP_BRIDGE_SECRET` for the bridge→edge-fn hop.

## Resolved decisions (locked)

1. **Binding UX:** QR-with-one-time-code at the visit. Robust against
   family-phone mismatches — it binds the patient who was in the room, not
   "whoever owns the number."
2. **Voice-out:** text-first for anything clinical (a TTS mishearing a dose is
   unacceptable); voice replies only for warm, non-clinical turns.
3. **Reminder source:** a minimal `visits.next_appointment_at` datetime the
   doctor sets seeds the reminder — no full scheduling product needed for v1.
