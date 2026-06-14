import { createHmac, timingSafeEqual } from "node:crypto";
import { getProvider } from "./provider";

export function verifyChallenge(url: URL): { ok: true; challenge: string } | { ok: false; reason: string } {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode !== "subscribe") return { ok: false, reason: `unexpected hub.mode: ${mode}` };
  if (!process.env.WHATSAPP_VERIFY_TOKEN) return { ok: false, reason: "WHATSAPP_VERIFY_TOKEN not configured" };
  if (token !== process.env.WHATSAPP_VERIFY_TOKEN) return { ok: false, reason: "verify token mismatch" };
  if (!challenge) return { ok: false, reason: "missing hub.challenge" };
  return { ok: true, challenge };
}

export type SignatureVerificationResult =
  | { ok: true }
  | { ok: false; reason: string }
  | { ok: "skipped"; reason: string };

function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

export function verifySignature(rawBody: string, signatureHeader: string | null): SignatureVerificationResult {
  const secret = getProvider().webhookSecret();
  const secretName = process.env.WHATSAPP_PROVIDER === "meta" ? "META_APP_SECRET" : "DIALOG360_WEBHOOK_SECRET";
  if (!secret) {
    if (isProduction()) return { ok: false, reason: `${secretName} not set — required in production` };
    return { ok: "skipped", reason: `${secretName} not set — signature check skipped (non-production)` };
  }
  if (!signatureHeader) return { ok: false, reason: "missing X-Hub-Signature-256 header" };
  const expected = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : signatureHeader;
  const computed = createHmac("sha256", secret).update(rawBody, "utf-8").digest("hex");
  if (expected.length !== computed.length) return { ok: false, reason: "signature length mismatch" };
  const equal = timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(computed, "hex"));
  return equal ? { ok: true } : { ok: false, reason: "signature mismatch" };
}
