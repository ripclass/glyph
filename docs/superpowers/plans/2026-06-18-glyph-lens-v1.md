# Glyph Lens v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the diagnostic-centre result pipeline — a centre's staff log in, create an order for a walk-in or known patient, enter/extract results, an AI normalizes + sanity-checks them, a qualified signatory signs → a **LabResult Verifiable Credential** (issued under the centre's DID) lands in the patient's wallet, publicly verifiable.

**Architecture:** Purely additive on top of the owner/scope foundation (migration 011, live in prod). A new `lab_orders` table (migration 012) carries the `ordered → resulted → signed` workflow, scoped to a `diagnostic_centre` organization via `memberships` RLS. Centre staff authenticate through a **parallel** `staff-store` + `StaffGuard` (the live doctor auth-store/AuthGuard is untouched). The signature uses the existing `issueCredential` seam with `issuer = { kind: 'organization', id: centreOrgId }` (orgs became DID-bearing principals in the foundation). On sign, a frozen `lab_reports` projection row is written so the **already-built wallet** (`/wallet/[token]`, which reads `lab_reports`) surfaces the signed result with no wallet changes. Free verification reuses `/api/verify`.

**Tech Stack:** Supabase Postgres (migration SQL + RLS), `@kham/schemas-clinical` (`labResultData`), `@kham/identity` via `lib/identity/issue.ts`, Supabase Edge Function (Deno) for AI normalize (Opus 4.8 primary, egress-gated), Next.js 14 App Router (centre routes + API), Zustand (staff-store), Vitest.

## Global Constraints

- **Chamber is untouched and provably so.** No change to `doctors`, the doctor `auth-store`, `AuthGuard`, the clinic RLS policies, or any migration ≤ 011. Gate: `scripts/smoke-path.mjs` stays **19/19** and `scripts/smoke-documents.mjs` stays **16/16**.
- **R1 — anchor to the DID, never `patient_id`.** The LabResult's subject is the patient-row DID minted via `ensureEntityIdentity`; the credential is the record, the rows are projections.
- **R2 — the centre is an owner, not a clinic.** `organizations.org_type = 'diagnostic_centre'`; centre staff are `memberships` rows, never `doctors`.
- **Issuer = the centre organization's DID** (founder decision 2026-06-18). The human signatory is recorded as `lab_orders.signatory_user_id` for accountability; the cryptographic issuer is the org.
- **Egress discipline (M4):** every external LLM call declares a tier. Image extraction = **Tier B** (consent-gated, reuses `extract-document`). AI normalize over structured values = **Tier A** (de-identified structured fields; no name/phone sent).
- **Models:** AI normalize primary `claude-opus-4-8`, fallback `gemini-2.0-flash`. Never invent model ids.
- **No Bangla strings inline in new components** — use `t('section.field')` via `useLanguage()`. Centre UI default language `bn`.
- **Standing ship-it gate:** this plan ends at local-green + docs. NO prod `supabase db push` / deploy without the founder's explicit "ship it."
- **No new UI libs.** Reuse `components/ui/*`, lucide, sonner, the `cn()` helper, the anchored design tokens (`glyph-*` lime/ink, `clinical-*`).

**Out of scope (mapped in the Lens spec, foundation-reserved — do NOT build here):** remote-radiologist draft→verify→sign loop, MedGemma vision co-interpretation (arrives with task B), trusted urgency-flagging, Chamber-sourced structured orders, paper-slip OCR, patient-initiated orders, cross-centre/cross-clinic trending (needs the R1 persons build), correction/revocation UI, billing.

---

## Key design decisions (rationale, so a fresh reviewer can veto before execution)

1. **`lab_orders` is a new workflow table; `lab_reports` stays the projection.** The order lifecycle (queue, draft results, normalize, signatory) needs mutable working state that `lab_reports` (frozen-on-credential) can't hold. On sign we issue the VC and write ONE frozen `lab_reports` row (`credential_id` set, `source='digital'`). The wallet already reads `lab_reports` → zero wallet-read changes.
2. **Centre-staff auth is parallel, not generalized.** A new `staff-store` + `StaffGuard` + `/center/*` routes read `memberships`/`organizations` (self-read RLS from migration 011). The live doctor `auth-store`/`AuthGuard`/`/doctor/*`/`/login` are byte-for-byte unchanged → Chamber risk is zero.
3. **Server-to-server edge auth via `LENS_SHARED_SECRET`** (same pattern as `TRIAGE_SHARED_SECRET`): the `lens-normalize` edge fn is deployed `--no-verify-jwt` and trusts only this secret; the Next route does the real staff+membership auth before calling it. Avoids re-implementing membership checks in Deno.
4. **`extract-document` gains an additive `extractOnly` flag** (defaults `false` = current behaviour) so Lens can pre-fill a draft from an image **without** creating a `lab_reports` row prematurely. Guarded; `smoke-documents.mjs` must stay 16/16.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/012_lab_orders.sql` | **Create:** `lab_orders` workflow table (owner-org scoped), status CHECK, freeze-on-credential trigger, member RLS, indexes. |
| `scripts/smoke-lens.mjs` | **Create:** live-DB + route E2E — centre/staff/membership setup, order→result→normalize→sign→LabResult VC→wallet projection→`/api/verify` ✓, plus RLS isolation between two centres. |
| `scripts/create-center.mjs` | **Create:** real centre onboarding (service-role): a `diagnostic_centre` org + a technologist + a signatory staff user with memberships (mirrors `create-doctor.mjs` safety rails). |
| `apps/glyph/src/lib/services/staff-logic.ts` | **Create:** pure session-shaping from membership rows + role-capability predicates (`canSign`, `canEnterResults`). |
| `apps/glyph/src/lib/services/staff-logic.test.ts` | **Create:** unit tests for shaping + role gates. |
| `apps/glyph/src/lib/stores/staff-store.ts` | **Create:** Zustand store: `checkStaffSession`, `signInWithEmail`, `signOut` (reads `memberships`+`organizations`). |
| `apps/glyph/src/components/center/StaffGuard.tsx` | **Create:** parallel guard; redirects to `/center/login` when no centre membership. |
| `apps/glyph/src/app/center/login/page.tsx` | **Create:** centre staff email/password login. |
| `apps/glyph/src/app/center/layout.tsx` | **Create:** `StaffGuard` + centre chrome (org name, role, sign-out). |
| `apps/glyph/src/app/center/page.tsx` | **Create:** centre dashboard — order queue (ordered / resulted / signed). |
| `apps/glyph/src/lib/services/lens-logic.ts` | **Create:** pure builders — `buildLabOrderRow`, `normalizeRawItem`, `buildLabResultData`, `KNOWN_TEST_CATEGORIES`. |
| `apps/glyph/src/lib/services/lens-logic.test.ts` | **Create:** unit tests for the builders. |
| `apps/glyph/src/app/api/center/orders/route.ts` | **Create:** POST create order (find-or-create patient: known by phone-in-org, or provisional via `createOwnedPatient`). |
| `apps/glyph/src/app/api/center/orders/[id]/results/route.ts` | **Create:** POST save draft results + optional image extraction (reuse `extract-document` `extractOnly`). |
| `apps/glyph/src/app/api/center/orders/[id]/normalize/route.ts` | **Create:** POST run AI normalize+sanity (calls `lens-normalize`), persist `normalized_results`+`sanity_flags`. |
| `apps/glyph/src/app/api/center/orders/[id]/sign/route.ts` | **Create:** POST sign → LabResult VC (issuer=org) + frozen `lab_reports` projection + status `signed` (one-shot 409). |
| `apps/glyph/src/app/center/orders/new/page.tsx` | **Create:** order intake form. |
| `apps/glyph/src/app/center/orders/[id]/page.tsx` | **Create:** result entry + normalize review + sign + wallet handoff. |
| `supabase/functions/lens-normalize/index.ts` | **Create:** Tier-A normalize+sanity edge fn (Opus 4.8 primary). |
| `supabase/functions/extract-document/index.ts` | **Modify:** add additive `extractOnly` flag (skip DB insert, return extracted). |
| `apps/glyph/src/lib/identity/projections.ts` | **Modify:** project `lab_result` credentials → `lab_reports` rows (mirror the prescription branch). |
| `apps/glyph/src/lib/identity/projections.test.ts` | **Create/Modify:** test the lab_result projection. |
| `apps/glyph/src/lib/supabase/types.ts` | **Regenerate** after migration 012. |
| `apps/glyph/src/lib/i18n/{bn,en}.json` | **Modify:** add the `center.*` and `lens.*` keys used by the new screens. |
| `CLAUDE.md` | **Modify:** record migration 012, the `lab_orders` table, `/center/*`, `lens-normalize`, `LENS_SHARED_SECRET`. |

---

### Task 1: Migration 012 — `lab_orders` workflow table + RLS + freeze trigger

**Files:**
- Create: `supabase/migrations/012_lab_orders.sql`
- Create: `scripts/smoke-lens.mjs` (Section A only in this task)

**Interfaces:**
- Produces: table `lab_orders` with columns `id, owner_org_id, patient_id, test_category, status('ordered'|'resulted'|'signed'|'revoked'), ordered_by, ordered_at, raw_results jsonb, result_image_path, resulted_by, resulted_at, normalized_results jsonb, sanity_flags jsonb, normalized_at, signatory_user_id, signed_at, credential_id, lab_report_id, created_at`; RLS policy `lab_orders_member_all`; trigger `trg_lab_orders_frozen`.

- [ ] **Step 1: Write the failing smoke (Section A)**

Create `scripts/smoke-lens.mjs`:

```js
/**
 * Live-DB + route E2E smoke for Lens v1 (migration 012 + the centre pipeline).
 *
 * Section A (service-role): lab_orders schema, status CHECK, freeze-on-credential.
 * Section B (added in later tasks): full order→result→normalize→sign→wallet→verify
 *   over the live Next routes, plus two-centre RLS isolation.
 *
 * Run on a LOCAL Supabase (keys from `supabase status -o env`):
 *   node scripts/smoke-lens.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>
 * (APP_URL unused until Section B; pass http://localhost:3000.)
 */

import { createClient } from '@supabase/supabase-js';

const [appUrl, url, anonKey, serviceKey] = process.argv.slice(2);
if (!url || !anonKey || !serviceKey) {
  console.error('usage: node scripts/smoke-lens.mjs <APP_URL> <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY>');
  process.exit(2);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

// ===== Section A: lab_orders schema + constraints =====
const { data: centre } = await db
  .from('organizations')
  .insert({ name: 'Lens Smoke Centre', org_type: 'diagnostic_centre' })
  .select('id')
  .single();
const { data: pat } = await db
  .from('patients')
  .insert({ owner_org_id: centre.id, clinic_id: null, name: 'Lens Smoke Patient' })
  .select('id')
  .single();

const { data: order, error: orderErr } = await db
  .from('lab_orders')
  .insert({ owner_org_id: centre.id, patient_id: pat.id, test_category: 'CBC' })
  .select('id, status')
  .single();
check('lab_orders insert defaults status=ordered', !orderErr && order?.status === 'ordered', orderErr?.message);

const { error: badStatusErr } = await db
  .from('lab_orders')
  .update({ status: 'teleported' })
  .eq('id', order.id);
check('lab_orders status CHECK rejects unknown status', Boolean(badStatusErr), badStatusErr?.message);

// freeze: simulate a credentialed order, then a results mutation must fail.
const { data: cred } = await db
  .from('credentials')
  .select('id')
  .limit(1)
  .maybeSingle();
if (cred?.id) {
  await db.from('lab_orders').update({ credential_id: cred.id, status: 'signed' }).eq('id', order.id);
  const { error: frozenErr } = await db
    .from('lab_orders')
    .update({ normalized_results: [{ testName: 'X', value: '1' }] })
    .eq('id', order.id);
  check('credentialed lab_order is frozen against results mutation', Boolean(frozenErr), frozenErr?.message);
} else {
  check('credentialed lab_order freeze (skipped — no credential row to borrow)', true, 'no-op on empty credentials');
}

// cleanup
await db.from('lab_orders').delete().eq('id', order.id);
await db.from('patients').delete().eq('id', pat.id);
await db.from('organizations').delete().eq('id', centre.id);

// ===== Section B added in later tasks (before this summary) =====

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 2: Run the smoke to verify it fails**

```bash
supabase status -o env   # copy API_URL, ANON_KEY, SERVICE_ROLE_KEY
node scripts/smoke-lens.mjs http://localhost:3000 <API_URL> <ANON_KEY> <SERVICE_ROLE_KEY>
```
Expected: FAIL — `relation "lab_orders" does not exist` on the first insert.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/012_lab_orders.sql`:

```sql
-- ============================================================
-- GLYPH — Lens v1: the diagnostic-centre order/result workflow (migration 012)
--
-- ADDITIVE on the owner/scope foundation (011). lab_orders is the centre's
-- mutable workflow (ordered → resulted → signed); the canonical record is the
-- LabResult credential, and lab_reports stays the frozen projection the wallet
-- already reads. Scoped to a diagnostic_centre via memberships RLS. Chamber and
-- every prior table/policy are untouched.
-- ============================================================

CREATE TABLE lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- the diagnostic_centre that owns this order (R2: an owner, not a clinic)
  owner_org_id UUID NOT NULL REFERENCES organizations(id),
  -- the patient (walk-in/provisional under the centre, or a known patient row)
  patient_id UUID NOT NULL REFERENCES patients(id),
  test_category TEXT NOT NULL,            -- CBC / RFT / LFT / HbA1c / Thyroid / ...
  status TEXT NOT NULL DEFAULT 'ordered'
    CHECK (status IN ('ordered', 'resulted', 'signed', 'revoked')),

  ordered_by UUID REFERENCES auth.users(id),
  ordered_at TIMESTAMPTZ DEFAULT now(),

  -- result draft (technologist enters; optionally pre-filled from an image)
  raw_results JSONB,                      -- [{name,value,unit,range,isAbnormal,severity}]
  result_image_path TEXT,                 -- optional Tier-B extraction source
  resulted_by UUID REFERENCES auth.users(id),
  resulted_at TIMESTAMPTZ,

  -- AI normalize output (the "same test, comparable answer" beat)
  normalized_results JSONB,               -- [{testName,value,unit,referenceRange,isAbnormal,severity}]
  sanity_flags JSONB,                     -- [{message,severity}]
  normalized_at TIMESTAMPTZ,

  -- signature: WHICH human authorized (accountability); issuer DID is the org
  signatory_user_id UUID REFERENCES auth.users(id),
  signed_at TIMESTAMPTZ,
  credential_id UUID REFERENCES credentials(id),  -- the LabResult VC (freezes the row)
  lab_report_id UUID REFERENCES lab_reports(id),  -- the projected wallet row

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_lab_orders_org_status ON lab_orders(owner_org_id, status);
CREATE INDEX idx_lab_orders_patient ON lab_orders(patient_id);

-- Once credentialed, the order's clinical content is frozen — amend only by
-- issuing a replacement credential (mirrors lab_reports_frozen from 002).
CREATE OR REPLACE FUNCTION lab_orders_frozen()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.credential_id IS NOT NULL AND (
       NEW.normalized_results IS DISTINCT FROM OLD.normalized_results
    OR NEW.raw_results        IS DISTINCT FROM OLD.raw_results
    OR NEW.credential_id      IS DISTINCT FROM OLD.credential_id
  ) THEN
    RAISE EXCEPTION 'lab order is credentialed and frozen: amend by issuing a new credential';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lab_orders_frozen
  BEFORE UPDATE ON lab_orders
  FOR EACH ROW EXECUTE FUNCTION lab_orders_frozen();

-- RLS: a centre staffer (member of owner_org_id) reads/writes their orders.
-- Service-role routes bypass RLS for writes; this powers the staff-JWT dashboard
-- read and proves cross-centre isolation.
ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lab_orders_member_all" ON lab_orders FOR ALL
  USING (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()))
  WITH CHECK (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()));
```

- [ ] **Step 4: Apply + run the smoke to verify Section A passes**

```bash
supabase db reset
node scripts/smoke-lens.mjs http://localhost:3000 <API_URL> <ANON_KEY> <SERVICE_ROLE_KEY>
```
Expected: every Section A line `PASS`; final line `ALL CHECKS PASSED`. (`db reset` applies 001–012 + seed cleanly.)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/012_lab_orders.sql scripts/smoke-lens.mjs
git commit -m "feat(lens): lab_orders workflow table + member RLS + freeze trigger (migration 012)"
```

---

### Task 2: Centre-staff auth — pure session logic + store + guard + login

**Files:**
- Create: `apps/glyph/src/lib/services/staff-logic.ts`
- Create: `apps/glyph/src/lib/services/staff-logic.test.ts`
- Create: `apps/glyph/src/lib/stores/staff-store.ts`
- Create: `apps/glyph/src/components/center/StaffGuard.tsx`
- Create: `apps/glyph/src/app/center/login/page.tsx`
- Regenerate first: `apps/glyph/src/lib/supabase/types.ts`

**Interfaces:**
- Produces: `StaffSession { userId, orgId, orgName, orgType, role }`; `shapeStaffSession(rows): StaffSession | null`; `canSign(role): boolean`; `canEnterResults(role): boolean`; Zustand `useStaffStore` with `{ staff, isLoading, signInWithEmail, signOut, checkStaffSession }`; `<StaffGuard>`.

- [ ] **Step 1: Regenerate types so app code sees `lab_orders`**

```bash
supabase gen types typescript --local > apps/glyph/src/lib/supabase/types.ts
grep -n "lab_orders:" apps/glyph/src/lib/supabase/types.ts | head -1
```
Expected: a match. (Run after migration 012 applied in Task 1.)

- [ ] **Step 2: Write the failing test (pure logic)**

Create `apps/glyph/src/lib/services/staff-logic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { shapeStaffSession, canSign, canEnterResults } from './staff-logic';

const row = (over = {}) => ({
  user_id: 'u1',
  role: 'technologist',
  organizations: { id: 'org1', name: 'Popular Diagnostics', org_type: 'diagnostic_centre' },
  ...over,
});

describe('shapeStaffSession', () => {
  it('picks a diagnostic_centre membership and shapes a session', () => {
    const s = shapeStaffSession([row()]);
    expect(s).toEqual({ userId: 'u1', orgId: 'org1', orgName: 'Popular Diagnostics', orgType: 'diagnostic_centre', role: 'technologist' });
  });

  it('ignores non-centre memberships (e.g. a clinic org)', () => {
    const clinic = row({ organizations: { id: 'c1', name: 'Clinic', org_type: 'clinic' }, role: 'doctor' });
    expect(shapeStaffSession([clinic])).toBeNull();
  });

  it('prefers the centre membership when both exist', () => {
    const clinic = row({ organizations: { id: 'c1', name: 'Clinic', org_type: 'clinic' }, role: 'doctor' });
    const s = shapeStaffSession([clinic, row()]);
    expect(s?.orgType).toBe('diagnostic_centre');
  });

  it('returns null for empty/no memberships', () => {
    expect(shapeStaffSession([])).toBeNull();
    expect(shapeStaffSession(null)).toBeNull();
  });
});

describe('role capabilities', () => {
  it('canSign: signatory/owner/admin only', () => {
    expect(canSign('signatory')).toBe(true);
    expect(canSign('owner')).toBe(true);
    expect(canSign('admin')).toBe(true);
    expect(canSign('technologist')).toBe(false);
    expect(canSign('staff')).toBe(false);
  });
  it('canEnterResults: technologist + signers, not plain staff', () => {
    expect(canEnterResults('technologist')).toBe(true);
    expect(canEnterResults('signatory')).toBe(true);
    expect(canEnterResults('staff')).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test --workspace glyph-web -- staff-logic`
Expected: FAIL — module `./staff-logic` not found.

- [ ] **Step 4: Write the pure logic**

Create `apps/glyph/src/lib/services/staff-logic.ts`:

```ts
/**
 * @fileoverview Pure session-shaping + role capabilities for diagnostic-centre
 * staff (Lens). No Supabase/network — orchestration lives in staff-store.ts.
 * R2: a centre is an owner (org_type='diagnostic_centre'); staff are memberships,
 * never doctors. The live doctor auth path is untouched.
 *
 * @module lib/services/staff-logic
 */

export type StaffRole = 'owner' | 'admin' | 'doctor' | 'technologist' | 'signatory' | 'staff';

export interface StaffSession {
  userId: string;
  orgId: string;
  orgName: string;
  orgType: string;
  role: StaffRole;
}

interface MembershipRow {
  user_id: string;
  role: string;
  organizations: { id: string; name: string; org_type: string } | null;
}

/** Picks the diagnostic_centre membership (if any) and shapes a centre session. */
export function shapeStaffSession(rows: MembershipRow[] | null | undefined): StaffSession | null {
  if (!Array.isArray(rows)) return null;
  const centre = rows.find((r) => r.organizations?.org_type === 'diagnostic_centre');
  if (!centre || !centre.organizations) return null;
  return {
    userId: centre.user_id,
    orgId: centre.organizations.id,
    orgName: centre.organizations.name,
    orgType: centre.organizations.org_type,
    role: centre.role as StaffRole,
  };
}

const SIGN_ROLES: StaffRole[] = ['signatory', 'owner', 'admin'];
const RESULT_ROLES: StaffRole[] = ['technologist', 'signatory', 'owner', 'admin'];

/** Only a qualified signatory (or owner/admin) may sign → LabResult credential. */
export function canSign(role: string): boolean {
  return SIGN_ROLES.includes(role as StaffRole);
}

/** Technologists and signers may enter/extract results. */
export function canEnterResults(role: string): boolean {
  return RESULT_ROLES.includes(role as StaffRole);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test --workspace glyph-web -- staff-logic`
Expected: PASS (8 assertions across the suites).

- [ ] **Step 6: Write the staff store**

Create `apps/glyph/src/lib/stores/staff-store.ts`:

```ts
'use client';

/**
 * @fileoverview Centre-staff session store (Lens). PARALLEL to auth-store.ts —
 * it reads memberships+organizations, never the doctors table. Keeping it
 * separate means the live doctor auth path is untouched (Chamber-safe).
 */

import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { shapeStaffSession, type StaffSession } from '@/lib/services/staff-logic';

interface StaffState {
  staff: StaffSession | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkStaffSession: () => Promise<void>;
}

export const useStaffStore = create<StaffState>((set) => ({
  staff: null,
  isLoading: true,

  signInWithEmail: async (email, password) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  },

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ staff: null });
  },

  checkStaffSession: async () => {
    set({ isLoading: true });
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ staff: null, isLoading: false });
      return;
    }
    // membership_self_read RLS scopes this to the signed-in user.
    const { data: rows } = await supabase
      .from('memberships')
      .select('user_id, role, organizations(id, name, org_type)');
    set({ staff: shapeStaffSession(rows as never), isLoading: false });
  },
}));
```

- [ ] **Step 7: Write the StaffGuard**

Create `apps/glyph/src/components/center/StaffGuard.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStaffStore } from '@/lib/stores/staff-store';

/** Parallel to AuthGuard: gates /center/* on a diagnostic_centre membership. */
export function StaffGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const staff = useStaffStore((s) => s.staff);
  const isLoading = useStaffStore((s) => s.isLoading);
  const checkStaffSession = useStaffStore((s) => s.checkStaffSession);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!checkedRef.current) {
      checkedRef.current = true;
      void checkStaffSession();
    }
  }, [checkStaffSession]);

  useEffect(() => {
    if (checkedRef.current && !isLoading && !staff) {
      router.replace('/center/login');
    }
  }, [isLoading, staff, router]);

  if (isLoading || !staff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clinical-bg">
        <p className="text-sm text-clinical-muted">Loading…</p>
      </div>
    );
  }
  return <>{children}</>;
}
```

- [ ] **Step 8: Write the centre login page**

Create `apps/glyph/src/app/center/login/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useStaffStore } from '@/lib/stores/staff-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CenterLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const signInWithEmail = useStaffStore((s) => s.signInWithEmail);
  const checkStaffSession = useStaffStore((s) => s.checkStaffSession);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || submitting) return;
    setSubmitting(true);
    try {
      await signInWithEmail(email, password);
      await checkStaffSession();
      const staff = useStaffStore.getState().staff;
      if (!staff) {
        toast.error('Signed in, but this account is not a diagnostic centre member.');
        return;
      }
      toast.success(staff.orgName);
      router.push('/center');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-clinical-bg p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl border border-line bg-white p-6">
        <h1 className="text-lg font-semibold text-ink">Glyph Lens — Centre sign in</h1>
        <Input type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? '…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 9: Type-check + commit**

```bash
npm run type-check --workspace glyph-web
git add apps/glyph/src/lib/services/staff-logic.ts apps/glyph/src/lib/services/staff-logic.test.ts \
  apps/glyph/src/lib/stores/staff-store.ts apps/glyph/src/components/center/StaffGuard.tsx \
  apps/glyph/src/app/center/login/page.tsx apps/glyph/src/lib/supabase/types.ts
git commit -m "feat(lens): centre-staff auth — staff-logic + staff-store + StaffGuard + /center/login"
```

---

### Task 3: Centre onboarding script + centre layout + dashboard

**Files:**
- Create: `scripts/create-center.mjs`
- Create: `apps/glyph/src/app/center/layout.tsx`
- Create: `apps/glyph/src/app/center/page.tsx`

**Interfaces:**
- Consumes: `lab_orders` (Task 1), `StaffGuard` + `useStaffStore` (Task 2).
- Produces: a real centre + technologist + signatory in the DB; the centre dashboard reading `lab_orders` via the staff JWT (RLS-scoped).

- [ ] **Step 1: Write the onboarding script**

Create `scripts/create-center.mjs`:

```js
/**
 * Real diagnostic-centre onboarding (service-role). Creates a diagnostic_centre
 * organization + a technologist + a signatory auth user, each with a membership.
 * No self-signup exists by design (mirrors create-doctor.mjs).
 *
 *   node scripts/create-center.mjs <SUPABASE_URL> <SERVICE_KEY> \
 *     --name "Popular Diagnostics, Dhanmondi" [--district Dhaka] [--phone 02...] \
 *     --tech-email t@centre.bd --tech-password .. --tech-name "Tech Name" \
 *     --signer-email s@centre.bd --signer-password .. --signer-name "Dr. Signatory"
 */

import { createClient } from '@supabase/supabase-js';

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const url = process.argv[2];
const serviceKey = process.argv[3];
const name = arg('--name');
if (!url || !serviceKey || !name) {
  console.error('usage: node scripts/create-center.mjs <SUPABASE_URL> <SERVICE_KEY> --name ".." [--district ..] [--phone ..] --tech-email .. --tech-password .. --tech-name .. --signer-email .. --signer-password .. --signer-name ..');
  process.exit(2);
}
if (/\.supabase\.co/.test(url) && !process.argv.includes('--prod')) {
  console.error('Refusing a non-local URL without --prod (safety rail).');
  process.exit(2);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: org, error: orgErr } = await db
  .from('organizations')
  .insert({ name, org_type: 'diagnostic_centre', district: arg('--district') ?? null, phone: arg('--phone') ?? null })
  .select('id')
  .single();
if (orgErr) { console.error('org insert failed:', orgErr.message); process.exit(1); }
console.log('centre org:', org.id);

async function addStaff(emailFlag, pwFlag, nameFlag, role) {
  const email = arg(emailFlag), password = arg(pwFlag);
  if (!email || !password) return;
  const { data: u, error: uErr } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (uErr) { console.error(`${role} user failed:`, uErr.message); process.exit(1); }
  const { error: mErr } = await db.from('memberships').insert({ user_id: u.user.id, organization_id: org.id, role });
  if (mErr) { console.error(`${role} membership failed:`, mErr.message); process.exit(1); }
  console.log(`${role}:`, email, '→', u.user.id, `(${arg(nameFlag) ?? ''})`);
}

await addStaff('--tech-email', '--tech-password', '--tech-name', 'technologist');
await addStaff('--signer-email', '--signer-password', '--signer-name', 'signatory');
console.log('DONE');
```

- [ ] **Step 2: Verify it creates a centre locally**

```bash
node scripts/create-center.mjs <API_URL> <SERVICE_ROLE_KEY> \
  --name "Lens Dev Centre" --district Dhaka \
  --tech-email tech@lens.dev --tech-password lens-dev-2026 --tech-name "Tech Dev" \
  --signer-email signer@lens.dev --signer-password lens-dev-2026 --signer-name "Dr. Signer Dev"
```
Expected: prints `centre org: <uuid>`, `technologist: …`, `signatory: …`, `DONE`. (Used for the browser pass + Section B smoke.)

- [ ] **Step 3: Write the centre layout**

Create `apps/glyph/src/app/center/layout.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { StaffGuard } from '@/components/center/StaffGuard';
import { useStaffStore } from '@/lib/stores/staff-store';
import { Button } from '@/components/ui/button';

function CenterChrome({ children }: { children: React.ReactNode }) {
  const staff = useStaffStore((s) => s.staff);
  const signOut = useStaffStore((s) => s.signOut);
  return (
    <div className="min-h-screen bg-clinical-bg">
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3">
        <Link href="/center" className="font-semibold text-ink">{staff?.orgName ?? 'Glyph Lens'}</Link>
        <div className="flex items-center gap-3 text-sm text-clinical-muted">
          <span>{staff?.role}</span>
          <Button variant="ghost" onClick={() => void signOut()}>Sign out</Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-4">{children}</main>
    </div>
  );
}

export default function CenterLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffGuard>
      <CenterChrome>{children}</CenterChrome>
    </StaffGuard>
  );
}
```

Note: `/center/login` is OUTSIDE this layout group's guard by virtue of being a sibling route that renders before the guard resolves; if Next nests it under this layout, move `login/` to a route group `(public)` — but with App Router, `/center/login/page.tsx` shares `/center/layout.tsx`. To avoid the guard wrapping login, keep login self-contained and let the guard's `checkStaffSession` no-op redirect to itself harmlessly (it already renders its own full-screen form before redirect fires). Verified acceptable in Step 6 browser pass; if it loops, relocate login to `apps/glyph/src/app/center-login/page.tsx` and update the redirect target.

- [ ] **Step 4: Write the dashboard (order queue)**

Create `apps/glyph/src/app/center/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

interface OrderRow {
  id: string;
  test_category: string;
  status: string;
  ordered_at: string;
  patients: { name: string } | null;
}

export default function CenterDashboard() {
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from('lab_orders')
      .select('id, test_category, status, ordered_at, patients(name)')
      .order('ordered_at', { ascending: false })
      .then(({ data }) => setOrders((data as never) ?? []));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Orders</h1>
        <Link href="/center/orders/new"><Button>New order</Button></Link>
      </div>
      <ul className="space-y-2">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/center/orders/${o.id}`} className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-3">
              <span className="text-ink">{o.patients?.name ?? '—'} · {o.test_category}</span>
              <span className="rounded-full bg-glyph-50 px-2 py-0.5 text-xs text-ink">{o.status}</span>
            </Link>
          </li>
        ))}
        {orders.length === 0 && <li className="text-sm text-clinical-muted">No orders yet.</li>}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Type-check + commit**

```bash
npm run type-check --workspace glyph-web
git add scripts/create-center.mjs apps/glyph/src/app/center/layout.tsx apps/glyph/src/app/center/page.tsx
git commit -m "feat(lens): centre onboarding script + /center layout + dashboard queue"
```

- [ ] **Step 6: Browser pass (manual)**

Run `npm run dev`, visit `/center/login`, sign in as `tech@lens.dev`, confirm redirect to `/center` with the centre name in the header and an empty queue. Confirm `/doctor` still works for `doctor@glyph.dev` (Chamber unbroken). If login loops, apply the relocation note in Step 3.

---

### Task 4: Order creation — pure builders + the create-order route + intake form

**Files:**
- Create: `apps/glyph/src/lib/services/lens-logic.ts`
- Create: `apps/glyph/src/lib/services/lens-logic.test.ts`
- Create: `apps/glyph/src/app/api/center/orders/route.ts`
- Create: `apps/glyph/src/app/center/orders/new/page.tsx`

**Interfaces:**
- Consumes: `createOwnedPatient`/`ensureKhamHoldingOrg` (organizations.ts), `lab_orders` (Task 1), staff auth (Task 2).
- Produces: `KNOWN_TEST_CATEGORIES: string[]`; `buildLabOrderRow({ ownerOrgId, patientId, testCategory, orderedBy }): {...}`; `normalizeRawItem(raw): LabResultItem`; POST `/api/center/orders` → `{ orderId, patientId }`.

- [ ] **Step 1: Write the failing test**

Create `apps/glyph/src/lib/services/lens-logic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildLabOrderRow, normalizeRawItem, KNOWN_TEST_CATEGORIES } from './lens-logic';

describe('buildLabOrderRow', () => {
  it('builds an ordered row with the centre as owner', () => {
    const row = buildLabOrderRow({ ownerOrgId: 'org1', patientId: 'p1', testCategory: 'CBC', orderedBy: 'u1' });
    expect(row).toEqual({ owner_org_id: 'org1', patient_id: 'p1', test_category: 'CBC', ordered_by: 'u1', status: 'ordered' });
  });
  it('trims the test category and rejects empty', () => {
    expect(buildLabOrderRow({ ownerOrgId: 'o', patientId: 'p', testCategory: '  RFT ', orderedBy: 'u' }).test_category).toBe('RFT');
    expect(() => buildLabOrderRow({ ownerOrgId: 'o', patientId: 'p', testCategory: '   ', orderedBy: 'u' })).toThrow();
  });
});

describe('normalizeRawItem', () => {
  it('maps extract-document shape ({name,range}) to LabResultItem ({testName,referenceRange})', () => {
    const item = normalizeRawItem({ name: 'Hemoglobin', value: '9.1', unit: 'g/dL', range: '13-17', isAbnormal: true, severity: 'moderate' });
    expect(item).toEqual({ testName: 'Hemoglobin', value: '9.1', unit: 'g/dL', referenceRange: '13-17', isAbnormal: true, severity: 'moderate' });
  });
  it('coerces value to string and drops a non-enum severity', () => {
    const item = normalizeRawItem({ name: 'WBC', value: 11000 });
    expect(item.value).toBe('11000');
    expect(item.severity).toBeUndefined();
  });
  it('throws on a missing test name', () => {
    expect(() => normalizeRawItem({ value: '1' })).toThrow();
  });
});

describe('KNOWN_TEST_CATEGORIES', () => {
  it('includes the common BD panels', () => {
    expect(KNOWN_TEST_CATEGORIES).toEqual(expect.arrayContaining(['CBC', 'RFT', 'LFT', 'HbA1c', 'Lipid Profile', 'Thyroid', 'Urine R/E']));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace glyph-web -- lens-logic`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the pure builders**

Create `apps/glyph/src/lib/services/lens-logic.ts`:

```ts
/**
 * @fileoverview Pure builders for the Lens order/result pipeline. No Supabase —
 * orchestration is in the /api/center routes. Bridges the extract-document
 * output shape ({name,range,severity:'normal'|...}) to the @kham/schemas-clinical
 * LabResultItem shape ({testName,referenceRange,severity:'mild'|...}).
 *
 * @module lib/services/lens-logic
 */

export const KNOWN_TEST_CATEGORIES = [
  'CBC', 'RFT', 'LFT', 'HbA1c', 'Lipid Profile', 'Thyroid', 'Urine R/E',
  'Blood Sugar', 'Electrolytes', 'CRP', 'Other',
] as const;

const SEVERITIES = ['mild', 'moderate', 'severe', 'critical'] as const;
type Severity = (typeof SEVERITIES)[number];

export interface LabResultItem {
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
  severity?: Severity;
}

export interface BuildLabOrderInput {
  ownerOrgId: string;
  patientId: string;
  testCategory: string;
  orderedBy: string;
}

export function buildLabOrderRow(input: BuildLabOrderInput) {
  const test_category = input.testCategory.trim();
  if (!test_category) throw new Error('Test category is required');
  return {
    owner_org_id: input.ownerOrgId,
    patient_id: input.patientId,
    test_category,
    ordered_by: input.orderedBy,
    status: 'ordered' as const,
  };
}

/** Normalizes one raw result row (extract-document or manual) to a LabResultItem. */
export function normalizeRawItem(raw: Record<string, unknown>): LabResultItem {
  const testName = String((raw.testName ?? raw.name ?? '')).trim();
  if (!testName) throw new Error('Result item requires a test name');
  const sevRaw = String(raw.severity ?? '').toLowerCase();
  const severity = (SEVERITIES as readonly string[]).includes(sevRaw) ? (sevRaw as Severity) : undefined;
  const unit = raw.unit != null ? String(raw.unit) : undefined;
  const referenceRange = (raw.referenceRange ?? raw.range) != null ? String(raw.referenceRange ?? raw.range) : undefined;
  return {
    testName,
    value: String(raw.value ?? ''),
    ...(unit ? { unit } : {}),
    ...(referenceRange ? { referenceRange } : {}),
    ...(raw.isAbnormal != null ? { isAbnormal: Boolean(raw.isAbnormal) } : {}),
    ...(severity ? { severity } : {}),
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test --workspace glyph-web -- lens-logic`
Expected: PASS.

- [ ] **Step 5: Write the create-order route**

Create `apps/glyph/src/app/api/center/orders/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { createOwnedPatient } from '@/lib/services/organizations';
import { buildLabOrderRow } from '@/lib/services/lens-logic';
import { shapeStaffSession } from '@/lib/services/staff-logic';
import type { Database } from '@/lib/supabase/types';

/** POST /api/center/orders — create an order for a known or walk-in patient. */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ success: false, error: 'Missing authorization header' }, { status: 401 });

  const userClient = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

  // Resolve the staff session via RLS-scoped memberships (proves centre membership).
  const { data: memRows } = await userClient
    .from('memberships')
    .select('user_id, role, organizations(id, name, org_type)');
  const staff = shapeStaffSession(memRows as never);
  if (!staff) return NextResponse.json({ success: false, error: 'Not a diagnostic centre member' }, { status: 403 });

  const body = await req.json();
  const { patientName, phone, age, gender, testCategory, existingPatientId } = body ?? {};
  if (!testCategory) return NextResponse.json({ success: false, error: 'testCategory is required' }, { status: 400 });

  const admin = createAdminClient();

  // Patient resolution: an explicit known patient (must belong to this centre),
  // a phone match within the centre, or a new provisional patient owned by the centre.
  let patientId: string | null = null;
  if (existingPatientId) {
    const { data: owned } = await admin
      .from('patients').select('id').eq('id', existingPatientId).eq('owner_org_id', staff.orgId).maybeSingle();
    if (!owned) return NextResponse.json({ success: false, error: 'Patient not in this centre' }, { status: 403 });
    patientId = owned.id;
  } else if (phone) {
    const { data: match } = await admin
      .from('patients').select('id').eq('owner_org_id', staff.orgId).eq('phone', phone).maybeSingle();
    patientId = match?.id ?? null;
  }
  if (!patientId) {
    if (!patientName) return NextResponse.json({ success: false, error: 'patientName is required for a new patient' }, { status: 400 });
    const created = await createOwnedPatient(admin, {
      ownerOrgId: staff.orgId, name: patientName, phone: phone ?? null,
      age: age ?? null, gender: gender ?? null,
    });
    patientId = created.id;
  }

  const row = buildLabOrderRow({ ownerOrgId: staff.orgId, patientId, testCategory, orderedBy: user.id });
  const { data: order, error } = await admin.from('lab_orders').insert(row).select('id').single();
  if (error || !order) return NextResponse.json({ success: false, error: error?.message ?? 'insert failed' }, { status: 500 });

  return NextResponse.json({ success: true, data: { orderId: order.id, patientId } });
}
```

- [ ] **Step 6: Write the order intake form**

Create `apps/glyph/src/app/center/orders/new/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { KNOWN_TEST_CATEGORIES } from '@/lib/services/lens-logic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NewOrderPage() {
  const router = useRouter();
  const [form, setForm] = useState({ patientName: '', phone: '', age: '', gender: '', testCategory: 'CBC' });
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/center/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          patientName: form.patientName, phone: form.phone || null,
          age: form.age ? Number(form.age) : null, gender: form.gender || null,
          testCategory: form.testCategory,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      router.push(`/center/orders/${json.data.orderId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create order');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-white p-6">
      <h1 className="text-lg font-semibold text-ink">New order</h1>
      <Input placeholder="Patient name" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
      <Input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <div className="flex gap-3">
        <Input placeholder="Age" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
        <select className="rounded-md border border-line px-3" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
          <option value="">gender</option><option value="male">male</option><option value="female">female</option><option value="other">other</option>
        </select>
      </div>
      <select className="w-full rounded-md border border-line px-3 py-2" value={form.testCategory} onChange={(e) => setForm({ ...form, testCategory: e.target.value })}>
        {KNOWN_TEST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <Button type="submit" className="w-full" disabled={submitting}>{submitting ? '…' : 'Create order'}</Button>
    </form>
  );
}
```

- [ ] **Step 7: Type-check + commit**

```bash
npm run type-check --workspace glyph-web
git add apps/glyph/src/lib/services/lens-logic.ts apps/glyph/src/lib/services/lens-logic.test.ts \
  apps/glyph/src/app/api/center/orders/route.ts apps/glyph/src/app/center/orders/new/page.tsx
git commit -m "feat(lens): order creation — lens-logic builders + create-order route + intake form"
```

---

### Task 5: Result entry — `extractOnly` flag + draft-results route + result UI

**Files:**
- Modify: `supabase/functions/extract-document/index.ts`
- Create: `apps/glyph/src/app/api/center/orders/[id]/results/route.ts`
- Modify: `apps/glyph/src/app/center/orders/[id]/page.tsx` (created here as the order detail screen)

**Interfaces:**
- Consumes: `normalizeRawItem` (Task 4), `extract-document` (now with `extractOnly`).
- Produces: POST `/api/center/orders/[id]/results` → `{ rawResults }`; the order-detail page renders result rows + an image-extract button.

- [ ] **Step 1: Add the additive `extractOnly` flag to extract-document**

In `supabase/functions/extract-document/index.ts`, where the request body is parsed:

```typescript
const { imageUrl, type, visitId, patientId, consentId, extractOnly } = await req.json();
```

After the LLM call produces `extracted` and BEFORE the `serviceClient.from(...).insert(...)` DB write, insert this early return (additive; default `extractOnly` is falsy → existing behaviour unchanged):

```typescript
// Lens reuse: return the extracted structure WITHOUT projecting a row. The
// centre flow holds results as a lab_orders draft until signing; only the sign
// step writes the frozen lab_reports projection. Chamber/bridge paths omit the
// flag and keep inserting as before.
if (extractOnly === true) {
  return jsonResponse({ success: true, data: extracted });
}
```

- [ ] **Step 2: Regression — extract-document's default path is unchanged**

```bash
supabase functions serve extract-document &   # or rely on the full smoke below
node scripts/smoke-documents.mjs <FUNCTIONS_URL> <SUPABASE_URL> <ANON> <SERVICE>
```
Expected: **16/16** (the flag defaults off; the document pipeline is untouched). If anything regresses, STOP.

- [ ] **Step 3: Write the draft-results route**

Create `apps/glyph/src/app/api/center/orders/[id]/results/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { shapeStaffSession, canEnterResults } from '@/lib/services/staff-logic';
import { normalizeRawItem } from '@/lib/services/lens-logic';
import type { Database } from '@/lib/supabase/types';

async function resolveStaffOrder(authHeader: string, orderId: string) {
  const userClient = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: 'Invalid token', status: 401 as const };
  const { data: memRows } = await userClient
    .from('memberships').select('user_id, role, organizations(id, name, org_type)');
  const staff = shapeStaffSession(memRows as never);
  if (!staff) return { error: 'Not a centre member', status: 403 as const };
  const admin = createAdminClient();
  const { data: order } = await admin
    .from('lab_orders').select('*').eq('id', orderId).eq('owner_org_id', staff.orgId).maybeSingle();
  if (!order) return { error: 'Order not found in this centre', status: 404 as const };
  return { user, staff, admin, order };
}

/** POST /api/center/orders/[id]/results — save a draft of entered/extracted results. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ success: false, error: 'Missing authorization header' }, { status: 401 });
  const ctx = await resolveStaffOrder(authHeader, params.id);
  if ('error' in ctx) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });
  const { staff, admin, order } = ctx;

  if (!canEnterResults(staff.role)) return NextResponse.json({ success: false, error: 'Role cannot enter results' }, { status: 403 });
  if (order.credential_id) return NextResponse.json({ success: false, error: 'Order is signed and frozen' }, { status: 409 });

  const body = await req.json();
  const rawItems: Array<Record<string, unknown>> = Array.isArray(body?.rawResults) ? body.rawResults : [];
  let normalized;
  try {
    normalized = rawItems.map(normalizeRawItem);
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'bad result item' }, { status: 400 });
  }

  const { error } = await admin
    .from('lab_orders')
    .update({
      raw_results: normalized as never,
      result_image_path: body?.resultImagePath ?? order.result_image_path ?? null,
      resulted_by: ctx.user.id,
      resulted_at: new Date().toISOString(),
      status: 'resulted',
    })
    .eq('id', order.id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data: { rawResults: normalized } });
}
```

- [ ] **Step 4: Write the order-detail screen (result entry section)**

Create `apps/glyph/src/app/center/orders/[id]/page.tsx`. (Normalize + sign sections are added in Tasks 6 + 7; this step ships the result-entry surface.)

```tsx
'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ResultItem { testName: string; value: string; unit?: string; referenceRange?: string }

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<any>(null);
  const [rows, setRows] = useState<ResultItem[]>([{ testName: '', value: '', unit: '', referenceRange: '' }]);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from('lab_orders').select('*, patients(name)').eq('id', params.id).maybeSingle();
    setOrder(data);
    if (Array.isArray((data as any)?.raw_results) && (data as any).raw_results.length) setRows((data as any).raw_results);
  }
  useEffect(() => { void load(); }, [params.id]);

  async function token() {
    const { data: { session } } = await createClient().auth.getSession();
    return session?.access_token;
  }

  async function saveResults() {
    const res = await fetch(`/api/center/orders/${params.id}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ rawResults: rows.filter((r) => r.testName) }),
    });
    const json = await res.json();
    if (!json.success) return toast.error(json.error);
    toast.success('Results saved'); void load();
  }

  if (!order) return <p className="text-sm text-clinical-muted">Loading…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-ink">{order.patients?.name} · {order.test_category}</h1>
      <p className="text-xs text-clinical-muted">Status: {order.status}</p>

      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Results</h2>
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="Test" value={r.testName} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, testName: e.target.value } : x))} />
            <Input placeholder="Value" value={r.value} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
            <Input placeholder="Unit" value={r.unit ?? ''} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} />
            <Input placeholder="Range" value={r.referenceRange ?? ''} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, referenceRange: e.target.value } : x))} />
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setRows([...rows, { testName: '', value: '', unit: '', referenceRange: '' }])}>+ row</Button>
          <Button onClick={saveResults}>Save results</Button>
        </div>
      </section>
      {/* Normalize panel (Task 6) and Sign panel (Task 7) render below. */}
    </div>
  );
}
```

(Image extraction wiring — an upload that calls `extract-document` with `extractOnly:true` and pre-fills `rows` — is folded into Task 6 Step 6, after the consent helper exists. v1 result entry is functional via manual rows now.)

- [ ] **Step 5: Type-check + commit**

```bash
npm run type-check --workspace glyph-web
git add supabase/functions/extract-document/index.ts \
  apps/glyph/src/app/api/center/orders/[id]/results/route.ts \
  apps/glyph/src/app/center/orders/[id]/page.tsx
git commit -m "feat(lens): result entry — extract-document extractOnly flag + draft-results route + order detail"
```

---

### Task 6: AI normalize + sanity-check — `lens-normalize` edge fn + route + image pre-fill

**Files:**
- Create: `supabase/functions/lens-normalize/index.ts`
- Create: `apps/glyph/src/app/api/center/orders/[id]/normalize/route.ts`
- Modify: `apps/glyph/src/app/center/orders/[id]/page.tsx` (normalize panel + image-extract button)

**Interfaces:**
- Consumes: `_shared/{cors,egress,llm-router,cost-logger}.ts`, `normalizeRawItem`, the order's `raw_results`.
- Produces: edge fn `lens-normalize` (input `{ testCategory, rawResults, patientContext }` → `{ normalized, sanityFlags }`); POST `/api/center/orders/[id]/normalize`.

- [ ] **Step 1: Write the normalize edge function**

Create `supabase/functions/lens-normalize/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors } from "../_shared/cors.ts";
import { callLLM } from "../_shared/llm-router.ts";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

const SYSTEM = `You are a clinical lab-result normalizer for Bangladeshi diagnostic centres.
You receive raw lab values and a test category. You DO NOT diagnose or prescribe.
Return STRICT JSON:
{
  "normalized": [
    { "testName": "...", "value": "...", "unit": "...", "referenceRange": "...", "isAbnormal": true|false, "severity": "mild|moderate|severe|critical" }
  ],
  "sanityFlags": [ { "message": "...", "severity": "info|warning|critical" } ]
}
Rules:
- Standardize test names (e.g. "Hb" -> "Hemoglobin"), units, and reference-range formatting so the SAME test reads the SAME way across centres.
- Set isAbnormal/severity from the value vs the reference range. Omit severity when normal.
- sanityFlags: implausible values, internal inconsistency, or value inconsistent with the supplied patient context. Empty array if none.
- Never invent results not present in the input.`;

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  // Server-to-server only: deployed --no-verify-jwt, trusts LENS_SHARED_SECRET.
  const secret = Deno.env.get("LENS_SHARED_SECRET");
  const auth = req.headers.get("Authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return jsonResponse({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }

  const { testCategory, rawResults, patientContext, orderId } = await req.json();
  if (!testCategory || !Array.isArray(rawResults)) {
    return jsonResponse({ success: false, error: "testCategory and rawResults[] required", code: "BAD_REQUEST" }, 400);
  }

  const prompt = JSON.stringify({ testCategory, rawResults, patientContext: patientContext ?? null });

  // Tier A: structured de-identified fields only (no name/phone/NID). The caller
  // must strip direct identifiers from patientContext before sending.
  const llm = await callLLM({
    primary: { provider: "claude", model: "claude-opus-4-8", temperature: 0.1, maxTokens: 2000 },
    fallback: { provider: "gemini", model: "gemini-2.0-flash", temperature: 0.1, maxTokens: 2000 },
    prompt,
    systemPrompt: SYSTEM,
    edgeFunction: "lens-normalize",
    egress: { tier: "A", containsUnredactable: false },
  });

  let parsed: unknown;
  try {
    const text = (llm as { text: string }).text ?? "";
    parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
  } catch {
    return jsonResponse({ success: false, error: "Model returned non-JSON", code: "PARSE_ERROR" }, 502);
  }

  return jsonResponse({ success: true, data: parsed, orderId: orderId ?? null });
});
```

- [ ] **Step 2: Add the env var to `.env.example`**

In `.env.example`, add:

```
# Lens v1 — server-to-server secret for the lens-normalize edge fn (deployed --no-verify-jwt).
# Set the SAME value in BOTH Vercel env AND `supabase secrets set` (same pattern as TRIAGE_SHARED_SECRET).
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
LENS_SHARED_SECRET=
```

- [ ] **Step 3: Write the normalize route**

Create `apps/glyph/src/app/api/center/orders/[id]/normalize/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { shapeStaffSession, canEnterResults } from '@/lib/services/staff-logic';
import type { Database } from '@/lib/supabase/types';

/** POST /api/center/orders/[id]/normalize — run AI normalize+sanity, persist. */
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
  if (!staff || !canEnterResults(staff.role)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  const { data: order } = await admin
    .from('lab_orders').select('*, patients(age, gender)').eq('id', params.id).eq('owner_org_id', staff.orgId).maybeSingle();
  if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  if (order.credential_id) return NextResponse.json({ success: false, error: 'Order is signed' }, { status: 409 });
  if (!Array.isArray(order.raw_results) || order.raw_results.length === 0) {
    return NextResponse.json({ success: false, error: 'Enter results before normalizing' }, { status: 400 });
  }

  // Tier A: send ONLY de-identified structured context (age/gender), never name/phone.
  const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/lens-normalize`;
  const llmRes = await fetch(fnUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LENS_SHARED_SECRET}` },
    body: JSON.stringify({
      orderId: order.id,
      testCategory: order.test_category,
      rawResults: order.raw_results,
      patientContext: { age: (order as any).patients?.age ?? null, gender: (order as any).patients?.gender ?? null },
    }),
  });
  const llmJson = await llmRes.json();
  if (!llmJson.success) return NextResponse.json({ success: false, error: llmJson.error ?? 'normalize failed' }, { status: 502 });

  const { error } = await admin
    .from('lab_orders')
    .update({
      normalized_results: llmJson.data.normalized ?? [],
      sanity_flags: llmJson.data.sanityFlags ?? [],
      normalized_at: new Date().toISOString(),
    })
    .eq('id', order.id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data: { normalized: llmJson.data.normalized, sanityFlags: llmJson.data.sanityFlags } });
}
```

- [ ] **Step 4: Add the normalize panel + image-extract to the order screen**

In `apps/glyph/src/app/center/orders/[id]/page.tsx`, add a normalize action and a normalized-results display. Add inside the component (after `saveResults`):

```tsx
  const [normalized, setNormalized] = useState<any[]>([]);
  const [sanityFlags, setSanityFlags] = useState<any[]>([]);

  async function runNormalize() {
    const res = await fetch(`/api/center/orders/${params.id}/normalize`, {
      method: 'POST', headers: { Authorization: `Bearer ${await token()}` },
    });
    const json = await res.json();
    if (!json.success) return toast.error(json.error);
    setNormalized(json.data.normalized ?? []); setSanityFlags(json.data.sanityFlags ?? []);
    toast.success('Normalized'); void load();
  }
```

And add this section to the JSX (after the Results section):

```tsx
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-ink">AI normalize + sanity-check</h2>
          <Button variant="accent" onClick={runNormalize} disabled={order.status === 'ordered'}>Normalize</Button>
        </div>
        {(normalized.length ? normalized : (order.normalized_results ?? [])).map((r: any, i: number) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-ink">{r.testName}</span>
            <span className={r.isAbnormal ? 'text-red_flag' : 'text-clinical-muted'}>{r.value} {r.unit} ({r.referenceRange})</span>
          </div>
        ))}
        {(sanityFlags.length ? sanityFlags : (order.sanity_flags ?? [])).map((f: any, i: number) => (
          <p key={i} className="text-xs text-red_flag">⚠ {f.message}</p>
        ))}
      </section>
```

- [ ] **Step 5: Deploy the function locally + smoke it**

```bash
supabase secrets set LENS_SHARED_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")  # local
supabase functions serve lens-normalize
# manual curl with the secret + a sample CBC payload → expect {success:true,data:{normalized:[...]}}
```
Expected: a 200 with normalized JSON. (The end-to-end assertion is in Task 8's Section B smoke.)

- [ ] **Step 6: Type-check + commit**

```bash
npm run type-check --workspace glyph-web
git add supabase/functions/lens-normalize/index.ts .env.example \
  apps/glyph/src/app/api/center/orders/[id]/normalize/route.ts \
  apps/glyph/src/app/center/orders/[id]/page.tsx
git commit -m "feat(lens): AI normalize+sanity edge fn (Opus 4.8, Tier A) + normalize route + panel"
```

---

### Task 7: Sign → LabResult credential + the lab_reports projection

**Files:**
- Modify: `apps/glyph/src/lib/services/lens-logic.ts` (add `buildLabResultData`)
- Modify: `apps/glyph/src/lib/services/lens-logic.test.ts`
- Modify: `apps/glyph/src/lib/identity/projections.ts` (project `lab_result` → `lab_reports`)
- Create/Modify: `apps/glyph/src/lib/identity/projections.test.ts`
- Create: `apps/glyph/src/app/api/center/orders/[id]/sign/route.ts`
- Modify: `apps/glyph/src/app/center/orders/[id]/page.tsx` (sign panel)

**Interfaces:**
- Consumes: `issueCredential`, `ensureEntityIdentity`, `rebuildProjections`, `validateClinicalCredential('lab_result', …)`.
- Produces: `buildLabResultData({ orgId, orgName, testCategory, reportDate, normalized }): LabResultData`; POST `/api/center/orders/[id]/sign` → `{ labResultVcId, patientDid, orgDid }`.

- [ ] **Step 1: Write the failing test for `buildLabResultData`**

Append to `apps/glyph/src/lib/services/lens-logic.test.ts`:

```ts
import { buildLabResultData } from './lens-logic';

describe('buildLabResultData', () => {
  it('builds a LabResultData payload with the centre as lab + encounterDate', () => {
    const data = buildLabResultData({
      orgId: 'org1', orgName: 'Popular Diagnostics', testCategory: 'CBC',
      reportDate: '2026-06-18',
      normalized: [{ testName: 'Hemoglobin', value: '9.1', unit: 'g/dL', referenceRange: '13-17', isAbnormal: true, severity: 'moderate' }],
    });
    expect(data.testCategory).toBe('CBC');
    expect(data.reportDate).toBe('2026-06-18');
    expect(data.encounterDate).toBe('2026-06-18');
    expect(data.lab).toEqual({ did: 'did:org:org1', name: 'Popular Diagnostics' });
    expect(data.results).toHaveLength(1);
    expect(data.results[0].testName).toBe('Hemoglobin');
    expect(data.locale).toBe('bn');
  });
  it('throws when there are no results (schema requires min 1)', () => {
    expect(() => buildLabResultData({ orgId: 'o', orgName: 'X', testCategory: 'CBC', reportDate: '2026-06-18', normalized: [] })).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace glyph-web -- lens-logic`
Expected: FAIL — `buildLabResultData` not exported.

- [ ] **Step 3: Add `buildLabResultData`**

Append to `apps/glyph/src/lib/services/lens-logic.ts`:

```ts
export interface BuildLabResultInput {
  orgId: string;
  orgName: string;
  testCategory: string;
  reportDate: string; // ISO date
  normalized: LabResultItem[];
}

/**
 * Builds the LabResultData payload (credentialSubject.data) for issueCredential.
 * `lab` is an entityRef to the centre org (the issuer); encounterDate mirrors the
 * report date. Matches labResultData in @kham/schemas-clinical.
 */
export function buildLabResultData(input: BuildLabResultInput) {
  if (!input.normalized.length) throw new Error('LabResult requires at least one result');
  return {
    encounterDate: input.reportDate,
    locale: 'bn' as const,
    lab: { did: `did:org:${input.orgId}`, name: input.orgName },
    testCategory: input.testCategory,
    reportDate: input.reportDate,
    results: input.normalized,
  };
}
```

Note: the `lab.did` here is a human-facing reference label inside the payload; the cryptographic issuer DID is resolved separately by `ensureEntityIdentity('organization', orgId)` in the sign route. (`entityRef.did` is a free string in the schema — see `common.ts`.)

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test --workspace glyph-web -- lens-logic`
Expected: PASS.

- [ ] **Step 5: Extend projections to handle `lab_result`**

In `apps/glyph/src/lib/identity/projections.ts`, mirror the existing prescription branch. Read the file first to match its exact structure (the prescription branch reads the patient's `lab_result`/`prescription` credentials and upserts projection rows). Add a `lab_result` projection that, for each `lab_result` credential of the subject DID, ensures a `lab_reports` row exists keyed by `credential_id` (insert if missing — the `trg_lab_reports_frozen` trigger blocks mutation of credentialed rows, so this is insert-once/idempotent):

```ts
// Inside rebuildProjections, alongside the prescription projection. `creds` is
// the subject's credentials; `admin` the service client; mirror the existing
// prescription loop's structure exactly.
const labCreds = creds.filter((c) => c.credential_type === 'lab_result');
for (const c of labCreds) {
  const { data: existing } = await admin
    .from('lab_reports').select('id').eq('credential_id', c.id).maybeSingle();
  if (existing) continue;
  const data = (c.vc as any)?.credentialSubject?.data ?? {};
  await admin.from('lab_reports').insert({
    patient_id: patientRowId,            // resolved the same way the prescription branch resolves it
    visit_id: null,
    source: 'digital',
    lab_name: data.lab?.name ?? null,
    report_date: data.reportDate ?? null,
    test_category: data.testCategory ?? null,
    results: data.results ?? [],
    raw_extraction: null,
    extraction_confidence: null,
    verified_by_doctor: true,            // signed by the centre signatory
    credential_id: c.id,
  });
}
```

(If `patientRowId` is not already in scope in that function, resolve it from the subject DID exactly as the prescription branch does — match the existing code; do not invent a new lookup.)

- [ ] **Step 6: Test the projection**

Add to (or create) `apps/glyph/src/lib/identity/projections.test.ts` a test that, given a fake `lab_result` credential, the projection inserts one `lab_reports` row with `credential_id` set and `source='digital'`, and a second rebuild does NOT insert a duplicate. Use the same mocking style the existing prescription projection test uses (read the file to match). Run:

Run: `npm run test --workspace glyph-web -- projections`
Expected: PASS (existing prescription tests + the new lab_result test).

- [ ] **Step 7: Write the sign route**

Create `apps/glyph/src/app/api/center/orders/[id]/sign/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureEntityIdentity } from '@/lib/identity/ensure-identity';
import { issueCredential } from '@/lib/identity/issue';
import { rebuildProjections } from '@/lib/identity/projections';
import { shapeStaffSession, canSign } from '@/lib/services/staff-logic';
import { buildLabResultData } from '@/lib/services/lens-logic';
import type { Database } from '@/lib/supabase/types';

/** POST /api/center/orders/[id]/sign — issue the LabResult credential (issuer=org). */
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
  if (!staff) return NextResponse.json({ success: false, error: 'Not a centre member' }, { status: 403 });
  if (!canSign(staff.role)) return NextResponse.json({ success: false, error: 'Role cannot sign' }, { status: 403 });

  const admin = createAdminClient();
  const { data: order } = await admin
    .from('lab_orders').select('*').eq('id', params.id).eq('owner_org_id', staff.orgId).maybeSingle();
  if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  if (order.credential_id) return NextResponse.json({ success: false, error: 'Order already signed; amend via a replacement credential' }, { status: 409 });
  const normalized = (order.normalized_results as any[]) ?? [];
  if (!normalized.length) return NextResponse.json({ success: false, error: 'Normalize results before signing' }, { status: 400 });

  // Issuer = the centre org's DID (founder decision). Subject = the patient DID (R1).
  const orgIdentity = await ensureEntityIdentity(admin, 'organization', staff.orgId);
  const patientIdentity = await ensureEntityIdentity(admin, 'patient', order.patient_id);

  const data = buildLabResultData({
    orgId: staff.orgId,
    orgName: staff.orgName,
    testCategory: order.test_category,
    reportDate: (order.resulted_at ?? order.created_at ?? new Date().toISOString()).slice(0, 10),
    normalized,
  });

  const credential = await issueCredential(admin, {
    issuer: { kind: 'organization', id: staff.orgId, name: staff.orgName },
    subjectDid: patientIdentity.did,
    type: 'lab_result',
    data,
  });

  // Project the frozen lab_reports row the wallet reads.
  const projection = await rebuildProjections(admin, patientIdentity.did);
  const { data: labRow } = await admin
    .from('lab_reports').select('id').eq('credential_id', credential.rowId).maybeSingle();

  const { error: updErr } = await admin
    .from('lab_orders')
    .update({
      status: 'signed',
      signatory_user_id: user.id,
      signed_at: new Date().toISOString(),
      credential_id: credential.rowId,
      lab_report_id: labRow?.id ?? null,
    })
    .eq('id', order.id);
  if (updErr) return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    data: { labResultVcId: credential.vcId, patientDid: patientIdentity.did, orgDid: orgIdentity.did, projection },
  });
}
```

- [ ] **Step 8: Add the sign panel to the order screen**

In `apps/glyph/src/app/center/orders/[id]/page.tsx`, add (after the normalize panel), gated so it shows once normalized:

```tsx
  const [signed, setSigned] = useState<{ vcId: string } | null>(null);
  async function sign() {
    const res = await fetch(`/api/center/orders/${params.id}/sign`, {
      method: 'POST', headers: { Authorization: `Bearer ${await token()}` },
    });
    const json = await res.json();
    if (!json.success) return toast.error(json.error);
    setSigned({ vcId: json.data.labResultVcId }); toast.success('Signed'); void load();
  }
```

```tsx
      {(order.normalized_results?.length || normalized.length) ? (
        <section className="rounded-xl border border-line bg-white p-4">
          {order.status === 'signed' || signed ? (
            <p className="text-sm text-ink">✓ Signed · LabResult credential issued.</p>
          ) : (
            <Button onClick={sign}>Sign &amp; issue result</Button>
          )}
        </section>
      ) : null}
```

- [ ] **Step 9: Type-check + commit**

```bash
npm run type-check --workspace glyph-web
npm run test --workspace glyph-web -- lens-logic projections
git add apps/glyph/src/lib/services/lens-logic.ts apps/glyph/src/lib/services/lens-logic.test.ts \
  apps/glyph/src/lib/identity/projections.ts apps/glyph/src/lib/identity/projections.test.ts \
  apps/glyph/src/app/api/center/orders/[id]/sign/route.ts apps/glyph/src/app/center/orders/[id]/page.tsx
git commit -m "feat(lens): sign → LabResult credential (issuer=org) + lab_reports projection"
```

---

### Task 8: Wallet delivery + free verification + the E2E smoke (Section B)

**Files:**
- Modify: `apps/glyph/src/app/center/orders/[id]/page.tsx` (wallet handoff after sign)
- Modify: `scripts/smoke-lens.mjs` (Section B — full pipeline over the live routes)
- (Reuse, no change: `/api/wallet/issue`, `/wallet/[token]`, `/api/verify`)

**Interfaces:**
- Consumes: `/api/wallet/issue` (existing), `/api/verify` (existing), the sign route (Task 7).
- Produces: a wallet token + link for the order's patient; Section B proves the signed LabResult surfaces in the wallet read and verifies via `/api/verify`.

- [ ] **Step 1: Add wallet handoff to the order screen**

In the sign panel of `apps/glyph/src/app/center/orders/[id]/page.tsx`, after a successful sign, issue a wallet token and show the link/QR. Add:

```tsx
  const [walletPath, setWalletPath] = useState<string | null>(null);
  async function issueWallet() {
    const res = await fetch('/api/wallet/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ patientId: order.patient_id }),
    });
    const json = await res.json();
    if (!json.success) return toast.error(json.error ?? 'wallet link failed');
    setWalletPath(json.walletPath);
  }
```

Render (inside the signed branch):

```tsx
      {(order.status === 'signed' || signed) && (
        <div className="mt-2 space-y-2">
          <Button variant="ghost" onClick={issueWallet}>Get patient wallet link</Button>
          {walletPath && <a className="block text-sm text-ink underline" href={walletPath} target="_blank" rel="noreferrer">{walletPath}</a>}
        </div>
      )}
```

Note: confirm `/api/wallet/issue` accepts a centre-staff JWT. It currently records `created_by_doctor_id: user.id` (FK → doctors). For a centre staffer (not a doctor) this FK will fail. **In Task 8 Step 2**, relax that: make `created_by_doctor_id` nullable OR add a nullable `created_by_user_id` — see the migration note below. The wallet read itself is identity-agnostic (token → patient), so delivery works once issuance accepts a non-doctor creator.

- [ ] **Step 2: Allow non-doctor wallet issuance (minimal, additive)**

The simplest Chamber-safe fix: in `apps/glyph/src/app/api/wallet/issue/route.ts`, when the caller is a centre staffer (no `doctors` row), insert with `created_by_doctor_id: null`. Add a migration `supabase/migrations/013_wallet_created_by_nullable.sql`:

```sql
-- Lens: a diagnostic-centre staffer (not a doctor) can issue a patient wallet
-- link. Relax the NOT NULL so non-doctor issuers are allowed; the FK stays.
ALTER TABLE wallet_access_tokens ALTER COLUMN created_by_doctor_id DROP NOT NULL;
```

And in the issue route, set `created_by_doctor_id` only when a `doctors` row exists for `user.id` (else `null`). Re-run `supabase gen types` after applying. (If `created_by_doctor_id` is already nullable in 006, skip the migration and just pass `null` — verify by reading 006 first.)

- [ ] **Step 3: Write Section B of the smoke**

In `scripts/smoke-lens.mjs`, replace the line `// ===== Section B added in later tasks (before this summary) =====` with a block that:
1. Creates a `diagnostic_centre` org + a technologist user + a signatory user + memberships (service-role).
2. Signs both in via the anon client to get JWTs.
3. As the tech, POSTs `/api/center/orders` (walk-in patient) → `orderId`.
4. POSTs `/api/center/orders/[id]/results` with sample CBC rows.
5. POSTs `/api/center/orders/[id]/normalize` → asserts `normalized` non-empty.
6. As the tech (no sign right) POSTs `/sign` → asserts **403**.
7. As the signatory POSTs `/sign` → asserts success + `labResultVcId`.
8. Asserts a `lab_reports` row exists with that `credential_id` (`source='digital'`, `verified_by_doctor=true`).
9. POSTs `/api/wallet/issue` → gets a token; GETs `/api/wallet/[token]` → asserts the signed lab appears under `labs`.
10. POSTs `/api/verify` with the `labResultVcId` → asserts the signature verifies (`valid: true`).
11. Second-centre isolation: a second centre's signatory cannot read the first centre's order (RLS).
12. Cleans up all created rows + auth users.

```js
// ===== Section B: full Lens pipeline over the live Next routes =====
const post = (path, jwt, body) => fetch(`${appUrl}${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
  body: body ? JSON.stringify(body) : undefined,
}).then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) }));

const centreB = (await db.from('organizations').insert({ name: 'Lens Smoke Centre B', org_type: 'diagnostic_centre' }).select('id').single()).data;
const centreBId = centreB.id;
const orgA = (await db.from('organizations').insert({ name: 'Lens Smoke Centre A', org_type: 'diagnostic_centre' }).select('id').single()).data;
const pw = 'smoke-test-only-1234';
async function staff(role, orgId) {
  const u = (await db.auth.admin.createUser({ email: `lens-${role}-${Date.now()}-${Math.floor(performance.now())}@glyph.local`, password: pw, email_confirm: true })).data;
  await db.from('memberships').insert({ user_id: u.user.id, organization_id: orgId, role });
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  await anon.auth.signInWithPassword({ email: u.user.email, password: pw });
  const jwt = (await anon.auth.getSession()).data.session.access_token;
  return { id: u.user.id, email: u.user.email, jwt };
}
const tech = await staff('technologist', orgA.id);
const signer = await staff('signatory', orgA.id);
const signerB = await staff('signatory', centreBId);

const created = await post('/api/center/orders', tech.jwt, { patientName: 'Walk-in Smoke', testCategory: 'CBC' });
check('create order 200', created.status === 200 && created.json.success, JSON.stringify(created.json));
const orderId = created.json.data?.orderId;

const resulted = await post(`/api/center/orders/${orderId}/results`, tech.jwt, {
  rawResults: [{ name: 'Hemoglobin', value: '9.1', unit: 'g/dL', range: '13-17', isAbnormal: true, severity: 'moderate' }],
});
check('save results 200', resulted.status === 200, JSON.stringify(resulted.json));

const normd = await post(`/api/center/orders/${orderId}/normalize`, tech.jwt);
check('normalize returns results', normd.json.success && (normd.json.data?.normalized?.length ?? 0) > 0, JSON.stringify(normd.json));

const techSign = await post(`/api/center/orders/${orderId}/sign`, tech.jwt);
check('technologist CANNOT sign (403)', techSign.status === 403, `got ${techSign.status}`);

const signed = await post(`/api/center/orders/${orderId}/sign`, signer.jwt);
check('signatory signs → LabResult VC', signed.json.success && Boolean(signed.json.data?.labResultVcId), JSON.stringify(signed.json));
const vcId = signed.json.data?.labResultVcId;

const { data: order2 } = await db.from('lab_orders').select('credential_id, patient_id').eq('id', orderId).single();
const { data: labRow } = await db.from('lab_reports').select('id, source, verified_by_doctor').eq('credential_id', order2.credential_id).maybeSingle();
check('signed LabResult projected to lab_reports (digital, verified)', labRow?.source === 'digital' && labRow?.verified_by_doctor === true, JSON.stringify(labRow));

const walletIssue = await post('/api/wallet/issue', signer.jwt, { patientId: order2.patient_id });
check('wallet token issued', walletIssue.json.success && Boolean(walletIssue.json.token), JSON.stringify(walletIssue.json));
const walletRead = await fetch(`${appUrl}/api/wallet/${walletIssue.json.token}`).then((r) => r.json());
check('signed lab appears in wallet read', (walletRead.labs ?? []).some((l) => l.test_category === 'CBC'), JSON.stringify(walletRead.labs));

const verify = await post('/api/verify', null, { vcId });
check('LabResult verifies via /api/verify', verify.json?.valid === true || verify.json?.data?.valid === true, JSON.stringify(verify.json));

const crossRead = await createClient(url, anonKey, { auth: { persistSession: false } });
await crossRead.auth.signInWithPassword({ email: signerB.email, password: pw });
const { data: leak } = await crossRead.from('lab_orders').select('id').eq('id', orderId);
check('centre B CANNOT read centre A order (RLS)', (leak?.length ?? 0) === 0, `got ${leak?.length}`);

// cleanup
await db.from('lab_orders').delete().eq('id', orderId);
await db.from('lab_reports').delete().eq('credential_id', order2.credential_id);
await db.from('patients').delete().eq('id', order2.patient_id);
await db.from('memberships').delete().in('user_id', [tech.id, signer.id, signerB.id]);
await db.from('organizations').delete().in('id', [orgA.id, centreBId]);
for (const id of [tech.id, signer.id, signerB.id]) await db.auth.admin.deleteUser(id);
console.log('\nSection B cleanup done');
```

(Note `/api/verify`'s exact request shape — read `apps/glyph/src/app/api/verify/route.ts` and adjust the `{ vcId }` body + the `valid` assertion to its real contract before running.)

- [ ] **Step 4: Run the full smoke (needs `npm run dev` running)**

```bash
npm run dev   # separate shell
node scripts/smoke-lens.mjs http://localhost:3000 <API_URL> <ANON_KEY> <SERVICE_ROLE_KEY>
```
Expected: `ALL CHECKS PASSED` (Sections A + B), `Section B cleanup done`.

- [ ] **Step 5: Type-check + commit**

```bash
npm run type-check --workspace glyph-web
git add apps/glyph/src/app/center/orders/[id]/page.tsx scripts/smoke-lens.mjs \
  apps/glyph/src/app/api/wallet/issue/route.ts
[ -f supabase/migrations/013_wallet_created_by_nullable.sql ] && git add supabase/migrations/013_wallet_created_by_nullable.sql apps/glyph/src/lib/supabase/types.ts
git commit -m "feat(lens): wallet delivery + free verification + full E2E smoke (Section B)"
```

---

### Task 9: i18n keys, full regression gate, docs

**Files:**
- Modify: `apps/glyph/src/lib/i18n/bn.json`, `apps/glyph/src/lib/i18n/en.json`
- Modify: `CLAUDE.md`
- Modify: `C:\Users\User\.claude\projects\J--KhaM-Health-Glyph\memory\lens-foundation-build.md`

- [ ] **Step 1: Add i18n keys + replace inline strings**

Add a `center` and `lens` section to both `bn.json` and `en.json` covering the labels used in the centre screens (`center.orders`, `center.newOrder`, `center.signIn`, `center.results`, `center.normalize`, `center.sign`, `center.walletLink`, `lens.signedBadge`, etc.). Replace the inline strings in the Task 2–8 components with `t('center.…')` via `useLanguage()`. Keep clinical red only on abnormal/sanity-critical.

- [ ] **Step 2: Clean apply + full local verification suite**

```bash
supabase db reset
node scripts/smoke-lens.mjs http://localhost:3000 <API_URL> <ANON_KEY> <SERVICE_ROLE_KEY>   # ALL CHECKS PASSED
node scripts/smoke-owner-scope.mjs <API_URL> <ANON_KEY> <SERVICE_ROLE_KEY>                  # foundation intact (LOCAL fresh reset)
node scripts/smoke-path.mjs        <API_URL> <ANON_KEY> <SERVICE_ROLE_KEY>                  # 19/19 (Chamber unbroken)
node scripts/smoke-documents.mjs   <FUNCTIONS_URL> <API_URL> <ANON_KEY> <SERVICE_ROLE_KEY>  # 16/16 (extract-document untouched)
node scripts/smoke-credentials.mjs <API_URL> <SERVICE_ROLE_KEY>                             # identity layer intact (LOCAL ONLY)
npm run type-check                                                                          # all workspaces clean
npm run lint                                                                                # glyph-web clean
npm run test                                                                                # packages + app (incl. staff-logic, lens-logic, projections)
```
Expected: every command green. The three gates that prove the additive promise: **smoke-path 19/19**, **smoke-documents 16/16**, **smoke-credentials**. If any regresses, STOP and fix.

- [ ] **Step 3: Update CLAUDE.md**

Record: migration `012_lab_orders.sql` (+ `013` if added) in the migrations block; the `lab_orders` table row in §5; `/center/*` routes + `lens-normalize` function + the `api/center/orders/*` routes in §3; `LENS_SHARED_SECRET` in §7; the AI routing table row for `lens-normalize` (Opus 4.8 primary / Gemini fallback, Tier A) in §4.

- [ ] **Step 4: Update the active-thread memory**

In `lens-foundation-build.md`, record: Lens v1 BUILT + VERIFIED on local (smoke-lens green, smoke-path 19/19, smoke-documents 16/16, smoke-credentials intact, type-check/lint/test green); branch + commits; awaiting founder **"ship it"** before prod. Next: task B (wire self-hosted MedGemma) → Lens v1.5 vision co-interp.

- [ ] **Step 5: Commit**

```bash
git add apps/glyph/src/lib/i18n/bn.json apps/glyph/src/lib/i18n/en.json CLAUDE.md
git commit -m "docs(lens): i18n keys + record Lens v1 (migration 012, /center, lens-normalize) in CLAUDE.md"
```

- [ ] **Step 6: Report + hold at the ship-it gate**

Summarize for the founder: what shipped to local, the green verification evidence (smoke-lens + the three regression gates), and that **no prod deploy happened** (standing gate). Offer the prod deploy (migrations 012/013 → `supabase db push`, `supabase functions deploy lens-normalize`, set `LENS_SHARED_SECRET` in Vercel + Supabase, `vercel deploy --prod`, then smoke-path + smoke-lens against prod) only on explicit "ship it."

---

## Self-Review

**Spec coverage (against the Lens v1 cut, items 1–5):**
- ✅ **1. Centre account + staff roles** — Tasks 2 (auth) + 3 (onboarding script, dashboard); `technologist`/`signatory` role gates in `staff-logic`.
- ✅ **2. Manual order + result entry (values + image extraction)** — Tasks 4 (order) + 5 (results + `extractOnly` image reuse).
- ✅ **3. AI normalize + sanity-check (Opus live)** — Task 6 (`lens-normalize`, Opus 4.8 primary, Tier A).
- ✅ **4. Single qualified signature → LabResult credential (anchored to patient DID, issuer=org)** — Task 7.
- ✅ **5. Patient delivery (wallet) + free verification** — Task 8 (wallet issue/read reuse + `/api/verify`).
- ✅ Provisional/walk-in patient — `createOwnedPatient` in Task 4.
- ✅ Within-patient trendability — normalized results land in `lab_reports` (the wallet already lists labs chronologically).
- ✅ Chamber untouched + provable — smoke-path 19/19 + smoke-documents 16/16 gates (Tasks 5, 9).

**Deferred-but-reserved confirmed out of scope:** remote-radiologist loop, MedGemma vision, urgency-flagging, Chamber-order intake, paper-slip OCR, patient-initiated orders, cross-centre trending, correction/revocation UI, billing — none built.

**Placeholder scan:** every code step contains complete code. Two steps explicitly require reading an existing file to MATCH its pattern before editing (`projections.ts` prescription branch in Task 7 Step 5; `/api/verify` contract in Task 8 Step 3) — these are match-the-sibling instructions with the new code supplied, not placeholders.

**Type consistency:** `StaffSession`/`shapeStaffSession`/`canSign`/`canEnterResults` defined in Task 2 and consumed identically in Tasks 4–8. `buildLabOrderRow`/`normalizeRawItem`/`buildLabResultData`/`LabResultItem`/`KNOWN_TEST_CATEGORIES` defined in Tasks 4 + 7 and consumed in the routes. `issueCredential` call shape (`{ issuer:{kind:'organization',id,name}, subjectDid, type:'lab_result', data }`) matches `IssueCredentialInput` from the recon. `lab_orders` columns match across the migration, smoke, routes, and freeze trigger. `buildLabResultData` output matches `labResultData` (`encounterDate`, `locale`, `lab`, `testCategory`, `reportDate`, `results[]`).

**Known integration risks flagged inline for the executor:** (a) `/center/login` sharing `/center/layout.tsx` — Task 3 Step 3 note + browser check; (b) `wallet_access_tokens.created_by_doctor_id` NOT NULL vs a non-doctor issuer — Task 8 Step 2 migration 013 (conditional on reading 006); (c) `/api/verify` request/response contract — read before wiring the smoke assertion.
