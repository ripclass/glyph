import { describe, it, expect } from 'vitest';
import { validateWaitlistInput } from './waitlist-logic';

describe('validateWaitlistInput', () => {
  const valid = { name: 'Dr. Rahima Khatun', phone: '01712345678', role: 'doctor' };

  it('accepts a valid doctor signup', () => {
    const r = validateWaitlistInput(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.row).toEqual({
        name: 'Dr. Rahima Khatun',
        phone: '01712345678',
        role: 'doctor',
        district: null,
        bmdc_reg_no: null,
      });
    }
  });

  it('normalizes +880 international phone form', () => {
    const r = validateWaitlistInput({ ...valid, phone: '+880 1712-345678' });
    expect(r.ok && r.row.phone).toBe('01712345678');
  });

  it('rejects non-BD phone numbers', () => {
    const r = validateWaitlistInput({ ...valid, phone: '12345' });
    expect(r).toMatchObject({ ok: false, code: 'invalid_phone' });
  });

  it('rejects landline-shaped and operator-0 numbers', () => {
    const r = validateWaitlistInput({ ...valid, phone: '01012345678' });
    expect(r).toMatchObject({ ok: false, code: 'invalid_phone' });
  });

  it('rejects missing or one-character names', () => {
    expect(validateWaitlistInput({ ...valid, name: ' ' })).toMatchObject({
      ok: false,
      code: 'invalid_name',
    });
    expect(validateWaitlistInput({ ...valid, name: undefined })).toMatchObject({
      ok: false,
      code: 'invalid_name',
    });
  });

  it('accepts Bangla names and collapses whitespace', () => {
    const r = validateWaitlistInput({ ...valid, name: '  ডাঃ   রহিমা   খাতুন ' });
    expect(r.ok && r.row.name).toBe('ডাঃ রহিমা খাতুন');
  });

  it('defaults unknown roles to doctor', () => {
    const r = validateWaitlistInput({ ...valid, role: 'admin"; DROP TABLE--' });
    expect(r.ok && r.row.role).toBe('doctor');
  });

  it('keeps valid optional fields and nulls empty ones', () => {
    const r = validateWaitlistInput({
      ...valid,
      district: ' ঢাকা ',
      bmdcRegNo: 'A-12345',
    });
    expect(r.ok && r.row.district).toBe('ঢাকা');
    expect(r.ok && r.row.bmdc_reg_no).toBe('A-12345');
  });

  it('nulls oversized optional fields instead of failing', () => {
    const r = validateWaitlistInput({ ...valid, district: 'x'.repeat(200) });
    expect(r.ok && r.row.district).toBeNull();
  });

  it('flags honeypot submissions as bot', () => {
    const r = validateWaitlistInput({ ...valid, website: 'https://spam.example' });
    expect(r).toMatchObject({ ok: false, code: 'bot' });
  });

  it('ignores an empty honeypot', () => {
    const r = validateWaitlistInput({ ...valid, website: '' });
    expect(r.ok).toBe(true);
  });
});
