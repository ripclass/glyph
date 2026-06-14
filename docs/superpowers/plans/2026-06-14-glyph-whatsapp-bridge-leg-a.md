# Glyph WhatsApp Bridge — Leg A (Skeleton) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the WhatsApp channel skeleton for Glyph — a webhook that verifies, dedupes, and durably queues inbound messages; an identity-binding flow (QR one-time code → verified patient); consent-first onboarding for unknown numbers; and a bound-patient echo — running against the 360dialog sandbox, with zero clinical surface.

**Architecture:** Port the proven, framework-agnostic WhatsApp channel modules from the Juugadu project (`J:\Juugadu\src\channels\whatsapp\*`) into `apps/glyph/src/lib/whatsapp/`, adapted to read `process.env` directly (Glyph has no central env module). A Next.js App Router route (`/api/whatsapp/webhook`) receives, signature-verifies, dedupes, and persists each inbound, returns 200 fast, and kicks processing via `after()`. A sweeper cron retries anything stuck. All routing is pure functions (`decideRoute`, binding, window) that are unit-tested; the network/DB pieces are covered by a sandbox smoke. NO LLM calls in Leg A.

**Tech Stack:** Next.js 14 App Router (Node runtime), TypeScript, Supabase (service-role admin client), Vitest, 360dialog WhatsApp Cloud API.

---

## Scope

This plan is **Leg A only** (per `docs/superpowers/specs/2026-06-14-glyph-whatsapp-bridge-design.md`). It delivers a working, testable channel + identity binding. It does **NOT** include triage/wallet replies (Leg B), media/voice capture (Leg C), or proactive templates/doctor nudges (Leg D). Those are separate plans. The `sendTemplate`, `scheduled_messages`, and `visits.next_appointment_at` pieces belong to Leg D and are intentionally absent here.

## File structure (Leg A)

**Create:**
- `supabase/migrations/008_whatsapp_bridge.sql` — `whatsapp_links`, `wa_conversations`, `wa_messages` (RLS deny-all)
- `apps/glyph/src/lib/whatsapp/types.ts` — inbound payload + `NormalizedInbound` types
- `apps/glyph/src/lib/whatsapp/provider.ts` — 360dialog/Meta provider config (reads `process.env`)
- `apps/glyph/src/lib/whatsapp/parse.ts` — `extractInbound` (webhook payload → `NormalizedInbound[]`)
- `apps/glyph/src/lib/whatsapp/verify.ts` — `verifyChallenge` + `verifySignature`
- `apps/glyph/src/lib/whatsapp/send.ts` — `sendText`
- `apps/glyph/src/lib/whatsapp/window.ts` — 24h window helpers (pure)
- `apps/glyph/src/lib/whatsapp/binding.ts` — bind-code generate/redeem + `resolveLinkByWaId`
- `apps/glyph/src/lib/whatsapp/router.ts` — `decideRoute` + `extractBindCode` (pure)
- `apps/glyph/src/lib/whatsapp/process.ts` — `processInbound` (orchestrates route → action → reply → persist)
- `apps/glyph/src/lib/whatsapp/*.test.ts` — unit tests for parse, verify, window, router, binding
- `apps/glyph/src/app/api/whatsapp/webhook/route.ts` — GET (challenge) + POST (ingest)
- `apps/glyph/src/app/api/whatsapp/bind-code/route.ts` — doctor session → issue a bind code + `wa.me` link
- `apps/glyph/src/app/api/cron/whatsapp-sweeper/route.ts` — retry stuck inbound
- `scripts/smoke-whatsapp.mjs` — sandbox E2E

**Modify:**
- `apps/glyph/src/lib/supabase/types.ts` — add the 3 generated table types
- `.env.example` — WhatsApp env vars
- `CLAUDE.md` — migration 008 + the new routes/lib (after the leg lands)

---

### Task 1: Migration 008 — the three bridge tables

**Files:**
- Create: `supabase/migrations/008_whatsapp_bridge.sql`
- Modify: `apps/glyph/src/lib/supabase/types.ts`

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================
-- GLYPH — WhatsApp bridge skeleton (migration 008)
--
-- Leg A of the WhatsApp bridge. Three service-role-only tables (RLS deny-all,
-- like wallet_access_tokens / triage_sessions): patients never reach PostgREST.
--   * whatsapp_links     — binds a WhatsApp number (wa_id) to a verified
--                          patient via a one-time code. The identity anchor is
--                          the patient; wa_id is a linked, revocable transport.
--   * wa_conversations   — durable, re-entrant per-thread state (the 24h window
--                          lives here as window_expires_at).
--   * wa_messages        — inbound/outbound log + idempotency (unique
--                          provider_message_id) + audit trail.
-- ============================================================

CREATE TABLE whatsapp_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  -- Set only once the patient redeems the code. NULL while pending.
  wa_id TEXT,
  -- The one-time binding code (set at issue, cleared/kept after redeem).
  bind_code TEXT,
  bind_code_expires_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL
);

COMMENT ON TABLE whatsapp_links IS
  'Binds a WhatsApp number to a verified patient. Service-role only.';

-- One active (verified, non-revoked) link per wa_id.
CREATE UNIQUE INDEX idx_wa_link_active_waid
  ON whatsapp_links(wa_id) WHERE verified_at IS NOT NULL AND NOT revoked;
-- A pending code must be unique while unredeemed.
CREATE UNIQUE INDEX idx_wa_link_pending_code
  ON whatsapp_links(bind_code) WHERE bind_code IS NOT NULL AND verified_at IS NULL;
CREATE INDEX idx_wa_link_patient ON whatsapp_links(patient_id);

ALTER TABLE whatsapp_links ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies: deny-all for anon/authenticated.

CREATE TABLE wa_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wa_id TEXT NOT NULL UNIQUE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  active_flow TEXT NOT NULL DEFAULT 'idle',
  flow_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- The 24h customer-service window. NULL = closed.
  window_expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE wa_conversations IS
  'Durable per-thread WhatsApp conversation state. Service-role only.';

ALTER TABLE wa_conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE wa_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Inbound dedupe key (the provider's message id). NULL for outbound.
  provider_message_id TEXT UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  wa_id TEXT NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  -- inbound: received|processing|done|failed ; outbound: sent|failed
  status TEXT NOT NULL,
  payload JSONB,
  error TEXT
);

COMMENT ON TABLE wa_messages IS
  'WhatsApp inbound/outbound log + idempotency + audit. Service-role only.';

-- The sweeper reads inbound rows stuck in 'received'.
CREATE INDEX idx_wa_messages_inbound_status
  ON wa_messages(status, created_at) WHERE direction = 'inbound';
CREATE INDEX idx_wa_messages_waid ON wa_messages(wa_id, created_at DESC);

ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Apply locally (if local Supabase is up) and regenerate types**

Run: `supabase db reset` (local) then
`supabase gen types typescript --local > apps/glyph/src/lib/supabase/types.ts`

If local Supabase is down (it has been this cycle), hand-add the three tables to `apps/glyph/src/lib/supabase/types.ts` instead — follow the exact precedent of the `triage_sessions` block already in that file (insert each alphabetically inside `Tables`, with `Row`/`Insert`/`Update`/`Relationships`, and add `export type` aliases at the bottom). The columns are exactly those in the migration above; jsonb columns (`flow_state`, `payload`) type as `Json`.

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: PASS (no errors).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/008_whatsapp_bridge.sql apps/glyph/src/lib/supabase/types.ts
git commit -m "feat(whatsapp): migration 008 — bridge skeleton tables"
```

---

### Task 2: Inbound types + parse

**Files:**
- Create: `apps/glyph/src/lib/whatsapp/types.ts`
- Create: `apps/glyph/src/lib/whatsapp/parse.ts`
- Test: `apps/glyph/src/lib/whatsapp/parse.test.ts`

- [ ] **Step 1: Write the types**

`types.ts`:

```ts
/** WhatsApp Cloud API inbound payload shapes (subset we consume) + normalized form. */

export type WaKind = "text" | "audio" | "image" | "document" | "unhandled";

export interface NormalizedInbound {
  channel: "whatsapp";
  providerMessageId: string;
  fromWaId: string;
  fromName?: string;
  receivedAt: Date;
  replyToMessageId?: string;
  kind: WaKind;
  /** Text body (or media caption); "" for media without caption. */
  text: string;
  mediaId?: string;
  mediaMimeType?: string;
  raw: unknown;
}

export interface WAInboundMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  context?: { id?: string };
  text?: { body: string };
  audio?: { id: string; mime_type: string };
  image?: { id: string; mime_type: string; caption?: string };
  document?: { id: string; mime_type: string; caption?: string };
}

export interface WAChangeValue {
  messaging_product?: string;
  contacts?: Array<{ wa_id: string; profile: { name: string } }>;
  messages?: WAInboundMessage[];
}

export interface WAWebhookPayload {
  entry?: Array<{ changes?: Array<{ value: WAChangeValue }> }>;
}
```

- [ ] **Step 2: Write the failing test**

`parse.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { extractInbound } from "./parse";
import type { WAWebhookPayload } from "./types";

const textPayload: WAWebhookPayload = {
  entry: [
    {
      changes: [
        {
          value: {
            contacts: [{ wa_id: "8801711000000", profile: { name: "Karim" } }],
            messages: [
              { id: "wamid.1", from: "8801711000000", timestamp: "1700000000", type: "text", text: { body: "hi" } },
            ],
          },
        },
      ],
    },
  ],
};

describe("extractInbound", () => {
  it("normalizes a text message", () => {
    const [msg] = [...extractInbound(textPayload)];
    expect(msg.kind).toBe("text");
    expect(msg.text).toBe("hi");
    expect(msg.fromWaId).toBe("8801711000000");
    expect(msg.fromName).toBe("Karim");
    expect(msg.providerMessageId).toBe("wamid.1");
  });

  it("normalizes an image with caption", () => {
    const payload: WAWebhookPayload = {
      entry: [{ changes: [{ value: { messages: [
        { id: "wamid.2", from: "8801711000000", timestamp: "1700000000", type: "image", image: { id: "media-1", mime_type: "image/jpeg", caption: "my Rx" } },
      ] } }] }],
    };
    const [msg] = [...extractInbound(payload)];
    expect(msg.kind).toBe("image");
    expect(msg.mediaId).toBe("media-1");
    expect(msg.text).toBe("my Rx");
  });

  it("yields nothing for a payload with no messages (status update)", () => {
    expect([...extractInbound({ entry: [{ changes: [{ value: {} }] }] })]).toHaveLength(0);
  });
});
```

- [ ] **Step 2b: Run it to verify it fails**

Run: `cd apps/glyph && npx vitest run src/lib/whatsapp/parse.test.ts`
Expected: FAIL ("Cannot find module './parse'").

- [ ] **Step 3: Write parse.ts**

```ts
import type { NormalizedInbound, WAChangeValue, WAInboundMessage, WAWebhookPayload } from "./types";

/** Walk a webhook payload, yielding one NormalizedInbound per inbound message. */
export function* extractInbound(payload: WAWebhookPayload): Generator<NormalizedInbound> {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value.messages ?? []) {
        yield normalise(message, change.value);
      }
    }
  }
}

function normalise(message: WAInboundMessage, value: WAChangeValue): NormalizedInbound {
  const contact = (value.contacts ?? []).find((c) => c.wa_id === message.from);
  const base = {
    channel: "whatsapp" as const,
    providerMessageId: message.id,
    fromWaId: message.from,
    fromName: contact?.profile.name,
    receivedAt: new Date(Number(message.timestamp) * 1000),
    replyToMessageId: message.context?.id,
    raw: message,
  };
  if (message.type === "text" && message.text) {
    return { ...base, kind: "text", text: message.text.body };
  }
  if (message.type === "audio" && message.audio) {
    return { ...base, kind: "audio", text: "", mediaId: message.audio.id, mediaMimeType: message.audio.mime_type };
  }
  if (message.type === "image" && message.image) {
    return { ...base, kind: "image", text: message.image.caption ?? "", mediaId: message.image.id, mediaMimeType: message.image.mime_type };
  }
  if (message.type === "document" && message.document) {
    return { ...base, kind: "document", text: message.document.caption ?? "", mediaId: message.document.id, mediaMimeType: message.document.mime_type };
  }
  return { ...base, kind: "unhandled", text: "" };
}
```

- [ ] **Step 4: Run the tests, verify pass**

Run: `cd apps/glyph && npx vitest run src/lib/whatsapp/parse.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/glyph/src/lib/whatsapp/types.ts apps/glyph/src/lib/whatsapp/parse.ts apps/glyph/src/lib/whatsapp/parse.test.ts
git commit -m "feat(whatsapp): inbound payload types + parse"
```

---

### Task 3: Provider config + signature/challenge verification

**Files:**
- Create: `apps/glyph/src/lib/whatsapp/provider.ts`
- Create: `apps/glyph/src/lib/whatsapp/verify.ts`
- Test: `apps/glyph/src/lib/whatsapp/verify.test.ts`

- [ ] **Step 1: Write provider.ts (reads `process.env`)**

```ts
/**
 * WhatsApp Cloud API provider config. 360dialog (BSP) and Meta share the same
 * payload + webhook signature scheme; only base URL + auth header differ.
 * Leg A needs the messages base URL, auth headers, and the webhook secret.
 */
export interface ProviderConfig {
  messageBaseUrl(): string;
  authHeaders(): Record<string, string>;
  webhookSecret(): string | undefined;
}

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export function getProvider(): ProviderConfig {
  if (process.env.WHATSAPP_PROVIDER === "meta") {
    const apiBase = `${process.env.META_API_BASE ?? "https://graph.facebook.com"}/${process.env.META_GRAPH_VERSION ?? "v19.0"}`;
    return {
      messageBaseUrl: () => `${apiBase}/${req("META_PHONE_NUMBER_ID")}`,
      authHeaders: () => ({ Authorization: `Bearer ${req("META_ACCESS_TOKEN")}` }),
      webhookSecret: () => process.env.META_APP_SECRET,
    };
  }
  // default: 360dialog
  return {
    messageBaseUrl: () => process.env.DIALOG360_API_BASE ?? "https://waba-v2.360dialog.io",
    authHeaders: () => ({ "D360-API-KEY": req("DIALOG360_API_KEY") }),
    webhookSecret: () => process.env.DIALOG360_WEBHOOK_SECRET,
  };
}
```

- [ ] **Step 2: Write the failing test**

`verify.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createHmac } from "node:crypto";
import { verifyChallenge, verifySignature } from "./verify";

beforeEach(() => {
  process.env.WHATSAPP_PROVIDER = "360dialog";
  process.env.WHATSAPP_VERIFY_TOKEN = "verify-tok";
  process.env.DIALOG360_WEBHOOK_SECRET = "shh";
  delete process.env.VERCEL_ENV;
  process.env.NODE_ENV = "test";
});

describe("verifyChallenge", () => {
  it("echoes the challenge on a correct token", () => {
    const url = new URL("https://x/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify-tok&hub.challenge=42");
    expect(verifyChallenge(url)).toEqual({ ok: true, challenge: "42" });
  });
  it("rejects a wrong token", () => {
    const url = new URL("https://x/?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=42");
    expect(verifyChallenge(url).ok).toBe(false);
  });
});

describe("verifySignature", () => {
  it("accepts a correctly signed body", () => {
    const body = '{"a":1}';
    const sig = "sha256=" + createHmac("sha256", "shh").update(body, "utf-8").digest("hex");
    expect(verifySignature(body, sig)).toEqual({ ok: true });
  });
  it("rejects a tampered body", () => {
    const sig = "sha256=" + createHmac("sha256", "shh").update("{}", "utf-8").digest("hex");
    expect(verifySignature('{"a":2}', sig).ok).toBe(false);
  });
  it("skips when no secret in non-production", () => {
    delete process.env.DIALOG360_WEBHOOK_SECRET;
    expect(verifySignature("{}", null).ok).toBe("skipped");
  });
});
```

- [ ] **Step 2b: Run to verify it fails**

Run: `cd apps/glyph && npx vitest run src/lib/whatsapp/verify.test.ts`
Expected: FAIL ("Cannot find module './verify'").

- [ ] **Step 3: Write verify.ts**

```ts
import { createHmac, timingSafeEqual } from "node:crypto";
import { getProvider } from "./provider";

export function verifyChallenge(url: URL): { ok: true; challenge: string } | { ok: false; reason: string } {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode !== "subscribe") return { ok: false, reason: `unexpected hub.mode: ${mode}` };
  if (!process.env.WHATSAPP_VERIFY_TOKEN) return { ok: false, reason: "WHATSAPP_VERIFY_TOKEN not configured" };
  if (token !== process.env.WHATSAPP_VERIFY_TOKEN) return { ok: false, reason: "verify token mismatch" };
  if (!challenge) return { ok: false, reason: "missing hub.challenge" };
  return { ok: true, challenge };
}

export type SignatureVerificationResult =
  | { ok: true }
  | { ok: false; reason: string }
  | { ok: "skipped"; reason: string };

function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

export function verifySignature(rawBody: string, signatureHeader: string | null): SignatureVerificationResult {
  const secret = getProvider().webhookSecret();
  const secretName = process.env.WHATSAPP_PROVIDER === "meta" ? "META_APP_SECRET" : "DIALOG360_WEBHOOK_SECRET";
  if (!secret) {
    if (isProduction()) return { ok: false, reason: `${secretName} not set — required in production` };
    return { ok: "skipped", reason: `${secretName} not set — signature check skipped (non-production)` };
  }
  if (!signatureHeader) return { ok: false, reason: "missing X-Hub-Signature-256 header" };
  const expected = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : signatureHeader;
  const computed = createHmac("sha256", secret).update(rawBody, "utf-8").digest("hex");
  if (expected.length !== computed.length) return { ok: false, reason: "signature length mismatch" };
  const equal = timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(computed, "hex"));
  return equal ? { ok: true } : { ok: false, reason: "signature mismatch" };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `cd apps/glyph && npx vitest run src/lib/whatsapp/verify.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/glyph/src/lib/whatsapp/provider.ts apps/glyph/src/lib/whatsapp/verify.ts apps/glyph/src/lib/whatsapp/verify.test.ts
git commit -m "feat(whatsapp): provider config + challenge/signature verification"
```

---

### Task 4: Outbound sendText

**Files:**
- Create: `apps/glyph/src/lib/whatsapp/send.ts`

(Network integration — covered by the Task 12 smoke, not a unit test.)

- [ ] **Step 1: Write send.ts**

```ts
import { getProvider } from "./provider";

export interface SendResult {
  messageId: string;
  raw: unknown;
}

export interface SendTextOptions {
  /** E.164 without '+', matches WA wa_id, e.g. '8801XXXXXXXXX'. */
  to: string;
  body: string;
  replyToMessageId?: string;
  previewUrl?: boolean;
}

export async function sendText(opts: SendTextOptions): Promise<SendResult> {
  const provider = getProvider();
  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: opts.to,
    type: "text",
    text: { body: opts.body, ...(opts.previewUrl !== undefined ? { preview_url: opts.previewUrl } : {}) },
    ...(opts.replyToMessageId ? { context: { message_id: opts.replyToMessageId } } : {}),
  };
  const res = await fetch(`${provider.messageBaseUrl()}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...provider.authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WA send failed: ${res.status} ${res.statusText} — ${body}`);
  }
  const json = (await res.json()) as { messages?: { id: string }[] };
  const messageId = json.messages?.[0]?.id;
  if (!messageId) throw new Error(`WA send returned no message ID: ${JSON.stringify(json)}`);
  return { messageId, raw: json };
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/glyph/src/lib/whatsapp/send.ts
git commit -m "feat(whatsapp): outbound sendText"
```

---

### Task 5: The 24h window helpers (pure)

**Files:**
- Create: `apps/glyph/src/lib/whatsapp/window.ts`
- Test: `apps/glyph/src/lib/whatsapp/window.test.ts`

- [ ] **Step 1: Write the failing test**

`window.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { WA_WINDOW_MS, isWindowOpen, nextWindowExpiry } from "./window";

describe("window", () => {
  const now = new Date("2026-06-14T12:00:00Z");
  it("is open when expiry is in the future", () => {
    expect(isWindowOpen(new Date("2026-06-14T20:00:00Z"), now)).toBe(true);
  });
  it("is closed when expiry has passed or is null", () => {
    expect(isWindowOpen(new Date("2026-06-14T11:00:00Z"), now)).toBe(false);
    expect(isWindowOpen(null, now)).toBe(false);
  });
  it("nextWindowExpiry is 24h out", () => {
    expect(nextWindowExpiry(now).getTime()).toBe(now.getTime() + WA_WINDOW_MS);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/glyph && npx vitest run src/lib/whatsapp/window.test.ts`
Expected: FAIL ("Cannot find module './window'").

- [ ] **Step 3: Write window.ts**

```ts
/** WhatsApp 24-hour customer-service window — the gate for free-form sends. */
export const WA_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isWindowOpen(expiresAt: Date | string | null | undefined, now: Date): boolean {
  if (!expiresAt) return false;
  const t = typeof expiresAt === "string" ? new Date(expiresAt).getTime() : expiresAt.getTime();
  return t > now.getTime();
}

export function nextWindowExpiry(now: Date): Date {
  return new Date(now.getTime() + WA_WINDOW_MS);
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `cd apps/glyph && npx vitest run src/lib/whatsapp/window.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/glyph/src/lib/whatsapp/window.ts apps/glyph/src/lib/whatsapp/window.test.ts
git commit -m "feat(whatsapp): 24h window helpers"
```

---

### Task 6: Identity binding (code generate + extract + redeem)

**Files:**
- Create: `apps/glyph/src/lib/whatsapp/binding.ts`
- Test: `apps/glyph/src/lib/whatsapp/binding.test.ts`

The pure pieces (`generateBindCode`, `extractBindCode`) are unit-tested. The DB ops (`createBindCode`, `redeemBindCode`, `resolveLinkByWaId`) take an admin client and are covered by the Task 12 smoke.

- [ ] **Step 1: Write the failing test**

`binding.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateBindCode, extractBindCode } from "./binding";

describe("generateBindCode", () => {
  it("is 6 digits", () => {
    for (let i = 0; i < 20; i++) expect(generateBindCode()).toMatch(/^\d{6}$/);
  });
});

describe("extractBindCode", () => {
  it("pulls a 6-digit code out of arbitrary text", () => {
    expect(extractBindCode("আমার কোড 482910")).toBe("482910");
    expect(extractBindCode("482910")).toBe("482910");
  });
  it("returns null when there is no 6-digit group", () => {
    expect(extractBindCode("hello")).toBeNull();
    expect(extractBindCode("12345")).toBeNull(); // too short
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/glyph && npx vitest run src/lib/whatsapp/binding.test.ts`
Expected: FAIL ("Cannot find module './binding'").

- [ ] **Step 3: Write binding.ts**

```ts
import { randomInt } from "node:crypto";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** A pending bind code is valid for 30 minutes — long enough to scan at the desk. */
export const BIND_CODE_TTL_MS = 30 * 60 * 1000;

/** 6-digit numeric one-time code. */
export function generateBindCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** First standalone 6-digit group in arbitrary text, or null. */
export function extractBindCode(text: string): string | null {
  const m = text.match(/(?<!\d)(\d{6})(?!\d)/);
  return m ? m[1] : null;
}

/** Issue a pending link row carrying a fresh code. Returns the code. */
export async function createBindCode(
  admin: Admin,
  patientId: string,
  doctorId: string,
  nowMs: number,
): Promise<{ code: string }> {
  const code = generateBindCode();
  const { error } = await admin.from("whatsapp_links").insert({
    patient_id: patientId,
    bind_code: code,
    bind_code_expires_at: new Date(nowMs + BIND_CODE_TTL_MS).toISOString(),
    created_by_doctor_id: doctorId,
  });
  if (error) throw new Error(`createBindCode failed: ${error.message}`);
  return { code };
}

/** Redeem a code: match a pending, unexpired row → bind wa_id + verify. */
export async function redeemBindCode(
  admin: Admin,
  waId: string,
  code: string,
  nowIso: string,
): Promise<{ patientId: string } | null> {
  const { data: pending } = await admin
    .from("whatsapp_links")
    .select("id, patient_id, bind_code_expires_at")
    .eq("bind_code", code)
    .is("verified_at", null)
    .eq("revoked", false)
    .maybeSingle();
  if (!pending || !pending.bind_code_expires_at || pending.bind_code_expires_at < nowIso) return null;

  // Revoke any prior active link for this wa_id (re-bind to a new patient).
  await admin.from("whatsapp_links").update({ revoked: true }).eq("wa_id", waId).eq("revoked", false);

  const { error } = await admin
    .from("whatsapp_links")
    .update({ wa_id: waId, verified_at: nowIso, bind_code: null })
    .eq("id", pending.id);
  if (error) throw new Error(`redeemBindCode failed: ${error.message}`);
  return { patientId: pending.patient_id as string };
}

/** The active verified patient for a wa_id, or null. */
export async function resolveLinkByWaId(admin: Admin, waId: string): Promise<{ patientId: string } | null> {
  const { data } = await admin
    .from("whatsapp_links")
    .select("patient_id")
    .eq("wa_id", waId)
    .not("verified_at", "is", null)
    .eq("revoked", false)
    .maybeSingle();
  return data ? { patientId: data.patient_id as string } : null;
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `cd apps/glyph && npx vitest run src/lib/whatsapp/binding.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/glyph/src/lib/whatsapp/binding.ts apps/glyph/src/lib/whatsapp/binding.test.ts
git commit -m "feat(whatsapp): identity binding (code generate/extract/redeem)"
```

---

### Task 7: The router (pure decision)

**Files:**
- Create: `apps/glyph/src/lib/whatsapp/router.ts`
- Test: `apps/glyph/src/lib/whatsapp/router.test.ts`

- [ ] **Step 1: Write the failing test**

`router.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { decideRoute } from "./router";
import type { NormalizedInbound } from "./types";

function inbound(partial: Partial<NormalizedInbound>): NormalizedInbound {
  return {
    channel: "whatsapp",
    providerMessageId: "m1",
    fromWaId: "8801711000000",
    receivedAt: new Date("2026-06-14T12:00:00Z"),
    kind: "text",
    text: "",
    raw: {},
    ...partial,
  };
}

describe("decideRoute", () => {
  it("bound patient text → reply (Leg A echo)", () => {
    const a = decideRoute(inbound({ text: "hello" }), { bound: true });
    expect(a.kind).toBe("reply");
  });
  it("unbound + a 6-digit code → bind", () => {
    const a = decideRoute(inbound({ text: "my code 482910" }), { bound: false });
    expect(a).toEqual({ kind: "bind", code: "482910" });
  });
  it("unbound + no code → onboard", () => {
    expect(decideRoute(inbound({ text: "hi" }), { bound: false }).kind).toBe("onboard");
  });
  it("unhandled kind → ignore", () => {
    expect(decideRoute(inbound({ kind: "unhandled" }), { bound: true }).kind).toBe("ignore");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/glyph && npx vitest run src/lib/whatsapp/router.test.ts`
Expected: FAIL ("Cannot find module './router'").

- [ ] **Step 3: Write router.ts**

```ts
import type { NormalizedInbound } from "./types";
import { extractBindCode } from "./binding";

export type RouteAction =
  | { kind: "ignore"; reason: string }
  | { kind: "onboard" }
  | { kind: "bind"; code: string }
  | { kind: "reply"; text: string };

export interface RouteContext {
  bound: boolean;
}

/**
 * Pure routing for Leg A. Bound patients get an echo placeholder (Leg B
 * replaces this with triage/wallet routing). Unbound numbers are offered the
 * binding/onboarding path only — never auto-registered (self-reg is deferred).
 */
export function decideRoute(inbound: NormalizedInbound, ctx: RouteContext): RouteAction {
  if (inbound.kind === "unhandled") return { kind: "ignore", reason: "unhandled message type" };

  if (!ctx.bound) {
    const code = inbound.kind === "text" ? extractBindCode(inbound.text) : null;
    return code ? { kind: "bind", code } : { kind: "onboard" };
  }

  // Bound. Leg A: echo. (Leg B routes to triage / wallet / etc.)
  return { kind: "reply", text: inbound.text || "" };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `cd apps/glyph && npx vitest run src/lib/whatsapp/router.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/glyph/src/lib/whatsapp/router.ts apps/glyph/src/lib/whatsapp/router.test.ts
git commit -m "feat(whatsapp): pure router decision"
```

---

### Task 8: Conversation store + processInbound orchestration

**Files:**
- Create: `apps/glyph/src/lib/whatsapp/process.ts`

Glues the pure pieces to the DB and the channel. Covered by the Task 12 smoke (it needs a live admin client + the sandbox number).

- [ ] **Step 1: Write process.ts**

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import type { NormalizedInbound } from "./types";
import { decideRoute } from "./router";
import { resolveLinkByWaId, redeemBindCode } from "./binding";
import { sendText } from "./send";
import { isWindowOpen, nextWindowExpiry } from "./window";

type Admin = ReturnType<typeof createAdminClient>;

const ONBOARD_MSG =
  "আসসালামু আলাইকুম। এটি Glyph। আপনার রেকর্ড দেখতে ক্লিনিক থেকে পাওয়া কোডটি এখানে পাঠান। " +
  "কোড না থাকলে আপনার ডাক্তারের কাছে চান।";
const BIND_OK_MSG =
  "ধন্যবাদ — আপনার নম্বর যুক্ত হয়েছে। এখন থেকে এখানেই আপনার তথ্য পাবেন।";
const BIND_FAIL_MSG =
  "কোডটি কাজ করছে না বা মেয়াদ শেষ। ক্লিনিক থেকে নতুন কোড নিন।";

/**
 * Process one inbound message end to end. Idempotency is the caller's job (the
 * webhook dedupes by provider_message_id before calling this).
 */
export async function processInbound(admin: Admin, inbound: NormalizedInbound, now: Date): Promise<void> {
  const link = await resolveLinkByWaId(admin, inbound.fromWaId);
  const action = decideRoute(inbound, { bound: !!link });

  let replyText: string | null = null;
  let patientId: string | null = link?.patientId ?? null;

  if (action.kind === "ignore") {
    // no reply
  } else if (action.kind === "onboard") {
    replyText = ONBOARD_MSG;
  } else if (action.kind === "bind") {
    const redeemed = await redeemBindCode(admin, inbound.fromWaId, action.code, now.toISOString());
    if (redeemed) {
      patientId = redeemed.patientId;
      replyText = BIND_OK_MSG;
    } else {
      replyText = BIND_FAIL_MSG;
    }
  } else if (action.kind === "reply") {
    replyText = `Glyph (Leg A echo): ${action.text}`;
  }

  // Inbound refreshes the 24h window.
  await upsertConversation(admin, inbound.fromWaId, patientId, nextWindowExpiry(now));

  if (replyText) {
    await sendReply(admin, inbound.fromWaId, patientId, replyText, now);
  }

  // Mark the inbound row done (the webhook inserted it as 'received').
  await admin
    .from("wa_messages")
    .update({ status: "done", patient_id: patientId })
    .eq("provider_message_id", inbound.providerMessageId);
}

async function upsertConversation(admin: Admin, waId: string, patientId: string | null, windowExpiry: Date) {
  await admin
    .from("wa_conversations")
    .upsert(
      { wa_id: waId, patient_id: patientId, window_expires_at: windowExpiry.toISOString(), updated_at: new Date().toISOString() },
      { onConflict: "wa_id" },
    );
}

/**
 * The single send chokepoint. Leg A only sends inside an open window (every
 * reply here is a direct response to an inbound, so the window is always open).
 * Leg D adds the template path for closed-window proactive sends.
 */
async function sendReply(admin: Admin, waId: string, patientId: string | null, text: string, now: Date) {
  const { data: convo } = await admin
    .from("wa_conversations")
    .select("window_expires_at")
    .eq("wa_id", waId)
    .maybeSingle();
  if (!isWindowOpen(convo?.window_expires_at ?? null, now)) {
    // Should never happen in Leg A (we just refreshed it); guard anyway.
    await logOutbound(admin, waId, patientId, "text", "failed", null, "window closed (no template path in Leg A)");
    return;
  }
  try {
    const sent = await sendText({ to: waId, body: text });
    await logOutbound(admin, waId, patientId, "text", "sent", sent.messageId, null);
  } catch (err) {
    await logOutbound(admin, waId, patientId, "text", "failed", null, err instanceof Error ? err.message : String(err));
  }
}

async function logOutbound(
  admin: Admin,
  waId: string,
  patientId: string | null,
  kind: string,
  status: string,
  providerMessageId: string | null,
  error: string | null,
) {
  await admin.from("wa_messages").insert({
    provider_message_id: providerMessageId,
    direction: "outbound",
    wa_id: waId,
    patient_id: patientId,
    kind,
    status,
    error,
  });
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/glyph/src/lib/whatsapp/process.ts
git commit -m "feat(whatsapp): conversation store + processInbound orchestration"
```

---

### Task 9: The webhook route (GET challenge + POST ingest)

**Files:**
- Create: `apps/glyph/src/app/api/whatsapp/webhook/route.ts`

- [ ] **Step 1: Write the route**

```ts
/**
 * WhatsApp inbound webhook.
 *   GET  — Meta/360dialog verification challenge.
 *   POST — verify signature → dedupe (unique provider_message_id) → persist
 *          inbound 'received' → 200 fast → process via after().
 * A sweeper cron retries anything stuck in 'received'.
 */
import { NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyChallenge, verifySignature } from "@/lib/whatsapp/verify";
import { extractInbound } from "@/lib/whatsapp/parse";
import { processInbound } from "@/lib/whatsapp/process";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const result = verifyChallenge(new URL(req.url));
  if (!result.ok) return new NextResponse(result.reason, { status: 403 });
  return new NextResponse(result.challenge, { status: 200 });
}

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = verifySignature(raw, req.headers.get("x-hub-signature-256"));
  if (sig.ok === false) {
    console.warn("[wa/webhook] signature rejected:", sig.reason);
    return new NextResponse("forbidden", { status: 401 });
  }
  if (sig.ok === "skipped") console.warn("[wa/webhook]", sig.reason);

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }

  const admin = createAdminClient();
  const fresh: string[] = [];
  for (const msg of extractInbound(payload as Parameters<typeof extractInbound>[0])) {
    // Dedupe: unique provider_message_id. On conflict, this is a redelivery.
    const { error } = await admin.from("wa_messages").insert({
      provider_message_id: msg.providerMessageId,
      direction: "inbound",
      wa_id: msg.fromWaId,
      kind: msg.kind,
      status: "received",
      payload: msg.raw as never,
    });
    if (!error) fresh.push(msg.providerMessageId);
  }

  // Ack fast; process out of band.
  after(async () => {
    const adminBg = createAdminClient();
    for (const msg of extractInbound(payload as Parameters<typeof extractInbound>[0])) {
      if (!fresh.includes(msg.providerMessageId)) continue;
      try {
        await processInbound(adminBg, msg, new Date());
      } catch (err) {
        console.error("[wa/webhook] process failed:", msg.providerMessageId, err);
        await adminBg.from("wa_messages").update({ status: "failed", error: String(err) }).eq("provider_message_id", msg.providerMessageId);
      }
    }
  });

  return new NextResponse("ok", { status: 200 });
}
```

- [ ] **Step 2: Type-check + build**

Run: `npm run type-check && npm run build`
Expected: PASS; build output lists `ƒ /api/whatsapp/webhook`.

- [ ] **Step 3: Commit**

```bash
git add apps/glyph/src/app/api/whatsapp/webhook/route.ts
git commit -m "feat(whatsapp): inbound webhook (challenge + dedupe + queue + after)"
```

---

### Task 10: Bind-code issuance route (doctor session)

**Files:**
- Create: `apps/glyph/src/app/api/whatsapp/bind-code/route.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add env**

Append to `.env.example`:

```
# === WhatsApp bridge (Leg A) ===
WHATSAPP_PROVIDER=360dialog
DIALOG360_API_KEY=
DIALOG360_API_BASE=https://waba-v2.360dialog.io
DIALOG360_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
DIALOG360_WEBHOOK_SECRET=
# The display number patients message, E.164 no '+', for the wa.me bind link.
GLYPH_WA_NUMBER=
```

- [ ] **Step 2: Write the route**

```ts
/**
 * Issue a one-time WhatsApp bind code for a patient (doctor session). The
 * tablet renders the returned wa.me link as a QR; the patient scans it, which
 * pre-fills the code, and on send their number binds to this patient.
 */
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { createBindCode } from "@/lib/whatsapp/binding";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ success: false, error: "Missing authorization header" }, { status: 401 });

  const userClient = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const patientId = typeof body.patientId === "string" ? body.patientId : null;
  if (!patientId) return NextResponse.json({ success: false, error: "patientId is required" }, { status: 400 });

  // Scope check through RLS: the patient must be in the doctor's clinic.
  const { data: patient } = await userClient.from("patients").select("id").eq("id", patientId).maybeSingle();
  if (!patient) return NextResponse.json({ success: false, error: "Patient not found in your clinic" }, { status: 404 });

  const glyphNumber = process.env.GLYPH_WA_NUMBER;
  if (!glyphNumber) return NextResponse.json({ success: false, error: "GLYPH_WA_NUMBER not configured" }, { status: 500 });

  const admin = createAdminClient();
  const { code } = await createBindCode(admin, patientId, user.id, Date.now());
  const prefill = encodeURIComponent(`Glyph কোড: ${code}`);
  const waLink = `https://wa.me/${glyphNumber}?text=${prefill}`;
  return NextResponse.json({ success: true, code, waLink });
}
```

- [ ] **Step 3: Type-check + build**

Run: `npm run type-check && npm run build`
Expected: PASS; build lists `ƒ /api/whatsapp/bind-code`.

- [ ] **Step 4: Commit**

```bash
git add apps/glyph/src/app/api/whatsapp/bind-code/route.ts .env.example
git commit -m "feat(whatsapp): doctor-session bind-code issuance + wa.me link"
```

---

### Task 11: Sweeper cron (retry stuck inbound)

**Files:**
- Create: `apps/glyph/src/app/api/cron/whatsapp-sweeper/route.ts`
- Modify: `apps/glyph/vercel.json` (create if absent)

- [ ] **Step 1: Write the sweeper route**

```ts
/**
 * Sweeper — retries inbound rows stuck in 'received' for > 2 minutes (a webhook
 * crash before after() finished). Idempotent: claims 'received' → 'processing'
 * before re-running. Cron auth via CRON_SECRET (Vercel sets the header).
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processInbound } from "@/lib/whatsapp/process";
import type { NormalizedInbound } from "@/lib/whatsapp/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: stuck } = await admin
    .from("wa_messages")
    .select("provider_message_id, wa_id, kind, payload")
    .eq("direction", "inbound")
    .eq("status", "received")
    .lt("created_at", cutoff)
    .limit(50);

  let retried = 0;
  for (const row of stuck ?? []) {
    const claim = await admin
      .from("wa_messages")
      .update({ status: "processing" })
      .eq("provider_message_id", row.provider_message_id)
      .eq("status", "received")
      .select("provider_message_id")
      .maybeSingle();
    if (!claim.data) continue; // lost the race
    const inbound = row.payload as unknown as NormalizedInbound;
    // payload stored message.raw; reconstruct the minimum NormalizedInbound fields:
    const normalized: NormalizedInbound = {
      channel: "whatsapp",
      providerMessageId: row.provider_message_id as string,
      fromWaId: row.wa_id as string,
      receivedAt: new Date(),
      kind: row.kind as NormalizedInbound["kind"],
      text: (inbound as { text?: { body?: string } })?.text?.body ?? "",
      raw: inbound,
    };
    try {
      await processInbound(admin, normalized, new Date());
      retried++;
    } catch (err) {
      await admin.from("wa_messages").update({ status: "failed", error: String(err) }).eq("provider_message_id", row.provider_message_id);
    }
  }
  return NextResponse.json({ ok: true, retried });
}
```

> Note: the sweeper reconstructs text from the stored raw payload. Since Leg A
> stores `message.raw` (the provider message) in `payload`, text lives at
> `payload.text.body`. This is a deliberate, narrow reconstruction; media flows
> (Leg C) extend it.

- [ ] **Step 2: Register the cron**

`apps/glyph/vercel.json` (create or merge):

```json
{
  "crons": [
    { "path": "/api/cron/whatsapp-sweeper", "schedule": "* * * * *" }
  ]
}
```

- [ ] **Step 3: Type-check + build**

Run: `npm run type-check && npm run build`
Expected: PASS; build lists `ƒ /api/cron/whatsapp-sweeper`.

- [ ] **Step 4: Commit**

```bash
git add apps/glyph/src/app/api/cron/whatsapp-sweeper/route.ts apps/glyph/vercel.json
git commit -m "feat(whatsapp): sweeper cron for stuck inbound"
```

---

### Task 12: Sandbox smoke (E2E)

**Files:**
- Create: `scripts/smoke-whatsapp.mjs`

Verifies the bind→bound flow against the DB without needing real WhatsApp delivery: it simulates an inbound POST to the local/preview webhook and asserts the link + conversation + outbound-log state. (Real send is exercised manually against the 360dialog sandbox once `DIALOG360_API_KEY` is set — see the run note.)

- [ ] **Step 1: Write the smoke**

```js
/**
 * Pocket WhatsApp bridge (Leg A) smoke. Drives the webhook the way 360dialog
 * would, asserting the binding + conversation + message-log state. No real WA
 * delivery (outbound send will fail without DIALOG360_API_KEY and is logged
 * 'failed' — that is expected in this DB-only smoke; the bind/route/persist
 * path is what we assert).
 *
 * usage: node scripts/smoke-whatsapp.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>
 */
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const [appUrl, supaUrl, serviceKey] = process.argv.slice(2);
if (!appUrl || !supaUrl || !serviceKey) {
  console.error("usage: node scripts/smoke-whatsapp.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>");
  process.exit(2);
}
const base = appUrl.replace(/\/$/, "");
const admin = createClient(supaUrl, serviceKey, { auth: { persistSession: false } });
let failures = 0;
const check = (label, ok, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${String(detail).slice(0, 160)}` : ""}`); if (!ok) failures++; };

const waId = `8801${randomInt(100000000, 999999999)}`;
const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

function inboundPayload(text, id) {
  return { entry: [{ changes: [{ value: {
    contacts: [{ wa_id: waId, profile: { name: "Smoke" } }],
    messages: [{ id, from: waId, timestamp: "1700000000", type: "text", text: { body: text } }],
  } }] }] };
}
async function post(payload) {
  return fetch(`${base}/api/whatsapp/webhook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

// Provision a throwaway clinic + patient + a pending bind code.
const { data: clinic } = await admin.from("clinics").insert({ name: "WA Smoke Clinic" }).select().single();
const { data: patient } = await admin.from("patients").insert({ clinic_id: clinic.id, name: "WA Smoke", phone: `019${randomInt(10000000, 99999999)}`, age: 40, gender: "male" }).select().single();
await admin.from("whatsapp_links").insert({ patient_id: patient.id, bind_code: code, bind_code_expires_at: new Date(Date.now() + 600000).toISOString() });

try {
  // 1. Unknown number, no code → onboard (no link created).
  const r1 = await post(inboundPayload("hello", `wamid.${code}.a`));
  check("webhook 200 for onboarding message", r1.status === 200, r1.status);
  await new Promise((r) => setTimeout(r, 2500)); // let after() run
  const { data: l0 } = await admin.from("whatsapp_links").select("verified_at").eq("patient_id", patient.id).maybeSingle();
  check("no binding yet (onboard only)", !l0?.verified_at);

  // 2. Send the code → binds.
  const r2 = await post(inboundPayload(`Glyph কোড: ${code}`, `wamid.${code}.b`));
  check("webhook 200 for bind message", r2.status === 200, r2.status);
  await new Promise((r) => setTimeout(r, 2500));
  const { data: link } = await admin.from("whatsapp_links").select("wa_id, verified_at, revoked").eq("patient_id", patient.id).maybeSingle();
  check("link verified + bound to wa_id", link?.wa_id === waId && !!link?.verified_at && !link?.revoked, JSON.stringify(link));

  // 3. Conversation row + window set.
  const { data: convo } = await admin.from("wa_conversations").select("patient_id, window_expires_at").eq("wa_id", waId).maybeSingle();
  check("conversation bound + window open", convo?.patient_id === patient.id && new Date(convo.window_expires_at) > new Date(), JSON.stringify(convo));

  // 4. Idempotency: replay the bind message → no duplicate inbound row.
  await post(inboundPayload(`Glyph কোড: ${code}`, `wamid.${code}.b`));
  await new Promise((r) => setTimeout(r, 1500));
  const { count } = await admin.from("wa_messages").select("*", { count: "exact", head: true }).eq("provider_message_id", `wamid.${code}.b`);
  check("redelivery deduped (1 inbound row)", count === 1, `count=${count}`);
} finally {
  await admin.from("wa_messages").delete().eq("wa_id", waId);
  await admin.from("wa_conversations").delete().eq("wa_id", waId);
  await admin.from("whatsapp_links").delete().eq("patient_id", patient.id);
  await admin.from("patients").delete().eq("id", patient.id);
  await admin.from("clinics").delete().eq("id", clinic.id);
  console.log("cleanup done");
}

console.log(failures === 0 ? "\nALL CHECKS PASSED — WhatsApp bridge Leg A wired" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 2: Run the smoke against a preview/local deploy**

Run (against a deploy with the new code; outbound send 'failed' rows are expected without `DIALOG360_API_KEY`):
`node scripts/smoke-whatsapp.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>`
Expected: `ALL CHECKS PASSED`.

> Real outbound delivery is verified manually once the founder provisions the
> sandbox/production `DIALOG360_API_KEY` + `GLYPH_WA_NUMBER`: register the
> webhook URL in the 360dialog Hub (it hits GET → 200 challenge), send the bind
> code from a real WhatsApp, and confirm the "যুক্ত হয়েছে" reply arrives.

- [ ] **Step 3: Run the full unit suite + commit**

Run: `npm run test && npm run type-check && npm run lint`
Expected: all green (parse/verify/window/binding/router suites pass).

```bash
git add scripts/smoke-whatsapp.mjs
git commit -m "test(whatsapp): Leg A sandbox smoke"
```

---

### Task 13: Docs

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md**

Add migration 008 to the migrations list (§3), the `whatsapp/` lib + the three new routes to the tree, and a one-line note in §7 env table for the `DIALOG360_*` / `WHATSAPP_VERIFY_TOKEN` / `GLYPH_WA_NUMBER` vars. Note the bridge is Leg A (skeleton) of the spec at `docs/superpowers/specs/2026-06-14-glyph-whatsapp-bridge-design.md`.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: WhatsApp bridge Leg A in CLAUDE.md"
```

---

## Self-review

**Spec coverage (Leg A rows of the spec):**
- Port channel modules → Tasks 2–4 (types/parse/provider/verify/send). ✓ (audio port deferred to Leg C, where it is used — noted in scope.)
- Webhook + signature verify → Task 9 / Task 3. ✓
- Inbound queue + dedupe + after() + sweeper → Tasks 9, 11. ✓
- Conversation store → Tasks 1, 8. ✓
- Identity binding (QR one-time code) → Tasks 6, 10. ✓
- Consent-first onboarding (unknown number → offered binding only, never auto-registered) → Tasks 7, 8 (`onboard`). ✓
- Window mechanic (first-class) → Tasks 5, 8 (`sendReply` guard). ✓
- RLS deny-all tables → Task 1. ✓
- Sandbox smoke + unit tests → Task 12 + per-task tests. ✓
- NOT in Leg A (correctly absent): `sendTemplate`, `scheduled_messages`, `visits.next_appointment_at`, triage/wallet/extract routing, media/voice. These are Legs B–D.

**Placeholder scan:** No TBD/TODO; every code step has complete code; every test step has real assertions. ✓

**Type consistency:** `NormalizedInbound` (Task 2) is consumed unchanged by `decideRoute` (Task 7), `processInbound` (Task 8), webhook (Task 9), sweeper (Task 11). `RouteAction` kinds (`ignore|onboard|bind|reply`) match between Task 7 and the Task 8 switch. `createBindCode/redeemBindCode/resolveLinkByWaId` signatures (Task 6) match their call sites (Tasks 8, 10). `getProvider().messageBaseUrl/authHeaders/webhookSecret` (Task 3) match `send.ts` (Task 4) and `verify.ts` (Task 3). ✓

**One known integration caveat:** the bridge → edge-function service-to-service auth (`WHATSAPP_BRIDGE_SECRET`, edge fns `--no-verify-jwt`) is **not** exercised in Leg A — Leg A makes no edge-function calls. It first appears in Leg B (triage) / Leg C (extract-document) and is specced there.
