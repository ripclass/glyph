# Emergency Self-SOS (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a conscious, WhatsApp-bound patient self-trigger an emergency by texting "SOS" and sharing their location, which fires the existing Emergency Access broadcast engine (audit + nearby-hospital alert + family ping).

**Architecture:** Reuse the shipped, trigger-agnostic engine `runEmergencyScan(admin, token, coords)` **unchanged**. Add one WhatsApp trigger surface: a new `location` message kind, an `isSosWord` intent, a two-state router flow (`awaiting_sos_location`), and process handlers. The location share is the confirmation. SOS auto-enables emergency access via one new helper that does not clobber an existing profile. No schema migration.

**Tech Stack:** TypeScript, Next.js App Router, the existing WhatsApp bridge (`apps/glyph/src/lib/whatsapp/*`), Supabase (service-role admin client), Vitest (unit), Node smoke (E2E).

## Global Constraints

- **Reuse the engine.** `runEmergencyScan` and the stranger `/e/<token>` path are NOT modified.
- **No migration.** Uses migration 018's tables + the `emergency_access` consent type. SOS provenance is the consent `device_info='whatsapp_sos'` (distinct from the wallet opt-in's `emergency_profile`).
- **Bound patients only.** Unbound numbers fall through to the existing onboarding flow (untouched).
- **SOS is preemptive** for a bound patient: an SOS word overrides any active sub-flow (triage/document).
- **Confirmation = location share.** No separate yes/no step. No fire without coords.
- **Bangla copy: no em dashes, no Devanagari** (Bangla U+0980–U+09FF + the shared danda `।` only). Copy verbatim from this plan.
- **Intent matching is whole-message** (the entire trimmed message must BE the command), mirroring `isStopWord`, so symptom text that merely contains a word never trips it.
- Commit messages end with the repo trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `apps/glyph/src/lib/whatsapp/types.ts` | modify | Add `location` to `WaKind`; add `location` field to `NormalizedInbound` + `WAInboundMessage`. |
| `apps/glyph/src/lib/whatsapp/parse.ts` | modify | Normalize WhatsApp `type:"location"` messages. |
| `apps/glyph/src/lib/whatsapp/intents.ts` | modify | `isSosWord`, `isCancelWord`. |
| `apps/glyph/src/lib/whatsapp/router.ts` | modify | `sos_prompt`/`sos_fire`/`sos_cancel` actions + preemptive routing. |
| `apps/glyph/src/lib/whatsapp/flow.ts` | modify | Add `awaiting_sos_location` to `ActiveFlow`. |
| `apps/glyph/src/lib/services/emergency.ts` | modify | `ensureEmergencyEnabled(admin, patientId)`. |
| `apps/glyph/src/lib/whatsapp/reply.ts` | modify | `buildSosRoutingReply(view)`. |
| `apps/glyph/src/lib/whatsapp/process.ts` | modify | Handle the three SOS actions; SOS copy constants. |
| `scripts/smoke-sos.mjs` | create | E2E: webhook bind → SOS → location → assert broadcast + consent. |
| `*.test.ts` (parse/intents/router) | modify | Unit tests per task. |

---

### Task 1: Parser — `location` message kind

**Files:**
- Modify: `apps/glyph/src/lib/whatsapp/types.ts`
- Modify: `apps/glyph/src/lib/whatsapp/parse.ts`
- Test: `apps/glyph/src/lib/whatsapp/parse.test.ts`

**Interfaces:**
- Produces: `NormalizedInbound.kind === "location"` carrying `location?: { lat: number; lon: number }`.

- [ ] **Step 1: Write the failing test** — append to `parse.test.ts`:

```ts
import { extractInbound } from "./parse";

it("normalizes a location message to kind:location with coords", () => {
  const payload = {
    entry: [{ changes: [{ value: { messages: [{
      id: "wamid.loc1", from: "8801700000000", timestamp: "1718900000",
      type: "location", location: { latitude: 23.8103, longitude: 90.4125 },
    }] } }] }],
  };
  const [msg] = [...extractInbound(payload as never)];
  expect(msg.kind).toBe("location");
  expect(msg.location).toEqual({ lat: 23.8103, lon: 90.4125 });
  expect(msg.text).toBe("");
});
```

- [ ] **Step 2: Run, verify fail** — `npm run test --workspace glyph-web -- parse` → FAIL (`kind` is `"unhandled"`, `location` undefined).

- [ ] **Step 3: Implement** — in `types.ts`:
  - `WaKind`: add `"location"` → `export type WaKind = "text" | "audio" | "image" | "document" | "location" | "unhandled";`
  - `NormalizedInbound`: add after `mediaMimeType?: string;` → `location?: { lat: number; lon: number };`
  - `WAInboundMessage`: add after the `document?` line → `location?: { latitude: number; longitude: number; name?: string; address?: string };`

  In `parse.ts`, add this branch before the final `return { ...base, kind: "unhandled", text: "" };`:

```ts
  if (message.type === "location" && message.location) {
    return { ...base, kind: "location", text: "", location: { lat: message.location.latitude, lon: message.location.longitude } };
  }
```

- [ ] **Step 4: Run, verify pass** — `npm run test --workspace glyph-web -- parse` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/glyph/src/lib/whatsapp/types.ts apps/glyph/src/lib/whatsapp/parse.ts apps/glyph/src/lib/whatsapp/parse.test.ts
git commit -m "feat(sos): parse WhatsApp location messages

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Intents — `isSosWord` + `isCancelWord`

**Files:**
- Modify: `apps/glyph/src/lib/whatsapp/intents.ts`
- Test: `apps/glyph/src/lib/whatsapp/intents.test.ts`

**Interfaces:**
- Produces: `isSosWord(text: string): boolean`, `isCancelWord(text: string): boolean`.

- [ ] **Step 1: Write the failing test** — append to `intents.test.ts`:

```ts
import { isSosWord, isCancelWord } from "./intents";

describe("isSosWord", () => {
  it("matches explicit SOS words (whole message)", () => {
    for (const w of ["SOS", "sos", "🆘", "জরুরি", "বাঁচাও", "save me", "emergency"]) {
      expect(isSosWord(w)).toBe(true);
    }
  });
  it("does NOT match a symptom that merely contains a word", () => {
    expect(isSosWord("আমার জরুরি ভিত্তিতে ওষুধ দরকার, মাথা ব্যথা করছে")).toBe(false);
    expect(isSosWord("help me understand my report please")).toBe(false);
  });
});

describe("isCancelWord", () => {
  it("matches cancel/stop words", () => {
    for (const w of ["বাতিল", "cancel", "stop"]) expect(isCancelWord(w)).toBe(true);
  });
  it("does not match other text", () => {
    expect(isCancelWord("আমার বুকে ব্যথা")).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npm run test --workspace glyph-web -- intents` → FAIL (not exported).

- [ ] **Step 3: Implement** — in `intents.ts`, add after the `RECORD` constant:

```ts
const SOS = ["sos", "🆘", "save me", "emergency", "জরুরি", "বাঁচাও"];
const CANCEL = ["বাতিল", "cancel", "stop", "বন্ধ"];
```

  and add these exports at the end of the file (they reuse the existing `isWholeMessage`):

```ts
/** An explicit emergency trigger (whole-message, high precision). */
export function isSosWord(text: string): boolean {
  return isWholeMessage(text, SOS);
}

/** A cancel/stop reply used to abort the SOS location step. */
export function isCancelWord(text: string): boolean {
  return isWholeMessage(text, CANCEL);
}
```

- [ ] **Step 4: Run, verify pass** — `npm run test --workspace glyph-web -- intents` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/glyph/src/lib/whatsapp/intents.ts apps/glyph/src/lib/whatsapp/intents.test.ts
git commit -m "feat(sos): isSosWord + isCancelWord intents

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Router — SOS actions + preemptive routing

**Files:**
- Modify: `apps/glyph/src/lib/whatsapp/router.ts`
- Test: `apps/glyph/src/lib/whatsapp/router.test.ts`

**Interfaces:**
- Consumes: `isSosWord`, `isCancelWord` (Task 2); `NormalizedInbound.location` (Task 1).
- Produces: `RouteAction` variants `{ kind: "sos_prompt" }`, `{ kind: "sos_fire"; coords: { lat: number; lon: number } }`, `{ kind: "sos_cancel" }`.

- [ ] **Step 1: Write the failing test** — append to `router.test.ts`:

```ts
const inbound = (over: Record<string, unknown>) => ({
  channel: "whatsapp", providerMessageId: "x", fromWaId: "8801700000000",
  receivedAt: new Date(0), kind: "text", text: "", raw: {}, ...over,
} as never);

describe("SOS routing", () => {
  const bound = (activeFlow = "idle") => ({ bound: true, activeFlow });

  it("an SOS word from idle → sos_prompt", () => {
    expect(decideRoute(inbound({ text: "SOS" }), bound()).kind).toBe("sos_prompt");
  });
  it("SOS preempts an active triage flow", () => {
    expect(decideRoute(inbound({ text: "জরুরি" }), bound("triage")).kind).toBe("sos_prompt");
  });
  it("a location while awaiting_sos_location → sos_fire with coords", () => {
    const a = decideRoute(inbound({ kind: "location", location: { lat: 23.8, lon: 90.4 } }), bound("awaiting_sos_location"));
    expect(a).toEqual({ kind: "sos_fire", coords: { lat: 23.8, lon: 90.4 } });
  });
  it("a cancel word while awaiting_sos_location → sos_cancel", () => {
    expect(decideRoute(inbound({ text: "বাতিল" }), bound("awaiting_sos_location")).kind).toBe("sos_cancel");
  });
  it("other text while awaiting_sos_location → re-prompt", () => {
    expect(decideRoute(inbound({ text: "কী করব?" }), bound("awaiting_sos_location")).kind).toBe("sos_prompt");
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npm run test --workspace glyph-web -- router` → FAIL.

- [ ] **Step 3: Implement** — in `router.ts`:
  - Update the import on line 3:

```ts
import { isAffirmative, isStopWord, isRecordRequest, isSosWord, isCancelWord } from "./intents";
```

  - Add to the `RouteAction` union (after the `{ kind: "revoke" }` line):

```ts
  | { kind: "sos_prompt" }
  | { kind: "sos_fire"; coords: { lat: number; lon: number } }
  | { kind: "sos_cancel" }
```

  - Insert this block immediately after the `// Bound patient.` comment (line 54), BEFORE the `awaiting_triage_consent` check, so SOS preempts other sub-flows:

```ts
  // Emergency self-SOS preempts any other bound sub-flow.
  if (ctx.activeFlow === "awaiting_sos_location") {
    if (inbound.kind === "location" && inbound.location) return { kind: "sos_fire", coords: inbound.location };
    if (inbound.kind === "text" && isCancelWord(inbound.text)) return { kind: "sos_cancel" };
    return { kind: "sos_prompt" }; // re-ask for location
  }
  if (inbound.kind === "text" && isSosWord(inbound.text)) return { kind: "sos_prompt" };
```

- [ ] **Step 4: Run, verify pass** — `npm run test --workspace glyph-web -- router` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/glyph/src/lib/whatsapp/router.ts apps/glyph/src/lib/whatsapp/router.test.ts
git commit -m "feat(sos): preemptive SOS router states (prompt/fire/cancel)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Engine helper — `ensureEmergencyEnabled`

**Files:**
- Modify: `apps/glyph/src/lib/services/emergency.ts`

**Interfaces:**
- Consumes: the existing private `findOrCreateToken(admin, patientId)` in `emergency.ts`.
- Produces: `ensureEmergencyEnabled(admin: Admin, patientId: string): Promise<string>` (returns the emergency token).

- [ ] **Step 1: Implement** — add this exported function to `emergency.ts` (after `setEmergencyAccess`). It enables the flag and records consent WITHOUT writing profile fields, so an existing blood group / allergies are preserved:

```ts
/**
 * Enable emergency access for a patient WITHOUT touching their profile fields
 * (used by self-SOS, where the act of SOS-ing is the opt-in). Flips the flag,
 * records a standing emergency_access consent tagged 'whatsapp_sos', and
 * find-or-creates the emergency token. Returns the token.
 */
export async function ensureEmergencyEnabled(admin: Admin, patientId: string): Promise<string> {
  await admin.from("patients").update({ emergency_access_enabled: true }).eq("id", patientId);
  const { data: existing } = await admin
    .from("consent_records")
    .select("id")
    .eq("patient_id", patientId)
    .eq("consent_type", "emergency_access")
    .eq("granted", true)
    .is("withdrawn_at", null)
    .limit(1)
    .maybeSingle();
  if (!existing) {
    await admin.from("consent_records").insert({
      patient_id: patientId, consent_type: "emergency_access", granted: true,
      granted_by: "patient", device_info: "whatsapp_sos",
    });
  }
  return findOrCreateToken(admin, patientId);
}
```

- [ ] **Step 2: Type-check** — `npm run type-check --workspace glyph-web` → clean. (No unit test: DB-touching, like the other `emergency.ts` functions; covered by the Task 6 smoke.)

- [ ] **Step 3: Commit**

```bash
git add apps/glyph/src/lib/services/emergency.ts
git commit -m "feat(sos): ensureEmergencyEnabled — enable + consent without clobbering profile

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Process handlers + reply copy + flow state

**Files:**
- Modify: `apps/glyph/src/lib/whatsapp/flow.ts`
- Modify: `apps/glyph/src/lib/whatsapp/reply.ts`
- Modify: `apps/glyph/src/lib/whatsapp/process.ts`

**Interfaces:**
- Consumes: `ensureEmergencyEnabled` + `runEmergencyScan` (`@/lib/services/emergency`); `buildSosRoutingReply` (this task); the `sos_*` actions (Task 3).
- Produces: end-to-end handling of the three SOS actions.

- [ ] **Step 1: Add the flow state** — in `flow.ts`, add `"awaiting_sos_location"` to the `ActiveFlow` union (after `"awaiting_document_type"`).

- [ ] **Step 2: Add the routing reply** — in `reply.ts`, add:

```ts
/** The SOS confirmation reply after the broadcast fires. No PHI. */
export function buildSosRoutingReply(view: { nearestHospitalName?: string | null; mapsUrl?: string }): string {
  const lines = ["আমরা আপনার পরিবার ও কাছের হাসপাতালকে জানিয়েছি।"];
  if (view.nearestHospitalName) lines.push(`নিকটতম হাসপাতাল: ${view.nearestHospitalName}।`);
  if (view.mapsUrl) lines.push(view.mapsUrl);
  lines.push("সাহায্য আসছে।");
  return lines.join("\n");
}
```

- [ ] **Step 3: Wire process.ts** — add imports:

```ts
import { ensureEmergencyEnabled, runEmergencyScan } from "@/lib/services/emergency";
```

  extend the existing reply import to include `buildSosRoutingReply`:

```ts
import { formatOutcome, buildSosRoutingReply } from "./reply";
```

  add the copy constants next to the other `*_MSG` constants:

```ts
const SOS_PROMPT_MSG = "🆘 জরুরি অবস্থা? নিশ্চিত করতে এখনই আপনার বর্তমান লোকেশন পাঠান (📎 → Location)। বাতিল করতে 'বাতিল' লিখুন।";
const SOS_CANCEL_MSG = "ঠিক আছে, বাতিল করা হলো।";
const SOS_FAIL_MSG = "জরুরি বার্তা পাঠানো গেল না। সরাসরি নিকটস্থ হাসপাতালে যান বা পরিবারকে ফোন করুন।";
```

  and add these three `else if` branches to the action dispatch (place them right after the `action.kind === "revoke"` branch, so an emergency is handled early):

```ts
  } else if (action.kind === "sos_prompt") {
    await writeFlow(admin, waId, "awaiting_sos_location", {});
    replyText = SOS_PROMPT_MSG;
  } else if (action.kind === "sos_fire") {
    if (patientId) {
      try {
        const token = await ensureEmergencyEnabled(admin, patientId);
        const view = await runEmergencyScan(admin, token, action.coords);
        replyText = buildSosRoutingReply(view);
      } catch (err) {
        console.error("[wa/process] sos_fire error:", err);
        replyText = SOS_FAIL_MSG;
      }
    }
    await writeFlow(admin, waId, "idle", {});
  } else if (action.kind === "sos_cancel") {
    await writeFlow(admin, waId, "idle", {});
    replyText = SOS_CANCEL_MSG;
```

- [ ] **Step 4: Verify** — type-check clean + the whole bridge suite still green:

Run: `npm run type-check --workspace glyph-web` → clean.
Run: `npm run test --workspace glyph-web` → all pass (parse/intents/router SOS tests included).

- [ ] **Step 5: Commit**

```bash
git add apps/glyph/src/lib/whatsapp/flow.ts apps/glyph/src/lib/whatsapp/reply.ts apps/glyph/src/lib/whatsapp/process.ts
git commit -m "feat(sos): process handlers — prompt, fire (engine), cancel

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: E2E smoke — `smoke-sos.mjs`

**Files:**
- Create: `scripts/smoke-sos.mjs`

**Interfaces:**
- Consumes: the deployed `/api/whatsapp/webhook` route + the live DB (drives the full stack like `smoke-front-door.mjs`).

- [ ] **Step 1: Write the smoke** — create `scripts/smoke-sos.mjs`:

```js
// scripts/smoke-sos.mjs
// Self-SOS E2E: a bound patient texts SOS, shares location, and the existing
// emergency engine fires (audit + near-hospital broadcast), emergency access is
// auto-enabled, and the consent is tagged whatsapp_sos.
// usage: node scripts/smoke-sos.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const [APP_URL, SUPABASE_URL, SERVICE_KEY] = process.argv.slice(2);
if (!APP_URL || !SUPABASE_URL || !SERVICE_KEY) {
  console.error("usage: node scripts/smoke-sos.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>");
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const WA = "8801" + Math.floor(100000000 + Math.random() * 899999999);
const secret = process.env.DIALOG360_WEBHOOK_SECRET ?? process.env.META_APP_SECRET ?? "";
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

const SCAN = { lat: 23.8103, lon: 90.4125 };
const NEAR = { lat: 23.814, lon: 90.415 };
const FAR = { lat: 23.4, lon: 90.4125 };

function envelope(message) {
  return { entry: [{ changes: [{ value: { messages: [message] } }] }] };
}
async function post(message) {
  const body = JSON.stringify(envelope(message));
  const headers = { "content-type": "application/json" };
  if (secret) headers["x-hub-signature-256"] = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
  const r = await fetch(`${APP_URL}/api/whatsapp/webhook`, { method: "POST", headers, body });
  ok(r.ok, `webhook accepted (status ${r.status})`);
}
const textMsg = (t) => ({ id: "sos-" + crypto.randomUUID(), from: WA, timestamp: String(Math.floor(Date.now() / 1000)), type: "text", text: { body: t } });
const locMsg = (lat, lon) => ({ id: "sos-" + crypto.randomUUID(), from: WA, timestamp: String(Math.floor(Date.now() / 1000)), type: "location", location: { latitude: lat, longitude: lon } });

let patientId, nearId, farId;
try {
  console.log(`Self-SOS smoke — ${WA}`);

  const { data: owner } = await db.from("organizations").select("id").eq("org_type", "kham_holding").limit(1).maybeSingle();
  ok(!!owner?.id, "kham_holding owner org exists");

  const { data: p } = await db.from("patients").insert({ name: "SOS Smoke Patient", owner_org_id: owner.id }).select("id").single();
  patientId = p.id;
  await db.from("whatsapp_links").insert({ patient_id: patientId, wa_id: WA, verified_at: new Date().toISOString() });
  ok(!!patientId, "bound patient seeded");

  const { data: nh } = await db.from("organizations").insert({ name: "Near SOS Hospital", org_type: "hospital", latitude: NEAR.lat, longitude: NEAR.lon, phone: null }).select("id").single();
  const { data: fh } = await db.from("organizations").insert({ name: "Far SOS Hospital", org_type: "hospital", latitude: FAR.lat, longitude: FAR.lon, phone: null }).select("id").single();
  nearId = nh?.id; farId = fh?.id;
  ok(!!nearId && !!farId, "near + far hospital orgs seeded");

  await post(textMsg("SOS"));
  const { data: convo } = await db.from("wa_conversations").select("active_flow").eq("wa_id", WA).maybeSingle();
  ok(convo?.active_flow === "awaiting_sos_location", "SOS set active_flow=awaiting_sos_location");

  await post(locMsg(SCAN.lat, SCAN.lon));

  const { data: scans } = await db.from("emergency_scans").select("id").eq("patient_id", patientId);
  ok((scans?.length ?? 0) === 1, "one emergency_scans row after location share");
  const { data: alerts } = scans?.[0] ? await db.from("emergency_alerts").select("hospital_org_id").eq("scan_id", scans[0].id) : { data: [] };
  ok((alerts?.length ?? 0) === 1 && alerts[0].hospital_org_id === nearId, "broadcast targets the NEAR hospital only");
  const { data: patient } = await db.from("patients").select("emergency_access_enabled").eq("id", patientId).maybeSingle();
  ok(patient?.emergency_access_enabled === true, "emergency access auto-enabled by SOS");
  const { data: consent } = await db.from("consent_records").select("device_info").eq("patient_id", patientId).eq("consent_type", "emergency_access").maybeSingle();
  ok(consent?.device_info === "whatsapp_sos", "emergency_access consent tagged whatsapp_sos");
  const { data: backToIdle } = await db.from("wa_conversations").select("active_flow").eq("wa_id", WA).maybeSingle();
  ok(backToIdle?.active_flow === "idle", "flow cleared to idle after fire");
} catch (e) {
  fail++; console.log("  ✗ threw:", e.message);
} finally {
  if (patientId) {
    await db.from("emergency_alerts").delete().eq("patient_id", patientId);
    await db.from("emergency_scans").delete().eq("patient_id", patientId);
    await db.from("emergency_tokens").delete().eq("patient_id", patientId);
    await db.from("consent_records").delete().eq("patient_id", patientId);
    await db.from("wa_messages").delete().eq("wa_id", WA);
    await db.from("wa_conversations").delete().eq("wa_id", WA);
    await db.from("whatsapp_links").delete().eq("wa_id", WA);
    await db.from("patients").delete().eq("id", patientId);
  }
  if (nearId) await db.from("organizations").delete().eq("id", nearId);
  if (farId) await db.from("organizations").delete().eq("id", farId);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Syntax-check** — `node --check scripts/smoke-sos.mjs` → no output (OK). Live run against a running stack (`supabase start` + `npm run dev` + bridge env) when available; defer otherwise, like the front-door smoke. Do NOT fake a pass.

- [ ] **Step 3: Commit**

```bash
git add scripts/smoke-sos.mjs
git commit -m "test(sos): E2E smoke — SOS + location fires engine, auto-enable, whatsapp_sos consent

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- The webhook signature: locally the smoke mirrors `smoke-front-door.mjs` (HMAC header if a secret env is set). The live bridge is on Meta Cloud API; set `META_APP_SECRET` (or the configured provider secret) so `verify.ts` accepts the POST.
- `runEmergencyScan`'s built-in "patient self-notify" will WhatsApp the SOS-ing patient a template — harmless and mostly a no-op without approved templates; do not special-case it in Phase 1.
- Do not modify `runEmergencyScan` or the `/e/<token>` path. If you find yourself editing them, stop — the design is explicit that they stay untouched.
