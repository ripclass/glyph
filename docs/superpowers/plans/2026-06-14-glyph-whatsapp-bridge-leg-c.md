# Glyph WhatsApp Bridge — Leg C (Pre-chamber Capture) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A bound patient photographs an old prescription or lab report and sends it on WhatsApp; Glyph asks "প্রেসক্রিপশন না রিপোর্ট?", extracts it through the existing `extract-document` pipeline, and the result waits in the doctor's briefing at the next visit.

**Architecture:** Reuse the entire "plastic bag" pipeline already live on prod — the `extract-document` edge function, the `documents` storage bucket, the `prescriptions`/`lab_reports` tables. Port Juugadu's media-download helper. The only change to a live function is **additive**: `extract-document` gains a service-secret path (`WHATSAPP_BRIDGE_SECRET`, like triage's) and an optional `consentId` so the bridge — which has no doctor JWT and no visit — can call it; the existing intake JWT path is untouched and re-verified with the 16/16 `smoke-documents` suite. The bridge downloads the WhatsApp photo, lands it in the `documents` bucket (service-role), and calls `extract-document` with `consentId` + no `visitId`. A two-step state machine (one-time photo consent → "prescription or lab report?") drives it. Voice is deferred.

**Tech Stack:** Next.js 14.2 App Router (Node), TypeScript, Supabase service-role + Storage, Deno edge function, Vitest. Builds on Legs A+B (`apps/glyph/src/lib/whatsapp/*`) and the document pipeline (migration 004, `extract-document`).

---

## Scope

**Leg C only.** In: image/document capture from a bound patient → photo consent → type question → download → `documents` bucket → `extract-document` (service path) → prescriptions/lab_reports row → ack. **Out** (deferred): voice notes / STT, `sendTemplate`/proactive, `scheduled_messages`, `next_appointment_at`, doctor nudge.

## New env

- **`WHATSAPP_BRIDGE_SECRET`** — shared secret the bridge sends to `extract-document` (set the SAME value in Vercel prod env AND `supabase secrets set`, exactly like `TRIAGE_SHARED_SECRET`). Set at ship time.

## File structure

**Create:**
- `apps/glyph/src/lib/whatsapp/media.ts` — `downloadMedia(mediaId)` → `{bytes, mimeType}`
- `apps/glyph/src/lib/whatsapp/documents.ts` — `captureDocument`, `resolveDocConsent`, `createDocConsent`
- `apps/glyph/src/lib/whatsapp/doc-type.ts` — `DocType` + pure `parseDocType` (+test)
- `apps/glyph/src/lib/whatsapp/media.test.ts` is NOT created (network helper; smoke-covered)

**Modify:**
- `apps/glyph/src/lib/whatsapp/provider.ts` — add `mediaMetadataUrl` + `mediaDownloadHeaders`
- `apps/glyph/src/lib/whatsapp/flow.ts` — `ActiveFlow` + `WaFlowState` gain document states/fields
- `apps/glyph/src/lib/whatsapp/router.ts` (+test) — image/document + document states
- `apps/glyph/src/lib/whatsapp/process.ts` — document handlers
- `supabase/functions/extract-document/index.ts` — service-secret path + optional `consentId`
- `.env.example`, `CLAUDE.md`, `scripts/smoke-whatsapp.mjs`

---

### Task 1: Extend provider + port media download

**Files:**
- Modify: `apps/glyph/src/lib/whatsapp/provider.ts`
- Create: `apps/glyph/src/lib/whatsapp/media.ts`

- [ ] **Step 1: Extend `ProviderConfig` in `provider.ts`.** Add two methods to the `ProviderConfig` interface:
```ts
  /** Metadata URL for a media id (returns a JSON envelope with a signed url). */
  mediaMetadataUrl(mediaId: string): string;
  /** Headers to download the signed media url (Meta: Bearer; 360dialog: D360 key). */
  mediaDownloadHeaders(): Record<string, string>;
```
In the `meta` branch of `getProvider`, add:
```ts
      mediaMetadataUrl: (mediaId) => `${apiBase}/${mediaId}`,
      mediaDownloadHeaders: () => ({ Authorization: `Bearer ${req("META_ACCESS_TOKEN")}` }),
```
In the 360dialog (default) branch, add:
```ts
    mediaMetadataUrl: (mediaId) => `${process.env.DIALOG360_API_BASE ?? "https://waba-v2.360dialog.io"}/${mediaId}`,
    mediaDownloadHeaders: () => ({ "D360-API-KEY": req("DIALOG360_API_KEY") }),
```

- [ ] **Step 2: Create `media.ts`:**
```ts
import { getProvider } from "./provider";

export interface MediaDownload {
  bytes: Uint8Array;
  mimeType: string;
}

/**
 * Download an inbound WhatsApp media object by id. Two hops: GET the metadata
 * (a short-lived signed url) then GET the file. Both need the provider's
 * download headers (360dialog: D360-API-KEY; Meta: Bearer).
 */
export async function downloadMedia(mediaId: string): Promise<MediaDownload> {
  const provider = getProvider();
  const headers = provider.mediaDownloadHeaders();
  const meta = await fetch(provider.mediaMetadataUrl(mediaId), { headers });
  if (!meta.ok) throw new Error(`WA media metadata failed for ${mediaId}: ${meta.status} ${meta.statusText}`);
  const metaJson = (await meta.json()) as { url?: string; mime_type?: string };
  if (!metaJson.url) throw new Error(`WA media metadata missing url for ${mediaId}`);

  const fileRes = await fetch(metaJson.url, { headers });
  if (!fileRes.ok) throw new Error(`WA media download failed: ${fileRes.status} ${fileRes.statusText}`);
  const bytes = new Uint8Array(await fileRes.arrayBuffer());
  return { bytes, mimeType: metaJson.mime_type ?? fileRes.headers.get("content-type") ?? "application/octet-stream" };
}
```

- [ ] **Step 3:** `npm run type-check` — PASS.
- [ ] **Step 4: Commit:**
```bash
git add apps/glyph/src/lib/whatsapp/provider.ts apps/glyph/src/lib/whatsapp/media.ts
git commit -m "feat(whatsapp): provider media URLs + downloadMedia"
```

---

### Task 2: `extract-document` — add the service-secret path + optional consentId

**Files:**
- Modify: `supabase/functions/extract-document/index.ts`

ADDITIVE change. The existing user-JWT path must keep working (verified by `smoke-documents` at ship). Read the file first.

- [ ] **Step 1: Add the service-path auth branch.** Replace the auth block (the `if (!authHeader) ... getUser ...` section, roughly lines 80–94) with:
```ts
    // ── Auth ────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ success: false, error: "Missing authorization header", code: "UNAUTHORIZED" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    // Trusted server-to-server path: the WhatsApp bridge holds a shared secret
    // and has no user JWT (no doctor session, no visit). Any other caller goes
    // through the normal user-JWT validation (the intake document flow).
    const bridgeSecret = Deno.env.get("WHATSAPP_BRIDGE_SECRET");
    const isBridge = !!bridgeSecret && authHeader === `Bearer ${bridgeSecret}`;

    if (!isBridge) {
      const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        return jsonResponse({ success: false, error: "Invalid token", code: "UNAUTHORIZED" }, 401);
      }
    }
```
(Note: the `supabase` user-client is now scoped inside the `if (!isBridge)` block — it was only used for `getUser`. The rest of the function already uses `serviceClient`, so nothing else changes.)

- [ ] **Step 2: Accept an optional `consentId` from the body and prefer it.** In the body parse, add `consentId`:
```ts
    const { imageUrl, type, visitId, patientId, consentId } = await req.json();
```
Then change the egress `consentId` line (inside the `callLLM` egress block) from:
```ts
        consentId: aiConsent?.id,
```
to:
```ts
        consentId: (typeof consentId === "string" ? consentId : undefined) ?? aiConsent?.id,
```

- [ ] **Step 3: Type-safety / deno check.** This is a Deno function (no `npm run type-check`). Confirm the edit is syntactically consistent by re-reading the function; ensure `serviceClient` is still defined before its first use (it is — created after the auth block) and `aiConsent` lookup is unchanged.

- [ ] **Step 4: Commit:**
```bash
git add supabase/functions/extract-document/index.ts
git commit -m "feat(extract-document): bridge service-secret path + optional consentId"
```

> Deploy + the 16/16 `smoke-documents` regression happen at ship time, NOT here.

---

### Task 3: Document-type parser (pure)

**Files:**
- Create: `apps/glyph/src/lib/whatsapp/doc-type.ts`, `doc-type.test.ts`

- [ ] **Step 1: Failing test `doc-type.test.ts`:**
```ts
import { describe, it, expect } from "vitest";
import { parseDocType } from "./doc-type";

describe("parseDocType", () => {
  it("maps prescription answers", () => {
    for (const s of ["১", "1", "প্রেসক্রিপশন", "rx", "Rx", "prescription"]) expect(parseDocType(s)).toBe("prescription");
  });
  it("maps lab report answers", () => {
    for (const s of ["২", "2", "রিপোর্ট", "lab", "report", "ল্যাব"]) expect(parseDocType(s)).toBe("lab_report");
  });
  it("returns null for anything else", () => {
    for (const s of ["", "hi", "৩", "3"]) expect(parseDocType(s)).toBeNull();
  });
});
```
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: `doc-type.ts`:**
```ts
export type DocType = "prescription" | "lab_report";

const RX = ["১", "1", "প্রেসক্রিপশন", "rx", "prescription", "presc"];
const LAB = ["২", "2", "রিপোর্ট", "report", "lab", "ল্যাব", "lab report", "ল্যাব রিপোর্ট"];

/** Map a patient's "1/2/prescription/report" reply to a DocType, or null. */
export function parseDocType(text: string): DocType | null {
  const t = text.trim().toLowerCase().replace(/[।.!?]+$/u, "");
  if (RX.includes(t)) return "prescription";
  if (LAB.includes(t)) return "lab_report";
  return null;
}
```
- [ ] **Step 4: Run → 3 PASS.** **Step 5: Commit:**
```bash
git add apps/glyph/src/lib/whatsapp/doc-type.ts apps/glyph/src/lib/whatsapp/doc-type.test.ts
git commit -m "feat(whatsapp): document-type parser"
```

---

### Task 4: Document capture orchestration + consent helpers

**Files:**
- Create: `apps/glyph/src/lib/whatsapp/documents.ts`

(Network/DB/storage — covered by the Task 7 smoke; type-check here.)

- [ ] **Step 1: Create `documents.ts`:**
```ts
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { downloadMedia } from "./media";
import type { DocType } from "./doc-type";

type Admin = ReturnType<typeof createAdminClient>;

/** Tags the WhatsApp document-upload consent apart from the triage/visit grants. */
const DOC_CONSENT_TAG = "whatsapp_document";

/** The patient's active WhatsApp-document ai_processing consent, or null. */
export async function resolveDocConsent(admin: Admin, patientId: string): Promise<string | null> {
  const { data } = await admin
    .from("consent_records")
    .select("id")
    .eq("patient_id", patientId)
    .eq("consent_type", "ai_processing")
    .eq("granted", true)
    .is("withdrawn_at", null)
    .eq("device_info", DOC_CONSENT_TAG)
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? (data.id as string) : null;
}

/** Record the one-time WhatsApp-document consent (patient-granted). */
export async function createDocConsent(admin: Admin, patientId: string): Promise<string | null> {
  const { data, error } = await admin
    .from("consent_records")
    .insert({ patient_id: patientId, consent_type: "ai_processing", granted: true, granted_by: "patient", device_info: DOC_CONSENT_TAG })
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("[wa/documents] consent insert failed:", error?.code, error?.message);
    return null;
  }
  return data.id as string;
}

export interface CaptureInput {
  patientId: string;
  mediaId: string;
  mimeType: string;
  type: DocType;
  consentId: string;
}

/**
 * Download the WhatsApp photo, store it in the private `documents` bucket
 * (service-role; path keyed on patientId so the clinic's doctor can read it),
 * then call the egress-gated `extract-document` edge function with the bridge
 * secret + consentId + no visitId. The extraction writes the prescription/lab
 * row that surfaces in the next briefing.
 */
export async function captureDocument(admin: Admin, input: CaptureInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const media = await downloadMedia(input.mediaId);
    const ext = media.mimeType.includes("png") ? "png" : media.mimeType.includes("pdf") ? "pdf" : "jpg";
    const path = `${input.patientId}/whatsapp/${input.type}-${randomUUID()}.${ext}`;

    const blob = new Blob([media.bytes], { type: media.mimeType });
    const { error: upErr } = await admin.storage.from("documents").upload(path, blob, { contentType: media.mimeType, upsert: false });
    if (upErr) return { ok: false, error: `upload: ${upErr.message}` };

    const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/extract-document`;
    const resp = await fetch(fnUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.WHATSAPP_BRIDGE_SECRET}` },
      body: JSON.stringify({ imageUrl: path, type: input.type, patientId: input.patientId, consentId: input.consentId }),
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json?.success) return { ok: false, error: `extract: ${resp.status} ${json?.error ?? ""}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
```
- [ ] **Step 2:** `npm run type-check` — PASS.
- [ ] **Step 3: Commit:**
```bash
git add apps/glyph/src/lib/whatsapp/documents.ts
git commit -m "feat(whatsapp): document capture orchestration + consent helpers"
```

---

### Task 5: Flow + router for the document states

**Files:**
- Modify: `apps/glyph/src/lib/whatsapp/flow.ts`, `router.ts`, `router.test.ts`

- [ ] **Step 1: `flow.ts`.** Change the `ActiveFlow` type to:
```ts
export type ActiveFlow = "idle" | "triage" | "awaiting_triage_consent" | "awaiting_document_consent" | "awaiting_document_type";
```
Add two optional fields to `WaFlowState`:
```ts
  /** A WhatsApp media id stashed while awaiting photo consent / type. */
  pendingMediaId?: string;
  pendingMimeType?: string;
```

- [ ] **Step 2: Update `router.test.ts`.** Add inside the `describe("decideRoute", ...)` block:
```ts
  it("bound idle + image → document_received", () => {
    const a = decideRoute(inbound({ kind: "image", mediaId: "m-1", mediaMimeType: "image/jpeg" }), idle);
    expect(a).toEqual({ kind: "document_received", mediaId: "m-1", mimeType: "image/jpeg" });
  });
  it("bound idle + document → document_received", () => {
    expect(decideRoute(inbound({ kind: "document", mediaId: "d-1", mediaMimeType: "application/pdf" }), idle).kind).toBe("document_received");
  });
  it("awaiting doc consent + yes → document_consent_reply agreed", () => {
    expect(decideRoute(inbound({ text: "হ্যাঁ" }), { bound: true, activeFlow: "awaiting_document_consent" })).toEqual({ kind: "document_consent_reply", agreed: true });
  });
  it("awaiting doc type + '১' → document_type_reply prescription", () => {
    expect(decideRoute(inbound({ text: "১" }), { bound: true, activeFlow: "awaiting_document_type" })).toEqual({ kind: "document_type_reply", docType: "prescription" });
  });
  it("awaiting doc type + junk → document_type_reply null", () => {
    expect(decideRoute(inbound({ text: "asdf" }), { bound: true, activeFlow: "awaiting_document_type" })).toEqual({ kind: "document_type_reply", docType: null });
  });
  it("mid-triage + image → help (don't interrupt triage)", () => {
    expect(decideRoute(inbound({ kind: "image", mediaId: "m" }), { bound: true, activeFlow: "triage" }).kind).toBe("help");
  });
```
- [ ] **Step 3: Run → FAIL.**
- [ ] **Step 4: Update `router.ts`.** Add the new `RouteAction` members:
```ts
  | { kind: "document_received"; mediaId: string; mimeType: string }
  | { kind: "document_consent_reply"; agreed: boolean }
  | { kind: "document_type_reply"; docType: DocType | null }
```
Add imports: `import { parseDocType, type DocType } from "./doc-type";`
In `decideRoute`, in the bound section, add these two state handlers ALONGSIDE the existing `awaiting_triage_consent`/`triage` handlers (before the idle block):
```ts
  if (ctx.activeFlow === "awaiting_document_consent") {
    if (inbound.kind !== "text") return { kind: "help" };
    return { kind: "document_consent_reply", agreed: isAffirmative(inbound.text) };
  }
  if (ctx.activeFlow === "awaiting_document_type") {
    if (inbound.kind !== "text") return { kind: "help" };
    return { kind: "document_type_reply", docType: parseDocType(inbound.text) };
  }
```
And in the idle block, BEFORE the `if (inbound.kind !== "text") return { kind: "help" };` line, add:
```ts
  if (inbound.kind === "image" || inbound.kind === "document") {
    return { kind: "document_received", mediaId: inbound.mediaId ?? "", mimeType: inbound.mediaMimeType ?? "" };
  }
```
(The existing `triage`/`awaiting_triage_consent` branches already return `help` for non-text, so a photo mid-triage correctly does not start a document flow.)

- [ ] **Step 5: Run → all PASS** (`cd apps/glyph && npx vitest run src/lib/whatsapp/`). **Step 6: Commit:**
```bash
git add apps/glyph/src/lib/whatsapp/flow.ts apps/glyph/src/lib/whatsapp/router.ts apps/glyph/src/lib/whatsapp/router.test.ts
git commit -m "feat(whatsapp): router + flow for document capture states"
```

---

### Task 6: Document handlers in `process.ts`

**Files:**
- Modify: `apps/glyph/src/lib/whatsapp/process.ts`

- [ ] **Step 1: Add imports + messages.** Add near the other imports:
```ts
import { captureDocument, resolveDocConsent, createDocConsent } from "./documents";
```
Add near the other message consts:
```ts
const DOC_CONSENT_NOTICE =
  "ছবিতে নাম-পরিচয় থাকতে পারে; এটি একটি AI পড়বে, পরিচয় গোপন রাখা হয়। ডাক্তার দেখার আগে আপনার তথ্য প্রস্তুত হবে। রাজি থাকলে 'হ্যাঁ' লিখুন।";
const DOC_TYPE_QUESTION = "এটা কি প্রেসক্রিপশন না ল্যাব রিপোর্ট? প্রেসক্রিপশন হলে '১', রিপোর্ট হলে '২' লিখুন।";
const DOC_OK_MSG = "পেয়েছি ✓ ডাক্তার দেখার আগে এটি প্রস্তুত থাকবে।";
const DOC_FAIL_MSG = "দুঃখিত, ছবিটি পড়া গেল না। আবার একটি পরিষ্কার ছবি পাঠান, অথবা ক্লিনিকে দেখান।";
```

- [ ] **Step 2: Add the three action branches** in `processInbound`, alongside the existing `triage_*` branches (before the closing of the `if/else if` chain):
```ts
  } else if (action.kind === "document_received") {
    if (patientId) {
      const consentId = await resolveDocConsent(admin, patientId);
      if (consentId) {
        await writeFlow(admin, waId, "awaiting_document_type", { pendingMediaId: action.mediaId, pendingMimeType: action.mimeType });
        replyText = DOC_TYPE_QUESTION;
      } else {
        await writeFlow(admin, waId, "awaiting_document_consent", { pendingMediaId: action.mediaId, pendingMimeType: action.mimeType });
        replyText = DOC_CONSENT_NOTICE;
      }
    }
  } else if (action.kind === "document_consent_reply") {
    if (action.agreed && patientId) {
      await createDocConsent(admin, patientId);
      await writeFlow(admin, waId, "awaiting_document_type", state); // keep the stashed media
      replyText = DOC_TYPE_QUESTION;
    } else {
      await writeFlow(admin, waId, "idle", {});
      replyText = CONSENT_DECLINED_MSG;
    }
  } else if (action.kind === "document_type_reply") {
    if (!action.docType) {
      replyText = DOC_TYPE_QUESTION; // unrecognised → re-ask, stay in the state
    } else if (patientId && state.pendingMediaId) {
      const consentId = await resolveDocConsent(admin, patientId);
      const result = consentId
        ? await captureDocument(admin, {
            patientId,
            mediaId: state.pendingMediaId,
            mimeType: state.pendingMimeType ?? "image/jpeg",
            type: action.docType,
            consentId,
          })
        : { ok: false, error: "no consent" };
      await writeFlow(admin, waId, "idle", {});
      replyText = result.ok ? DOC_OK_MSG : DOC_FAIL_MSG;
      if (!result.ok) console.error("[wa/process] document capture failed:", result.error);
    } else {
      await writeFlow(admin, waId, "idle", {});
      replyText = DOC_FAIL_MSG;
    }
  }
```
> Note: the `document_type_reply` "unrecognised" branch leaves `activeFlow` as `awaiting_document_type` (it does NOT writeFlow), so the stash survives and the next reply is re-parsed. Correct.

- [ ] **Step 3:** `npm run type-check`, `cd apps/glyph && npx vitest run` (no regressions), `npm run build` (webhook route compiles). All PASS.
- [ ] **Step 4: Commit:**
```bash
git add apps/glyph/src/lib/whatsapp/process.ts
git commit -m "feat(whatsapp): document capture handlers (consent → type → extract)"
```

---

### Task 7: Smoke + docs

**Files:**
- Modify: `scripts/smoke-whatsapp.mjs`, `.env.example`, `CLAUDE.md`

- [ ] **Step 1: `.env.example`.** Append:
```
# === WhatsApp bridge (Leg C) ===
# Shared secret the bridge sends to the extract-document edge fn (set the SAME
# value in Vercel AND `supabase secrets set`, like TRIAGE_SHARED_SECRET):
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
WHATSAPP_BRIDGE_SECRET=hex-32-bytes
```

- [ ] **Step 2: Extend `scripts/smoke-whatsapp.mjs`.** Add, inside the `try` after the red-flag check (check 6), a document state-machine check (the media download will fail without a real 360dialog media id — that is expected; we assert the CONSENT → TYPE transitions, which happen BEFORE any download):
```js
  // 7. Bound patient sends an image → one-time doc consent notice, then type question.
  const r7 = await post({ entry: [{ changes: [{ value: {
    contacts: [{ wa_id: waId, profile: { name: "Smoke" } }],
    messages: [{ id: `wamid.${code}.img`, from: waId, timestamp: "1700000000", type: "image", image: { id: "fake-media-1", mime_type: "image/jpeg" } }],
  } }] }] });
  check("webhook 200 for image", r7.status === 200, r7.status);
  await new Promise((r) => setTimeout(r, 2500));
  let { data: convo7 } = await admin.from("wa_conversations").select("active_flow").eq("wa_id", waId).maybeSingle();
  check("image → awaiting_document_consent", convo7?.active_flow === "awaiting_document_consent", convo7?.active_flow);

  const r8 = await post(inboundPayload("হ্যাঁ", `wamid.${code}.docyes`));
  check("webhook 200 for doc consent yes", r8.status === 200, r8.status);
  await new Promise((r) => setTimeout(r, 2500));
  ({ data: convo7 } = await admin.from("wa_conversations").select("active_flow").eq("wa_id", waId).maybeSingle());
  check("doc consent agreed → awaiting_document_type", convo7?.active_flow === "awaiting_document_type", convo7?.active_flow);
  const { data: docConsent } = await admin.from("consent_records").select("device_info").eq("patient_id", patient.id).eq("device_info", "whatsapp_document").maybeSingle();
  check("whatsapp_document consent recorded", !!docConsent);
```
(The `finally` cleanup already deletes consent_records/wa_conversations/etc. for the patient — no change needed.)

- [ ] **Step 3: Syntax-check:** `node --check scripts/smoke-whatsapp.mjs` — OK. (The full extract E2E with a real image is the separate ship-time check via the fixture; see ship notes.)

- [ ] **Step 4: `CLAUDE.md`.** Update the `lib/whatsapp/` line to mention `media`, `documents`, `doc-type`. Note `extract-document` now has a bridge service path (`WHATSAPP_BRIDGE_SECRET`) for visitless WhatsApp uploads. Add `WHATSAPP_BRIDGE_SECRET` to the §7 env table (set in Vercel + Supabase secrets). Note Leg C (pre-chamber photo capture) is built; voice deferred.

- [ ] **Step 5: Commit:**
```bash
git add scripts/smoke-whatsapp.mjs .env.example CLAUDE.md
git commit -m "test+docs(whatsapp): Leg C smoke (doc state machine) + env + CLAUDE.md"
```

---

## Self-review

**Spec coverage (Leg C):** image/document inbound → consent → type → download → bucket → extract-document → row. Tasks 1 (media), 2 (service path), 3 (type parser), 4 (capture+consent), 5 (router/flow), 6 (process handlers), 7 (smoke/docs). Voice correctly deferred.

**The live-function risk is bounded:** Task 2 is additive (a new auth branch + an optional body field); the existing user-JWT intake path is unchanged. The 16/16 `smoke-documents` regression + an explicit bridge-path extraction check run at ship, before anything patient-facing is enabled.

**Type consistency:** `DocType` defined once in `doc-type.ts`, imported by `documents.ts` and `router.ts`. New `RouteAction` kinds (`document_received`/`document_consent_reply`/`document_type_reply`) match between `router.ts` (Task 5) and the `process.ts` switch (Task 6). `ActiveFlow` gains the two document states (Task 5) consumed by `process.ts` via the router. `WaFlowState.pendingMediaId/pendingMimeType` written in `document_received`/`document_consent_reply` and read in `document_type_reply`.

**Ship-time checklist (NOT in this plan's tasks):** set `WHATSAPP_BRIDGE_SECRET` in Vercel + `supabase secrets set`; deploy `extract-document --no-verify-jwt`; run `smoke-documents.mjs` (16/16, the intake regression) + a bridge-path extraction check with `scripts/fixtures/rx-napa.jpg`; merge + deploy frontend. Live WhatsApp photo verified once the founder's number is wired.
