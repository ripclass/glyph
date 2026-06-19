import { describe, it, expect } from 'vitest';
import { shapeStaffSession, canSign, canEnterResults, requireOrgType } from './staff-logic';

const row = (over = {}) => ({
  user_id: 'u1',
  role: 'technologist',
  organizations: { id: 'org1', name: 'Popular Diagnostics', org_type: 'diagnostic_centre' },
  ...over,
});

describe('shapeStaffSession', () => {
  it('picks a diagnostic_centre membership and shapes a session', () => {
    const s = shapeStaffSession([row()]);
    expect(s).toEqual({ userId: 'u1', orgId: 'org1', orgName: 'Popular Diagnostics', orgType: 'diagnostic_centre', role: 'technologist' });
  });

  it('ignores non-centre memberships (e.g. a clinic org)', () => {
    const clinic = row({ organizations: { id: 'c1', name: 'Clinic', org_type: 'clinic' }, role: 'doctor' });
    expect(shapeStaffSession([clinic])).toBeNull();
  });

  it('picks a hospital membership and shapes a session with orgType hospital', () => {
    const hospital = row({ organizations: { id: 'h1', name: 'Shante Hospital', org_type: 'hospital' }, role: 'signatory' });
    const s = shapeStaffSession([hospital]);
    expect(s).toEqual({ userId: 'u1', orgId: 'h1', orgName: 'Shante Hospital', orgType: 'hospital', role: 'signatory' });
  });

  it('picks a program membership and shapes a session with orgType program', () => {
    const program = row({ organizations: { id: 'p1', name: 'BRAC Maternal Program', org_type: 'program' }, role: 'doctor' });
    const s = shapeStaffSession([program]);
    expect(s).toEqual({ userId: 'u1', orgId: 'p1', orgName: 'BRAC Maternal Program', orgType: 'program', role: 'doctor' });
  });

  it('prefers the non-clinic owner membership when both exist', () => {
    const clinic = row({ organizations: { id: 'c1', name: 'Clinic', org_type: 'clinic' }, role: 'doctor' });
    const s = shapeStaffSession([clinic, row()]);
    expect(s?.orgType).toBe('diagnostic_centre');
  });

  it('returns null for empty/no memberships', () => {
    expect(shapeStaffSession([])).toBeNull();
    expect(shapeStaffSession(null)).toBeNull();
  });
});

describe('requireOrgType', () => {
  const s = { userId: 'u', orgId: 'o', orgName: 'H', orgType: 'hospital', role: 'signatory' } as const;
  it('passes when orgType matches', () => expect(requireOrgType(s, 'hospital')).toBe(true));
  it('fails on mismatch', () => expect(requireOrgType(s, 'diagnostic_centre')).toBe(false));
  it('fails on null session', () => expect(requireOrgType(null, 'hospital')).toBe(false));
});

describe('role capabilities', () => {
  it('canSign: signatory/owner/admin only', () => {
    expect(canSign('signatory')).toBe(true);
    expect(canSign('owner')).toBe(true);
    expect(canSign('admin')).toBe(true);
    expect(canSign('technologist')).toBe(false);
    expect(canSign('doctor')).toBe(false);
    expect(canSign('staff')).toBe(false);
  });
  it('canEnterResults: technologist + doctor + signers, not plain staff', () => {
    expect(canEnterResults('technologist')).toBe(true);
    expect(canEnterResults('doctor')).toBe(true);
    expect(canEnterResults('signatory')).toBe(true);
    expect(canEnterResults('owner')).toBe(true);
    expect(canEnterResults('admin')).toBe(true);
    expect(canEnterResults('staff')).toBe(false);
  });
  it('doctor enters but cannot sign (Hospital flow)', () => {
    expect(canEnterResults('doctor')).toBe(true);
    expect(canSign('doctor')).toBe(false);
  });
});
