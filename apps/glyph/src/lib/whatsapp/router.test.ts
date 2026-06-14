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
  it("bound patient text → reply (Leg A echo)", () => {
    const a = decideRoute(inbound({ text: "hello" }), { bound: true });
    expect(a.kind).toBe("reply");
  });
  it("unbound + a 6-digit code → bind", () => {
    const a = decideRoute(inbound({ text: "my code 482910" }), { bound: false });
    expect(a).toEqual({ kind: "bind", code: "482910" });
  });
  it("unbound + no code → onboard", () => {
    expect(decideRoute(inbound({ text: "hi" }), { bound: false }).kind).toBe("onboard");
  });
  it("unhandled kind → ignore", () => {
    expect(decideRoute(inbound({ kind: "unhandled" }), { bound: true }).kind).toBe("ignore");
  });
});
