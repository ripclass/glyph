import { describe, it, expect } from 'vitest';
import {
  banglaDigitsToAscii,
  buildPatientSearchTerm,
} from './patients-logic';

describe('banglaDigitsToAscii', () => {
  it('converts Bangla numerals and leaves the rest alone', () => {
    expect(banglaDigitsToAscii('০১৭১১')).toBe('01711');
    expect(banglaDigitsToAscii('রহমান ০১')).toBe('রহমান 01');
    expect(banglaDigitsToAscii('no digits')).toBe('no digits');
  });
});

describe('buildPatientSearchTerm', () => {
  it('treats blank input as empty', () => {
    expect(buildPatientSearchTerm('')).toEqual({ kind: 'empty' });
    expect(buildPatientSearchTerm('   ')).toEqual({ kind: 'empty' });
  });

  it('canonicalizes a full BD number however it is typed', () => {
    expect(buildPatientSearchTerm('+880 1711-223344')).toEqual({
      kind: 'phone',
      value: '01711223344',
    });
    expect(buildPatientSearchTerm('০১৭১১২২৩৩৪৪')).toEqual({
      kind: 'phone',
      value: '01711223344',
    });
  });

  it('keeps digit fragments as phone searches, folding the 880 prefix', () => {
    expect(buildPatientSearchTerm('01711')).toEqual({ kind: 'phone', value: '01711' });
    expect(buildPatientSearchTerm('+880171')).toEqual({ kind: 'phone', value: '0171' });
  });

  it('treats names as text — Bangla and Latin', () => {
    expect(buildPatientSearchTerm('জাহানারা')).toEqual({ kind: 'text', value: 'জাহানারা' });
    expect(buildPatientSearchTerm('  Rahman  ')).toEqual({ kind: 'text', value: 'Rahman' });
  });

  it('mixed digit-and-letter input is a name, not a phone', () => {
    expect(buildPatientSearchTerm('Rahman 01').kind).toBe('text');
  });

  it('strips PostgREST filter syntax from text so input cannot break the query', () => {
    expect(buildPatientSearchTerm('Rah,man(x)')).toEqual({ kind: 'text', value: 'Rah man x' });
    expect(buildPatientSearchTerm(',()')).toEqual({ kind: 'empty' });
  });
});
