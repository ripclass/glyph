/**
 * @fileoverview Unit tests for the pure patient-registration matching logic.
 * No Supabase, no network — pure functions only.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeBdPhone,
  normalizeName,
  namesMatch,
  findMatchingPatient,
} from './registration-logic';

describe('normalizeBdPhone', () => {
  it('accepts the canonical local form unchanged', () => {
    expect(normalizeBdPhone('01711223344')).toBe('01711223344');
  });

  it('normalizes +880 international prefix to local form', () => {
    expect(normalizeBdPhone('+8801711223344')).toBe('01711223344');
  });

  it('normalizes bare 880 prefix to local form', () => {
    expect(normalizeBdPhone('8801711223344')).toBe('01711223344');
  });

  it('strips spaces and dashes', () => {
    expect(normalizeBdPhone('017 11-22 33 44')).toBe('01711223344');
    expect(normalizeBdPhone('+880 1711-223344')).toBe('01711223344');
  });

  it('accepts all real BD mobile operator prefixes (013-019)', () => {
    for (const op of ['3', '4', '5', '6', '7', '8', '9']) {
      expect(normalizeBdPhone(`01${op}11223344`)).toBe(`01${op}11223344`);
    }
  });

  it('rejects numbers with an invalid operator digit', () => {
    expect(normalizeBdPhone('01011223344')).toBeNull();
    expect(normalizeBdPhone('01111223344')).toBeNull();
    expect(normalizeBdPhone('01211223344')).toBeNull();
  });

  it('rejects wrong lengths, garbage, and empty input', () => {
    expect(normalizeBdPhone('0171122334')).toBeNull(); // 10 digits
    expect(normalizeBdPhone('017112233445')).toBeNull(); // 12 digits
    expect(normalizeBdPhone('not a phone')).toBeNull();
    expect(normalizeBdPhone('')).toBeNull();
    expect(normalizeBdPhone('   ')).toBeNull();
  });

  it('rejects landline-style numbers (no leading 01)', () => {
    expect(normalizeBdPhone('029112233')).toBeNull();
  });
});

describe('normalizeName', () => {
  it('trims and collapses internal whitespace', () => {
    expect(normalizeName('  আব্দুল   রহমান ')).toBe('আব্দুল রহমান');
    expect(normalizeName('Abdul\t Rahman')).toBe('Abdul Rahman');
  });
});

describe('namesMatch', () => {
  it('matches identical Bangla names', () => {
    expect(namesMatch('আব্দুল রহমান', 'আব্দুল রহমান')).toBe(true);
  });

  it('matches across whitespace and Latin case differences', () => {
    expect(namesMatch('abdul rahman', 'Abdul  Rahman ')).toBe(true);
  });

  it('rejects different names', () => {
    expect(namesMatch('আব্দুল রহমান', 'ফাতেমা বেগম')).toBe(false);
  });

  it('rejects empty names rather than matching them to each other', () => {
    expect(namesMatch('', '')).toBe(false);
    expect(namesMatch('  ', 'Abdul')).toBe(false);
  });
});

describe('findMatchingPatient', () => {
  const rahman = { id: 'p1', name: 'আব্দুল রহমান', phone: '01711223344' };
  const fatema = { id: 'p2', name: 'ফাতেমা বেগম', phone: '01711223344' };

  it('returns the candidate whose name matches', () => {
    expect(
      findMatchingPatient([rahman, fatema], { name: 'আব্দুল রহমান' })
    ).toBe(rahman);
  });

  it('does NOT merge family members sharing one phone — name must match too', () => {
    // In Bangladesh one phone commonly serves a whole family. A phone-only
    // match must never silently reuse another family member's record.
    expect(
      findMatchingPatient([rahman, fatema], { name: 'করিম মিয়া' })
    ).toBeNull();
  });

  it('matches case- and whitespace-insensitively', () => {
    const latin = { id: 'p3', name: 'Abdul Rahman', phone: '01711223344' };
    expect(
      findMatchingPatient([latin], { name: ' abdul  rahman' })
    ).toBe(latin);
  });

  it('returns null for an empty candidate list', () => {
    expect(findMatchingPatient([], { name: 'আব্দুল রহমান' })).toBeNull();
  });
});
