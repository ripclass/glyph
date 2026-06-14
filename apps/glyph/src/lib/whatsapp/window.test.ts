import { describe, it, expect } from "vitest";
import { WA_WINDOW_MS, isWindowOpen, nextWindowExpiry } from "./window";

describe("window", () => {
  const now = new Date("2026-06-14T12:00:00Z");
  it("is open when expiry is in the future", () => {
    expect(isWindowOpen(new Date("2026-06-14T20:00:00Z"), now)).toBe(true);
  });
  it("is closed when expiry has passed or is null", () => {
    expect(isWindowOpen(new Date("2026-06-14T11:00:00Z"), now)).toBe(false);
    expect(isWindowOpen(null, now)).toBe(false);
  });
  it("nextWindowExpiry is 24h out", () => {
    expect(nextWindowExpiry(now).getTime()).toBe(now.getTime() + WA_WINDOW_MS);
  });
});
