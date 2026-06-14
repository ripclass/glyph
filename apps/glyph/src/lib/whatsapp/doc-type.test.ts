import { describe, it, expect } from "vitest";
import { parseDocType } from "./doc-type";

describe("parseDocType", () => {
  it("maps prescription answers", () => {
    for (const s of ["১", "1", "প্রেসক্রিপশন", "rx", "Rx", "prescription"]) expect(parseDocType(s)).toBe("prescription");
  });
  it("maps lab report answers", () => {
    for (const s of ["২", "2", "রিপোর্ট", "lab", "report", "ল্যাব"]) expect(parseDocType(s)).toBe("lab_report");
  });
  it("returns null for anything else", () => {
    for (const s of ["", "hi", "৩", "3"]) expect(parseDocType(s)).toBeNull();
  });
});
