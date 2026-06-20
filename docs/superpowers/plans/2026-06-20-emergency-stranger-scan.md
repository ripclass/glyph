# Emergency Access v1 (QR + Stranger-Scan + Hospital Broadcast) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A patient enables an emergency profile and gets a scannable QR; a stranger scanning it hits a public endpoint that routes them to the nearest hospital (no medical data), broadcasts a time-boxed minimal-dataset alert to nearby registered hospitals, pings the patient's family, and audits the scan.

**Architecture:** A new migration (emergency profile fields, `emergency_tokens`, `emergency_scans` audit, time-boxed `emergency_alerts`, coarse geo on `organizations`, the `emergency_access` consent type). Pure logic (token, haversine geo-filter, the disclosure-split with NO PHI to the stranger) in `emergency-logic.ts`. A token/profile service mirroring `wallet-logic`. A scan orchestrator. A public `/e/[token]` page + `/api/e/[token]` (resolve) and `/api/e/[token]/scan` (fire the legs) routes. Family + hospital pings via approved WhatsApp **templates** (immediate `sendTemplate`, since free-form is window-gated). All three legs are independent and degrade gracefully.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (service-role admin client), Vitest (unit), Node smoke (E2E), the existing WhatsApp bridge (`sendTemplate`), the `qrcode` dep already in the app.

## Global Constraints

- **The stranger response NEVER contains PHI** — no blood group, allergy, medication, or condition string in any `/e/[token]` or `/scan` response or page. (Smoke asserts this.)
- **Emergency token is SEPARATE from the wallet token** — it unlocks only the emergency flow, never the wallet/record.
- **A DID/record is never exposed by a scan.** The broadcast pushes only the minimal dataset to registered hospitals; it is never a full-record read.
- **Family + hospital pings use approved Meta templates via `sendTemplate`** (free-form `sendText` is blocked outside a 24h window). Sends degrade gracefully: a failed/ unapproved template logs and continues; the scan still routes + audits.
- **Self-reported framing:** any surfaced dataset is labeled "self-reported — verify on arrival." Routing says "directions to the nearest hospital," never "this hospital will treat you."
- **Locked values:** broadcast radius **10 km**; alert TTL **4 hours**; `emergency_medications` is **free text**; scan rate limit **3 broadcasts per token per hour** (a genuine re-scan still routes + pings family).
- No em dashes / no Devanagari in any Bangla copy (Bangla U+0980–U+09FF + the shared danda only). Copy lives in one module; copy verbatim, never retype Bangla.

---

### Task 1: Migration 018 — schema for emergency access

**Files:**
- Create: `supabase/migrations/018_emergency_access.sql`
- Modify (after applying): regenerate `apps/glyph/src/lib/supabase/types.ts` via `supabase gen types`

**Interfaces produced:** tables `emergency_tokens`, `emergency_scans`, `emergency_alerts`; columns `patients.emergency_access_enabled BOOLEAN`, `patients.emergency_medications TEXT`, `organizations.latitude NUMERIC(9,6)`, `organizations.longitude NUMERIC(9,6)`; `consent_records.consent_type` now allows `'emergency_access'`.

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================
-- 018_emergency_access.sql
-- Emergency Access v1: opt-in emergency profile, a separate
-- scannable emergency token, the stranger-scan audit log, the
-- time-boxed hospital broadcast, coarse geo on hospital orgs,
-- and the emergency_access consent type. Service-role only.
-- ============================================================

-- Emergency profile fields on patients (reuse blood_group/known_allergies/
-- chronic_conditions/emergency_contact_* already present).
ALTER TABLE patients ADD COLUMN emergency_access_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN emergency_medications TEXT;

-- Coarse geo for hospital broadcast radius filtering.
ALTER TABLE organizations ADD COLUMN latitude NUMERIC(9,6);
ALTER TABLE organizations ADD COLUMN longitude NUMERIC(9,6);

-- New consent type.
ALTER TABLE consent_records DROP CONSTRAINT consent_records_consent_type_check;
ALTER TABLE consent_records ADD CONSTRAINT consent_records_consent_type_check CHECK (consent_type IN (
  'recording','data_storage','ai_processing','image_capture','whatsapp_followup','data_sharing','emergency_access'
));

-- Per-patient emergency token (separate from wallet_access_tokens).
CREATE TABLE emergency_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  token TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  last_scanned_at TIMESTAMPTZ
);
CREATE INDEX idx_emergency_tokens_patient ON emergency_tokens(patient_id);
ALTER TABLE emergency_tokens ENABLE ROW LEVEL SECURITY;
-- Deny-all (service-role only), same as wallet_access_tokens.

-- Append-only scan audit.
CREATE TABLE emergency_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  scan_lat NUMERIC(9,6),
  scan_lon NUMERIC(9,6),
  routed BOOLEAN NOT NULL DEFAULT FALSE,
  broadcast_count INTEGER NOT NULL DEFAULT 0,
  family_notified BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_emergency_scans_patient ON emergency_scans(patient_id);
CREATE INDEX idx_emergency_scans_token_time ON emergency_scans(token, scanned_at);
ALTER TABLE emergency_scans ENABLE ROW LEVEL SECURITY;

-- Time-boxed broadcast to nearby registered hospitals.
CREATE TABLE emergency_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scan_id UUID NOT NULL REFERENCES emergency_scans(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  hospital_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  minimal_dataset JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'created' CHECK (delivery_status IN ('created','sent','failed'))
);
CREATE INDEX idx_emergency_alerts_hospital_exp ON emergency_alerts(hospital_org_id, expires_at);
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Apply locally + regenerate types**

Run: `supabase db reset` (or `supabase migration up`), then `supabase gen types typescript --local > apps/glyph/src/lib/supabase/types.ts` and append the project's compatibility tail if the repo uses one (check the current file's footer before overwriting).
Expected: tables exist; `patients` has the two new columns; `npm run type-check --workspace glyph-web` clean.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/018_emergency_access.sql apps/glyph/src/lib/supabase/types.ts
git commit -m "feat(emergency): migration 018 — profile fields, tokens, scans, alerts, geo, consent type"
```

---

### Task 2: `emergency-logic.ts` — pure logic + tests

**Files:**
- Create: `apps/glyph/src/lib/services/emergency-logic.ts`
- Test: `apps/glyph/src/lib/services/emergency-logic.test.ts`

**Interfaces produced:**
- `generateEmergencyToken(): string`
- `haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number`
- `interface HospitalGeo { id: string; name: string; latitude: number; longitude: number; phone: string | null }`
- `nearbyHospitals(scan: { lat: number; lon: number }, hospitals: HospitalGeo[], radiusKm: number): Array<HospitalGeo & { distanceKm: number }>` (sorted nearest-first)
- `interface EmergencyPatient { name: string; blood_group: string | null; known_allergies: unknown; chronic_conditions: unknown; emergency_medications: string | null }`
- `buildMinimalSnapshot(p: EmergencyPatient): Record<string, unknown>` (the dataset pushed to hospitals — basics only)
- `mapsLinkNearestHospital(lat: number, lon: number): string`
- `STRANGER_PHI_KEYS: string[]` (keys that must never appear in a stranger payload — used by the smoke + a guard test)

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "vitest";
import { haversineKm, nearbyHospitals, buildMinimalSnapshot, mapsLinkNearestHospital, generateEmergencyToken } from "./emergency-logic";

describe("haversineKm", () => {
  it("is ~0 for the same point", () => { expect(haversineKm(23.81, 90.41, 23.81, 90.41)).toBeLessThan(0.001); });
  it("Dhaka to Chittagong is ~210-260 km", () => { const d = haversineKm(23.81, 90.41, 22.36, 91.78); expect(d).toBeGreaterThan(200); expect(d).toBeLessThan(270); });
});

describe("nearbyHospitals", () => {
  const H = (id: string, lat: number, lon: number) => ({ id, name: id, latitude: lat, longitude: lon, phone: "880" });
  it("keeps only within radius, nearest first", () => {
    const scan = { lat: 23.81, lon: 90.41 };
    const res = nearbyHospitals(scan, [H("near", 23.82, 90.42), H("far", 22.36, 91.78)], 10);
    expect(res.map(h => h.id)).toEqual(["near"]);
    expect(res[0].distanceKm).toBeGreaterThan(0);
  });
  it("skips hospitals with no geo (filtered by caller) — empty list yields empty", () => {
    expect(nearbyHospitals({ lat: 23.8, lon: 90.4 }, [], 10)).toEqual([]);
  });
});

describe("buildMinimalSnapshot", () => {
  it("includes only the basics, never name-as-PHI beyond display, and flags self-reported", () => {
    const snap = buildMinimalSnapshot({ name: "X", blood_group: "O+", known_allergies: ["penicillin"], chronic_conditions: ["HTN"], emergency_medications: "amlodipine" });
    expect(snap.bloodGroup).toBe("O+");
    expect(snap.allergies).toEqual(["penicillin"]);
    expect(snap.selfReported).toBe(true);
  });
});

describe("mapsLinkNearestHospital", () => {
  it("builds a coords-based maps search url", () => {
    const url = mapsLinkNearestHospital(23.81, 90.41);
    expect(url).toContain("23.81");
    expect(url).toContain("90.41");
    expect(url.startsWith("https://")).toBe(true);
  });
});

describe("generateEmergencyToken", () => {
  it("returns a url-safe token of reasonable length, unique per call", () => {
    const a = generateEmergencyToken(), b = generateEmergencyToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(20);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npm run test --workspace glyph-web -- emergency-logic` → FAIL (module not found).

- [ ] **Step 3: Implement `emergency-logic.ts`**

```ts
import { randomBytes } from "crypto";

/** URL-safe per-patient emergency token (mirrors wallet-logic.generateToken). */
export function generateEmergencyToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Great-circle distance in km. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface HospitalGeo { id: string; name: string; latitude: number; longitude: number; phone: string | null }

/** Hospitals within radiusKm of the scan, nearest first. Caller pre-filters to org_type='hospital' with non-null geo. */
export function nearbyHospitals(
  scan: { lat: number; lon: number },
  hospitals: HospitalGeo[],
  radiusKm: number,
): Array<HospitalGeo & { distanceKm: number }> {
  return hospitals
    .map((h) => ({ ...h, distanceKm: haversineKm(scan.lat, scan.lon, h.latitude, h.longitude) }))
    .filter((h) => h.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export interface EmergencyPatient {
  name: string;
  blood_group: string | null;
  known_allergies: unknown;
  chronic_conditions: unknown;
  emergency_medications: string | null;
}

/** The minimal dataset pushed to a hospital. Basics only; explicitly self-reported. */
export function buildMinimalSnapshot(p: EmergencyPatient): Record<string, unknown> {
  return {
    name: p.name,
    bloodGroup: p.blood_group ?? null,
    allergies: Array.isArray(p.known_allergies) ? p.known_allergies : [],
    conditions: Array.isArray(p.chronic_conditions) ? p.chronic_conditions : [],
    medications: p.emergency_medications ?? null,
    selfReported: true,
  };
}

/** Coords-based maps deep-link to hospitals near the scan (no Glyph facility data needed). */
export function mapsLinkNearestHospital(lat: number, lon: number): string {
  return `https://www.google.com/maps/search/hospital/@${lat},${lon},14z`;
}

/** Keys that must NEVER appear in a stranger-facing payload (guard for the smoke). */
export const STRANGER_PHI_KEYS = ["bloodGroup", "allergies", "conditions", "medications", "blood_group", "known_allergies", "chronic_conditions", "emergency_medications"];
```

- [ ] **Step 4: Run, verify pass** — `npm run test --workspace glyph-web -- emergency-logic` → PASS.

- [ ] **Step 5: Commit** — `git add apps/glyph/src/lib/services/emergency-logic.ts apps/glyph/src/lib/services/emergency-logic.test.ts && git commit -m "feat(emergency): pure logic — token, haversine geo-filter, minimal snapshot, maps link"`

---

### Task 3: Emergency token + profile service; ConsentType update

**Files:**
- Create: `apps/glyph/src/lib/services/emergency.ts`
- Modify: `apps/glyph/src/lib/services/consents.ts` (add `'emergency_access'` to the `ConsentType` union)

**Interfaces produced (service; admin = `ReturnType<typeof createAdminClient>`):**
- `setEmergencyAccess(admin, patientId: string, enabled: boolean, profile: { bloodGroup?: string|null; allergies?: string[]; conditions?: string[]; medications?: string|null; contactName?: string|null; contactPhone?: string|null }, grantedBy: "patient"|"guardian"): Promise<{ token: string | null }>` — sets `emergency_access_enabled`, writes the profile fields, records/withdraws the `emergency_access` consent, and find-or-creates (enable) or revokes (disable) the emergency token. Returns the active token (or null when disabled).
- `rotateEmergencyToken(admin, patientId: string): Promise<string>` — revokes the current token, issues a new one.
- `resolveEmergencyToken(admin, token: string): Promise<{ patientId: string } | null>` — returns the patient iff the token exists, is not revoked, and the patient's `emergency_access_enabled` is true; else null.

- [ ] **Step 1: Add `'emergency_access'` to ConsentType** in `consents.ts:32-38` (append `| 'emergency_access'`).

- [ ] **Step 2: Implement `emergency.ts`** (token mirrors `wallet-link.findOrCreateWalletToken`; consent insert mirrors `process.ts`). Key bodies:

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import { generateEmergencyToken } from "./emergency-logic";
type Admin = ReturnType<typeof createAdminClient>;

async function findOrCreateToken(admin: Admin, patientId: string): Promise<string> {
  const { data } = await admin.from("emergency_tokens").select("token").eq("patient_id", patientId).eq("revoked", false).maybeSingle();
  if (data?.token) return data.token;
  const token = generateEmergencyToken();
  await admin.from("emergency_tokens").insert({ patient_id: patientId, token });
  return token;
}

export async function setEmergencyAccess(admin: Admin, patientId: string, enabled: boolean, profile: { bloodGroup?: string|null; allergies?: string[]; conditions?: string[]; medications?: string|null; contactName?: string|null; contactPhone?: string|null }, grantedBy: "patient"|"guardian"): Promise<{ token: string | null }> {
  await admin.from("patients").update({
    emergency_access_enabled: enabled,
    blood_group: profile.bloodGroup ?? null,
    known_allergies: profile.allergies ?? [],
    chronic_conditions: profile.conditions ?? [],
    emergency_medications: profile.medications ?? null,
    emergency_contact_name: profile.contactName ?? null,
    emergency_contact_phone: profile.contactPhone ?? null,
  }).eq("id", patientId);

  if (enabled) {
    // record standing consent (find-or-create, like the whatsapp_followup pattern)
    const { data: existing } = await admin.from("consent_records").select("id").eq("patient_id", patientId).eq("consent_type", "emergency_access").eq("granted", true).is("withdrawn_at", null).limit(1).maybeSingle();
    if (!existing) await admin.from("consent_records").insert({ patient_id: patientId, consent_type: "emergency_access", granted: true, granted_by: grantedBy, device_info: "emergency_profile" });
    return { token: await findOrCreateToken(admin, patientId) };
  }
  // disable: withdraw consent + revoke token
  await admin.from("consent_records").update({ withdrawn_at: new Date().toISOString() }).eq("patient_id", patientId).eq("consent_type", "emergency_access").is("withdrawn_at", null);
  await admin.from("emergency_tokens").update({ revoked: true }).eq("patient_id", patientId).eq("revoked", false);
  return { token: null };
}

export async function rotateEmergencyToken(admin: Admin, patientId: string): Promise<string> {
  await admin.from("emergency_tokens").update({ revoked: true }).eq("patient_id", patientId).eq("revoked", false);
  const token = generateEmergencyToken();
  await admin.from("emergency_tokens").insert({ patient_id: patientId, token });
  return token;
}

export async function resolveEmergencyToken(admin: Admin, token: string): Promise<{ patientId: string } | null> {
  const { data } = await admin.from("emergency_tokens").select("patient_id, revoked, patients!inner(emergency_access_enabled)").eq("token", token).maybeSingle();
  if (!data || data.revoked) return null;
  const enabled = (data as { patients?: { emergency_access_enabled?: boolean } }).patients?.emergency_access_enabled;
  return enabled ? { patientId: data.patient_id as string } : null;
}
```

- [ ] **Step 3: Type-check** — `npm run type-check --workspace glyph-web` clean. (No unit test here — DB-touching; covered by the smoke in Task 7. If the join shape in `resolveEmergencyToken` fights the generated types, do two selects instead: token row, then the patient's `emergency_access_enabled`.)

- [ ] **Step 4: Commit** — `git add apps/glyph/src/lib/services/emergency.ts apps/glyph/src/lib/services/consents.ts && git commit -m "feat(emergency): token + profile service, emergency_access consent type"`

---

### Task 4: WhatsApp emergency templates

**Files:**
- Modify: `apps/glyph/src/lib/whatsapp/templates.ts`

**Interfaces produced:** `EMERGENCY_FAMILY_TEMPLATE = "glyph_emergency_family"`, `EMERGENCY_HOSPITAL_TEMPLATE = "glyph_emergency_hospital"`; `familyAlertParams(patientName, area, hospitalName, timeText): string[]`; `hospitalAlertParams(area, bloodGroup, timeText): string[]`.

- [ ] **Step 1:** Add the constants + param helpers (mirroring `followupParams` etc.). The two templates must be created + approved in Meta separately (a prereq, not code). Param order is documented in the helper.

```ts
export const EMERGENCY_FAMILY_TEMPLATE = "glyph_emergency_family";
export const EMERGENCY_HOSPITAL_TEMPLATE = "glyph_emergency_hospital";
// family body: "{{1}} এর জন্য একটি জরুরি কোড স্ক্যান হয়েছে {{2}} এলাকায়, {{4}}। নিকটতম হাসপাতাল: {{3}}।"
export function familyAlertParams(patientName: string, area: string, hospitalName: string, timeText: string): string[] {
  return [patientName, area, hospitalName, timeText];
}
// hospital body (no patient name): "জরুরি রোগী আসছে {{1}} এলাকা থেকে। রক্তের গ্রুপ: {{2}}। সময়: {{3}}। (রোগী-প্রদত্ত তথ্য, যাচাই করুন।)"
export function hospitalAlertParams(area: string, bloodGroup: string, timeText: string): string[] {
  return [area, bloodGroup || "অজানা", timeText];
}
```

- [ ] **Step 2:** `npm run type-check --workspace glyph-web` clean. Commit — `git commit -am "feat(emergency): family + hospital WhatsApp template definitions"`

---

### Task 5: Scan orchestrator

**Files:**
- Modify: `apps/glyph/src/lib/services/emergency.ts` (add the orchestrator)

**Interfaces produced:**
- `interface StrangerView { state: "ok" | "inactive"; mapsUrl?: string; nearestHospitalName?: string | null; alertedHospitals?: number; familyNotified?: boolean }`
- `runEmergencyScan(admin, token: string, scan: { lat: number; lon: number } | null): Promise<StrangerView>` — resolves the token; if inactive → `{ state: "inactive" }`; else: enforce the 3-broadcasts/token/hour rate limit (query `emergency_scans` count in the last hour — over limit still routes + family-pings but skips the broadcast); insert an `emergency_scans` audit row; if `scan` coords present, compute `nearbyHospitals` (fetch `org_type='hospital'` with non-null lat/lon, radius 10), insert an `emergency_alerts` row per hospital (`minimal_dataset` = `buildMinimalSnapshot`, `expires_at` = now + 4h) and `sendTemplate(EMERGENCY_HOSPITAL_TEMPLATE)` to each `org.phone` (failure → mark that alert `delivery_status='failed'`, continue); `sendTemplate(EMERGENCY_FAMILY_TEMPLATE)` to the patient's `emergency_contact_phone` (failure logs, continues); update the scan row's `routed`/`broadcast_count`/`family_notified`; return the StrangerView with `mapsUrl` (from `mapsLinkNearestHospital` if coords) + `nearestHospitalName` (nearest in-range registered hospital or null) + counts. **Never returns any PHI field.**

- [ ] **Step 1: Implement `runEmergencyScan`** in `emergency.ts` using the Task-2 pure helpers, `sendTemplate` (`@/lib/whatsapp/send`), and the Task-4 template params. (Full body: resolve → rate-limit check → insert scan → broadcast loop → family send → update scan → build StrangerView.) Patient-notify (the "your code was scanned" message to the patient's own number) is best-effort via `sendTemplate` reusing the family template to the patient's `phone` if set; if no template path, skip (log) — do not block.

- [ ] **Step 2: Type-check** clean. Verified E2E by the Task-7 smoke (DB + network). Commit — `git commit -am "feat(emergency): scan orchestrator — audit, geo broadcast, family ping, stranger view (no PHI)"`

---

### Task 6: Public routes + stranger page + wallet profile UI

**Files:**
- Create: `apps/glyph/src/app/api/e/[token]/route.ts` (GET resolve)
- Create: `apps/glyph/src/app/api/e/[token]/scan/route.ts` (POST scan → `runEmergencyScan`)
- Create: `apps/glyph/src/app/e/[token]/page.tsx` (public client page)
- Create: `apps/glyph/src/app/api/wallet/[token]/emergency/route.ts` (GET profile, POST set/rotate — authed by the WALLET token)
- Modify: `apps/glyph/src/app/wallet/[token]/page.tsx` (add the Emergency Access card)

**Interfaces consumed:** `resolveEmergencyToken`, `runEmergencyScan`, `setEmergencyAccess`, `rotateEmergencyToken` (Task 3/5); `validateAccess` (wallet-logic) to authorize the wallet-token profile route; the `qrcode` dependency for the QR/card.

- [ ] **Step 1: `/api/e/[token]/route.ts` GET** — service-role; `resolveEmergencyToken`; return `{ state: "ok" }` (no PHI) or `{ state: "inactive" }` (404). Mirror `api/wallet/[token]/route.ts` structure (`export const runtime = "nodejs"`).
- [ ] **Step 2: `/api/e/[token]/scan/route.ts` POST** — body `{ lat?: number, lon?: number }`; call `runEmergencyScan(admin, token, coords)`; return the `StrangerView`. (Side-effects live here, not in GET, so crawlers/prefetch never fire the broadcast.)
- [ ] **Step 3: `/e/[token]/page.tsx`** — `"use client"`, no AuthGuard; on mount GET resolve; if ok, request `navigator.geolocation` (graceful if denied → POST with null coords); POST `/scan`; render the stranger view: "এই ব্যক্তির সাহায্য দরকার। নিকটতম হাসপাতাল: [name] — [directions link]। আমরা কাছের হাসপাতাল ও পরিবারকে জানিয়েছি। থামার জন্য ধন্যবাদ।" **No PHI rendered.** Copy lives as constants at the top of the file (Bangla, no em dashes/Devanagari).
- [ ] **Step 4: `/api/wallet/[token]/emergency/route.ts`** — GET returns the editable profile (authorized by the wallet token via `validateAccess`; this IS the patient, so PHI is allowed here, unlike the public `/e` route). POST `{ enabled, profile, action: "save"|"rotate" }` → `setEmergencyAccess` / `rotateEmergencyToken`; returns the emergency token (for the QR).
- [ ] **Step 5: Wallet card** in `wallet/[token]/page.tsx` — an "Emergency Access" card: toggle, edit fields (blood group / allergies / conditions / meds / contact), a QR (render the `/e/<token>` URL via `qrcode`) + a print-card view, and a Rotate button.
- [ ] **Step 6: Type-check + the existing suite** — `npm run type-check --workspace glyph-web` clean; `npm run test --workspace glyph-web` still 204+/all green. Commit — `git commit -am "feat(emergency): public scan route+page, wallet emergency-profile UI+API"`

---

### Task 7: E2E smoke

**Files:**
- Create: `scripts/smoke-emergency.mjs`

- [ ] **Step 1: Write the smoke** — usage `node scripts/smoke-emergency.mjs <APP_URL> <SUPABASE_URL> <SERVICE_KEY>`. Steps: seed a throwaway patient (owner-scoped) + enable emergency access via `setEmergencyAccess` (or the wallet emergency API) → get the emergency token; seed a NEAR hospital org (`org_type='hospital'`, lat/lon ~0.5 km away) and a FAR one (~50 km); GET `/api/e/<token>` (expect `state:"ok"`, and assert the JSON body contains **none** of `STRANGER_PHI_KEYS` values); POST `/api/e/<token>/scan` with coords at the patient/near-hospital location. Assert: an `emergency_scans` row exists; `emergency_alerts` has exactly ONE row (the near hospital, not the far one) with `expires_at` ~4h out and a `minimal_dataset` JSONB; the scan response JSON contains a `mapsUrl` and **no PHI strings** (grep the raw response for the blood group/allergy/med values → none). Cleanup in FK-safe order (emergency_alerts → emergency_scans → emergency_tokens → consent_records → patients → the two hospital orgs).
- [ ] **Step 2: Run** (deferred if no live stack, exactly like the front-door smoke) — `node --check` it; run against a live stack when available; report deferred otherwise. Do NOT fake a pass.
- [ ] **Step 3: Commit** — `git add scripts/smoke-emergency.mjs && git commit -m "test(emergency): E2E smoke — scan fires audit + geo broadcast, no PHI to stranger"`

---

## Prerequisites the build cannot satisfy in code (flag at handoff)

- **Two Meta-approved WhatsApp templates** (`glyph_emergency_family`, `glyph_emergency_hospital`) must be created + approved before family/hospital pings actually deliver. Until then the sends fail gracefully (logged, scan still routes + audits). This is the same template-approval gate Leg D has.
- **Hospital org geo:** the broadcast only reaches registered hospitals that have `latitude`/`longitude` set. On prod today that may be zero — the broadcast no-ops and routing + family still fire (by design).
- **Independent governance/clinical/legal review** before this is exposed to real patients — this is a life-safety, PHI-adjacent feature; the spec defers clinician break-glass for exactly this reason, but even v1 (broadcast of basics) warrants review before a real pilot.

## Notes for the implementer

- The stranger payload is the security boundary: when in doubt, leave a field OUT. The smoke's PHI-absence assertion is the gate.
- Family/hospital pings are **immediate** `sendTemplate` calls (an emergency cannot wait for the 5-minute scheduler cron), not enqueued.
- Reuse `wallet-logic` token mechanics and the `process.ts` consent-insert pattern; do not invent new token/consent machinery.
