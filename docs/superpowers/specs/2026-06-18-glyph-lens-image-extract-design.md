# Glyph Lens — Image-Extract Result Pre-fill (design)

**KhaM Health · Glyph · 2026-06-18**

> Lens v1 follow-up. The founder chose "typed values + image extract" for v1, but image-extract was deferred during the v1 build because it was under-specified and appeared to collide with the clinic-scoped `documents` storage RLS (centre patients have `clinic_id NULL`). This spec closes that gap. Purely additive on top of shipped Lens v1; reuses the already-deployed `extractOnly` flag on `extract-document` and the existing `documents` bucket. Chamber untouched.

## What it is

On the order-detail screen (`/center/orders/[id]`), a technologist uploads a photo of the lab report / machine printout. With an explicit patient-consent checkbox ticked, the image is processed by the existing `extract-document` pipeline (Tier B, consent-gated) **without** writing a row, and the extracted values **pre-fill** the result-entry rows. The technologist reviews/edits, then Saves via the existing result-entry route. **Nothing auto-saves; signing still requires the signatory.** This is a convenience/accuracy aid on the front of the existing manual-entry path — it does not replace it.

## Resolved technical facts (verified against the live code)

1. **`extract-document` reads the image via the service-role client** (`supabase/functions/extract-document/index.ts:121-126` — `serviceClient.storage.from("documents").download(imageUrl)`). Therefore the clinic-scoped storage RLS does **not** block reading a centre-path object, and the function's **user-JWT auth path** (validate `getUser`, no doctor/clinic check) works for a centre staffer. **No `WHATSAPP_BRIDGE_SECRET` needed** — the Lens route calls `extract-document` with the staff JWT.
2. **`extractOnly: true`** (shipped in Lens v1) makes `extract-document` return `{ success: true, data: extracted }` after the LLM call and before any DB insert. `extracted` shape: `{ lab_name, report_date, test_category, results: [{name, value, unit, range, isAbnormal, severity}], confidence }`.
3. **`extract-document` still requires Tier-B consent** — the caller passes a `consentId` (a `consent_records` row id). For a centre walk-in patient we record one (see below).
4. **Storage writes** for a centre patient must use the **service-role client** (the bucket RLS is clinic-scoped) — same pattern `/api/wallet/issue` uses for its writes.
5. `consent_records.consent_type` enum includes `image_capture`; `granted_by` enum is `{patient, attendant, guardian}` (no `staff`) — so consent is recorded as `granted_by='patient'`.

## Architecture

One new authenticated Next route + a small UI addition + one pure helper. No migration. No edge-function change (the `extractOnly` seam already exists).

### Component 1 — `POST /api/center/orders/[id]/extract` (new route)

Server-side, mirrors the auth/scope pattern of the existing `/api/center/orders/[id]/results` route:
1. Staff auth: anon client + `getUser()` → RLS-scoped `memberships` select → `shapeStaffSession` → reject non-members (403).
2. `canEnterResults(staff.role)` gate (403 otherwise).
3. Resolve the order via the admin client scoped to `staff.orgId` (404 if not found); 409 if `order.credential_id` is set (signed/frozen).
4. **Require `body.consent === true`** (the checkbox) → else 400 `"Patient consent is required to process the report image"`.
5. Validate the posted image: `body.imageBase64` (a data-URL or raw base64 string) + `body.contentType` ∈ a small allowlist (`image/jpeg`, `image/png`, `image/webp`) → else 400. Pure validation via a helper in `lens-logic.ts`.
6. **Record consent** (service-role, find-or-create): look for an existing non-withdrawn `image_capture` consent for `order.patient_id` with `device_info='lens_image_extract'`; if none, insert one (`consent_type='image_capture'`, `granted_by='patient'`, `device_info='lens_image_extract'`, `patient_id`). Capture its `id` as `consentId`.
7. **Upload** the decoded image bytes (service-role) to the `documents` bucket at `lens/<orgId>/<patientId>/<isoish-ts>.<ext>` → the object path is the `imageUrl`.
8. **Call `extract-document`** (`${SUPABASE_URL}/functions/v1/extract-document`) with the **staff JWT** as `Authorization`, body `{ imageUrl, type: 'lab_report', patientId: order.patient_id, consentId, extractOnly: true }`.
9. Map `extracted.results` through the existing `normalizeRawItem` (Task 4 of Lens v1) → `rawResults: LabResultItem[]`. Drop items that throw (missing name) rather than failing the whole extract; if zero valid items, return `{ success: true, data: { rawResults: [], note: 'No results could be read from the image' } }`.
10. Return `{ success: true, data: { rawResults, labName, reportDate, testCategory, confidence } }`.

The route does **not** write `lab_orders.raw_results` — it only returns the parsed rows. Persisting still goes through the existing `/results` route when the technologist clicks Save (so the technologist's edits are what get saved). This keeps a clean separation: extract = read-only suggestion; save = the deliberate write.

### Component 2 — order-detail UI (`apps/glyph/src/app/center/orders/[id]/page.tsx`)

Add to the Results section (above the manual rows):
- A consent checkbox: "Patient consents to AI-assisted reading of this report" (required; unchecked → the file input / extract button is disabled).
- A file input (`accept="image/*"`) + an "Extract from photo" button.
- On extract: read the file as base64, POST to the new route with `{ consent: true, imageBase64, contentType }`; on success, set the returned `rawResults` into the existing `rows` state (replacing empty rows, or appending — replace if the only row is blank). Toast the `note` if zero results read. The technologist then edits and clicks the existing "Save results".
- Disabled once the order is signed (status `signed`).

### Component 3 — pure helper (`lens-logic.ts`)

`parseImageUpload(input: { imageBase64: string; contentType: string }): { base64: string; ext: 'jpg' | 'png' | 'webp' }` — validates the content type against the allowlist, strips a `data:...;base64,` prefix if present, returns the bare base64 + the file extension. Throws on a disallowed type or empty payload. Decoding to bytes happens in the route (`Buffer.from`), kept out of this pure helper so `lens-logic` stays browser-safe. Unit-tested (no network).

## Data flow

photo → page reads as base64 → `POST /extract` (consent record + service-role upload + `extract-document` `extractOnly`) → normalized rows → UI pre-fills `rows` → technologist edits → existing `POST /results` (the deliberate write) → normalize → sign (unchanged).

## Egress / PDPO

- The image goes to the LLM via `extract-document` = **Tier B**, gated on the recorded `consentId`. The egress gate (`_shared/egress.ts`) fails closed without it — unchanged behavior.
- Consent is an explicit, recorded `image_capture` row with `device_info='lens_image_extract'`, auditable. Withdrawal (a withdrawn consent) blocks the next extract (the find step skips withdrawn rows, and `extract-document`'s gate re-checks).

## Error handling

- No `consent: true` → 400. Disallowed/undecodable image → 400. Order signed → 409. `extract-document` non-success → 502 with its message (UI toasts; the technologist falls back to manual entry — the manual path is always available).

## Chamber-safety

Purely additive: one new centre route + UI + one pure helper. `extract-document`'s default (non-`extractOnly`) path is untouched (verified at Lens v1 ship; `smoke-documents` is the prod gate). No migration. No change to doctor/clinic code.

## Testing

- **Unit:** `parseImageUpload` — valid jpeg/png/webp (with and without data-URL prefix) decode to bytes + correct ext; disallowed type throws; garbage base64 throws.
- **E2E:** extend `scripts/smoke-lens.mjs` Section B with an image-extract step using the existing `scripts/fixtures/rx-napa.jpg` fixture: POST `/extract` with `consent:true` + the fixture as base64 → assert `rawResults` is a non-empty array of `{testName,value,...}` AND that an `image_capture` consent row with `device_info='lens_image_extract'` now exists for the patient. (This issues no credential — safe to leave in the local E2E; it is NOT run against prod, consistent with the append-only-on-prod discipline.)
- The existing manual-entry path is unchanged and still covered.

## Out of scope (unchanged from Lens v1 deferrals)

- MedGemma vision co-interpretation (task B / v1.5).
- Auto-saving extracted results (deliberate: technologist reviews first).
- Multi-image / multi-page reports (v1: one image pre-fills; the technologist can extract again to append).
- Paper-requisition (order-side) OCR.
