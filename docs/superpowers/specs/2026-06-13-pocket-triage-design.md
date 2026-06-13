# Glyph Pocket — v2 (triage)

**Design spec · 2026-06-13 · approved by founder**

The patient's "ask before the drug seller" symptom triage, inside the wallet.
A short guided exchange that informs and routes — never diagnoses, never
prescribes. v3 (out of scope) opens it to anonymous/public users behind a
gate.

## Flow

In their wallet, the patient taps "একটা সমস্যা জিজ্ঞেস করুন / Ask about a
symptom," describes it in Bangla, and Glyph runs a short guided triage: 1–3
targeted follow-ups (duration, the red-flag screen for that symptom), then one
structured answer — likely-about (no diagnosis label), what to watch for,
pharmacy-enough vs see-a-doctor + which kind, and a firm red-flag line. The
model receives the patient's age, gender, and chronic conditions from their
record, so "fever + diabetic" escalates harder than "fever" alone.

## The bright lines (designed in)

- Never diagnoses, never names a drug or dose. Routes and explains only.
- Conservative escalation always wins; uncertainty defaults to "see a doctor."
- **Deterministic red-flag pre-screen (defense in depth):** a pure-code screen
  for danger phrases (chest pain, breathlessness, stroke signs, severe
  bleeding, etc., Bangla + English) forces an urgent "go now" answer and ends
  the exchange — independent of the LLM. The model is never the sole arbiter
  of escalation.
- Every answer carries the plain-Bangla "this is not a doctor" framing.

## Components

**`prompts/patient/triage.md`** — versioned safety contract + structured output
spec (the prompt is where the clinical behavior is pinned).

**`triage-logic.ts` (pure, unit-tested)** —
- `screenRedFlags(text)` → an urgent escalation result if a danger phrase
  matches, else null. Bangla + English phrase list.
- `validateOutcome(json)` → parse/validate the LLM's structured reply
  (`mode: "question" | "answer"`, text, route, watchFor, redFlag), clamping
  the follow-up count and defaulting unknowns to the safe (see-doctor) side.

**`supabase/functions/triage/index.ts` (Deno edge)** — the LLM call lives here,
so the egress chokepoint is honored. Accepts `{ messages, patientContext }`
from the trusted Next route (service-role auth, server-to-server). Runs
`deidentify` → `callLLM` at **egress Tier B** (free-text symptoms,
consent-gated, best-effort scrub) with the triage system prompt → returns
validated structured JSON. `logUsage` as every function does.

**Migration 007 — `triage_sessions`** — `id`, `patient_id`, `messages` jsonb,
`outcome` jsonb, `created_at`. RLS deny-all (service-role only). The exchange
becomes part of the patient's record (next doctor sees "triaged for chest pain
3 days ago") and is auditable.

**`/api/wallet/[token]/triage` (Next, public, service-role)** — validates the
same wallet bearer token (reuses `validateAccess`), loads the patient's minimal
context, runs the deterministic red-flag pre-screen, calls the `triage` edge
function, persists the session on the final answer, returns the reply.

**Wallet triage UI** — a calm-presence guided Q&A view reached from the wallet
(`/wallet/[token]/ask`), with a one-time in-wallet consent notice ("your words
go to an AI, identity scrubbed"). The wallet page gets an "Ask about a symptom"
entry.

## Out of scope (v3+)

Anonymous/public access (needs a gate + rate-limiting), voice input for triage
(typed first), medication reminders, family circles, KhaM-Med local routing
(triage runs frontier-with-scrub until then — stated in the consent notice).

## Verification

Unit tests on `triage-logic` (red-flag screen catches danger phrases in both
languages; outcome validation defaults to safe). Token-gating reuses the
tested `wallet-logic`. The live LLM behavior — a real guided exchange and a
red-flag escalation — is verified on deploy via the demo wallet (local edge
runtime is down this session), the same path used to verify the briefing.
