import { describe, it, expect } from "vitest";
import { decideRoute } from "./router";
import type { NormalizedInbound } from "./types";

function inbound(partial: Partial<NormalizedInbound>): NormalizedInbound {
  return {
    channel: "whatsapp",
    providerMessageId: "m1",
    fromWaId: "8801711000000",
    receivedAt: new Date("2026-06-14T12:00:00Z"),
    kind: "text",
    text: "",
    raw: {},
    ...partial,
  };
}

describe("decideRoute", () => {
  const idle = { bound: true, activeFlow: "idle" };
  it("unhandled kind → ignore", () => {
    expect(decideRoute(inbound({ kind: "unhandled" }), idle).kind).toBe("ignore");
  });
  it("unbound + a 6-digit code → bind", () => {
    expect(decideRoute(inbound({ text: "my code 482910" }), { bound: false, activeFlow: "idle" })).toEqual({ kind: "bind", code: "482910" });
  });
  it("unbound + no code → onboard", () => {
    expect(decideRoute(inbound({ text: "hi" }), { bound: false, activeFlow: "idle" }).kind).toBe("onboard");
  });
  it("bound idle + symptom → triage_start", () => {
    expect(decideRoute(inbound({ text: "তিন দিন ধরে জ্বর" }), idle)).toEqual({ kind: "triage_start", symptom: "তিন দিন ধরে জ্বর" });
  });
  it("bound idle + stop word → revoke", () => {
    expect(decideRoute(inbound({ text: "stop" }), idle).kind).toBe("revoke");
  });
  it("bound idle + record request → wallet", () => {
    expect(decideRoute(inbound({ text: "আমার রেকর্ড" }), idle).kind).toBe("wallet");
  });
  it("bound mid-triage + text → triage_continue", () => {
    expect(decideRoute(inbound({ text: "১০২ ডিগ্রি" }), { bound: true, activeFlow: "triage" })).toEqual({ kind: "triage_continue", answer: "১০২ ডিগ্রি" });
  });
  it("bound awaiting consent + yes → consent agreed", () => {
    expect(decideRoute(inbound({ text: "হ্যাঁ" }), { bound: true, activeFlow: "awaiting_triage_consent" })).toEqual({ kind: "triage_consent_reply", agreed: true });
  });
  it("bound awaiting consent + no → consent declined", () => {
    expect(decideRoute(inbound({ text: "না" }), { bound: true, activeFlow: "awaiting_triage_consent" })).toEqual({ kind: "triage_consent_reply", agreed: false });
  });
  it("bound mid-triage + non-text → help", () => {
    expect(decideRoute(inbound({ kind: "image" }), { bound: true, activeFlow: "triage" }).kind).toBe("help");
  });
});
