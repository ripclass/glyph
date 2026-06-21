# Emergency Self-SOS (Phase 1 of the Emergency trigger layer) — Design

**Date:** 2026-06-21
**Status:** Approved (brainstorming) → ready for implementation plan
**Depends on:** Emergency Access v1 (migration 018, `runEmergencyScan` engine, merged + on prod), the live WhatsApp bridge.

---

## Context

Emergency Access v1 shipped a **trigger-agnostic broadcast engine** —
`runEmergencyScan(admin, token, coords)` → audit row + geo-targeted broadcast to
nearby registered hospitals + family ping → returns a `StrangerView` (no PHI).
v1 wired exactly one trigger into it: a stranger scanning a `/e/<token>` QR
(assumes an **unconscious** patient).

Two weaknesses surfaced:
1. The QR scan is high-friction for a panicking stranger (native cameras scan
   QRs, but the stranger must notice it, know what it is, and act mid-crisis;
   WhatsApp's own scanner only reads WhatsApp QRs, not a generic URL).
2. There is **no path for a conscious patient to self-trigger** an emergency.

The agreed reframe: v1 built the *engine*; what's missing is a **trigger
layer**. The engine stays untouched; we add doors into it.

### The trigger layer (full picture; this spec is Phase 1 only)

| Trigger | Who | Confirm? | Coords from | Phase |
|---|---|---|---|---|
| **WhatsApp SOS** | conscious patient | yes (share location = confirm) | WhatsApp location share | **1 — this spec** |
| **Pocket SOS button** | conscious patient | yes | browser geolocation | 2 (later) |
| **Stranger scan** (`/e/<token>`) | stranger | no (not accidental) | stranger's phone | ✅ shipped |
| **Stranger call** (proxied number) | stranger | n/a (human answers) | n/a | 3 (needs telephony) |

### Decisions locked during brainstorming

- **False-alarm policy (self-SOS): confirm before anything fires.** Protects the
  hospital channel's credibility (a crying-wolf broadcast is worse than nothing).
- **The confirmation IS the location share.** A conscious patient sharing their
  WhatsApp location is a deliberate act that both (a) confirms the emergency and
  (b) supplies the coordinates the geo-broadcast needs. One action, no separate
  yes/no step.
- **Approach A (lean), chosen over a structured refactor.** Reuse
  `runEmergencyScan` as-is; SOS = opt-in. No schema migration, no engine
  refactor, the shipped stranger path is untouched.

---

## Architecture

One engine, a thin trigger surface. Phase 1 adds a WhatsApp trigger only.

```
inbound WhatsApp message
   → parse.ts (now also parses `location` messages)
   → decideRoute() [pure] → RouteAction (sos_prompt | sos_fire | sos_cancel | …)
   → process.ts executes:
        sos_prompt  → set activeFlow=awaiting_sos_location, send prompt
        sos_fire    → ensureEmergencyEnabled(patientId)  [emergency.ts]
                      → runEmergencyScan(token, coords)   [UNCHANGED engine]
                      → clear flow, send routing reply
        sos_cancel  → clear flow, send ack
```

`runEmergencyScan` and the entire broadcast/audit/family-ping path are reused
verbatim. The only new engine-side code is one helper that enables emergency
access **without** clobbering an existing profile.

---

## Components

### 1. Parser — add a `location` message kind
**File:** `apps/glyph/src/lib/whatsapp/parse.ts` (+ `types.ts`)

- `WaKind` gains `"location"`.
- `NormalizedInbound` gains `location?: { lat: number; lon: number }`.
- `WAInboundMessage` gains `location?: { latitude: number; longitude: number; name?: string; address?: string }`.
- `extractInbound`: when `message.type === "location"`, emit
  `{ ...base, kind: "location", text: "", location: { lat: latitude, lon: longitude } }`.

### 2. Intent — `isSosWord(text)`
**File:** `apps/glyph/src/lib/whatsapp/intents.ts`

Whole-message, high-precision match (mirrors `isStopWord` — the entire message
must BE the command, so symptom text that merely contains the word does not
trip it). Tokens: `sos`, `🆘`, `save me`, `emergency`, `জরুরি`, `বাঁচাও`.
Deliberately **excludes** bare `help` / `সাহায্য` (too ambiguous with symptom
text routed to triage).

### 3. Router — SOS is preemptive
**File:** `apps/glyph/src/lib/whatsapp/router.ts`

`RouteAction` gains: `{ kind: "sos_prompt" }`, `{ kind: "sos_fire"; coords: { lat: number; lon: number } }`, `{ kind: "sos_cancel" }`.

In `decideRoute`, inside the **bound** branch, evaluated in this order so an
emergency overrides other sub-flows:

1. If `activeFlow === "awaiting_sos_location"`:
   - inbound.kind === `"location"` → `{ kind: "sos_fire", coords: inbound.location }`
   - text is a cancel/stop word (`বাতিল`/`cancel`/`stop`) → `{ kind: "sos_cancel" }`
   - any other input → `{ kind: "sos_prompt" }` (re-ask)
2. Else if inbound.kind === `"text"` && `isSosWord(text)` → `{ kind: "sos_prompt" }`
   (this sits **above** the triage/wallet/stop checks, so "SOS" works from any
   idle bound state).
3. Else → existing routing unchanged.

A new cancel-word helper (or reuse of `isStopWord` plus a `বাতিল` token) gates
the cancel branch.

### 4. Process handlers + copy
**File:** `apps/glyph/src/lib/whatsapp/process.ts` (+ `reply.ts` for copy)

Bangla copy (no em dashes, no Devanagari):
- **`sos_prompt`** → set `activeFlow = "awaiting_sos_location"`; reply:
  `🆘 জরুরি অবস্থা? নিশ্চিত করতে এখনই আপনার বর্তমান লোকেশন পাঠান (📎 → Location)। বাতিল করতে 'বাতিল' লিখুন।`
- **`sos_fire`** (has coords):
  1. `token = await ensureEmergencyEnabled(admin, patientId)`
  2. `view = await runEmergencyScan(admin, token, coords)`  *(unchanged)*
  3. clear `activeFlow`
  4. reply (use `view.nearestHospitalName` + `view.mapsUrl`):
     `আমরা আপনার পরিবার ও কাছের হাসপাতালকে জানিয়েছি। নিকটতম হাসপাতাল: <name>। <directions>। সাহায্য আসছে।`
     (omit the hospital line gracefully when no nearby hospital / no geo on prod)
- **`sos_cancel`** → clear `activeFlow`; reply `ঠিক আছে, বাতিল করা হলো।`

### 5. Engine-side helper — `ensureEmergencyEnabled`
**File:** `apps/glyph/src/lib/services/emergency.ts`

```
ensureEmergencyEnabled(admin, patientId): Promise<string>
```
- Sets `patients.emergency_access_enabled = true` (only that flag — **does not
  write profile fields**, so an existing blood group / allergies are preserved).
- Records a standing `emergency_access` consent (find-or-create; `granted_by =
  'patient'`, `device_info = 'whatsapp_sos'`) — distinguishable in the audit from
  the wallet opt-in (`emergency_profile`).
- Find-or-creates the patient's emergency token (reuses the existing
  `findOrCreateToken`).
- Returns the token (for `runEmergencyScan`).

This is the single reason for a new helper rather than calling
`setEmergencyAccess` (which overwrites profile fields with its arguments and
would blank an existing profile when called from SOS).

---

## Data flow & reuse

- **No migration.** Uses migration 018's tables + the `emergency_access` consent
  type. `emergency_scans.token` is satisfied by the patient's (now ensured)
  emergency token.
- `runEmergencyScan` is called unchanged. Its existing "patient self-notify"
  WhatsApps the patient who just SOS-ed — mildly redundant, harmless; left as-is.
- Family ping targets `emergency_contact_phone`; if unset it no-ops (logged), the
  broadcast + routing still fire. Same graceful degradation as the stranger path.

## Error handling / edge cases

- **No location ever shared:** the cancel word exits; other text re-prompts. A
  time-based auto-expire of `awaiting_sos_location` is deferred to the existing
  conversation-window/sweeper (noted, not built here).
- **Unbound number texts SOS:** falls into the existing onboarding flow (must
  bind first). An "emergency fast-onboard" is Phase 1.1, out of scope.
- **No nearby hospitals / no prod geo:** broadcast no-ops; family ping + routing
  link still returned. By design.
- **WA template/window:** SOS replies are free-form text inside the 24h customer
  service window (the patient just messaged us, so the window is open) — no Meta
  template needed for the SOS conversation itself. (The hospital/family
  *broadcast* pings still use the Phase-1-independent emergency templates from
  v1, which remain gated on Meta approval and degrade gracefully.)

## Testing

- `intents.test.ts` — `isSosWord`: positives (`SOS`, `🆘`, `জরুরি`, `বাঁচাও`),
  negatives (a symptom sentence containing `সাহায্য`; long text).
- `parse.test.ts` — a `type:"location"` payload → `kind:"location"` + coords.
- `router.test.ts` — bound + `SOS` → `sos_prompt`; `awaiting_sos_location` +
  location → `sos_fire`; + `বাতিল` → `sos_cancel`; + other text → `sos_prompt`;
  SOS preempts an active triage flow.
- `scripts/smoke-sos.mjs` — drives `/api/whatsapp/webhook` (front-door smoke
  harness): bind a throwaway patient → send `SOS` (assert `activeFlow` set +
  prompt sent) → send a location message at a near-hospital location (assert one
  `emergency_scans` row, one near-hospital `emergency_alerts` row,
  `patients.emergency_access_enabled = true`, and an `emergency_access` consent
  with `device_info='whatsapp_sos'`). Cleanup FK-safe. Live run when the local
  stack is up; `node --check` otherwise (front-door precedent).

## Out of scope (this spec)

- Pocket SOS button (Phase 2), proxied stranger call number (Phase 3).
- SOS interrupting/auto-expiring is minimal (cancel word only).
- Unbound-number emergency onboarding (Phase 1.1).
- No changes to the shipped stranger `/e/<token>` path or the engine internals.
