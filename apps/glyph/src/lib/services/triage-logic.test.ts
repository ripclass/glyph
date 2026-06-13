import { describe, it, expect } from "vitest";
import { screenRedFlags, validateOutcome, urgentOutcome } from "./triage-logic";

describe("screenRedFlags", () => {
  it("catches Bangla danger phrases", () => {
    expect(screenRedFlags("তিন দিন ধরে বুকে ব্যথা")).not.toBeNull();
    expect(screenRedFlags("হঠাৎ শ্বাসকষ্ট হচ্ছে")).not.toBeNull();
    expect(screenRedFlags("রোগী অজ্ঞান হয়ে গেছে")).not.toBeNull();
    expect(screenRedFlags("রক্তবমি হচ্ছে")).not.toBeNull();
  });
  it("catches English / transliterated danger phrases", () => {
    expect(screenRedFlags("severe CHEST PAIN since morning")).not.toBeNull();
    expect(screenRedFlags("he is having shortness of breath")).not.toBeNull();
    expect(screenRedFlags("slurred speech and face droop")).not.toBeNull();
  });
  it("returns a Bangla go-now message on a hit", () => {
    const hit = screenRedFlags("বুকে চাপ");
    expect(hit?.message).toContain("হাসপাতাল");
  });
  it("passes benign symptoms through", () => {
    expect(screenRedFlags("গত দুদিন ধরে হালকা সর্দি কাশি")).toBeNull();
    expect(screenRedFlags("mild headache and runny nose")).toBeNull();
    expect(screenRedFlags("")).toBeNull();
  });
});

describe("urgentOutcome", () => {
  it("is always an urgent answer with a red flag", () => {
    const o = urgentOutcome();
    expect(o.mode).toBe("answer");
    expect(o.route).toBe("urgent");
    expect(o.redFlag).toBeTruthy();
  });
});

describe("validateOutcome", () => {
  it("passes a well-formed question through", () => {
    const o = validateOutcome({ mode: "question", text: "কত দিন ধরে জ্বর?" });
    expect(o).toEqual({ mode: "question", text: "কত দিন ধরে জ্বর?" });
  });
  it("passes a well-formed answer through, keeping route/watchFor", () => {
    const o = validateOutcome({
      mode: "answer",
      text: "সম্ভবত ভাইরাল জ্বর।",
      route: "pharmacy",
      watchFor: ["জ্বর ৩ দিনের বেশি", "শ্বাসকষ্ট"],
      specialty: "মেডিসিন",
    });
    expect(o.route).toBe("pharmacy");
    expect(o.watchFor).toHaveLength(2);
  });
  it("downgrades a question to a doctor answer once the cap is reached", () => {
    const o = validateOutcome({ mode: "question", text: "আর কিছু?" }, true);
    expect(o.mode).toBe("answer");
    expect(o.route).toBe("doctor");
  });
  it("defaults an unknown/missing route to doctor, never pharmacy", () => {
    expect(validateOutcome({ mode: "answer", text: "x", route: "whatever" }).route).toBe("doctor");
    expect(validateOutcome({ mode: "answer", text: "x" }).route).toBe("doctor");
  });
  it("falls back safely on malformed input", () => {
    for (const bad of [null, undefined, "not json", {}, { mode: "answer", text: "" }, 42]) {
      const o = validateOutcome(bad);
      expect(o.mode).toBe("answer");
      expect(o.route).toBe("doctor");
    }
  });
  it("parses a JSON string", () => {
    const o = validateOutcome('{"mode":"answer","text":"ok","route":"pharmacy"}');
    expect(o.route).toBe("pharmacy");
  });
  it("clamps watchFor to strings and a max length", () => {
    const o = validateOutcome({
      mode: "answer",
      text: "x",
      watchFor: ["a", 1, "b", null, "c", "d", "e", "f", "g"],
    });
    expect(o.watchFor!.every((w) => typeof w === "string")).toBe(true);
    expect(o.watchFor!.length).toBeLessThanOrEqual(6);
  });
});
