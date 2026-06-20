# Glyph Front Door Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an unbound citizen self-onboard from a single WhatsApp message — consent → "who is this for?" → a provisional patient with a minted DID → a Pocket wallet link — then answer their question with the existing triage engine.

**Architecture:** Extend the live WhatsApp bridge. The deterministic router (`router.ts`) gains an onboarding sub-flow for *unbound* numbers; `process.ts` gains handlers that create a provisional patient (`createOwnedPatient` under the `kham_holding` org), auto-verify a `whatsapp_links` binding, record `ai_processing` consent, issue a wallet token, and run the first triage turn. New pure logic (subject parsing, copy) lives in `front-door.ts`. No DB migration — all tables already exist.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (service-role admin client), Vitest (unit), Node smoke scripts (E2E). WhatsApp via the existing Meta Cloud bridge.

## Global Constraints

- **No em dashes in user-facing Bangla copy** (founder voice rule). Use commas/periods.
- **Reuse, do not reinvent:** `ensureKhamHoldingOrg` + `createOwnedPatient` (`@/lib/services/organizations`), `findOrCreateWalletToken` (`./wallet-link`), `runTriageTurn` (`@/lib/services/triage-runner`), `resolveLinkByWaId`/`extractBindCode` (`./binding`), `readFlow`/`writeFlow` (`./flow`).
- **A DID is minted only AFTER consent**, never on the first inbound (prevents spam DIDs). `createOwnedPatient` mints the DID internally via `ensureEntityIdentity`.
- **Provisional identity is the weakest tier.** Patient row: `owner_org_id = kham_holding`, `clinic_id = null`. Consent `granted_by` = `'patient'` (self) or `'guardian'` (family proxy).
- **The existing Chamber bind-code path must keep working:** an unbound number whose first text is a 6-digit code still routes to `bind`.
- Admin type alias used throughout the bridge: `type Admin = ReturnType<typeof createAdminClient>`.

---

### Task 1: Front-door pure logic (`front-door.ts`)

**Files:**
- Create: `apps/glyph/src/lib/whatsapp/front-door.ts`
- Test: `apps/glyph/src/lib/whatsapp/front-door.test.ts`

**Interfaces:**
- Produces: `parseSubjectChoice(text: string): "self" | "family" | null`; copy constants `FRONT_DOOR_CONSENT_MSG`, `SUBJECT_QUESTION`, `CONSENT_DECLINED_MSG`, `buildWelcome(walletUrl: string): string`; `NAME_DEFAULT: string`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/glyph/src/lib/whatsapp/front-door.test.ts
import { describe, it, expect } from "vitest";
import { parseSubjectChoice, buildWelcome, FRONT_DOOR_CONSENT_MSG } from "./front-door";

describe("parseSubjectChoice", () => {
  it("maps self choices", () => {
    for (const t of ["1", "১", "নিজে", " আমি "]) expect(parseSubjectChoice(t)).toBe("self");
  });
  it("maps family choices", () => {
    for (const t of ["2", "২", "পরিবার"]) expect(parseSubjectChoice(t)).toBe("family");
  });
  it("returns null for anything else", () => {
    for (const t of ["", "hello", "3", "৫"]) expect(parseSubjectChoice(t)).toBeNull();
  });
});

describe("copy", () => {
  it("welcome embeds the wallet url and has no em dash", () => {
    const msg = buildWelcome("https://khamhealth.com/wallet/abc");
    expect(msg).toContain("https://khamhealth.com/wallet/abc");
    expect(msg).not.toContain("—");
  });
  it("consent notice has no em dash", () => {
    expect(FRONT_DOOR_CONSENT_MSG).not.toContain("—");
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npm run test --workspace glyph-web -- front-door`
Expected: FAIL — cannot find module `./front-door`.

- [ ] **Step 3: Implement `front-door.ts`**

```ts
// apps/glyph/src/lib/whatsapp/front-door.ts

/** Default display name for a provisional patient (real name captured later, progressively). */
export const NAME_DEFAULT = "Glyph ব্যবহারকারী";

/** First reply to an unknown number: what Glyph is + the consent ask. */
export const FRONT_DOOR_CONSENT_MSG =
  "আসসালামু আলাইকুম, এটি Glyph। আমি আপনার জন্য একটি বিনামূল্যের ব্যক্তিগত স্বাস্থ্য রেকর্ড রাখতে পারি এবং স্বাস্থ্য বিষয়ে সাহায্য করতে পারি। আপনার লেখা একটি AI পড়বে, পরিচয় গোপন রেখে। এটি ডাক্তারের বিকল্প নয়, শুধু পরামর্শ। শুরু করতে 'হ্যাঁ' লিখুন, বন্ধ করতে 'বন্ধ' লিখুন।";

/** After consent: who is the record for. */
export const SUBJECT_QUESTION =
  "এটি কার জন্য? নিজের জন্য হলে '১' লিখুন, পরিবারের কারও জন্য হলে '২' লিখুন।";

export const CONSENT_DECLINED_MSG = "ঠিক আছে, কোনো সমস্যা নেই। প্রয়োজনে ডাক্তার দেখান।";

/** Welcome shown once the record exists, carrying the wallet link. */
export function buildWelcome(walletUrl: string): string {
  return `স্বাগতম। আপনার ব্যক্তিগত স্বাস্থ্য রেকর্ড তৈরি হয়েছে। এখানে দেখুন:\n${walletUrl}`;
}

/** Map a free-text reply to a subject choice. Conservative: exact tokens only. */
export function parseSubjectChoice(text: string): "self" | "family" | null {
  const t = text.trim();
  if (["1", "১", "নিজে", "আমি"].includes(t)) return "self";
  if (["2", "২", "পরিবার"].includes(t)) return "family";
  return null;
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm run test --workspace glyph-web -- front-door`
Expected: PASS (5 assertions).

- [ ] **Step 5: Commit**

```bash
git add apps/glyph/src/lib/whatsapp/front-door.ts apps/glyph/src/lib/whatsapp/front-door.test.ts
git commit -m "feat(front-door): pure onboarding logic (subject parse + Bangla copy)"
```

---

### Task 2: Router + flow-state wiring

**Files:**
- Modify: `apps/glyph/src/lib/whatsapp/flow.ts:7` (ActiveFlow type)
- Modify: `apps/glyph/src/lib/whatsapp/router.ts` (RouteAction + unbound branch)
- Test: `apps/glyph/src/lib/whatsapp/router.test.ts` (extend if present; else create)

**Interfaces:**
- Consumes: `parseSubjectChoice` (Task 1), `isAffirmative` (`./intents`), `extractBindCode` (`./binding`).
- Produces: new `RouteAction` variants `{ kind: "onboard_start"; firstMessage: string }`, `{ kind: "onboard_consent_reply"; agreed: boolean }`, `{ kind: "onboard_subject_reply"; choice: "self" | "family" | null }`. New `ActiveFlow` members `"awaiting_onboard_consent"` and `"awaiting_onboard_subject"`.

- [ ] **Step 1: Extend `ActiveFlow` in `flow.ts`**

Replace line 7:

```ts
export type ActiveFlow =
  | "idle"
  | "awaiting_onboard_consent"
  | "awaiting_onboard_subject"
  | "triage"
  | "awaiting_triage_consent"
  | "awaiting_document_consent"
  | "awaiting_document_type";
```

- [ ] **Step 2: Write failing router tests**

```ts
// apps/glyph/src/lib/whatsapp/router.test.ts  (add these cases)
import { describe, it, expect } from "vitest";
import { decideRoute } from "./router";

const text = (t: string) => ({ kind: "text" as const, text: t, fromWaId: "x", providerMessageId: "p" });

describe("front door (unbound)", () => {
  it("first non-code text starts onboarding", () => {
    expect(decideRoute(text("মাথা ব্যথা"), { bound: false, activeFlow: "idle" }))
      .toEqual({ kind: "onboard_start", firstMessage: "মাথা ব্যথা" });
  });
  it("a 6-digit code still binds (Chamber path preserved)", () => {
    expect(decideRoute(text("123456"), { bound: false, activeFlow: "idle" }))
      .toEqual({ kind: "bind", code: "123456" });
  });
  it("consent state routes the affirmative reply", () => {
    expect(decideRoute(text("হ্যাঁ"), { bound: false, activeFlow: "awaiting_onboard_consent" }))
      .toEqual({ kind: "onboard_consent_reply", agreed: true });
  });
  it("subject state parses the choice", () => {
    expect(decideRoute(text("১"), { bound: false, activeFlow: "awaiting_onboard_subject" }))
      .toEqual({ kind: "onboard_subject_reply", choice: "self" });
  });
});
```

- [ ] **Step 3: Run, verify fail**

Run: `npm run test --workspace glyph-web -- router`
Expected: FAIL — routes return `{ kind: "onboard" }` / unknown shapes.

- [ ] **Step 4: Rewrite the unbound branch in `router.ts`**

Add to imports (line 3 area): `import { parseSubjectChoice } from "./front-door";`

Add to the `RouteAction` union (after line 8):

```ts
  | { kind: "onboard_start"; firstMessage: string }
  | { kind: "onboard_consent_reply"; agreed: boolean }
  | { kind: "onboard_subject_reply"; choice: "self" | "family" | null }
```

Replace the unbound block (current lines 35-38) with:

```ts
  if (!ctx.bound) {
    // Mid-onboarding sub-states take precedence (text-only).
    if (ctx.activeFlow === "awaiting_onboard_consent") {
      if (inbound.kind !== "text") return { kind: "help" };
      return { kind: "onboard_consent_reply", agreed: isAffirmative(inbound.text) };
    }
    if (ctx.activeFlow === "awaiting_onboard_subject") {
      if (inbound.kind !== "text") return { kind: "help" };
      return { kind: "onboard_subject_reply", choice: parseSubjectChoice(inbound.text) };
    }
    // First contact. A 6-digit code is still the Chamber bind path.
    const code = inbound.kind === "text" ? extractBindCode(inbound.text) : null;
    if (code) return { kind: "bind", code };
    return { kind: "onboard_start", firstMessage: inbound.kind === "text" ? inbound.text.trim() : "" };
  }
```

(`isAffirmative` is already imported on line 3.)

- [ ] **Step 5: Run, verify pass + type-check**

Run: `npm run test --workspace glyph-web -- router` → PASS.
Run: `npm run type-check --workspace glyph-web` → clean (the `onboard` literal is gone from the router; Task 3 removes its handler).

- [ ] **Step 6: Commit**

```bash
git add apps/glyph/src/lib/whatsapp/flow.ts apps/glyph/src/lib/whatsapp/router.ts apps/glyph/src/lib/whatsapp/router.test.ts
git commit -m "feat(front-door): router onboarding sub-flow for unbound numbers"
```

---

### Task 3: `process.ts` onboarding handlers

**Files:**
- Modify: `apps/glyph/src/lib/whatsapp/process.ts`

**Interfaces:**
- Consumes: router actions from Task 2; `ensureKhamHoldingOrg(admin): Promise<string>`, `createOwnedPatient(admin, { ownerOrgId, name, phone }): Promise<{ id: string; did: string }>` (`@/lib/services/organizations`); `findOrCreateWalletToken(admin, patientId): Promise<string>` (`./wallet-link`); `handleTriage(...)` (existing in this file); `FRONT_DOOR_CONSENT_MSG`, `SUBJECT_QUESTION`, `CONSENT_DECLINED_MSG`, `buildWelcome`, `NAME_DEFAULT`, `parseSubjectChoice` (`./front-door`).

- [ ] **Step 1: Add imports + drop the dead onboard copy**

Add near line 11:

```ts
import { ensureKhamHoldingOrg, createOwnedPatient } from "@/lib/services/organizations";
import { FRONT_DOOR_CONSENT_MSG, SUBJECT_QUESTION, CONSENT_DECLINED_MSG, buildWelcome, NAME_DEFAULT } from "./front-door";
```

Delete the now-unused `ONBOARD_MSG` constant (line 15-16). (`CONSENT_DECLINED_MSG` now comes from `front-door.ts`; remove the local `const CONSENT_DECLINED_MSG` on line 22 to avoid a duplicate.)

- [ ] **Step 2: Replace the `onboard` handler with the three onboarding handlers**

Replace the current `if (action.kind === "onboard") { replyText = ONBOARD_MSG; }` block (lines 41-42) with:

```ts
  if (action.kind === "onboard_start") {
    // No DID yet. Ask for consent; stash the first message for the eventual triage turn.
    await writeFlow(admin, waId, "awaiting_onboard_consent", { pendingSymptom: action.firstMessage });
    replyText = FRONT_DOOR_CONSENT_MSG;
  } else if (action.kind === "onboard_consent_reply") {
    if (action.agreed) {
      await writeFlow(admin, waId, "awaiting_onboard_subject", { pendingSymptom: state.pendingSymptom });
      replyText = SUBJECT_QUESTION;
    } else {
      await writeFlow(admin, waId, "idle", {});
      replyText = CONSENT_DECLINED_MSG;
    }
  } else if (action.kind === "onboard_subject_reply") {
    if (!action.choice) {
      replyText = SUBJECT_QUESTION; // unrecognised, re-ask, stay in state
    } else {
      const grantedBy = action.choice === "self" ? "patient" : "guardian";
      const orgId = await ensureKhamHoldingOrg(admin);
      const created = await createOwnedPatient(admin, { ownerOrgId: orgId, name: NAME_DEFAULT, phone: waId });
      patientId = created.id;
      // Bind the number so future messages resolve as a known patient.
      await admin.from("whatsapp_links").insert({ patient_id: patientId, wa_id: waId, verified_at: now.toISOString() });
      // Record the AI-processing consent the user just gave, with correct provenance.
      await admin.from("consent_records").insert({
        patient_id: patientId, consent_type: "ai_processing", granted: true, granted_by: grantedBy, device_info: TRIAGE_TAG,
      });
      const token = await findOrCreateWalletToken(admin, patientId);
      const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
      const welcome = buildWelcome(`${base}/wallet/${token}`);
      const symptom = state.pendingSymptom?.trim();
      if (symptom) {
        const triageReply = await handleTriage(admin, waId, patientId, [{ role: "patient", content: symptom }], true, symptom);
        replyText = `${welcome}\n\n${triageReply}`;
      } else {
        await writeFlow(admin, waId, "idle", {});
        replyText = welcome;
      }
    }
  } else if (action.kind === "bind") {
```

(Note: the line above re-opens the existing `else if (action.kind === "bind")` chain — keep all subsequent handlers unchanged.)

- [ ] **Step 3: Type-check**

Run: `npm run type-check --workspace glyph-web`
Expected: clean. (Every `RouteAction` variant is now handled; no `onboard` literal remains.)

- [ ] **Step 4: Commit**

```bash
git add apps/glyph/src/lib/whatsapp/process.ts
git commit -m "feat(front-door): provisional patient + DID + wallet + triage on first contact"
```

---

### Task 4: E2E smoke test

**Files:**
- Create: `scripts/smoke-front-door.mjs`

**Interfaces:**
- Consumes: the running Next app (`/api/whatsapp/webhook`) + a Supabase service key. Mirrors the payload + assertion pattern of `scripts/smoke-whatsapp.mjs`.

- [ ] **Step 1: Write the smoke script**

```js
// scripts/smoke-front-door.mjs
// usage: node scripts/smoke-front-door.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const [APP_URL, SUPABASE_URL, SERVICE_KEY] = process.argv.slice(2);
if (!APP_URL || !SUPABASE_URL || !SERVICE_KEY) { console.error("usage: node scripts/smoke-front-door.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>"); process.exit(1); }
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const WA = "8801" + Math.floor(100000000 + Math.random() * 899999999); // throwaway number
const secret = process.env.DIALOG360_WEBHOOK_SECRET ?? "";
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

function payload(text, id) {
  return { entry: [{ changes: [{ value: { messages: [{ id, from: WA, timestamp: String(Math.floor(Date.now()/1000)), type: "text", text: { body: text } }] } }] }] };
}
async function post(text) {
  const id = "fd-" + crypto.randomUUID();
  const body = JSON.stringify(payload(text, id));
  const headers = { "content-type": "application/json" };
  if (secret) headers["x-hub-signature-256"] = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
  const r = await fetch(`${APP_URL}/api/whatsapp/webhook`, { method: "POST", headers, body });
  ok(r.ok, `webhook accepted "${text}" (status ${r.status})`);
}

console.log(`Front Door smoke — ${WA}`);
await post("আমার মাথা ব্যথা");                 // 1: first contact → consent ask
await post("হ্যাঁ");                            // 2: consent → subject ask
await post("১");                                // 3: self → create patient + DID + wallet + triage

// Assertions
const { data: link } = await db.from("whatsapp_links").select("patient_id, verified_at").eq("wa_id", WA).maybeSingle();
ok(!!link?.verified_at, "whatsapp_links row is auto-verified");
const patientId = link?.patient_id;
const { data: p } = patientId ? await db.from("patients").select("owner_org_id, clinic_id, did").eq("id", patientId).maybeSingle() : { data: null };
ok(!!p && !!p.owner_org_id && p.clinic_id === null, "patient is provisional (owner_org_id set, clinic_id null)");
ok(!!p?.did && p.did.startsWith("did:web:"), "patient DID minted");
const { data: org } = p ? await db.from("organizations").select("org_type").eq("id", p.owner_org_id).maybeSingle() : { data: null };
ok(org?.org_type === "kham_holding", "owner is the kham_holding org");
const { data: tok } = patientId ? await db.from("wallet_access_tokens").select("token").eq("patient_id", patientId).maybeSingle() : { data: null };
ok(!!tok?.token, "wallet token issued");
const { data: consent } = patientId ? await db.from("consent_records").select("granted_by, device_info").eq("patient_id", patientId).eq("consent_type", "ai_processing").maybeSingle() : { data: null };
ok(consent?.granted_by === "patient" && consent?.device_info === "whatsapp_triage", "ai_processing consent recorded (self → patient)");
const { data: doneMsgs } = await db.from("wa_messages").select("id").eq("wa_id", WA).eq("direction", "inbound").eq("status", "done");
ok((doneMsgs?.length ?? 0) === 3, "all 3 inbound messages processed to 'done' (pipeline ran end to end)");

// Cleanup (FK order)
if (patientId) {
  await db.from("triage_sessions").delete().eq("patient_id", patientId);
  await db.from("consent_records").delete().eq("patient_id", patientId);
  await db.from("wallet_access_tokens").delete().eq("patient_id", patientId);
  await db.from("wa_messages").delete().eq("wa_id", WA);
  await db.from("wa_conversations").delete().eq("wa_id", WA);
  await db.from("whatsapp_links").delete().eq("wa_id", WA);
  await db.from("patients").delete().eq("id", patientId);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run it (fails before Task 3 is deployed; passes after)**

Prereq: local stack up (`supabase start`), Next dev running (`npm run dev`), env set (`NEXT_PUBLIC_APP_URL`, `TRIAGE_SHARED_SECRET` matching the function, `DIALOG360_WEBHOOK_SECRET` if signature verification is on locally).

Run: `node scripts/smoke-front-door.mjs http://localhost:3000 http://127.0.0.1:54321 <service_key>`
Expected after Tasks 1-3: all checks `✓`, exit 0.

- [ ] **Step 3: Run the regression gate**

Run: `node scripts/smoke-whatsapp.mjs http://localhost:3000 http://127.0.0.1:54321 <service_key>`
Expected: still green (the Chamber bind path and bound-patient flows are unchanged).

- [ ] **Step 4: Commit**

```bash
git add scripts/smoke-front-door.mjs
git commit -m "test(front-door): E2E smoke — text to DID to wallet on first contact"
```

---

## Spec items deliberately deferred (decided, not forgotten)

- **Explicit anchor-provenance field (`whatsapp_phone` tier):** the weak/self-asserted
  tier is already signalled by `owner_org_id = kham_holding` (the provisional org) plus
  the absence of any institution/authority credential. Do **not** invent a new column on
  `patients`/`did_documents` for an anchor label (CLAUDE.md forbids inventing columns).
  An explicit provenance/anchor record is a follow-up for when the identity layer adds
  first-class anchor tracking.
- **Per-number rate limiting:** the primary spam mitigation is structural — a DID is
  minted only after a 3-message consent dance (`text` → `হ্যাঁ` → `১`), so a one-off wrong
  number or a single spam blast never creates an identity. An explicit per-`wa_id` rate
  limit is a fast-follow hardening, not v1.

## Notes for the implementer

- **Shared-phone "who is this for?" on RETURN visits** (showing known members as options) is deliberately **out of v1** — v1 onboards the first human on a number; subsequent texts go to that bound patient. The household/member selection is a fast follow once the single-member flow is proven.
- **Name** is a default (`NAME_DEFAULT`); real-name capture is progressive (later). Do not gate onboarding on PII.
- **Missed-call / outbound** is out of scope (needs approved Meta templates).
- If `npm run test --workspace glyph-web` is not the exact invocation in this repo, use the repo's `package.json` test script for the `glyph-web` workspace; the bridge already has Vitest unit tests (`router`, `intents`) to match.
