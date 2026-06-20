# Emergency Access v1 — QR + Stranger-Scan + Hospital Broadcast — design spec

> A scannable emergency code on a patient's phone/card that, when a stranger
> scans it, routes the helper to the nearest hospital, broadcasts a time-boxed
> minimal alert to nearby registered hospitals, and pings the patient's family —
> without ever showing the stranger any medical data. Brainstormed 2026-06-20.
> Status: design, pending review → writing-plans.

## Why this exists

Bangladesh has no effective 911. When someone collapses, strangers carry them.
Today the patient is a blank to everyone who could help: the helper doesn't know
where to take them, the family doesn't know it happened, and the hospital starts
from zero. This turns "the anonymous us" — the strangers who stop — into a
dispatch layer, and pulls the family in, the moment a code is scanned. It is the
soul of the product made operational, and it is built to be privacy-safe: the
stranger never sees a single line of health data.

## v1 boundary (what's in, what's deferred)

**In v1:** (1) an opt-in **emergency profile** + standing consent; (2) a
per-patient **emergency QR/card**; (3) a public **scan flow** that fires three+1
disclosures — route the stranger, broadcast to nearby registered hospitals, ping
family, audit + notify the patient.

**Deferred to their own later specs (do NOT build here):**
- **Clinician break-glass** — a *verified clinician reading into the patient's
  full record*. Governance-fraught ("requires independent review before any
  hospital pilot"), depends on the Hospital module + clinician identity. v1
  *pushes the basics* to hospitals; it never opens the record for read.
- **Nearest-*capable*-hospital routing** — a facility directory with capabilities
  (v1 routes to nearest hospital via a maps link, capability-blind).
- **The "they're okay" helper callback** — optional follow-up to a helper who
  left a number.

## Section 1 — the pieces

### a) Emergency profile + standing consent
The patient (in their wallet) enables **Emergency access** and curates a
**minimal emergency dataset**: blood group, known allergies, current medications,
chronic conditions — plus **emergency contacts** (drawn from the family circle).
**Enabling it IS the standing consent** — recorded as a new
`emergency_access` consent row (`granted_by` = `patient` self / `guardian`
proxy). The dataset is patient-provided, so it is labeled, everywhere it is
used, **"self-reported — verify on arrival."** Disabling emergency access
withdraws the consent and deactivates the token.

### b) Emergency token + QR/card
A per-patient **emergency token**, **separate from the wallet bearer token** — it
unlocks *only* the emergency flow, never the full wallet (so a scan can never
reach the record). It renders as a **QR** encoding `https://khamhealth.com/e/<token>`
(for the phone lock screen) and a **printable card** for the wallet/pocket. The
token is **revocable and rotatable** (one tap re-issues, invalidating the old
QR/card if abused).

### c) Public scan endpoint `/e/<token>`
**No authentication** — a stranger must be able to open it. Resolves the token,
drives the scan flow (Section 2). Rate-limited per token and audited.

## Section 2 — the scan flow

A stranger opens `/e/<token>`:

1. **Resolve.** If the profile is enabled and the token valid → proceed. Else →
   a neutral "this code isn't active" page (no data, no hint).
2. **Locate.** Request the **scanning device's** browser geolocation (where the
   emergency is). If denied → fall back to the patient's registered district, or
   a generic "find nearest hospital."
3. **Three+1 disclosures from the one scan:**
   - **To the stranger (the open page) — no medical data, ever.** "This person
     needs care. Nearest hospital: **[name], [distance] — directions**" (a maps
     deep-link, works even where no hospital is on Glyph). "We've alerted nearby
     hospitals and their family. **Thank you for stopping.**" Optional: leave a
     number for a later "they're okay" message (stored for the deferred callback).
   - **To nearby registered hospitals — the broadcast.** A **time-boxed**
     emergency alert (expires in a few hours) carrying **only the minimal
     dataset** + approximate location + a reference id. Geo-filtered to registered
     Glyph hospital orgs within radius. A *push* of the basics — **not** full-record
     read. Degrades gracefully: zero hospitals nearby → no broadcast; routing +
     family still fire.
   - **To the family circle.** An alert over WhatsApp to the patient's emergency
     contacts: *"An emergency code for [patient] was scanned near [area] at
     [time]. Nearest hospital: X."*
   - **Audit + patient-notify.** Every scan logged (token, time, coarse location,
     what fired); the patient is notified it happened — transparency + abuse
     detection.
4. **Abuse guard.** A malicious scanner sees nothing; the broadcast reaches only
   registered hospitals (never the scanner); scans are rate-limited per token;
   the patient can rotate the token; data is minimal + time-boxed.

## Section 3 — boundaries, dependencies, graceful degradation

Three **independent legs**, each works alone:
- **Routing** (maps deep-link to nearest hospital): needs no facility data; works
  everywhere.
- **Family ping**: needs the patient's emergency contacts + the live WhatsApp
  bridge (already in prod).
- **Broadcast**: needs registered hospital orgs with a location → we add a coarse
  geo to `organizations`. On prod today there may be **zero** registered
  hospitals — the broadcast no-ops and the other two legs still fire. Nothing
  hard-depends on the (demo-grade) Hospital module.

## Safety & honest framing (product-facing, not just internal)

- The dataset is **self-reported → "verify on arrival."**
- Routing shows **"directions to the nearest hospital,"** never "this hospital
  will treat you" (it may be closed or incapable).
- It is a help layer, **not a guarantee** and **not a substitute** for shouting
  for help. No overclaiming anywhere a frightened person reads it.

## Data model (new migration)

- **Emergency profile:** reuse existing `patients` columns where possible
  (`blood_group`, `known_allergies` JSONB, `chronic_conditions` JSONB,
  `emergency_contact_name`, `emergency_contact_phone`); add a patient-curated
  `emergency_medications` field and an `emergency_access_enabled` flag.
- **`emergency_tokens`** — per-patient token (distinct from `wallet_access_tokens`),
  `revoked`/rotatable, RLS deny-all (service-role + the public endpoint only).
- **`emergency_scans`** — append-only audit: token, scanned_at, coarse location,
  what fired (routed / broadcast count / family-notified).
- **`emergency_alerts`** — the broadcast records: patient, hospital org,
  minimal-dataset snapshot, `expires_at`, status. Time-boxed.
- **`organizations`** — add coarse location (latitude/longitude, nullable) for the
  hospital geo-filter; hospitals without a location are simply not broadcast to.
- **`consent_records`** — new `consent_type` value `emergency_access`.

## Reuse (don't reinvent)

Family notification rides the existing **WhatsApp bridge** (`sendTemplate`/
scheduled-message infra) and the family-circle concept. The patient profile UI
lives in the existing **Pocket wallet** surface. Token generation mirrors the
`wallet-logic` token pattern (separate store).

## Testing (verification culture)

- **Unit:** token resolve/rotate; the nearby-hospital geo-filter (haversine within
  radius); the disclosure-split logic (what each audience gets); the "self-reported"
  labeling. Pure functions.
- **Smoke** (`scripts/smoke-emergency.mjs`): enable a test patient's emergency
  profile → hit `/e/<token>` → assert an `emergency_scans` audit row, a family
  notification enqueued, broadcast rows to a seeded test hospital within radius
  (and none to a far one), and **assert the stranger-page response contains NO
  PHI** (no blood group/allergy/meds strings).

## Decisions locked for v1

- **Broadcast radius: 10 km** (a single tunable constant).
- **Alert TTL: 4 hours** (`emergency_alerts.expires_at = scanned_at + 4h`).
- **`emergency_medications`: free text** in v1 (patient-curated, simple);
  structured medication entries are a later enhancement.
- **Scan rate limit:** at most a small number of broadcasts per token per hour
  (proposal: 3) to bound abuse while never blocking a genuine repeat scan from
  routing the helper or pinging family.
