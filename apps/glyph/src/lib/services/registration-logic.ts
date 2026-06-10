/**
 * @fileoverview Pure patient-registration matching logic.
 * No Supabase, no network, no framework — keep it that way so it stays
 * unit-testable. The orchestration (queries + inserts) lives in
 * `registration.ts`.
 *
 * Domain rule (see CLAUDE.md §9): in Bangladesh one phone commonly serves a
 * whole family — the attendant's number is often registered for several
 * patients. A phone match alone must therefore NEVER merge records; reuse
 * requires phone AND name agreement.
 *
 * @module lib/services/registration-logic
 */

/** Minimal patient shape needed for matching (structural — see Patient row) */
export interface PatientCandidate {
  id: string;
  name: string;
  phone: string | null;
}

/**
 * Normalizes a Bangladeshi mobile number to the canonical local form
 * `01XXXXXXXXX` (11 digits, operator digit 3-9).
 *
 * Accepts `+880`/`880` international prefixes and embedded spaces/dashes.
 * Returns null when the input is not a valid BD mobile number — callers
 * should then skip phone-based matching rather than store garbage.
 *
 * @param raw - User-entered phone string
 * @returns Canonical `01XXXXXXXXX` form, or null if invalid
 */
export function normalizeBdPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, '');

  /** Strip international prefix: 880 1XXXXXXXXX → 01XXXXXXXXX */
  const local = digits.startsWith('880') ? `0${digits.slice(3)}` : digits;

  return /^01[3-9]\d{8}$/.test(local) ? local : null;
}

/**
 * Normalizes a name for display/storage: trims and collapses internal
 * whitespace. Safe for Bangla and Latin scripts (whitespace-only operation).
 *
 * @param name - Raw name input
 * @returns Cleaned name
 */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Compares two names for identity-matching purposes: whitespace-collapsed
 * and case-insensitive (case only affects Latin script; Bangla is unaffected).
 * Empty names never match anything — an absent name is not an identity.
 *
 * @param a - First name
 * @param b - Second name
 * @returns Whether the names refer to the same person-name
 */
export function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a).toLowerCase();
  const nb = normalizeName(b).toLowerCase();
  if (na === '' || nb === '') return false;
  return na === nb;
}

/**
 * Picks the existing patient record matching the registration input from a
 * list of same-phone candidates, or null if this is a new patient.
 *
 * Candidates are assumed to already share the (normalized) phone — this
 * function applies the name test that prevents merging family members.
 *
 * @param candidates - Patients found by exact-phone lookup within the clinic
 * @param input - Registration input (name as entered)
 * @returns The matching candidate, or null to create a new patient
 */
export function findMatchingPatient<T extends PatientCandidate>(
  candidates: T[],
  input: { name: string }
): T | null {
  return candidates.find((c) => namesMatch(c.name, input.name)) ?? null;
}
