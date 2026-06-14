import { describe, it, expect } from "vitest";
import { formatOutcome } from "./reply";
import type { TriageOutcome } from "@/lib/services/triage-logic";

describe("formatOutcome", () => {
  it("a question is just its text", () => {
    const o: TriageOutcome = { mode: "question", text: "কত দিন ধরে?" };
    expect(formatOutcome(o)).toBe("কত দিন ধরে?");
  });
  it("an urgent answer leads with the go-now line", () => {
    const o: TriageOutcome = { mode: "answer", text: "x", route: "urgent", redFlag: "এখনই হাসপাতালে যান।" };
    expect(formatOutcome(o)).toContain("এখনই হাসপাতালে যান।");
  });
  it("a doctor answer includes the text and any watchFor list", () => {
    const o: TriageOutcome = { mode: "answer", text: "ডাক্তার দেখান।", route: "doctor", watchFor: ["জ্বর বাড়লে", "শ্বাসকষ্ট"] };
    const s = formatOutcome(o);
    expect(s).toContain("ডাক্তার দেখান।");
    expect(s).toContain("জ্বর বাড়লে");
  });
});
