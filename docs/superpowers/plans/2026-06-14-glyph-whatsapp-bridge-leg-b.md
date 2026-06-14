# Glyph WhatsApp Bridge — Leg B (Patient Core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Leg A echo with the real patient experience in-thread: a bound patient texts a symptom and gets the deterministic-red-flag-screened, consent-gated, guided triage (reusing the engine already live in Pocket v2), or asks for their record and gets their wallet link, or stops and is unbound — all stateful across the async WhatsApp conversation.

**Architecture:** Extract the wallet triage route's tested core into a shared `runTriageTurn(admin, input)` so the WhatsApp processor and the wallet route share one engine (no LLM in the bridge; the runner calls the egress-gated `triage` edge function with the existing `TRIAGE_SHARED_SECRET`). The router becomes intent-aware using the conversation's `active_flow`; `process.ts` drives the triage state machine (start → one-time consent → guided turns → final answer) persisted in `wa_conversations.flow_state`. Routing stays deterministic (no model). No new env secret (reuses `TRIAGE_SHARED_SECRET`); adds `NEXT_PUBLIC_APP_URL` for the wallet link.

**Tech Stack:** Next.js 14.2 App Router (Node runtime), TypeScript, Supabase service-role, Vitest. Builds on Leg A (`apps/glyph/src/lib/whatsapp/*`, migration 008) and Pocket v2 (`lib/services/triage-logic.ts`, the `triage` edge function, `wallet-logic.ts`).

---

## Scope

**Leg B only** (per `docs/superpowers/specs/2026-06-14-glyph-whatsapp-bridge-design.md`). In: in-thread triage (start/consent/continue/answer/urgent), wallet-link reply, stop-word revocation, the triage-runner extraction. **Out** (Leg C/D): media/voice (`extract-document`, STT), `sendTemplate` + proactive (the window guard's template arm is unused in B since every reply answers an inbound), `scheduled_messages`, `visits.next_appointment_at`, doctor nudges, the `WHATSAPP_BRIDGE_SECRET` hop for extract-document/intake.

## File structure

**Create:**
- `apps/glyph/src/lib/services/triage-runner.ts` — `runTriageTurn` (extracted core) + `TriageMsg`/`TriageTurnInput`/`TriageTurnResult`
- `apps/glyph/src/lib/whatsapp/intents.ts` — pure command classifiers (`isAffirmative`, `isStopWord`, `isRecordRequest`) (+test)
- `apps/glyph/src/lib/whatsapp/flow.ts` — `WaFlowState` type + read/write helpers on `wa_conversations.flow_state`
- `apps/glyph/src/lib/whatsapp/reply.ts` — `formatOutcome(outcome)` → patient-facing Bangla text for a triage outcome (+test)
- `apps/glyph/src/lib/whatsapp/wallet-link.ts` — `findOrCreateWalletToken(admin, patientId)` (service-role) → token
- `*.test.ts` for intents, reply, router

**Modify:**
- `apps/glyph/src/lib/whatsapp/router.ts` — intent-aware `decideRoute` (uses `active_flow`)
- `apps/glyph/src/lib/whatsapp/router.test.ts` — new cases
- `apps/glyph/src/lib/whatsapp/process.ts` — drive the triage state machine + wallet/revoke
- `apps/glyph/src/app/api/wallet/[token]/triage/route.ts` — call `runTriageTurn` (behavior unchanged)
- `.env.example`, `CLAUDE.md`

---

### Task 1: Extract `runTriageTurn` from the wallet triage route

**Files:**
- Create: `apps/glyph/src/lib/services/triage-runner.ts`
- Modify: `apps/glyph/src/app/api/wallet/[token]/triage/route.ts`

This is a pure refactor: move the core (red-flag → consent → edge-fn → clamp → persist) into a shared function. The wallet route keeps its token validation and delegates the rest. Behavior must be identical (verified by the existing `scripts/smoke-triage.mjs`).

- [ ] **Step 1: Create `triage-runner.ts`** with the extracted core:

```ts
/**
 * @fileoverview The shared symptom-triage turn — the tested core lifted out of
 * the wallet triage route so the WhatsApp bridge runs the SAME engine. No LLM
 * lives here: it runs the deterministic red-flag pre-screen, resolves/creates
 * the patient's ai_processing consent (Tier B fails closed without it), calls
 * the egress-gated `triage` edge function with TRIAGE_SHARED_SECRET, clamps the
 * reply with triage-logic, and persists the session on a final answer.
 *
 * @module lib/services/triage-runner
 */
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import {
  screenRedFlags,
  urgentOutcome,
  validateOutcome,
  type TriageOutcome,
} from "@/lib/services/triage-logic";

type Admin = ReturnType<typeof createAdminClient>;

export interface TriageMsg {
  role: "patient" | "glyph";
  content: string;
}

export interface TriageTurnInput {
  patientId: string;
  /** For triage_sessions.wallet_token_id; null for non-wallet sources (WhatsApp). */
  walletTokenId: string | null;
  /** Full exchange so far; MUST end with a patient turn. */
  messages: TriageMsg[];
  /** True once the patient has accepted the one-time consent notice. */
  consentAccepted: boolean;
  /** Distinguishes the consent grant, e.g. 'pocket_triage' | 'whatsapp_triage'. */
  deviceTag: string;
}

export type TriageTurnResult =
  | { state: "ok"; outcome: TriageOutcome }
  | { state: "consent_required" }
  | { state: "error"; error: string };

const MAX_QUESTIONS = 3;

export async function runTriageTurn(admin: Admin, input: TriageTurnInput): Promise<TriageTurnResult> {
  const { patientId, walletTokenId, messages, consentAccepted, deviceTag } = input;

  if (messages.length === 0 || messages[messages.length - 1].role !== "patient") {
    return { state: "error", error: "messages must end with a patient turn" };
  }

  // ── Deterministic red-flag pre-screen (defense in depth) ──────
  const patientText = messages.filter((m) => m.role === "patient").map((m) => m.content).join("\n");
  const redFlag = screenRedFlags(patientText);
  if (redFlag) {
    const outcome = urgentOutcome(redFlag.message);
    await persistSession(admin, patientId, walletTokenId, messages, outcome, true);
    return { state: "ok", outcome };
  }

  // ── Resolve/create the ai_processing consent (Tier B gate) ────
  let consentId: string | null = null;
  const { data: existingConsent } = await admin
    .from("consent_records")
    .select("id")
    .eq("patient_id", patientId)
    .eq("consent_type", "ai_processing")
    .eq("granted", true)
    .is("withdrawn_at", null)
    .eq("device_info", deviceTag)
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingConsent) {
    consentId = existingConsent.id as string;
  } else if (consentAccepted) {
    const { data: inserted, error: consentErr } = await admin
      .from("consent_records")
      .insert({ patient_id: patientId, consent_type: "ai_processing", granted: true, granted_by: "patient", device_info: deviceTag })
      .select("id")
      .maybeSingle();
    if (consentErr || !inserted) {
      console.error("[triage-runner] consent insert failed:", consentErr?.code, consentErr?.message);
      return { state: "error", error: "Could not record consent" };
    }
    consentId = inserted.id as string;
  } else {
    return { state: "consent_required" };
  }

  // ── Minimal context (escalate-only) ───────────────────────────
  const { data: patient } = await admin
    .from("patients")
    .select("age, gender, chronic_conditions")
    .eq("id", patientId)
    .maybeSingle();
  const conditions = Array.isArray(patient?.chronic_conditions)
    ? (patient!.chronic_conditions as unknown[]).filter((c): c is string => typeof c === "string")
    : [];
  const patientContext = { age: patient?.age ?? null, gender: patient?.gender ?? null, conditions };

  const questionCount = messages.filter((m) => m.role === "glyph").length;
  const maxQuestionsReached = questionCount >= MAX_QUESTIONS;

  // ── Call the egress-gated triage edge function ────────────────
  let outcome: TriageOutcome;
  try {
    const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/triage`;
    const resp = await fetch(fnUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TRIAGE_SHARED_SECRET}` },
      body: JSON.stringify({ messages, patientContext, questionCount, consentId }),
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json?.success) {
      console.error("[triage-runner] edge function error:", resp.status, json?.error);
      outcome = validateOutcome(null);
    } else {
      outcome = validateOutcome(json.data?.raw, maxQuestionsReached);
    }
  } catch (err) {
    console.error("[triage-runner] edge call threw:", err instanceof Error ? err.message : err);
    outcome = validateOutcome(null);
  }

  if (outcome.mode === "answer") {
    await persistSession(admin, patientId, walletTokenId, [...messages, { role: "glyph", content: outcome.text }], outcome, false);
  }
  return { state: "ok", outcome };
}

async function persistSession(
  admin: Admin,
  patientId: string,
  walletTokenId: string | null,
  messages: TriageMsg[],
  outcome: TriageOutcome,
  redFlagScreened: boolean,
): Promise<void> {
  const { error } = await admin.from("triage_sessions").insert({
    patient_id: patientId,
    wallet_token_id: walletTokenId,
    messages: messages as unknown as Json,
    outcome: outcome as unknown as Json,
    red_flag_screened: redFlagScreened,
  });
  if (error) console.error("[triage-runner] session insert failed:", error.code, error.message);
}
```

- [ ] **Step 2: Refactor the wallet route to delegate.** In `apps/glyph/src/app/api/wallet/[token]/triage/route.ts`, replace everything from the `// ── Deterministic red-flag pre-screen` comment (line ~88) through the end of the `POST` function body (the `return NextResponse.json({ state: "ok", outcome })`, line ~197) — i.e. all the inlined core AND the local `persistSession` helper at the bottom — with a single call to the runner. Keep the imports trimmed (remove now-unused `screenRedFlags`, `urgentOutcome`, `validateOutcome`, `TriageOutcome`, `Json` if unused; keep `validateAccess`). The new tail of `POST` after `const patientId = tokenRow.patient_id as string;`:

```ts
  const result = await runTriageTurn(admin, {
    patientId,
    walletTokenId: tokenRow.id as string,
    messages: rawMessages,
    consentAccepted,
    deviceTag: "pocket_triage",
  });

  if (result.state === "consent_required") return NextResponse.json({ state: "consent_required" });
  if (result.state === "error") return NextResponse.json({ state: "error", error: result.error }, { status: 500 });
  return NextResponse.json({ state: "ok", outcome: result.outcome });
}
```

Add the import: `import { runTriageTurn } from "@/lib/services/triage-runner";` and `import type { TriageMsg } from "@/lib/services/triage-runner";` (use `TriageMsg` for the `rawMessages` typing in place of the local `Msg` interface — delete the local `Msg` interface). Delete the bottom `persistSession` helper.

- [ ] **Step 3: Type-check + existing tests.**

Run: `npm run type-check` (expect pass) and `cd apps/glyph && npx vitest run` (expect the existing 98 still pass — no triage-runner unit test yet; the runner is covered by the existing `smoke-triage.mjs` E2E).
Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
git add apps/glyph/src/lib/services/triage-runner.ts "apps/glyph/src/app/api/wallet/[token]/triage/route.ts"
git commit -m "refactor(triage): extract runTriageTurn shared core from the wallet route"
```

> Live verification of the unchanged wallet behavior happens via `scripts/smoke-triage.mjs` against a deploy (the same 9/9 path proven on prod for Pocket v2).

---

### Task 2: Command classifiers (pure)

**Files:**
- Create: `apps/glyph/src/lib/whatsapp/intents.ts`, `intents.test.ts`

- [ ] **Step 1: Write the failing test** `intents.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isAffirmative, isStopWord, isRecordRequest } from "./intents";

describe("isAffirmative", () => {
  it("matches Bangla + English yes", () => {
    for (const s of ["হ্যাঁ", "হ্যা", "জি", "ঠিক আছে", "রাজি", "yes", "OK", "ok ", "👍"]) {
      expect(isAffirmative(s)).toBe(true);
    }
  });
  it("rejects no/other", () => {
    for (const s of ["না", "no", "পরে", "মাথা ব্যথা"]) expect(isAffirmative(s)).toBe(false);
  });
});

describe("isStopWord", () => {
  it("matches stop/unsubscribe in both languages", () => {
    for (const s of ["stop", "STOP", "বন্ধ", "আনসাবস্ক্রাইব", "unsubscribe"]) expect(isStopWord(s)).toBe(true);
  });
  it("rejects normal text", () => {
    expect(isStopWord("আমার জ্বর")).toBe(false);
  });
});

describe("isRecordRequest", () => {
  it("matches record-asking phrases", () => {
    for (const s of ["record", "রেকর্ড", "my record", "আমার রেকর্ড", "রিপোর্ট"]) expect(isRecordRequest(s)).toBe(true);
  });
  it("rejects a symptom", () => {
    expect(isRecordRequest("তিন দিন ধরে জ্বর")).toBe(false);
  });
});
```

- [ ] **Step 2: Run → confirm FAIL** (`cd apps/glyph && npx vitest run src/lib/whatsapp/intents.test.ts`).

- [ ] **Step 3: Write `intents.ts`:**

```ts
/**
 * Pure, deterministic command classifiers for bound-patient WhatsApp messages.
 * Conservative: only an explicit match counts; anything else is treated as a
 * symptom (the default in the router). Bangla + English.
 */
function norm(text: string): string {
  return text.trim().toLowerCase();
}

const AFFIRMATIVE = ["হ্যাঁ", "হ্যা", "জি", "জ্বি", "ঠিক আছে", "আচ্ছা", "রাজি", "সম্মত", "yes", "ok", "okay", "y", "👍", "✓", "accept"];
const STOP = ["stop", "unsubscribe", "বন্ধ", "আনসাবস্ক্রাইব", "বন্ধ করুন", "remove", "cancel"];
const RECORD = ["record", "records", "রেকর্ড", "my record", "আমার রেকর্ড", "রিপোর্ট", "report", "history", "ইতিহাস", "প্রেসক্রিপশন"];

function matchesAny(text: string, list: string[]): boolean {
  const t = norm(text);
  return list.some((w) => t === w || t.includes(w));
}

/** A short affirmative ("yes"/"হ্যাঁ"/👍). Only matches SHORT replies to avoid a symptom that contains "ok". */
export function isAffirmative(text: string): boolean {
  const t = norm(text);
  if (t.length > 12) return false; // a real symptom is longer than a yes
  return AFFIRMATIVE.some((w) => t === w || t.startsWith(w + " ") || t === w + "।");
}

export function isStopWord(text: string): boolean {
  return matchesAny(text, STOP);
}

export function isRecordRequest(text: string): boolean {
  return matchesAny(text, RECORD);
}
```

- [ ] **Step 4: Run → confirm PASS.** **Step 5: Commit:**

```bash
git add apps/glyph/src/lib/whatsapp/intents.ts apps/glyph/src/lib/whatsapp/intents.test.ts
git commit -m "feat(whatsapp): pure command classifiers (affirmative/stop/record)"
```

---

### Task 3: Intent-aware router

**Files:**
- Modify: `apps/glyph/src/lib/whatsapp/router.ts`, `router.test.ts`

- [ ] **Step 1: Update the failing test.** Replace the existing bound "reply" test and add the new ones in `router.test.ts`. The `inbound()` helper stays; calls now pass a context with `activeFlow`. Replace the `describe("decideRoute", ...)` body with:

```ts
describe("decideRoute", () => {
  const idle = { bound: true, activeFlow: "idle" };
  it("unhandled kind → ignore", () => {
    expect(decideRoute(inbound({ kind: "unhandled" }), idle).kind).toBe("ignore");
  });
  it("unbound + a 6-digit code → bind", () => {
    expect(decideRoute(inbound({ text: "my code 482910" }), { bound: false, activeFlow: "idle" })).toEqual({ kind: "bind", code: "482910" });
  });
  it("unbound + no code → onboard", () => {
    expect(decideRoute(inbound({ text: "hi" }), { bound: false, activeFlow: "idle" }).kind).toBe("onboard");
  });
  it("bound idle + symptom → triage_start", () => {
    expect(decideRoute(inbound({ text: "তিন দিন ধরে জ্বর" }), idle)).toEqual({ kind: "triage_start", symptom: "তিন দিন ধরে জ্বর" });
  });
  it("bound idle + stop word → revoke", () => {
    expect(decideRoute(inbound({ text: "stop" }), idle).kind).toBe("revoke");
  });
  it("bound idle + record request → wallet", () => {
    expect(decideRoute(inbound({ text: "আমার রেকর্ড" }), idle).kind).toBe("wallet");
  });
  it("bound mid-triage + text → triage_continue", () => {
    expect(decideRoute(inbound({ text: "১০২ ডিগ্রি" }), { bound: true, activeFlow: "triage" })).toEqual({ kind: "triage_continue", answer: "১০২ ডিগ্রি" });
  });
  it("bound awaiting consent + yes → consent agreed", () => {
    expect(decideRoute(inbound({ text: "হ্যাঁ" }), { bound: true, activeFlow: "awaiting_triage_consent" })).toEqual({ kind: "triage_consent_reply", agreed: true });
  });
  it("bound awaiting consent + no → consent declined", () => {
    expect(decideRoute(inbound({ text: "না" }), { bound: true, activeFlow: "awaiting_triage_consent" })).toEqual({ kind: "triage_consent_reply", agreed: false });
  });
  it("bound mid-triage + non-text → help", () => {
    expect(decideRoute(inbound({ kind: "image" }), { bound: true, activeFlow: "triage" }).kind).toBe("help");
  });
});
```

- [ ] **Step 2: Run → confirm FAIL.**

- [ ] **Step 3: Rewrite `router.ts`:**

```ts
import type { NormalizedInbound } from "./types";
import { extractBindCode } from "./binding";
import { isAffirmative, isStopWord, isRecordRequest } from "./intents";

export type RouteAction =
  | { kind: "ignore"; reason: string }
  | { kind: "onboard" }
  | { kind: "bind"; code: string }
  | { kind: "triage_start"; symptom: string }
  | { kind: "triage_continue"; answer: string }
  | { kind: "triage_consent_reply"; agreed: boolean }
  | { kind: "wallet" }
  | { kind: "revoke" }
  | { kind: "help" };

export interface RouteContext {
  bound: boolean;
  /** wa_conversations.active_flow: "idle" | "triage" | "awaiting_triage_consent" */
  activeFlow: string;
}

/**
 * Deterministic routing (no LLM). Unbound numbers may only bind/onboard
 * (self-registration is deferred). Bound patients: mid-flow messages continue
 * that flow; an idle message is a stop word, a record request, or — by default —
 * a new symptom to triage.
 */
export function decideRoute(inbound: NormalizedInbound, ctx: RouteContext): RouteAction {
  if (inbound.kind === "unhandled") return { kind: "ignore", reason: "unhandled message type" };

  if (!ctx.bound) {
    const code = inbound.kind === "text" ? extractBindCode(inbound.text) : null;
    return code ? { kind: "bind", code } : { kind: "onboard" };
  }

  // Bound patient.
  if (ctx.activeFlow === "awaiting_triage_consent") {
    if (inbound.kind !== "text") return { kind: "help" };
    return { kind: "triage_consent_reply", agreed: isAffirmative(inbound.text) };
  }
  if (ctx.activeFlow === "triage") {
    if (inbound.kind !== "text") return { kind: "help" };
    return { kind: "triage_continue", answer: inbound.text };
  }

  // Idle.
  if (inbound.kind !== "text") return { kind: "help" };
  const text = inbound.text.trim();
  if (isStopWord(text)) return { kind: "revoke" };
  if (isRecordRequest(text)) return { kind: "wallet" };
  return { kind: "triage_start", symptom: text };
}
```

- [ ] **Step 4: Run → confirm PASS.** **Step 5: Commit:**

```bash
git add apps/glyph/src/lib/whatsapp/router.ts apps/glyph/src/lib/whatsapp/router.test.ts
git commit -m "feat(whatsapp): intent-aware router (triage/wallet/revoke/consent)"
```

---

### Task 4: Outcome → Bangla reply formatter (pure)

**Files:**
- Create: `apps/glyph/src/lib/whatsapp/reply.ts`, `reply.test.ts`

- [ ] **Step 1: Write the failing test** `reply.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatOutcome } from "./reply";
import type { TriageOutcome } from "@/lib/services/triage-logic";

describe("formatOutcome", () => {
  it("a question is just its text", () => {
    const o: TriageOutcome = { mode: "question", text: "কত দিন ধরে?" };
    expect(formatOutcome(o)).toBe("কত দিন ধরে?");
  });
  it("an urgent answer leads with the go-now line", () => {
    const o: TriageOutcome = { mode: "answer", text: "x", route: "urgent", redFlag: "এখনই হাসপাতালে যান।" };
    expect(formatOutcome(o)).toContain("এখনই হাসপাতালে যান।");
  });
  it("a doctor answer includes the text and any watchFor list", () => {
    const o: TriageOutcome = { mode: "answer", text: "ডাক্তার দেখান।", route: "doctor", watchFor: ["জ্বর বাড়লে", "শ্বাসকষ্ট"] };
    const s = formatOutcome(o);
    expect(s).toContain("ডাক্তার দেখান।");
    expect(s).toContain("জ্বর বাড়লে");
  });
});
```

- [ ] **Step 2: Run → confirm FAIL.**

- [ ] **Step 3: Write `reply.ts`:**

```ts
import type { TriageOutcome } from "@/lib/services/triage-logic";

/**
 * Render a triage outcome as one plain-Bangla WhatsApp message. Questions are
 * sent as-is; answers lead with the firm line for urgent, then the explanation,
 * then a "watch for" list. (WhatsApp has no rich cards — this is the text form
 * of the wallet's OutcomeCard.)
 */
export function formatOutcome(outcome: TriageOutcome): string {
  if (outcome.mode === "question") return outcome.text;

  const lines: string[] = [];
  if (outcome.route === "urgent" && outcome.redFlag) {
    lines.push("⚠️ " + outcome.redFlag);
  }
  if (outcome.text) lines.push(outcome.text);
  if (outcome.route === "doctor" && outcome.specialty) {
    lines.push(`কোন ডাক্তার: ${outcome.specialty}`);
  }
  if (outcome.watchFor && outcome.watchFor.length > 0) {
    lines.push("এগুলো দেখা দিলে দেরি না করে ডাক্তার দেখান:");
    for (const w of outcome.watchFor) lines.push(`• ${w}`);
  }
  return lines.join("\n");
}
```

- [ ] **Step 4: Run → confirm PASS.** **Step 5: Commit:**

```bash
git add apps/glyph/src/lib/whatsapp/reply.ts apps/glyph/src/lib/whatsapp/reply.test.ts
git commit -m "feat(whatsapp): triage outcome → Bangla reply formatter"
```

---

### Task 5: Flow-state helpers + wallet-token helper

**Files:**
- Create: `apps/glyph/src/lib/whatsapp/flow.ts`, `apps/glyph/src/lib/whatsapp/wallet-link.ts`

(Both are thin DB helpers — covered by the Task 7 smoke; type-check only here.)

- [ ] **Step 1: Write `flow.ts`:**

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import type { TriageMsg } from "@/lib/services/triage-runner";

type Admin = ReturnType<typeof createAdminClient>;

export type ActiveFlow = "idle" | "triage" | "awaiting_triage_consent";

export interface WaFlowState {
  /** The triage exchange so far (patient + glyph turns). */
  triageMessages?: TriageMsg[];
  /** The first symptom, stashed while awaiting the consent reply. */
  pendingSymptom?: string;
}

/** Read the conversation's flow for a wa_id (defaults to idle/empty). */
export async function readFlow(admin: Admin, waId: string): Promise<{ activeFlow: ActiveFlow; state: WaFlowState }> {
  const { data } = await admin
    .from("wa_conversations")
    .select("active_flow, flow_state")
    .eq("wa_id", waId)
    .maybeSingle();
  const activeFlow = (data?.active_flow as ActiveFlow) ?? "idle";
  const state = (data?.flow_state as WaFlowState) ?? {};
  return { activeFlow, state };
}

/** Persist the conversation's flow (the row is created by the Leg A upsert path). */
export async function writeFlow(admin: Admin, waId: string, activeFlow: ActiveFlow, state: WaFlowState): Promise<void> {
  const { error } = await admin
    .from("wa_conversations")
    .update({ active_flow: activeFlow, flow_state: state as unknown as Json, updated_at: new Date().toISOString() })
    .eq("wa_id", waId);
  if (error) console.error("[wa/flow] writeFlow failed:", error.code, error.message);
}
```

- [ ] **Step 2: Write `wallet-link.ts`:**

```ts
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** base64url token, mirrors wallet-logic.generateToken (24 bytes). */
function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Find the patient's active wallet token or mint one (service-role). The
 * WhatsApp bridge has no doctor session, so created_by_doctor_id is null. PIN
 * is never set here — the WhatsApp thread is already an authenticated channel
 * (the number is bound to this patient).
 */
export async function findOrCreateWalletToken(admin: Admin, patientId: string): Promise<string> {
  const { data: existing } = await admin
    .from("wallet_access_tokens")
    .select("token")
    .eq("patient_id", patientId)
    .eq("revoked", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing.token as string;

  const token = generateToken();
  const { error } = await admin.from("wallet_access_tokens").insert({ token, patient_id: patientId });
  if (error) throw new Error(`findOrCreateWalletToken failed: ${error.message}`);
  return token;
}
```

- [ ] **Step 3: Type-check.** Run: `npm run type-check` — expect PASS.

- [ ] **Step 4: Commit:**

```bash
git add apps/glyph/src/lib/whatsapp/flow.ts apps/glyph/src/lib/whatsapp/wallet-link.ts
git commit -m "feat(whatsapp): flow-state + wallet-token helpers"
```

---

### Task 6: Wire the flows in `process.ts`

**Files:**
- Modify: `apps/glyph/src/lib/whatsapp/process.ts`
- Modify: `.env.example`

This rewires `processInbound`: it reads the conversation flow, passes `activeFlow` to the router, and handles the new bound-patient actions. The Leg A `upsertConversation` (window refresh) and inbound-`done` mark stay. The window-guarded `sendReply` stays.

- [ ] **Step 1: Add env.** Append to `.env.example`:

```
# Public base URL of the app, for the wallet link sent over WhatsApp (no trailing slash).
NEXT_PUBLIC_APP_URL=https://khamhealth.com
```

- [ ] **Step 2: Rewrite `process.ts`.** Replace the whole file with:

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import type { NormalizedInbound } from "./types";
import { decideRoute } from "./router";
import { resolveLinkByWaId, redeemBindCode } from "./binding";
import { sendText } from "./send";
import { isWindowOpen, nextWindowExpiry } from "./window";
import { readFlow, writeFlow, type WaFlowState } from "./flow";
import { formatOutcome } from "./reply";
import { findOrCreateWalletToken } from "./wallet-link";
import { runTriageTurn, type TriageMsg } from "@/lib/services/triage-runner";

type Admin = ReturnType<typeof createAdminClient>;

const ONBOARD_MSG =
  "আসসালামু আলাইকুম। এটি Glyph। আপনার রেকর্ড দেখতে ক্লিনিক থেকে পাওয়া কোডটি এখানে পাঠান। কোড না থাকলে আপনার ডাক্তারের কাছে চান।";
const BIND_OK_MSG = "ধন্যবাদ — আপনার নম্বর যুক্ত হয়েছে। সমস্যা থাকলে এখানে লিখুন, বা 'রেকর্ড' লিখে আপনার তথ্য দেখুন।";
const BIND_FAIL_MSG = "কোডটি কাজ করছে না বা মেয়াদ শেষ। ক্লিনিক থেকে নতুন কোড নিন।";
const HELP_MSG = "এখন শুধু লেখা পড়তে পারি। আপনার সমস্যাটা লিখুন, অথবা 'রেকর্ড' লিখুন।";
const CONSENT_NOTICE =
  "আপনার লেখা একটি AI-তে পাঠানো হবে — পাঠানোর আগে নাম-পরিচয় মুছে ফেলা হয়। এটি ডাক্তারের বিকল্প নয়, শুধু পরামর্শ। রাজি থাকলে 'হ্যাঁ' লিখুন।";
const CONSENT_DECLINED_MSG = "ঠিক আছে, কোনো সমস্যা নেই। প্রয়োজনে ডাক্তার দেখান।";
const REVOKED_MSG = "আপনার নম্বর সরিয়ে নেওয়া হয়েছে। আর কোনো বার্তা পাবেন না। আবার যুক্ত হতে ক্লিনিকের কোড পাঠান।";
const TRIAGE_TAG = "whatsapp_triage";

export async function processInbound(admin: Admin, inbound: NormalizedInbound, now: Date): Promise<void> {
  const waId = inbound.fromWaId;
  const link = await resolveLinkByWaId(admin, waId);
  const { activeFlow, state } = await readFlow(admin, waId);
  const action = decideRoute(inbound, { bound: !!link, activeFlow });

  let replyText: string | null = null;
  let patientId: string | null = link?.patientId ?? null;
  // The window/flow are only touched for non-ignore actions.
  const touch = action.kind !== "ignore";

  if (action.kind === "onboard") {
    replyText = ONBOARD_MSG;
  } else if (action.kind === "bind") {
    let redeemed: { patientId: string } | null = null;
    try {
      redeemed = await redeemBindCode(admin, waId, action.code, now.toISOString());
    } catch (err) {
      console.error("[wa/process] redeemBindCode error:", err instanceof Error ? err.message : err);
    }
    if (redeemed) {
      patientId = redeemed.patientId;
      replyText = BIND_OK_MSG;
    } else {
      replyText = BIND_FAIL_MSG;
    }
  } else if (action.kind === "help") {
    replyText = HELP_MSG;
  } else if (action.kind === "revoke") {
    await admin.from("whatsapp_links").update({ revoked: true }).eq("wa_id", waId).eq("revoked", false);
    await writeFlow(admin, waId, "idle", {});
    replyText = REVOKED_MSG;
  } else if (action.kind === "wallet") {
    if (patientId) {
      try {
        const token = await findOrCreateWalletToken(admin, patientId);
        const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
        replyText = `আপনার স্বাস্থ্য রেকর্ড:\n${base}/wallet/${token}`;
      } catch (err) {
        console.error("[wa/process] wallet token error:", err);
        replyText = "দুঃখিত, এই মুহূর্তে রেকর্ড লিঙ্ক তৈরি করা গেল না। পরে চেষ্টা করুন।";
      }
    }
  } else if (action.kind === "triage_start") {
    replyText = await handleTriage(admin, waId, patientId, [{ role: "patient", content: action.symptom }], false, action.symptom);
  } else if (action.kind === "triage_continue") {
    const msgs: TriageMsg[] = [...(state.triageMessages ?? []), { role: "patient", content: action.answer }];
    replyText = await handleTriage(admin, waId, patientId, msgs, false, null);
  } else if (action.kind === "triage_consent_reply") {
    if (action.agreed) {
      const msgs: TriageMsg[] = state.triageMessages ?? (state.pendingSymptom ? [{ role: "patient", content: state.pendingSymptom }] : []);
      replyText = await handleTriage(admin, waId, patientId, msgs, true, null);
    } else {
      await writeFlow(admin, waId, "idle", {});
      replyText = CONSENT_DECLINED_MSG;
    }
  }

  if (touch) {
    await upsertConversation(admin, waId, patientId, nextWindowExpiry(now));
    if (replyText) await sendReply(admin, waId, patientId, replyText, now);
  }

  const { error: doneErr } = await admin
    .from("wa_messages")
    .update({ status: "done", patient_id: patientId })
    .eq("provider_message_id", inbound.providerMessageId);
  if (doneErr) console.error("[wa/process] failed to mark inbound done:", inbound.providerMessageId, doneErr.message);
}

/**
 * Run one triage turn and update the conversation flow. Returns the reply text.
 * - consent_required → ask for consent, stash the symptom, set awaiting state.
 * - ok + question → store the exchange, stay in 'triage'.
 * - ok + answer/urgent → clear back to 'idle' (the runner already persisted).
 */
async function handleTriage(
  admin: Admin,
  waId: string,
  patientId: string | null,
  messages: TriageMsg[],
  consentAccepted: boolean,
  symptomForStash: string | null,
): Promise<string> {
  if (!patientId || messages.length === 0) {
    return "আপনার সমস্যাটা একটু লিখুন।";
  }
  const result = await runTriageTurn(admin, { patientId, walletTokenId: null, messages, consentAccepted, deviceTag: TRIAGE_TAG });

  if (result.state === "consent_required") {
    await writeFlow(admin, waId, "awaiting_triage_consent", { triageMessages: messages, pendingSymptom: symptomForStash ?? messages[0]?.content });
    return CONSENT_NOTICE;
  }
  if (result.state === "error") {
    await writeFlow(admin, waId, "idle", {});
    return "এই মুহূর্তে উত্তর দিতে পারছি না। নিরাপদ থাকতে একজন ডাক্তার দেখান।";
  }

  const outcome = result.outcome;
  if (outcome.mode === "question") {
    await writeFlow(admin, waId, "triage", { triageMessages: [...messages, { role: "glyph", content: outcome.text }] });
  } else {
    await writeFlow(admin, waId, "idle", {});
  }
  return formatOutcome(outcome);
}

async function upsertConversation(admin: Admin, waId: string, patientId: string | null, windowExpiry: Date) {
  await admin
    .from("wa_conversations")
    .upsert({ wa_id: waId, patient_id: patientId, window_expires_at: windowExpiry.toISOString(), updated_at: new Date().toISOString() }, { onConflict: "wa_id" });
}

async function sendReply(admin: Admin, waId: string, patientId: string | null, text: string, now: Date) {
  const { data: convo } = await admin.from("wa_conversations").select("window_expires_at").eq("wa_id", waId).maybeSingle();
  if (!isWindowOpen(convo?.window_expires_at ?? null, now)) {
    await logOutbound(admin, waId, patientId, "failed", null, "window closed (no template path in Leg B)");
    return;
  }
  try {
    const sent = await sendText({ to: waId, body: text });
    await logOutbound(admin, waId, patientId, "sent", sent.messageId, null);
  } catch (err) {
    await logOutbound(admin, waId, patientId, "failed", null, err instanceof Error ? err.message : String(err));
  }
}

async function logOutbound(admin: Admin, waId: string, patientId: string | null, status: string, providerMessageId: string | null, error: string | null) {
  await admin.from("wa_messages").insert({
    provider_message_id: providerMessageId,
    direction: "outbound",
    wa_id: waId,
    patient_id: patientId,
    kind: "text",
    status,
    error,
  });
}
```

> Note on `upsertConversation` vs `writeFlow` ordering: `handleTriage` calls `writeFlow` (sets active_flow + flow_state) BEFORE the post-routing `upsertConversation` runs. The upsert only sets `wa_id`, `patient_id`, `window_expires_at`, `updated_at` (NOT active_flow/flow_state), so it does not clobber the flow write. This is correct — verified by the smoke in Task 7.

- [ ] **Step 3: Type-check + full app suite.** Run: `npm run type-check` and `cd apps/glyph && npx vitest run` — expect PASS (router/intents/reply unit tests green; no regressions).

- [ ] **Step 4: Commit:**

```bash
git add apps/glyph/src/lib/whatsapp/process.ts .env.example
git commit -m "feat(whatsapp): in-thread triage state machine + wallet/revoke flows"
```

---

### Task 7: Extend the smoke + docs

**Files:**
- Modify: `scripts/smoke-whatsapp.mjs`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Extend `scripts/smoke-whatsapp.mjs`** with bound-patient flow assertions, after the existing bind checks (before the `finally`). Add (the patient is bound from the earlier steps; `waId`, `patient`, `admin`, `post`, `inboundPayload`, `check` are in scope):

```js
  // 5. Bound patient asks for their record → wallet link reply logged.
  const r5 = await post(inboundPayload("রেকর্ড", `wamid.${code}.rec`));
  check("webhook 200 for record request", r5.status === 200, r5.status);
  await new Promise((r) => setTimeout(r, 2500));
  const { data: walletOut } = await admin
    .from("wa_messages").select("status").eq("wa_id", waId).eq("direction", "outbound").order("created_at", { ascending: false }).limit(1).maybeSingle();
  check("record request produced an outbound reply", !!walletOut, JSON.stringify(walletOut));
  const { data: tok } = await admin.from("wallet_access_tokens").select("token").eq("patient_id", patient.id).maybeSingle();
  check("wallet token minted for the patient", !!tok?.token);

  // 6. Bound patient sends a RED-FLAG symptom → deterministic urgent (no LLM/consent needed).
  const r6 = await post(inboundPayload("আমার বুকে প্রচণ্ড ব্যথা আর শ্বাসকষ্ট হচ্ছে", `wamid.${code}.rf`));
  check("webhook 200 for red-flag symptom", r6.status === 200, r6.status);
  await new Promise((r) => setTimeout(r, 3000));
  const { data: triageRow } = await admin
    .from("triage_sessions").select("red_flag_screened, outcome").eq("patient_id", patient.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  check("red-flag triage session persisted as urgent", triageRow?.red_flag_screened === true && triageRow?.outcome?.route === "urgent", JSON.stringify(triageRow?.outcome?.route));
```

And in the `finally`, add `await admin.from("triage_sessions").delete().eq("patient_id", patient.id);` and `await admin.from("consent_records").delete().eq("patient_id", patient.id);` and `await admin.from("wallet_access_tokens").delete().eq("patient_id", patient.id);` BEFORE the `patients` delete (FK order).

- [ ] **Step 2: Syntax-check.** Run: `node --check scripts/smoke-whatsapp.mjs` — expect OK. (Full E2E runs post-deploy on a non-prod/sandbox webhook, since the prod fail-closed signature gate rejects unsigned posts. The red-flag assertion is deterministic and needs no LLM/number.)

- [ ] **Step 3: Update `CLAUDE.md`.** Update the `lib/whatsapp/` line to mention intents/flow/reply/wallet-link; note `lib/services/triage-runner.ts` (shared by the wallet route and the WhatsApp bridge); add `NEXT_PUBLIC_APP_URL` to the §7 env table; note Leg B is shipped (in-thread triage + wallet reply + revoke). Keep edits surgical.

- [ ] **Step 4: Commit:**

```bash
git add scripts/smoke-whatsapp.mjs CLAUDE.md
git commit -m "test+docs(whatsapp): Leg B smoke flows + CLAUDE.md"
```

---

## Self-review

**Spec coverage (Leg B):** in-thread triage start/consent/continue/answer/urgent → Tasks 1,3,6 (`runTriageTurn` + router + `handleTriage`). Wallet-link reply → Tasks 5,6. Stop-word revocation → Tasks 2,3,6. Reuse of the Pocket v2 engine (no new LLM path, no new secret) → Task 1 (shared `runTriageTurn`, `TRIAGE_SHARED_SECRET`). Deferred correctly: media/voice, `sendTemplate`/proactive, `scheduled_messages`, `next_appointment_at`, doctor nudge, the extract-document/intake service hop.

**Placeholder scan:** none — every step has complete code or an exact edit description with the surrounding anchors.

**Type consistency:** `TriageMsg` is defined once (triage-runner) and imported by flow.ts and process.ts. `RouteAction` kinds (`triage_start`/`triage_continue`/`triage_consent_reply`/`wallet`/`revoke`/`help`/`onboard`/`bind`/`ignore`) match between router.ts (Task 3) and the process.ts switch (Task 6). `RouteContext` gains `activeFlow` (Task 3) and process.ts supplies it from `readFlow` (Task 6). `runTriageTurn`'s `TriageTurnResult` states (`ok`/`consent_required`/`error`) are handled in both the wallet route (Task 1) and `handleTriage` (Task 6). `WaFlowState` (`triageMessages`/`pendingSymptom`) is written/read consistently.

**Risk flagged for review:** `handleTriage` writes the flow, then the post-routing `upsertConversation` runs — confirmed non-clobbering because the upsert omits `active_flow`/`flow_state`. The Task 7 smoke's red-flag assertion exercises the full webhook→process→runner→persist path deterministically (no number/LLM needed); the guided multi-turn exchange + consent gate is verified live on a sandbox deploy once the founder's number lands.
