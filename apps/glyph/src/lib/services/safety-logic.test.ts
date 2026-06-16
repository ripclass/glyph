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
