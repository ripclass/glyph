import { describe, it, expect } from "vitest";
import { isAffirmative, isStopWord, isRecordRequest, isSosWord, isCancelWord } from "./intents";

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

describe("isSosWord", () => {
  it("matches explicit SOS words (whole message)", () => {
    for (const w of ["SOS", "sos", "🆘", "জরুরি", "বাঁচাও", "save me", "emergency"]) {
      expect(isSosWord(w)).toBe(true);
    }
  });
  it("does NOT match a symptom that merely contains a word", () => {
    expect(isSosWord("আমার জরুরি ভিত্তিতে ওষুধ দরকার, মাথা ব্যথা করছে")).toBe(false);
    expect(isSosWord("help me understand my report please")).toBe(false);
  });
});

describe("isCancelWord", () => {
  it("matches cancel/stop words", () => {
    for (const w of ["বাতিল", "cancel", "stop"]) expect(isCancelWord(w)).toBe(true);
  });
  it("does not match other text", () => {
    expect(isCancelWord("আমার বুকে ব্যথা")).toBe(false);
  });
});
