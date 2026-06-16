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
