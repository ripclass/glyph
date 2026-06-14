import { describe, it, expect, beforeEach } from "vitest";
import { createHmac } from "node:crypto";
import { verifyChallenge, verifySignature } from "./verify";

beforeEach(() => {
  process.env.WHATSAPP_PROVIDER = "360dialog";
  process.env.WHATSAPP_VERIFY_TOKEN = "verify-tok";
  process.env.DIALOG360_WEBHOOK_SECRET = "shh";
  delete process.env.VERCEL_ENV;
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";
});

describe("verifyChallenge", () => {
  it("echoes the challenge on a correct token", () => {
    const url = new URL("https://x/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify-tok&hub.challenge=42");
    expect(verifyChallenge(url)).toEqual({ ok: true, challenge: "42" });
  });
  it("rejects a wrong token", () => {
    const url = new URL("https://x/?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=42");
    expect(verifyChallenge(url).ok).toBe(false);
  });
});

describe("verifySignature", () => {
  it("accepts a correctly signed body", () => {
    const body = '{"a":1}';
    const sig = "sha256=" + createHmac("sha256", "shh").update(body, "utf-8").digest("hex");
    expect(verifySignature(body, sig)).toEqual({ ok: true });
  });
  it("rejects a tampered body", () => {
    const sig = "sha256=" + createHmac("sha256", "shh").update("{}", "utf-8").digest("hex");
    expect(verifySignature('{"a":2}', sig).ok).toBe(false);
  });
  it("skips when no secret in non-production", () => {
    delete process.env.DIALOG360_WEBHOOK_SECRET;
    expect(verifySignature("{}", null).ok).toBe("skipped");
  });
});
