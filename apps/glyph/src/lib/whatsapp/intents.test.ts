import { describe, it, expect } from "vitest";
import { isAffirmative, isStopWord, isRecordRequest } from "./intents";

describe("isAffirmative", () => {
  it("matches Bangla + English yes", () => {
    for (const s of ["হ্যাঁ", "হ্যা", "জি", "ঠিক আছে", "রাজি", "yes", "OK", "ok ", "👍"]) {
      expect(isAffirmative(s)).toBe(true);
    }
  });
  it("rejects no/other", () => {
    for (const s of ["না", "no", "পরে", "মাথা ব্যথা"]) expect(isAffirmative(s)).toBe(false);
  });
});

describe("isStopWord", () => {
  it("matches stop/unsubscribe in both languages", () => {
    for (const s of ["stop", "STOP", "বন্ধ", "আনসাবস্ক্রাইব", "unsubscribe"]) expect(isStopWord(s)).toBe(true);
  });
  it("rejects normal text", () => {
    expect(isStopWord("আমার জ্বর")).toBe(false);
  });
});

describe("isRecordRequest", () => {
  it("matches record-asking phrases", () => {
    for (const s of ["record", "রেকর্ড", "my record", "আমার রেকর্ড", "রিপোর্ট"]) expect(isRecordRequest(s)).toBe(true);
  });
  it("rejects a symptom", () => {
    expect(isRecordRequest("তিন দিন ধরে জ্বর")).toBe(false);
  });
});
