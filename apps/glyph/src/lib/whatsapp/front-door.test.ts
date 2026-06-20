import { describe, it, expect } from "vitest";
import { parseSubjectChoice, buildWelcome, FRONT_DOOR_CONSENT_MSG } from "./front-door";

describe("parseSubjectChoice", () => {
  it("maps self choices", () => {
    for (const t of ["1", "१", "नजे", " आमि "]) expect(parseSubjectChoice(t)).toBe("self");
  });
  it("maps family choices", () => {
    for (const t of ["2", "२", "परिवार"]) expect(parseSubjectChoice(t)).toBe("family");
  });
  it("returns null for anything else", () => {
    for (const t of ["", "hello", "3", "३"]) expect(parseSubjectChoice(t)).toBeNull();
  });
});

describe("copy", () => {
  it("welcome embeds the wallet url and has no em dash", () => {
    const msg = buildWelcome("https://khamhealth.com/wallet/abc");
    expect(msg).toContain("https://khamhealth.com/wallet/abc");
    expect(msg).not.toContain("—");
  });
  it("consent notice has no em dash", () => {
    expect(FRONT_DOOR_CONSENT_MSG).not.toContain("—");
  });
});
