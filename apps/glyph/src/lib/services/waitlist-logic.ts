/**
 * @fileoverview Pure waitlist-signup validation. No Supabase, no network —
 * mirrors the registration-logic pattern so it stays unit-testable. The
 * orchestration (service-role insert) lives in `/api/waitlist/route.ts`.
 *
 * Phone is the identity (one phone often serves a family, but for a
 * waitlist that is fine — we are reaching a household, not merging
 * clinical records). Stored in canonical `01XXXXXXXXX` form via
 * `normalizeBdPhone`.
 *
 * @module lib/services/waitlist-logic
 */

import { normalizeBdPhone, normalizeName } from './registration-logic';

/** Audience segments the landing form offers */
export const WAITLIST_ROLES = ['doctor', 'clinic', 'pharmacy', 'other'] as const;
export type WaitlistRole = (typeof WAITLIST_ROLES)[number];

/** Raw, untrusted body from the public form */
export interface WaitlistInput {
  name?: unknown;
  phone?: unknown;
  role?: unknown;
  district?: unknown;
  bmdcRegNo?: unknown;
  /** Honeypot — humans never see this field; bots fill it */
  website?: unknown;
}

/** Row ready for insert into waitlist_signups */
export interface WaitlistRow {
  name: string;
  phone: string;
  role: WaitlistRole;
  district: string | null;
  bmdc_reg_no: string | null;
}

export type WaitlistValidation =
  | { ok: true; row: WaitlistRow }
  | { ok: false; error: string; code: 'invalid_name' | 'invalid_phone' | 'bot' };

/**
 * Validates and normalizes a waitlist submission.
 *
 * Bot policy: a filled honeypot returns `code: 'bot'` — the route should
 * respond with a *success* envelope (silent discard) so the bot learns
 * nothing.
 *
 * @param input - Untrusted request body
 * @returns Insert-ready row, or a rejection with a stable code
 */
export function validateWaitlistInput(input: WaitlistInput): WaitlistValidation {
  if (typeof input.website === 'string' && input.website.trim() !== '') {
    return { ok: false, error: 'Rejected', code: 'bot' };
  }

  const name = typeof input.name === 'string' ? normalizeName(input.name) : '';
  if (name.length < 2 || name.length > 120) {
    return { ok: false, error: 'Please enter your name (at least 2 characters)', code: 'invalid_name' };
  }

  const phone = typeof input.phone === 'string' ? normalizeBdPhone(input.phone) : null;
  if (!phone) {
    return {
      ok: false,
      error: 'Please enter a valid BD mobile number (01XXXXXXXXX)',
      code: 'invalid_phone',
    };
  }

  const role: WaitlistRole = WAITLIST_ROLES.includes(input.role as WaitlistRole)
    ? (input.role as WaitlistRole)
    : 'doctor';

  return {
    ok: true,
    row: {
      name,
      phone,
      role,
      district: cleanOptional(input.district, 80),
      bmdc_reg_no: cleanOptional(input.bmdcRegNo, 40),
    },
  };
}

/** Trims an optional free-text field; empty/non-string/oversized → null */
function cleanOptional(value: unknown, maxLen: number): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = normalizeName(value);
  if (cleaned === '' || cleaned.length > maxLen) return null;
  return cleaned;
}
