/**
 * @fileoverview Pure logic for Pocket wallet access tokens. No Supabase, no
 * network, no framework — mirrors registration-logic so it stays unit-testable.
 * The orchestration (token row read/write) lives in the /api/wallet routes.
 *
 * A wallet is reached by a per-patient BEARER TOKEN, not a login. The token is
 * the primary secret (32 bytes of entropy). An optional 4-digit PIN is a
 * second factor against shared-device / shoulder-surfing — it is NOT the main
 * barrier, and the tokens table is service-role-only, so a slow-ish salted
 * scrypt hash is sufficient here.
 *
 * @module lib/services/wallet-logic
 */

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** Minimal shape of a wallet_access_tokens row this logic reasons about. */
export interface WalletTokenRow {
  revoked: boolean;
  pin_hash: string | null;
}

/** Result of deciding whether a request may open the wallet. */
export type AccessDecision = "ok" | "pin_required" | "invalid_pin" | "revoked";

/**
 * Generates a URL-safe bearer token (~32 chars, 24 bytes of entropy).
 */
export function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Normalizes a raw PIN to exactly four digits, or null if it is not a valid
 * 4-digit PIN. Callers should treat null as "no PIN" / reject.
 */
export function normalizePin(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return /^\d{4}$/.test(trimmed) ? trimmed : null;
}

/**
 * Hashes a 4-digit PIN with a random salt via scrypt. Stored form is
 * `salt:key`, both hex. Returns null if the PIN is not a valid 4-digit PIN.
 */
export function hashPin(pin: string): string | null {
  const valid = normalizePin(pin);
  if (!valid) return null;
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(valid, salt, 32).toString("hex");
  return `${salt}:${key}`;
}

/**
 * Verifies a PIN against a stored `salt:key`. Constant-time on the digest.
 */
export function verifyPin(pin: string, stored: string | null): boolean {
  const valid = normalizePin(pin);
  if (!valid || !stored) return false;
  const [salt, keyHex] = stored.split(":");
  if (!salt || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = scryptSync(valid, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Decides whether a wallet request may proceed, given the token row and any
 * PIN the requester supplied. Pure: the caller fetches the row and acts on the
 * decision.
 *
 * @param row - The token row (revoked flag + optional pin hash)
 * @param providedPin - PIN supplied with the request, if any
 */
export function validateAccess(
  row: WalletTokenRow,
  providedPin?: string | null
): AccessDecision {
  if (row.revoked) return "revoked";
  if (!row.pin_hash) return "ok";
  if (providedPin == null || providedPin === "") return "pin_required";
  return verifyPin(providedPin, row.pin_hash) ? "ok" : "invalid_pin";
}
