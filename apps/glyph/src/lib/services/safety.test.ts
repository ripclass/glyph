import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the edge invoker so we test the fail-safe wrapping, not the network.
vi.mock("./ai-invoke", () => ({ invokeFunction: vi.fn() }));
import { invokeFunction } from "./ai-invoke";
import { checkPrescriptionSafety } from "./safety";

describe("checkPrescriptionSafety", () => {
  beforeEach(() => { vi.resetAllMocks(); });

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

  it("returns FAILED when the edge fn resolves with no payload", async () => {
    (invokeFunction as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const r = await checkPrescriptionSafety("visit-1", [{ name: "A" }]);
    expect(r.status).toBe("failed");
    expect(r.warnings).toEqual([]);
  });
});
