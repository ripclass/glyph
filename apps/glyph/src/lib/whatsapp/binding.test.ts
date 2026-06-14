import { describe, it, expect } from "vitest";
import { generateBindCode, extractBindCode } from "./binding";

describe("generateBindCode", () => {
  it("is 6 digits", () => {
    for (let i = 0; i < 20; i++) expect(generateBindCode()).toMatch(/^\d{6}$/);
  });
});

describe("extractBindCode", () => {
  it("pulls a 6-digit code out of arbitrary text", () => {
    expect(extractBindCode("আমার কোড 482910")).toBe("482910");
    expect(extractBindCode("482910")).toBe("482910");
  });
  it("returns null when there is no 6-digit group", () => {
    expect(extractBindCode("hello")).toBeNull();
    expect(extractBindCode("12345")).toBeNull(); // too short
  });
});
