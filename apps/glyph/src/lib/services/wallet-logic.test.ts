import { describe, it, expect } from "vitest";
import {
  generateToken,
  normalizePin,
  hashPin,
  verifyPin,
  validateAccess,
} from "./wallet-logic";

describe("generateToken", () => {
  it("produces URL-safe tokens with no padding or unsafe chars", () => {
    const t = generateToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t.length).toBeGreaterThanOrEqual(30);
  });
  it("is unique across calls", () => {
    const set = new Set(Array.from({ length: 200 }, () => generateToken()));
    expect(set.size).toBe(200);
  });
});

describe("normalizePin", () => {
  it("accepts exactly four digits", () => {
    expect(normalizePin("0420")).toBe("0420");
    expect(normalizePin(" 1234 ")).toBe("1234");
  });
  it("rejects non-4-digit input", () => {
    for (const bad of ["123", "12345", "abcd", "12a4", "", 1234, null, undefined]) {
      expect(normalizePin(bad)).toBeNull();
    }
  });
});

describe("hashPin / verifyPin", () => {
  it("round-trips a valid PIN", () => {
    const h = hashPin("4821");
    expect(h).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
    expect(verifyPin("4821", h)).toBe(true);
  });
  it("rejects a wrong PIN", () => {
    const h = hashPin("4821")!;
    expect(verifyPin("0000", h)).toBe(false);
  });
  it("salts: same PIN hashes differently each time", () => {
    expect(hashPin("1111")).not.toBe(hashPin("1111"));
  });
  it("returns null for an invalid PIN and verify handles nulls", () => {
    expect(hashPin("12")).toBeNull();
    expect(verifyPin("1234", null)).toBe(false);
    expect(verifyPin("12", "salt:key")).toBe(false);
  });
});

describe("validateAccess", () => {
  it("revoked tokens are refused first", () => {
    expect(validateAccess({ revoked: true, pin_hash: null })).toBe("revoked");
    expect(validateAccess({ revoked: true, pin_hash: hashPin("1234") }, "1234")).toBe("revoked");
  });
  it("no PIN set → opens directly", () => {
    expect(validateAccess({ revoked: false, pin_hash: null })).toBe("ok");
  });
  it("PIN set but none provided → pin_required", () => {
    const h = hashPin("1234");
    expect(validateAccess({ revoked: false, pin_hash: h })).toBe("pin_required");
    expect(validateAccess({ revoked: false, pin_hash: h }, "")).toBe("pin_required");
  });
  it("PIN set, correct → ok; wrong → invalid_pin", () => {
    const h = hashPin("1234");
    expect(validateAccess({ revoked: false, pin_hash: h }, "1234")).toBe("ok");
    expect(validateAccess({ revoked: false, pin_hash: h }, "9999")).toBe("invalid_pin");
  });
});
