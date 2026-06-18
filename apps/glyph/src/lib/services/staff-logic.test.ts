import { describe, it, expect } from 'vitest';
import { shapeStaffSession, canSign, canEnterResults } from './staff-logic';

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

  it('prefers the centre membership when both exist', () => {
    const clinic = row({ organizations: { id: 'c1', name: 'Clinic', org_type: 'clinic' }, role: 'doctor' });
    const s = shapeStaffSession([clinic, row()]);
    expect(s?.orgType).toBe('diagnostic_centre');
  });

  it('returns null for empty/no memberships', () => {
    expect(shapeStaffSession([])).toBeNull();
    expect(shapeStaffSession(null)).toBeNull();
  });
});

describe('role capabilities', () => {
  it('canSign: signatory/owner/admin only', () => {
    expect(canSign('signatory')).toBe(true);
    expect(canSign('owner')).toBe(true);
    expect(canSign('admin')).toBe(true);
    expect(canSign('technologist')).toBe(false);
    expect(canSign('staff')).toBe(false);
  });
  it('canEnterResults: technologist + signers, not plain staff', () => {
    expect(canEnterResults('technologist')).toBe(true);
    expect(canEnterResults('signatory')).toBe(true);
    expect(canEnterResults('staff')).toBe(false);
  });
});
