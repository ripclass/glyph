# Glyph Lens Image-Extract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a centre technologist upload a lab-report photo on the order-detail screen — with an explicit patient-consent checkbox — to pre-fill the result rows via the existing `extract-document` pipeline, which they then review/edit before saving.

**Architecture:** One pure helper + one new authenticated Next route + a small UI addition. No migration, no edge-function change — it reuses the already-deployed `extractOnly` flag on `extract-document` (which reads images via the service-role client, so the clinic-scoped storage RLS is irrelevant) and the existing `documents` bucket. The route does the centre-patient writes (consent record + image upload) with the service-role client, then calls `extract-document` with the staff JWT.

**Tech Stack:** Next.js 14 App Router (route + client page), `@supabase/supabase-js` (service-role admin client + storage), Vitest.

## Global Constraints

- **Chamber untouched:** no edge-function change, no migration, no change to doctor/clinic code. `extract-document`'s default (non-`extractOnly`) path stays byte-for-byte unchanged (`smoke-documents` is the prod gate).
- **Additive on Lens v1** (already shipped on `main`): reuses `lens-logic.ts` (`normalizeRawItem`), `staff-logic.ts` (`shapeStaffSession`, `canEnterResults`), the `/api/center/orders/[id]/results` auth pattern, and the `extractOnly` flag.
- **Explicit consent required:** the route rejects (400) unless `body.consent === true`; it records an `image_capture` consent (`granted=true`, `granted_by='patient'`, `device_info='lens_image_extract'`) for the patient before any image egress.
- **Tier B egress, consent-gated:** the image goes to the LLM via `extract-document` with the recorded `consentId`. The egress gate fails closed without it — unchanged.
- **No auto-save:** the route returns parsed rows only; persisting still goes through the existing `/results` route when the technologist clicks Save. Signing still requires the signatory.
- **Service-role for centre-patient writes** (consent row + storage upload) — the bucket/consent RLS is clinic-scoped; centre patients have `clinic_id NULL`. Same pattern `/api/wallet/issue` uses.
- **`extract-document` is called with the staff JWT** (its user-JWT path validates `getUser` with no clinic check; it downloads the image via service-role). No `WHATSAPP_BRIDGE_SECRET` needed.
- No new dependencies; `@/` imports; `"use client";` on the page.

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/glyph/src/lib/services/lens-logic.ts` | **Modify:** add `parseImageUpload` (pure: validate content type, strip data-URL prefix, return stripped base64 + ext). |
| `apps/glyph/src/lib/services/lens-logic.test.ts` | **Modify:** unit tests for `parseImageUpload`. |
| `apps/glyph/src/app/api/center/orders/[id]/extract/route.ts` | **Create:** the authenticated extract route (consent record + service-role upload + `extract-document` `extractOnly` + normalize). |
| `apps/glyph/src/app/center/orders/[id]/page.tsx` | **Modify:** consent checkbox + file input + "Extract from photo" button + pre-fill the `rows` state. |
| `scripts/smoke-lens.mjs` | **Modify:** add an image-extract step to Section B (plumbing + consent-recording assertions, using `scripts/fixtures/rx-napa.jpg`). |
| `CLAUDE.md` | **Modify:** note the `api/center/orders/[id]/extract` route + the `lens_image_extract` consent device_info. |

---

### Task 1: `parseImageUpload` pure helper

**Files:**
- Modify: `apps/glyph/src/lib/services/lens-logic.ts`
- Modify: `apps/glyph/src/lib/services/lens-logic.test.ts`

**Interfaces:**
- Produces: `parseImageUpload(input: { imageBase64: string; contentType: string }): { base64: string; ext: 'jpg' | 'png' | 'webp' }` — validates the content type against the allowlist, strips a `data:<type>;base64,` prefix if present, returns the bare base64 + the file extension. Throws on a disallowed type or empty payload. (Decoding to bytes happens in the route via `Buffer` — kept out of this pure helper so `lens-logic` stays browser-safe.)

- [ ] **Step 1: Write the failing test**

Append to `apps/glyph/src/lib/services/lens-logic.test.ts`:

```ts
import { parseImageUpload } from './lens-logic';

describe('parseImageUpload', () => {
  it('accepts jpeg and returns jpg ext + the bare base64', () => {
    const r = parseImageUpload({ imageBase64: 'AQID', contentType: 'image/jpeg' });
    expect(r).toEqual({ base64: 'AQID', ext: 'jpg' });
  });

  it('strips a data-URL prefix', () => {
    const r = parseImageUpload({ imageBase64: 'data:image/png;base64,AQID', contentType: 'image/png' });
    expect(r).toEqual({ base64: 'AQID', ext: 'png' });
  });

  it('maps webp', () => {
    expect(parseImageUpload({ imageBase64: 'AQID', contentType: 'image/webp' }).ext).toBe('webp');
  });

  it('throws on a disallowed content type', () => {
    expect(() => parseImageUpload({ imageBase64: 'AQID', contentType: 'image/gif' })).toThrow();
    expect(() => parseImageUpload({ imageBase64: 'AQID', contentType: 'application/pdf' })).toThrow();
  });

  it('throws on empty payload', () => {
    expect(() => parseImageUpload({ imageBase64: '', contentType: 'image/jpeg' })).toThrow();
    expect(() => parseImageUpload({ imageBase64: 'data:image/jpeg;base64,', contentType: 'image/jpeg' })).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace glyph-web -- lens-logic`
Expected: FAIL — `parseImageUpload` is not exported.

- [ ] **Step 3: Implement the helper**

Append to `apps/glyph/src/lib/services/lens-logic.ts`:

```ts
/** Content types we accept for a lab-report photo, mapped to a file extension. */
const IMAGE_EXT: Record<string, 'jpg' | 'png' | 'webp'> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface ParsedImageUpload {
  base64: string;
  ext: 'jpg' | 'png' | 'webp';
}

/**
 * Validates + normalizes a posted lab-report image. Pure (no Buffer/network) so
 * lens-logic stays browser-safe; the route decodes the returned base64 to bytes.
 *
 * @throws {Error} on a disallowed content type or an empty payload
 */
export function parseImageUpload(input: { imageBase64: string; contentType: string }): ParsedImageUpload {
  const ext = IMAGE_EXT[input.contentType];
  if (!ext) throw new Error(`Unsupported image type: ${input.contentType}`);
  // Strip an optional data-URL prefix: "data:image/png;base64,...."
  const base64 = input.imageBase64.replace(/^data:[^;]+;base64,/, '').trim();
  if (!base64) throw new Error('Empty image payload');
  return { base64, ext };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test --workspace glyph-web -- lens-logic`
Expected: PASS (the new `parseImageUpload` block + the existing lens-logic tests).

- [ ] **Step 5: Commit**

```bash
git add apps/glyph/src/lib/services/lens-logic.ts apps/glyph/src/lib/services/lens-logic.test.ts
git commit -m "feat(lens): parseImageUpload helper for report-photo result extraction"
```

---

### Task 2: the extract route

**Files:**
- Create: `apps/glyph/src/app/api/center/orders/[id]/extract/route.ts`

**Interfaces:**
- Consumes: `parseImageUpload` (Task 1), `normalizeRawItem` (Lens v1 `lens-logic.ts`), `shapeStaffSession` + `canEnterResults` (`staff-logic.ts`), `createAdminClient` (`@/lib/supabase/admin`).
- Produces: `POST /api/center/orders/[id]/extract` → `{ success: true, data: { rawResults, labName, reportDate, testCategory, confidence } }`.

- [ ] **Step 1: Write the route**

Create `apps/glyph/src/app/api/center/orders/[id]/extract/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { shapeStaffSession, canEnterResults } from '@/lib/services/staff-logic';
import { parseImageUpload, normalizeRawItem } from '@/lib/services/lens-logic';
import type { Database } from '@/lib/supabase/types';

export const runtime = 'nodejs';

/**
 * POST /api/center/orders/[id]/extract
 * Upload a lab-report photo (with explicit patient consent) → extract values via
 * extract-document (extractOnly, Tier B) → return normalized rows to pre-fill the
 * UI. Does NOT persist results; the technologist reviews then Saves via /results.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ success: false, error: 'Missing authorization header' }, { status: 401 });

  const userClient = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

  const { data: memRows } = await userClient
    .from('memberships').select('user_id, role, organizations(id, name, org_type)');
  const staff = shapeStaffSession(memRows as never);
  if (!staff || !canEnterResults(staff.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from('lab_orders').select('id, patient_id, credential_id').eq('id', params.id).eq('owner_org_id', staff.orgId).maybeSingle();
  if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  if (order.credential_id) return NextResponse.json({ success: false, error: 'Order is signed and frozen' }, { status: 409 });

  const body = await req.json().catch(() => null);
  if (!body || body.consent !== true) {
    return NextResponse.json({ success: false, error: 'Patient consent is required to process the report image' }, { status: 400 });
  }

  let parsed;
  try {
    parsed = parseImageUpload({ imageBase64: String(body.imageBase64 ?? ''), contentType: String(body.contentType ?? '') });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Invalid image' }, { status: 400 });
  }

  // 1) Record (find-or-create) the image_capture consent for this patient.
  const { data: existingConsent } = await admin
    .from('consent_records')
    .select('id')
    .eq('patient_id', order.patient_id)
    .eq('consent_type', 'image_capture')
    .eq('device_info', 'lens_image_extract')
    .eq('granted', true)
    .is('withdrawn_at', null)
    .maybeSingle();
  let consentId = existingConsent?.id ?? null;
  if (!consentId) {
    const { data: ins, error: consentErr } = await admin
      .from('consent_records')
      .insert({ patient_id: order.patient_id, consent_type: 'image_capture', granted: true, granted_by: 'patient', device_info: 'lens_image_extract' })
      .select('id')
      .single();
    if (consentErr || !ins) return NextResponse.json({ success: false, error: consentErr?.message ?? 'consent insert failed' }, { status: 500 });
    consentId = ins.id;
  }

  // 2) Upload the image to the documents bucket (service-role; centre patients have no clinic).
  const bytes = Buffer.from(parsed.base64, 'base64');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const imageUrl = `lens/${staff.orgId}/${order.patient_id}/${ts}.${parsed.ext}`;
  const { error: upErr } = await admin.storage
    .from('documents')
    .upload(imageUrl, bytes, { contentType: body.contentType, upsert: false });
  if (upErr) return NextResponse.json({ success: false, error: `upload failed: ${upErr.message}` }, { status: 500 });

  // 3) Extract (extractOnly — no DB row written) via extract-document, staff JWT.
  const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/extract-document`;
  const exRes = await fetch(fnUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify({ imageUrl, type: 'lab_report', patientId: order.patient_id, consentId, extractOnly: true }),
  });
  const exJson = await exRes.json().catch(() => ({}));
  if (!exRes.ok || !exJson?.success) {
    return NextResponse.json({ success: false, error: exJson?.error ?? 'extraction failed' }, { status: 502 });
  }

  const extracted = exJson.data ?? {};
  const rawItems: Array<Record<string, unknown>> = Array.isArray(extracted.results) ? extracted.results : [];
  const rawResults = rawItems
    .map((r) => { try { return normalizeRawItem(r); } catch { return null; } })
    .filter(Boolean);

  return NextResponse.json({
    success: true,
    data: {
      rawResults,
      labName: extracted.lab_name ?? null,
      reportDate: extracted.report_date ?? null,
      testCategory: extracted.test_category ?? null,
      confidence: extracted.confidence ?? null,
      note: rawResults.length === 0 ? 'No results could be read from the image' : undefined,
    },
  });
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check --workspace glyph-web`
Expected: PASS. (If the `consent_records` insert needs `granted_at`/other columns, they default in the DB — do not add columns that aren't in migration 001's `consent_records`.)

- [ ] **Step 3: Commit**

```bash
git add "apps/glyph/src/app/api/center/orders/[id]/extract/route.ts"
git commit -m "feat(lens): image-extract route — consent + service-role upload + extract-document extractOnly"
```

---

### Task 3: order-detail UI + E2E + docs

**Files:**
- Modify: `apps/glyph/src/app/center/orders/[id]/page.tsx`
- Modify: `scripts/smoke-lens.mjs`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `POST /api/center/orders/[id]/extract` (Task 2).

- [ ] **Step 1: Add the upload + consent UI and pre-fill handler**

In `apps/glyph/src/app/center/orders/[id]/page.tsx`, add state near the other `useState`s:

```tsx
  const [imgConsent, setImgConsent] = useState(false);
  const [extracting, setExtracting] = useState(false);
```

Add this handler (alongside `saveResults`), reusing the existing `token()` helper:

```tsx
  async function extractFromPhoto(file: File) {
    setExtracting(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(new Error('Could not read file'));
        fr.readAsDataURL(file);
      });
      const res = await fetch(`/api/center/orders/${params.id}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ consent: true, imageBase64: dataUrl, contentType: file.type }),
      });
      const json = await res.json();
      if (!json.success) return toast.error(json.error);
      const extracted = json.data.rawResults ?? [];
      if (extracted.length) {
        // Replace the rows if the only existing row is blank, else append.
        setRows((prev) => (prev.length === 1 && !prev[0].testName ? extracted : [...prev.filter((r) => r.testName), ...extracted]));
        toast.success(`Pre-filled ${extracted.length} result${extracted.length > 1 ? 's' : ''} — please review`);
      } else {
        toast.message(json.data.note ?? 'No results read from the image');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  }
```

In the Results `<section>`, ABOVE the manual rows, add the consent + upload controls (rendered only when the order isn't signed — i.e. inside the existing results-editing area):

```tsx
        <label className="flex items-center gap-2 text-xs text-clinical-muted">
          <input type="checkbox" checked={imgConsent} onChange={(e) => setImgConsent(e.target.checked)} />
          Patient consents to AI-assisted reading of this report
        </label>
        <input
          type="file"
          accept="image/*"
          disabled={!imgConsent || extracting}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void extractFromPhoto(f); e.currentTarget.value = ''; }}
          className="text-xs"
        />
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check --workspace glyph-web`
Expected: PASS.

- [ ] **Step 3: Add the image-extract step to smoke-lens Section B**

In `scripts/smoke-lens.mjs`, after the `save results 200` check (and before normalize), add an image-extract plumbing check. At the top of the file with the other imports, add:

```js
import { readFileSync } from 'node:fs';
```

Insert after the `resulted` check in Section B:

```js
// image-extract: consent + service-role upload + extract-document(extractOnly) plumbing.
// rx-napa.jpg is a prescription fixture (no lab fixture exists), so we assert the
// PLUMBING (200 + rawResults is an array) + that the consent row was recorded — NOT
// specific extracted values (LLM reading a Rx as a lab report is non-deterministic).
const fixtureB64 = readFileSync('scripts/fixtures/rx-napa.jpg').toString('base64');
const extracted = await post(`/api/center/orders/${orderId}/extract`, tech.jwt, {
  consent: true, imageBase64: fixtureB64, contentType: 'image/jpeg',
});
check('image-extract returns 200 + rawResults array', extracted.status === 200 && Array.isArray(extracted.json.data?.rawResults), JSON.stringify(extracted.json).slice(0, 200));

const { data: order2b } = await db.from('lab_orders').select('patient_id').eq('id', orderId).single();
const { data: imgConsent } = await db
  .from('consent_records').select('id')
  .eq('patient_id', order2b.patient_id).eq('consent_type', 'image_capture').eq('device_info', 'lens_image_extract').eq('granted', true);
check('image-extract recorded an image_capture consent (lens_image_extract)', (imgConsent?.length ?? 0) === 1, `got ${imgConsent?.length}`);

const consentReject = await post(`/api/center/orders/${orderId}/extract`, tech.jwt, { imageBase64: fixtureB64, contentType: 'image/jpeg' });
check('image-extract WITHOUT consent is rejected (400)', consentReject.status === 400, `got ${consentReject.status}`);
```

(The existing Section-B cleanup already deletes the patient; add `await db.from('consent_records').delete().eq('patient_id', order2b.patient_id);` to the cleanup block before the patient delete, to clear the consent rows this step created.)

- [ ] **Step 4: Run the full local E2E** (controller-orchestrated env — see the Lens v1 run notes: `supabase functions serve --no-verify-jwt --env-file supabase/functions/.env` + `npm run dev` with the local-demo keys + `LENS_SHARED_SECRET` wired in `.env.local`; restore `.env.local` after)

```bash
node scripts/smoke-lens.mjs http://localhost:3000 <API_URL> <ANON> <SERVICE>
```
Expected: `ALL CHECKS PASSED` including the three new image-extract checks. (`extract-document` is reachable via the staff JWT — it is JWT-validated, unlike `lens-normalize`; functions serve with `--no-verify-jwt` still serves it fine.)

- [ ] **Step 5: Update CLAUDE.md**

In §3, under the `api/center/orders/*` routes, add the `[id]/extract` route (image upload → consent + service-role upload → `extract-document` extractOnly → pre-fill rows). Note the `lens_image_extract` consent `device_info`. In §3 near `extract-document`, note it is now also consumed by the Lens centre image-extract path (staff-JWT, `extractOnly`).

- [ ] **Step 6: Commit**

```bash
git add "apps/glyph/src/app/center/orders/[id]/page.tsx" scripts/smoke-lens.mjs CLAUDE.md
git commit -m "feat(lens): order-detail photo-extract UI + consent + E2E plumbing checks"
```

---

## Self-Review

**Spec coverage:**
- ✅ Explicit consent checkbox + recorded `image_capture` consent (`lens_image_extract`) — Task 2 (route) + Task 3 (UI checkbox).
- ✅ Service-role upload to `documents` for centre patients — Task 2.
- ✅ `extract-document` via staff JWT + `extractOnly` — Task 2.
- ✅ Normalize via `normalizeRawItem`, return rows (no auto-save) — Task 2.
- ✅ UI pre-fills the existing `rows`, technologist reviews then Saves via `/results` — Task 3.
- ✅ Tier B consent-gated egress (the recorded `consentId`) — Task 2.
- ✅ Pure `parseImageUpload` unit-tested — Task 1.
- ✅ E2E plumbing + consent-recording + consent-required-400 — Task 3.
- ✅ Chamber-safe (no migration, no edge-fn change) — by construction.

**Placeholder scan:** every step has complete code/commands. The only "match the existing X" instruction (the `token()` helper + `rows`/`saveResults` already on the page from Lens v1) refers to code that demonstrably exists. ✅

**Type consistency:** `parseImageUpload` returns `{ base64, ext }` (Task 1) and is consumed identically in Task 2; `normalizeRawItem` is the Lens v1 export; the route response `{ data: { rawResults, ... } }` matches the page's `json.data.rawResults` read (Task 3). `consent_records` columns (`patient_id, consent_type, granted, granted_by, device_info, withdrawn_at`) match migration 001. ✅
