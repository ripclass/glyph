/**
 * @fileoverview Pure patient-search input interpretation. No Supabase, no
 * framework — unit-tested. The orchestration (queries) lives in
 * `patients.ts`.
 *
 * Doctors search by name (Bangla or Latin) or by phone — often the
 * family-shared number, often typed with +880, spaces, dashes, or Bangla
 * numerals. This module decides WHAT the doctor meant; the service decides
 * how to query it.
 *
 * @module lib/services/patients-logic
 */

import { normalizeBdPhone } from './registration-logic';

/** What a search input means */
export type PatientSearchTerm =
  | { kind: 'phone'; value: string }
  | { kind: 'text'; value: string }
  | { kind: 'empty' };

const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯';

/**
 * Converts Bangla numerals to ASCII digits, leaving everything else as-is.
 * `০১৭১১` → `01711`.
 */
export function banglaDigitsToAscii(input: string): string {
  return input.replace(/[০-৯]/g, (ch) => String(BANGLA_DIGITS.indexOf(ch)));
}

/**
 * Interprets a raw search input as either a phone (fragment) or a name.
 *
 * Phone detection: after converting Bangla numerals and stripping common
 * phone punctuation (`+ - ( ) .` and spaces), an all-digit string is a
 * phone search. A full valid number is canonicalized via
 * `normalizeBdPhone`; fragments keep their digits with the international
 * `880` prefix folded to the stored local `0…` form.
 *
 * Text values are stripped of PostgREST `or=` syntax characters (`,()`)
 * so user input can never break the filter expression.
 */
export function buildPatientSearchTerm(raw: string): PatientSearchTerm {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: 'empty' };

  const ascii = banglaDigitsToAscii(trimmed);
  const stripped = ascii.replace(/[\s+\-().]/g, '');

  if (/^\d+$/.test(stripped)) {
    const local = stripped.startsWith('880')
      ? `0${stripped.slice(3)}`
      : stripped;
    return { kind: 'phone', value: normalizeBdPhone(local) ?? local };
  }

  const safeText = trimmed.replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!safeText) return { kind: 'empty' };
  return { kind: 'text', value: safeText };
}
