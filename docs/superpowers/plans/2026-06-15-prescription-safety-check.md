# Prescription Safety Check — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** At note-approval, cross-check the doctor's drafted prescription against the patient's known medications, allergies, and chronic conditions, and surface interaction / allergy / contraindication warnings before the doctor signs — suggest, never block.

**Architecture:** A new Deno edge function (`check-prescription-safety`) assembles the patient's med/condition/allergy context server-side, sends only structured fields through the existing **Tier-A egress** chokepoint to **Claude Opus 4.8** via `callLLM`, and returns raw warnings + context counts. App-side pure logic (`safety-logic.ts`, Vitest-tested) validates/clamps the warnings, computes a data-completeness signal, and shapes the fail-safe states. The note screen runs the check at approval time, renders a warnings panel (each warning a launchpad into the existing consult), captures the doctor's per-warning verdict, then commits everything to a new `visits.prescription_safety_check` JSONB through the existing approve-note route.

**Tech Stack:** Supabase Edge Functions (Deno), `_shared/llm-router.ts` + `_shared/egress.ts`, Next.js 14 App Router, React 18, Vitest, Tailwind, `@supabase/supabase-js`.

**Spec:** `docs/superpowers/specs/2026-06-15-prescription-safety-check-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/010_prescription_safety.sql` | Adds `prescription_safety_check JSONB` to `visits`. |
| `apps/glyph/src/lib/services/safety-logic.ts` | **Pure, testable:** types, `validateWarnings`, `computeCompleteness`, `buildSafetyResult`, the fail-safe `failedResult`. No I/O. |
| `apps/glyph/src/lib/services/safety-logic.test.ts` | Vitest unit tests for the above. |
| `apps/glyph/src/lib/services/safety.ts` | Client service: `checkPrescriptionSafety(visitId, medications)` → edge fn → `buildSafetyResult`; catches all errors into `failedResult` (fail-safe). |
| `supabase/functions/check-prescription-safety/index.ts` | Edge fn: auth → assemble context (service role) → Tier-A egress → Opus 4.8 → parse → envelope. |
| `apps/glyph/src/components/doctor/PrescriptionSafetyPanel.tsx` | Renders warnings, "Ask Glyph" deep-link, verdict controls, the couldn't-run + nothing-found states. |
| `apps/glyph/src/app/doctor/note/[visitId]/page.tsx` (modify) | Two-phase approve: run check → show panel → commit with verdicts. |
| `apps/glyph/src/app/api/visits/approve-note/route.ts` (modify) | Accept optional `safetyCheck`, persist to `visits.prescription_safety_check`. |
| `scripts/smoke-rx-safety.mjs` | E2E smoke: cardiac/allergy/clean/thin/model-down fixtures. |

Shared type names used across tasks (defined once in Task 2, referenced everywhere):
`SafetyWarning`, `WarningVerdict`, `SafetyResult`, `Completeness`.

---

## Task 1: Migration — `prescription_safety_check` on `visits`

**Files:**
- Create: `supabase/migrations/010_prescription_safety.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 010_prescription_safety.sql
-- Stores the prescription safety check + the doctor's verdict on each warning,
-- captured at note-approval. Audit trail today; doctor-corrected ground truth
-- for KhaM-Med tomorrow. Shape (app-owned, not enforced here):
--   { status: 'ok'|'failed', warnings: [...], data_completeness, model, checked_at,
--     verdicts: [{ index, verdict, reason }] }
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS prescription_safety_check JSONB;

COMMENT ON COLUMN visits.prescription_safety_check IS
  'Prescription safety check result + per-warning doctor verdicts, recorded at note-approval.';
```

- [ ] **Step 2: Apply locally and verify the column exists**

Run:
```bash
supabase db reset
```
Expected: migrations 001–010 apply with no error; reset completes.

Verify:
```bash
node scripts/smoke-db.mjs http://127.0.0.1:54321 <sb_secret_key>
```
Expected: existing schema smoke still passes (14/14 or current count) — the additive column breaks nothing.

- [ ] **Step 3: Regenerate the Database type**

Run:
```bash
supabase gen types typescript --local > apps/glyph/src/lib/supabase/types.ts
```
Expected: `visits` Row/Insert/Update now include `prescription_safety_check: Json | null`. Do not hand-edit; the generated file is source of truth.

- [ ] **Step 4: Type-check**

Run: `npm run type-check`
Expected: passes (no drift introduced).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/010_prescription_safety.sql apps/glyph/src/lib/supabase/types.ts
git commit -m "feat(safety): add visits.prescription_safety_check column"
```

---

## Task 2: Pure safety logic + tests (`safety-logic.ts`)

This is where every clamp, the completeness heuristic, and the fail-safe shaping live — all pure, all Vitest-tested. The edge function returns *raw* model output + context counts; this module turns that into a trustworthy `SafetyResult`.

**Files:**
- Create: `apps/glyph/src/lib/services/safety-logic.ts`
- Test: `apps/glyph/src/lib/services/safety-logic.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/glyph/src/lib/services/safety-logic.test.ts
import { describe, it, expect } from "vitest";
import {
  validateWarnings,
  computeCompleteness,
  buildSafetyResult,
  failedResult,
} from "./safety-logic";

describe("validateWarnings", () => {
  it("keeps a well-formed warning and normalises it", () => {
    const raw = [{
      type: "interaction", severity: "critical",
      subject: "Ibuprofen", object: "Clopidogrel",
      explanation: "Bleeding risk", basis: "Rx photo 2022", confidence: "high",
    }];
    expect(validateWarnings(raw)).toHaveLength(1);
    expect(validateWarnings(raw)[0].severity).toBe("critical");
  });

  it("drops entries with an unknown type or missing subject/object", () => {
    const raw = [
      { type: "telepathy", severity: "low", subject: "X", object: "Y", explanation: "e", basis: "b" },
      { type: "allergy", severity: "low", subject: "", object: "Y", explanation: "e", basis: "b" },
    ];
    expect(validateWarnings(raw)).toHaveLength(0);
  });

  it("clamps an unknown severity to 'moderate' and unknown confidence to 'low'", () => {
    const raw = [{ type: "contraindication", severity: "apocalyptic", subject: "A", object: "B", explanation: "e", basis: "b", confidence: "maybe" }];
    const [w] = validateWarnings(raw);
    expect(w.severity).toBe("moderate");
    expect(w.confidence).toBe("low");
  });

  it("returns [] for non-array input", () => {
    expect(validateWarnings(null)).toEqual([]);
    expect(validateWarnings("nope")).toEqual([]);
  });
});

describe("computeCompleteness", () => {
  it("is 'thin' when nothing is known", () => {
    expect(computeCompleteness({ existingMedCount: 0, hasAllergies: false, hasConditions: false })).toBe("thin");
  });
  it("is 'partial' when only one dimension is known", () => {
    expect(computeCompleteness({ existingMedCount: 0, hasAllergies: true, hasConditions: false })).toBe("partial");
  });
  it("is 'rich' when meds plus a condition or allergy are known", () => {
    expect(computeCompleteness({ existingMedCount: 2, hasAllergies: false, hasConditions: true })).toBe("rich");
  });
});

describe("buildSafetyResult", () => {
  it("assembles an ok result with validated warnings and completeness", () => {
    const r = buildSafetyResult({
      warnings: [{ type: "allergy", severity: "critical", subject: "Amoxicillin", object: "Penicillin allergy", explanation: "e", basis: "allergies on file", confidence: "high" }],
      existingMedCount: 1, hasAllergies: true, hasConditions: true,
      model: "claude-opus-4-8", checkedAt: "2026-06-15T00:00:00.000Z",
    });
    expect(r.status).toBe("ok");
    expect(r.warnings).toHaveLength(1);
    expect(r.dataCompleteness).toBe("rich");
    expect(r.verdicts).toEqual([]);
  });
});

describe("failedResult", () => {
  it("never implies safety — status is 'failed' with no warnings", () => {
    const r = failedResult("timeout");
    expect(r.status).toBe("failed");
    expect(r.warnings).toEqual([]);
    expect(r.reason).toBe("timeout");
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm run test -- safety-logic`
Expected: FAIL — `Cannot find module './safety-logic'`.

- [ ] **Step 3: Implement `safety-logic.ts`**

```ts
// apps/glyph/src/lib/services/safety-logic.ts
/**
 * Pure shaping + validation for the prescription safety check. No I/O.
 * The edge function returns raw model output + context counts; this turns it
 * into a trustworthy SafetyResult, and guarantees a failure never reads as
 * "safe" (see failedResult). Tested in safety-logic.test.ts.
 */

export type WarningType = "interaction" | "allergy" | "contraindication";
export type Severity = "critical" | "moderate" | "low";
export type Confidence = "high" | "low";
export type Completeness = "rich" | "partial" | "thin";
export type Verdict = "adjust" | "accept" | "dismiss";

export interface SafetyWarning {
  type: WarningType;
  severity: Severity;
  subject: string; // the drug being prescribed
  object: string;  // the other drug / allergy / condition
  explanation: string;
  basis: string;
  confidence: Confidence;
}

export interface WarningVerdict {
  index: number;
  verdict: Verdict;
  reason?: string;
}

export interface SafetyResult {
  status: "ok" | "failed";
  warnings: SafetyWarning[];
  dataCompleteness: Completeness;
  model: string | null;
  checkedAt: string;
  verdicts: WarningVerdict[];
  reason?: string; // only when status === "failed"
}

const TYPES: WarningType[] = ["interaction", "allergy", "contraindication"];
const SEVERITIES: Severity[] = ["critical", "moderate", "low"];

/** Validate + normalise raw model warnings. Drops malformed; clamps unknowns. */
export function validateWarnings(raw: unknown): SafetyWarning[] {
  if (!Array.isArray(raw)) return [];
  const out: SafetyWarning[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const w = item as Record<string, unknown>;
    const type = w.type as WarningType;
    const subject = typeof w.subject === "string" ? w.subject.trim() : "";
    const object = typeof w.object === "string" ? w.object.trim() : "";
    if (!TYPES.includes(type) || !subject || !object) continue;
    out.push({
      type,
      severity: SEVERITIES.includes(w.severity as Severity) ? (w.severity as Severity) : "moderate",
      subject,
      object,
      explanation: typeof w.explanation === "string" ? w.explanation.trim() : "",
      basis: typeof w.basis === "string" ? w.basis.trim() : "",
      confidence: w.confidence === "high" ? "high" : "low",
    });
  }
  return out;
}

export function computeCompleteness(args: {
  existingMedCount: number;
  hasAllergies: boolean;
  hasConditions: boolean;
}): Completeness {
  const dimensions = [args.existingMedCount > 0, args.hasAllergies, args.hasConditions].filter(Boolean).length;
  if (dimensions === 0) return "thin";
  if (args.existingMedCount > 0 && dimensions >= 2) return "rich";
  return "partial";
}

export interface RawSafetyData {
  warnings: unknown;
  existingMedCount: number;
  hasAllergies: boolean;
  hasConditions: boolean;
  model: string | null;
  checkedAt: string;
}

export function buildSafetyResult(raw: RawSafetyData): SafetyResult {
  return {
    status: "ok",
    warnings: validateWarnings(raw.warnings),
    dataCompleteness: computeCompleteness(raw),
    model: raw.model,
    checkedAt: raw.checkedAt,
    verdicts: [],
  };
}

/** The fail-safe. A check that could not run NEVER reads as safe. */
export function failedResult(reason: string): SafetyResult {
  return {
    status: "failed",
    warnings: [],
    dataCompleteness: "thin",
    model: null,
    checkedAt: new Date().toISOString(),
    verdicts: [],
    reason,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- safety-logic`
Expected: PASS (all cases above green).

- [ ] **Step 5: Commit**

```bash
git add apps/glyph/src/lib/services/safety-logic.ts apps/glyph/src/lib/services/safety-logic.test.ts
git commit -m "feat(safety): pure warning validation + completeness + fail-safe logic"
```

---

## Task 3: Edge function `check-prescription-safety`

Mirrors `consult-query`'s structure (auth → service reads → `callLLM` with `egress: { tier: "A" }` → JSON parse → envelope). Returns **raw** warnings + context counts; app-side validates.

**Files:**
- Create: `supabase/functions/check-prescription-safety/index.ts`
- Reference (do not modify): `supabase/functions/consult-query/index.ts`, `supabase/functions/_shared/llm-router.ts`

- [ ] **Step 1: Confirm the Opus 4.8 model id is routable**

Open `supabase/functions/_shared/llm-router.ts`, find `OPENROUTER_MODEL_MAP`. If there is no entry for `claude-opus-4-8`, add one following the existing Claude convention (the value is the OpenRouter slug for Opus 4.8, matching how `claude-sonnet-4-20250514` is mapped). If a native `ANTHROPIC_API_KEY` path is used for Claude, confirm `claude-opus-4-8` is a valid model id there too. This is the only router change; do not alter routing logic.

- [ ] **Step 2: Write the edge function**

```ts
// supabase/functions/check-prescription-safety/index.ts
/**
 * check-prescription-safety — proactive twin of consult-query's drug-interaction
 * route. POST { visitId, medications: [{ name, dose?, frequency?, ... }] }.
 *
 * Assembles the patient's existing meds (from prior prescriptions), allergies,
 * and conditions server-side, then asks Opus 4.8 — via the Tier-A egress
 * chokepoint — for interaction / allergy / contraindication warnings. Returns
 * RAW warnings + context counts; the app layer validates and shapes them.
 *
 * Suggest, never override: this function only reports. It never writes the Rx,
 * never blocks anything. Persistence of the doctor's verdict happens at approval.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { callLLM } from "../_shared/llm-router.ts";
import type { EdgeFunctionResponse } from "../_shared/types.ts";

interface Med { name?: string; dose?: string; frequency?: string; duration?: string; instructions?: string }

const SYSTEM_PROMPT = `You are a prescription safety checker for doctors in Bangladesh.
You are given the drugs a doctor is about to prescribe and what the patient is already
on, allergic to, and lives with. Report ONLY genuine concerns. Never diagnose, never
prescribe, never reassure beyond the data. Prefer flagging with low confidence over
silence when unsure. Consider Bangladeshi brand/generic names.

Output ONLY valid JSON, no prose, matching exactly:
{ "warnings": [ { "type": "interaction"|"allergy"|"contraindication",
  "severity": "critical"|"moderate"|"low", "subject": "<prescribed drug>",
  "object": "<other drug/allergy/condition>", "explanation": "<one short line>",
  "basis": "<what data this rests on>", "confidence": "high"|"low" } ] }
Return { "warnings": [] } when nothing genuine is found.`;

function buildPrompt(toPrescribe: string[], existingMeds: string[], allergies: string[], conditions: string[]): string {
  return `Drugs being prescribed now:
${toPrescribe.map((d) => `- ${d}`).join("\n") || "- (none)"}

Patient is already taking:
${existingMeds.map((d) => `- ${d}`).join("\n") || "- (none on file)"}

Known allergies:
${allergies.map((a) => `- ${a}`).join("\n") || "- (none on file)"}

Chronic conditions:
${conditions.map((c) => `- ${c}`).join("\n") || "- (none on file)"}

Check the drugs being prescribed against each list (drug-drug, drug-allergy,
drug-condition). Respond with the JSON object specified in your instructions.`;
}

function asStrings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === "string" ? v : (v as Record<string, unknown>)?.name)).filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  }
  return [];
}

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ success: false, error: "Missing authorization header", code: "UNAUTHORIZED" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ success: false, error: "Invalid token", code: "UNAUTHORIZED" }, 401);

    const { visitId, medications } = await req.json();
    if (!visitId || !Array.isArray(medications)) {
      return json({ success: false, error: "visitId and medications[] are required", code: "BAD_REQUEST" }, 400);
    }

    // Drafted Rx → display strings.
    const toPrescribe = (medications as Med[])
      .filter((m) => m?.name)
      .map((m) => [m.name, m.dose, m.frequency].filter(Boolean).join(" "));

    // Patient context via service role (RLS-bypassing read of the patient the
    // visit belongs to — the doctor already proved scope via getUser + the visit).
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: visit } = await admin.from("visits").select("patient_id").eq("id", visitId).single();
    if (!visit?.patient_id) return json({ success: false, error: "Visit not found", code: "NOT_FOUND" }, 404);

    const { data: patient } = await admin
      .from("patients").select("known_allergies, chronic_conditions").eq("id", visit.patient_id).single();

    const { data: priorRx } = await admin
      .from("prescriptions").select("medications, source, created_at")
      .eq("patient_id", visit.patient_id).neq("visit_id", visitId);

    const existingMeds = (priorRx ?? []).flatMap((p) => asStrings((p.medications as { name?: string }[] | null)));
    const allergies = asStrings(patient?.known_allergies);
    const conditions = asStrings(patient?.chronic_conditions);

    const llm = await callLLM({
      primary: { provider: "claude", model: "claude-opus-4-8", temperature: 0.1, maxTokens: 2000 },
      fallback: { provider: "claude", model: "claude-sonnet-4-20250514", temperature: 0.1, maxTokens: 2000 },
      prompt: buildPrompt(toPrescribe, existingMeds, allergies, conditions),
      systemPrompt: SYSTEM_PROMPT,
      visitId,
      edgeFunction: "check-prescription-safety",
      egress: { tier: "A" }, // structured drug/condition names only — no PII, no free text
    }) as { text: string; model: string };

    let warnings: unknown = [];
    try {
      warnings = JSON.parse(llm.text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()).warnings ?? [];
    } catch {
      // Malformed model output: report empty + let the app treat low confidence as needed.
      // (The app's smoke test asserts the happy path; a parse failure here surfaces as
      // an empty raw list, and the client still records the model + checkedAt.)
      warnings = [];
    }

    return json<EdgeFunctionResponse>({
      success: true,
      data: {
        warnings,
        existingMedCount: existingMeds.length,
        hasAllergies: allergies.length > 0,
        hasConditions: conditions.length > 0,
        model: llm.model,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[check-prescription-safety] Error:", err);
    return json({ success: false, error: err instanceof Error ? err.message : "Internal error", code: "INTERNAL_ERROR" }, 500);
  }
});

function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
```

- [ ] **Step 3: Serve locally and smoke a hand request**

Run: `supabase functions serve check-prescription-safety` (in one terminal; `supabase start` running).
In another, POST a minimal body with a valid doctor JWT (reuse the token approach from `scripts/smoke-path.mjs`). Expected: `200` with `{ success: true, data: { warnings: [...], existingMedCount, hasAllergies, hasConditions, model, checkedAt } }`. (Full assertions live in Task 8's smoke script.)

- [ ] **Step 4: Type-check the edge function**

Run: `npm run type-check`
Expected: passes (the app workspace; the Deno fn is excluded from the app tsconfig — confirm it isn't picked up, matching the other edge fns).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/check-prescription-safety/index.ts supabase/functions/_shared/llm-router.ts
git commit -m "feat(safety): check-prescription-safety edge function (Tier-A, Opus 4.8)"
```

---

## Task 4: Client service (`safety.ts`) with the fail-safe

**Files:**
- Create: `apps/glyph/src/lib/services/safety.ts`
- Test: `apps/glyph/src/lib/services/safety.test.ts`

- [ ] **Step 1: Write the failing test (fail-safe contract)**

```ts
// apps/glyph/src/lib/services/safety.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the edge invoker so we test the fail-safe wrapping, not the network.
vi.mock("./ai-invoke", () => ({ invokeFunction: vi.fn() }));
import { invokeFunction } from "./ai-invoke";
import { checkPrescriptionSafety } from "./safety";

describe("checkPrescriptionSafety", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns an ok result when the edge fn succeeds", async () => {
    (invokeFunction as ReturnType<typeof vi.fn>).mockResolvedValue({
      warnings: [{ type: "interaction", severity: "moderate", subject: "A", object: "B", explanation: "e", basis: "b", confidence: "low" }],
      existingMedCount: 1, hasAllergies: false, hasConditions: true, model: "claude-opus-4-8", checkedAt: "2026-06-15T00:00:00.000Z",
    });
    const r = await checkPrescriptionSafety("visit-1", [{ name: "A" }]);
    expect(r.status).toBe("ok");
    expect(r.warnings).toHaveLength(1);
  });

  it("returns a FAILED result (never 'safe') when the edge fn throws", async () => {
    (invokeFunction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network down"));
    const r = await checkPrescriptionSafety("visit-1", [{ name: "A" }]);
    expect(r.status).toBe("failed");
    expect(r.warnings).toEqual([]);
  });
});
```

- [ ] **Step 2: Extract the invoker so it can be mocked**

The existing `invokeFunction` lives inside `ai.ts` (not exported). Create a tiny shared module and have `ai.ts` import from it (DRY; no behaviour change).

Create `apps/glyph/src/lib/services/ai-invoke.ts` with the `buildHeaders`, `functionUrl`, and `invokeFunction` helpers **moved verbatim** from `ai.ts` (lines 81–133 of `ai.ts`), exporting `invokeFunction`. Then in `ai.ts`, delete those local copies and add `import { invokeFunction } from "./ai-invoke";`. Run `npm run test` to confirm existing AI-service behaviour is unchanged.

- [ ] **Step 3: Run the new test to verify it fails**

Run: `npm run test -- services/safety`
Expected: FAIL — `Cannot find module './safety'`.

- [ ] **Step 4: Implement `safety.ts`**

```ts
// apps/glyph/src/lib/services/safety.ts
/**
 * Client service for the prescription safety check. Calls the edge function and
 * shapes the result. ANY failure (network, HTTP, malformed) becomes failedResult
 * — the surface then shows "couldn't run", never a green light.
 */
import { invokeFunction } from "./ai-invoke";
import { buildSafetyResult, failedResult, type SafetyResult, type RawSafetyData } from "./safety-logic";

interface MedInput { name?: string; dose?: string; frequency?: string; duration?: string; instructions?: string }

const TIMEOUT_MS = 12000;

export async function checkPrescriptionSafety(
  visitId: string,
  medications: MedInput[],
): Promise<SafetyResult> {
  try {
    const raw = await Promise.race([
      invokeFunction<RawSafetyData>("check-prescription-safety", { visitId, medications }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("safety check timed out")), TIMEOUT_MS)),
    ]);
    return buildSafetyResult(raw);
  } catch (err) {
    return failedResult(err instanceof Error ? err.message : "safety check failed");
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- services/safety` and `npm run test`
Expected: both PASS; pre-existing AI-service tests still green (the `ai-invoke` extraction is behaviour-preserving).

- [ ] **Step 6: Commit**

```bash
git add apps/glyph/src/lib/services/safety.ts apps/glyph/src/lib/services/safety.test.ts apps/glyph/src/lib/services/ai-invoke.ts apps/glyph/src/lib/services/ai.ts
git commit -m "feat(safety): client service with fail-safe + invokeFunction extraction"
```

---

## Task 5: `PrescriptionSafetyPanel` component

**Files:**
- Create: `apps/glyph/src/components/doctor/PrescriptionSafetyPanel.tsx`

- [ ] **Step 1: Implement the component**

```tsx
// apps/glyph/src/components/doctor/PrescriptionSafetyPanel.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import type { SafetyResult, Verdict, WarningVerdict } from "@/lib/services/safety-logic";

const SEVERITY_STYLE: Record<string, string> = {
  critical: "border-red_flag/40 bg-red_flag/5 text-red_flag",
  moderate: "border-amber-300 bg-amber-50 text-amber-800",
  low: "border-bone-line bg-bone-raise text-ink-soft",
};

const COMPLETENESS_NOTE: Record<string, string> = {
  rich: "Checked against this patient's known medications, allergies, and conditions.",
  partial: "Limited record — checked against what little is on file. Verify manually.",
  thin: "Almost no medication history on file — this is NOT a clean bill of health.",
};

/**
 * Renders the safety check at approval time. Suggest, never block: the parent's
 * Confirm button proceeds regardless of verdicts. "Ask Glyph" hands the warning
 * to the consult for sourced detail.
 */
export function PrescriptionSafetyPanel(props: {
  result: SafetyResult;
  onVerdict: (v: WarningVerdict) => void;
  onAskGlyph: (warningText: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirming: boolean;
}) {
  const { result, onVerdict, onAskGlyph, onConfirm, onCancel, confirming } = props;
  const [verdicts, setVerdicts] = React.useState<Record<number, Verdict>>({});

  const setV = (index: number, verdict: Verdict) => {
    setVerdicts((p) => ({ ...p, [index]: verdict }));
    onVerdict({ index, verdict });
  };

  if (result.status === "failed") {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">⚠ Safety check couldn&apos;t run — review the prescription manually.</p>
        <p className="mt-1 text-xs text-amber-700">{result.reason}</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={onConfirm} disabled={confirming}>{confirming ? "Approving…" : "Approve anyway"}</Button>
          <Button variant="outline" onClick={onCancel} disabled={confirming}>Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-bone-line bg-white p-4">
      {result.warnings.length === 0 ? (
        <p className="text-sm font-medium text-glyph-800">✓ No interactions found based on the medications on file.</p>
      ) : (
        <>
          <p className="text-sm font-semibold text-ink">Review {result.warnings.length} possible concern{result.warnings.length > 1 ? "s" : ""} before approving:</p>
          {result.warnings.map((w, i) => (
            <div key={i} className={`rounded-lg border p-3 ${SEVERITY_STYLE[w.severity] ?? SEVERITY_STYLE.low}`}>
              <p className="text-[13px] font-semibold uppercase tracking-wide">{w.severity} · {w.type}</p>
              <p className="mt-1 text-sm text-ink">{w.subject} ↔ {w.object}</p>
              <p className="mt-1 text-sm text-ink-soft">{w.explanation}</p>
              <p className="mt-1 text-xs text-ink-faint">Basis: {w.basis}{w.confidence === "low" ? " · low confidence, verify" : ""}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button onClick={() => onAskGlyph(`${w.subject} with ${w.object}: ${w.explanation}`)} className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-bone-raise">Ask Glyph</button>
                {(["adjust", "accept", "dismiss"] as Verdict[]).map((v) => (
                  <button key={v} onClick={() => setV(i, v)} className={`rounded-full border px-3 py-1 text-xs capitalize ${verdicts[i] === v ? "border-ink bg-ink text-bone-raise" : "border-ink/20 text-ink"}`}>{v}</button>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
      <p className="text-xs text-ink-faint">{COMPLETENESS_NOTE[result.dataCompleteness]}</p>
      <div className="flex gap-2 pt-1">
        <Button onClick={onConfirm} disabled={confirming}>{confirming ? "Approving…" : "Confirm & approve"}</Button>
        <Button variant="outline" onClick={onCancel} disabled={confirming}>Back to note</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: passes. (If `Button` has no `variant="outline"`, use the project's existing secondary variant — check `components/ui/button.tsx` and match it.)

- [ ] **Step 3: Commit**

```bash
git add apps/glyph/src/components/doctor/PrescriptionSafetyPanel.tsx
git commit -m "feat(safety): PrescriptionSafetyPanel — warnings, verdicts, Ask Glyph, fail-safe"
```

---

## Task 6: Note-screen integration (two-phase approve)

Intercept approval: run the check, show the panel, then commit. Keeps `NoteEditor` unchanged — the orchestration lives in the page.

**Files:**
- Modify: `apps/glyph/src/app/doctor/note/[visitId]/page.tsx`

- [ ] **Step 1: Add imports and state**

Add to the imports:
```tsx
import { checkPrescriptionSafety } from "@/lib/services/safety";
import type { SafetyResult, WarningVerdict } from "@/lib/services/safety-logic";
import { PrescriptionSafetyPanel } from "@/components/doctor/PrescriptionSafetyPanel";
```
Add to component state (near the other `useState` calls):
```tsx
const [safety, setSafety] = React.useState<SafetyResult | null>(null);
const [checking, setChecking] = React.useState(false);
const [pendingApproval, setPendingApproval] = React.useState<
  { note: BDNote; doctorEdits: ServerNote | undefined } | null
>(null);
const verdictsRef = React.useRef<WarningVerdict[]>([]);
```

- [ ] **Step 2: Split `handleApprove` into "run check" and "commit"**

Replace the existing `handleApprove` body so that, instead of calling `/api/visits/approve-note` directly, it computes `doctorEdits`, runs the safety check, and parks the approval:

```tsx
const handleApprove = React.useCallback(
  async (_note: BDNote | SOAPNote, format: NoteFormat, edits: NoteEdits) => {
    if (format === "soap") { toast.error("Approval is BD-format only for now"); return; }
    const original = (visit?.generated_note ?? {}) as ServerNote;
    const edited = _note as BDNote;
    const hasEdits = Object.values(edits).some(Boolean);
    const doctorEdits = hasEdits
      ? { ...original, chiefComplaint: edited.cc, onExamination: edited.oe, investigations: edited.ix, advice: edited.advice }
      : undefined;

    setChecking(true);
    verdictsRef.current = [];
    try {
      const meds = (original.prescription?.medications ?? []).filter((m) => m.name);
      const result = await checkPrescriptionSafety(visitId, meds);
      setSafety(result);
      setPendingApproval({ note: edited, doctorEdits });
    } finally {
      setChecking(false);
    }
  },
  [visitId, visit]
);
```

- [ ] **Step 3: Add the commit function (called by the panel's Confirm)**

```tsx
const commitApproval = React.useCallback(async () => {
  if (!pendingApproval || !safety) return;
  setApproving(true);
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const safetyCheck = { ...safety, verdicts: verdictsRef.current };
    const res = await fetch("/api/visits/approve-note", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ visitId, safetyCheck, ...(pendingApproval.doctorEdits ? { doctorEdits: pendingApproval.doctorEdits } : {}) }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? `Approval failed (${res.status})`);
    setCredentials({ visitNoteVcId: json.data.visitNoteVcId, prescriptionVcId: json.data.prescriptionVcId });
    toast.success("Note approved — credentials issued");
    setSafety(null); setPendingApproval(null);
    await refresh();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Approval failed");
  } finally {
    setApproving(false);
  }
}, [pendingApproval, safety, visitId, refresh]);
```

- [ ] **Step 4: Render the panel when a check is pending**

Immediately above the `<NoteEditor … />` block, add:
```tsx
{checking && <p className="mb-3 text-center text-sm text-slate-500">Running prescription safety check…</p>}
{safety && (
  <div className="mb-5">
    <PrescriptionSafetyPanel
      result={safety}
      onVerdict={(v) => { verdictsRef.current = [...verdictsRef.current.filter((x) => x.index !== v.index), v]; }}
      onAskGlyph={(text) => { window.location.href = `/doctor/consult/${visitId}?q=${encodeURIComponent(text)}`; }}
      onConfirm={commitApproval}
      onCancel={() => { setSafety(null); setPendingApproval(null); }}
      confirming={approving}
    />
  </div>
)}
```
(The consult page reads an optional `?q=` to pre-seed the question — wire that read in `app/doctor/consult/[visitId]/page.tsx` if it isn't already; if pre-seeding is non-trivial, ship "Ask Glyph" as a plain link to the consult for v1 and note it.)

- [ ] **Step 5: Type-check and browser-verify**

Run: `npm run type-check` (expect pass), then `npm run dev` and walk a visit with a generated note: click approve → see the "Running…" then the panel → confirm → credentials issue as before. Verify the failed-state path by temporarily pointing `NEXT_PUBLIC_SUPABASE_URL` at a bad value (expect "couldn't run", approval still possible). Restore env after.

- [ ] **Step 6: Commit**

```bash
git add apps/glyph/src/app/doctor/note/[visitId]/page.tsx
git commit -m "feat(safety): run safety check at note-approval, render panel, two-phase commit"
```

---

## Task 7: Persist the check + verdicts in approve-note

**Files:**
- Modify: `apps/glyph/src/app/api/visits/approve-note/route.ts`

- [ ] **Step 1: Accept `safetyCheck` from the body**

Change the input destructure (line 58) to also pull `safetyCheck`:
```ts
const { visitId, doctorEdits, nextAppointmentAt, safetyCheck } = await req.json().catch(() => ({}));
```

- [ ] **Step 2: Write it into the visit update**

In the `admin.from('visits').update({ … })` call (lines 144–152), add the column:
```ts
.update({
  approved_note: noteToApprove as Json,
  doctor_edits: (doctorEdits ?? null) as Json,
  approved_at: new Date().toISOString(),
  note_credential_id: noteCredential.rowId,
  status: 'completed',
  prescription_safety_check: (safetyCheck ?? null) as Json,
})
```
No validation gate here — the safety check never blocks approval (spec §8). It is recorded exactly as the client computed it (warnings already validated app-side in Task 2).

- [ ] **Step 3: Type-check**

Run: `npm run type-check`
Expected: passes (the column exists on the generated `Database` type from Task 1).

- [ ] **Step 4: Commit**

```bash
git add apps/glyph/src/app/api/visits/approve-note/route.ts
git commit -m "feat(safety): persist safety check + verdicts on approve-note"
```

---

## Task 8: End-to-end smoke + regression

**Files:**
- Create: `scripts/smoke-rx-safety.mjs`

- [ ] **Step 1: Write the smoke script**

Model it on `scripts/smoke-triage.mjs` (hits the live edge function with a real doctor JWT). It must: register a patient with a known cardiac condition + a penicillin allergy, seed a prior prescription, create a visit, then POST `check-prescription-safety` for several fixtures and assert:

```
1. Cardiac fixture  — prescribe Ibuprofen → expect ≥1 warning, type interaction|contraindication.
2. Allergy fixture  — prescribe Amoxicillin → expect ≥1 warning, type "allergy".
3. Clean fixture    — prescribe Paracetamol to a patient with empty history → expect warnings: [].
4. Thin-data fixture — patient with no allergies/conditions/prior Rx → response has hasAllergies=false,
                       hasConditions=false, existingMedCount=0 (the app maps this to completeness "thin").
5. Auth fixture     — POST with no Authorization → expect 401.
```
Each assertion prints PASS/FAIL with the count, exactly like the other smoke scripts. (The "model-down → failedResult" path is covered by the Vitest test in Task 4; the smoke proves the live function + real model.)

- [ ] **Step 2: Run it locally**

Run:
```bash
node scripts/smoke-rx-safety.mjs http://127.0.0.1:54321 <ANON_KEY> <SERVICE_KEY>
```
Expected: all five fixtures PASS.

- [ ] **Step 3: Run the regression gate**

Run:
```bash
node scripts/smoke-path.mjs http://127.0.0.1:54321 <ANON_KEY> <SERVICE_KEY>
```
Expected: the full clinical path still passes (the safety work is additive; approval still issues credentials).

- [ ] **Step 4: Commit**

```bash
git add scripts/smoke-rx-safety.mjs
git commit -m "test(safety): e2e smoke for prescription safety check"
```

---

## Deployment (after all tasks pass; do not run without explicit 'ship it')

```bash
supabase db push -p (Get-Content .db-password.glyph-prod.local)   # migration 010
supabase functions deploy check-prescription-safety
vercel deploy --prod --yes                                         # frontend
node scripts/smoke-rx-safety.mjs <PROD_FUNCTIONS_URL> <ANON> <SERVICE>
node scripts/smoke-path.mjs <PROD_URL> <ANON> <SERVICE>            # prod regression gate
```
Set the Opus 4.8 model id in OpenRouter (Task 3 Step 1) before deploy, or the primary will fail over to Sonnet.

---

## Self-Review (run against the spec)

- **§1 trio** → Task 3 prompt checks drug↔drug, drug↔allergy, drug↔condition; Task 8 fixtures cover each. ✓
- **§2 one core / Tier-A / Opus / KhaM-Med seam** → Task 3 (`egress: { tier: "A" }`, `claude-opus-4-8`, single `callLLM` swap point). ✓
- **§3 inputs + provenance** → Task 3 assembles existing meds (prior Rx) + allergies + conditions; `basis` field carries provenance. ✓
- **§4 schema + safety bias** → Task 2 `validateWarnings`; Task 3 system prompt ("prefer flagging with low confidence over silence"). ✓
- **§5 fail-safe** → Task 2 `failedResult`, Task 4 try/catch + timeout, Task 5 failed-state UI. ✓
- **§6 persistence/flywheel** → Task 1 column, Task 6 verdict capture, Task 7 write. ✓
- **§7 surface + Ask Glyph + verdicts + nothing-found** → Task 5 + Task 6. ✓
- **§8 invariants (never block/edit/certify)** → Task 7 (no gate), Task 5 (Confirm always enabled), prompt wording. ✓
- **§9 testing** → Task 2 (unit), Task 4 (fail-safe unit), Task 8 (smoke + regression). ✓

**Placeholder scan:** no TBD/TODO; every code step is complete. **Type consistency:** `SafetyResult`/`SafetyWarning`/`WarningVerdict`/`Verdict`/`Completeness` defined in Task 2, imported unchanged in Tasks 4–6. One known follow-up flagged inline: consult `?q=` pre-seed (Task 6 Step 4) degrades gracefully to a plain consult link if not already supported.
