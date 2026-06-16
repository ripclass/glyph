# Prescription Safety Check — Design Spec

**KhaM Health · Glyph · 2026-06-15**

**Goal:** At note-approval, cross-check the drugs a doctor is about to prescribe against what Glyph already knows the patient is taking, is allergic to, and lives with — and surface interaction / allergy / contraindication warnings *before* the doctor signs. It suggests; it never blocks, never auto-edits, never claims certainty.

**Why:** A doctor seeing 50–100 patients/day cannot hold every patient's full medication history and every interaction in working memory at patient #80. Glyph already holds the longitudinal record (the moat). This turns that record into an active, tireless second pair of eyes at the one moment it matters most — the moment the prescription is committed.

---

## 1. Scope

### In scope (v1) — the trio
- **Drug ↔ drug** — the drafted Rx vs. the patient's existing medications.
- **Drug ↔ allergy** — the drafted Rx vs. `patients.known_allergies`.
- **Drug ↔ condition** — the drafted Rx vs. `patients.chronic_conditions` (e.g., NSAID with cardiac/renal disease).

### Explicitly out of scope (deferred, not forgotten)
- Duplicate-therapy detection (two drugs, same class).
- Dose-range / renal–hepatic dose adjustment — high false-positive risk, needs lab values, and is where a *licensed drug database* (not an LLM) is the right tool. A future spec.
- Cost-substitution suggestions, differentials, recent-evidence lookups — these belong to the **consult** surface (some already exist there), not this check.

### Relationship to the existing consult
This check is the **proactive twin** of the consult's existing drug-interaction route. There is **one clinical core**; the consult exposes it reactively (the doctor asks), this check fires it proactively (at approval). They must never contradict each other, so they share the same reasoning grounding. Each warning links into the consult for deeper, source-backed research.

---

## 2. Architecture — one clinical core, two surfaces

A new bounded edge function `supabase/functions/check-prescription-safety/index.ts`.

- **Inputs assembled server-side** from the visit + patient (see §3). The client only sends the `visitId` and the drafted medications; the function reads patient context with the service-role client.
- **Egress: Tier A.** Only structured fields leave the country — drug names, condition names, allergy names. No patient name, no phone, no NID, no free-text transcript. This is the safest egress tier and sidesteps the free-text de-identification problem entirely. The call goes through the existing egress chokepoint (`_shared/egress.ts`), declared Tier A, fail-closed, logged to `egress_log`.
- **Model:** Claude Opus 4.8 (the current most capable model). The check runs **once per visit**, not per conversational turn, so the cost is bounded — and this is the single highest-stakes reasoning Glyph does, so it gets the sharpest brain, not the cheapest. Routed through the existing `_shared/llm-router.ts` (`callLLM`).
- **KhaM-Med swap seam:** the function's reasoning step is a single internal call with a fixed input/output contract (the warning schema in §4). Swapping Claude → KhaM-Med later is a router-config change behind that contract — the surface, the schema, and the consumers do not change. This is the "bounded, structured task that hands off to KhaM-Med first" from the KhaM-Med training architecture (§7 of that doc).
- **Cost logging:** like every LLM call in Glyph, it ends with `logUsage()` (`_shared/cost-logger.ts`).

---

## 3. Inputs (data flow)

The function assembles, for one visit:

| Input | Source |
|---|---|
| **Drafted Rx** (the drugs under review) | The `medications` the doctor is about to approve, sent from the note screen |
| **Existing medications** | Drugs from the patient's prior `prescriptions` rows (sources `photo_historical` / `photo_current` / prior `generated`), excluding the current draft. Each tagged with provenance + date. |
| **Allergies** | `patients.known_allergies` (JSONB) |
| **Conditions** | `patients.chronic_conditions` (JSONB) |

Every input carries **provenance** (where it came from) and, where available, **recency** (date), so a warning can cite its basis and so the function can compute a **data-completeness** signal (how much it actually knows about this patient's medications). Thin data must never read as a clean bill of health (§5).

---

## 4. Output — structured, schema-validated

The function returns a validated JSON object. The LLM is forced to emit this exact shape (strict JSON; retry on mismatch).

```
{
  "warnings": [
    {
      "type": "interaction" | "allergy" | "contraindication",
      "severity": "critical" | "moderate" | "low",
      "subject": "<the drug being prescribed>",
      "object": "<the other drug / allergy / condition>",
      "explanation": "<one-line, plain-language why>",
      "basis": "<what data this is grounded in, e.g. 'Rx photo dated 2022-03'>",
      "confidence": "high" | "low"
    }
  ],
  "data_completeness": "rich" | "partial" | "thin",
  "checked_at": "<ISO timestamp, stamped by the function>"
}
```

Rules baked into the prompt:
- Return `warnings: []` when nothing is found — and the surface then shows an explicit "nothing found *based on known meds*", never an unqualified "safe."
- **Safety bias:** when uncertain, flag with `confidence: "low"` rather than stay silent. A low-confidence prompt to verify is cheap; a missed critical interaction is not.
- Plain language a busy clinician reads in two seconds; no citations dumped inline (that's what "Ask Glyph" is for).

---

## 5. Fail-safe (the rule that keeps it honest)

A safety feature that fails *silently* is worse than no feature, because silence reads as "safe."

- If the check cannot run — model error, timeout (a few-second budget so approval is never held hostage), missing AI-processing consent, or malformed output after retry — the surface shows **"⚠ Safety check couldn't run — review manually,"** never a green light.
- Approval is **never blocked** by a failed or slow check. The doctor proceeds with eyes open.
- The "couldn't run" state is itself recorded (§6), so a systematically failing check is visible, not invisible.

---

## 6. Persistence → audit + flywheel

For every approval, store on the visit:
- the warnings produced (or the "couldn't run" state),
- the doctor's **verdict on each warning** — `adjust` / `accept` / `dismiss` (+ optional free-text reason),
- the model + prompt version, and the `checked_at` timestamp.

This is an **audit trail today** and **doctor-corrected ground truth tomorrow** — precisely the high-value training/eval signal the KhaM-Med architecture (§2, §5) is built to consume.

**v1 storage:** a `prescription_safety_check` JSONB column on `visits`, matching how `briefing_card` / `generated_note` are already stored. (A dedicated append-only table is a later analytics/eval optimization, not a v1 need.)

---

## 7. Surface (UI on the note/approve screen)

In `apps/glyph/src/app/doctor/note/[visitId]/page.tsx`:

1. The doctor finishes the note and initiates approval.
2. The check runs (brief inline spinner, bounded by the timeout).
3. A **warnings panel** renders *above* the final Approve action:
   - each warning: severity color, `subject ↔ object`, the plain-language why, the basis line, and a low-confidence marker where relevant;
   - each warning has an **"Ask Glyph"** button → opens the **consult** for this visit, pre-seeded with that warning's context, so the doctor gets the UpToDate/Perplexity-sourced deep answer in the surface they already trust;
   - each warning has a one-tap **verdict** control (Adjust Rx / Accept anyway / Dismiss).
4. Zero warnings → a quiet confirmation line that *names the completeness caveat* ("No interactions found based on the medications on file").
5. The doctor approves (the existing approve-note flow proceeds, now also persisting §6). Approval is never gated on verdicts being "clean" — only on the doctor having seen the panel.

---

## 8. Invariants (non-negotiable, enforced in code + prompt)

- **Never blocks** approval.
- **Never auto-edits** the prescription.
- **Always "verify," never "certified safe."** No warning is presented as a ruling.
- **Records** the doctor's decision; **never enforces** it.
- The doctor remains the decision-maker, always (this is the project-wide clinical rule: *never override the doctor*).

---

## 9. Testing

- **Unit tests** (Vitest) on: input assembly (provenance/recency tagging, completeness computation), output schema validation, and every fail-safe branch (model error, timeout, no-consent, malformed-output-after-retry).
- **Smoke** `scripts/smoke-rx-safety.mjs` with fixtures: the post-cardiac NSAID case (expects a contraindication/interaction warning), a penicillin-allergy case (expects an allergy warning), a clean case (expects `warnings: []`), a thin-data case (expects `data_completeness: "thin"`), and a model-down case (expects the explicit "couldn't run" state, not a green light).
- A browser pass on the note screen confirming the panel, the "Ask Glyph" deep-link, verdict capture, and the fail-safe message.
- `scripts/smoke-path.mjs` against prod stays the regression gate after any edge-function/schema deploy.

---

## 10. Build order (high level — detailed in the plan)

1. Migration: `prescription_safety_check` JSONB on `visits` + regenerate types.
2. The edge function `check-prescription-safety` (input assembly → Tier-A egress → Opus 4.8 via router → schema-validated warnings → cost log), with unit tests.
3. Client service + the note-screen warnings panel (render, "Ask Glyph" deep-link, verdict capture).
4. Persist warnings + verdicts through the approve-note flow.
5. `smoke-rx-safety.mjs` + browser pass + `smoke-path.mjs` regression.

---

*Suggests, never overrides. The doctor decides. Glyph just never forgets, and never gets tired.*
