import { describe, it, expect } from 'vitest';
import { buildOwnedPatientRow, KHAM_HOLDING_ORG_NAME } from './organizations-logic';

describe('buildOwnedPatientRow', () => {
  it('sets owner_org_id and forces clinic_id NULL (R2: owner is not a clinic)', () => {
    const row = buildOwnedPatientRow({ ownerOrgId: 'org-1', name: 'Walk-in' });
    expect(row.owner_org_id).toBe('org-1');
    expect(row.clinic_id).toBeNull();
  });

  it('normalizes the name and defaults optional fields to null', () => {
    const row = buildOwnedPatientRow({ ownerOrgId: 'org-1', name: '  রহিম   উদ্দিন ' });
    expect(row.name).toBe('রহিম উদ্দিন');
    expect(row.phone).toBeNull();
    expect(row.age).toBeNull();
    expect(row.gender).toBeNull();
  });

  it('passes through provided optional fields', () => {
    const row = buildOwnedPatientRow({
      ownerOrgId: 'o',
      name: 'X',
      phone: '01711999888',
      age: 40,
      gender: 'female',
    });
    expect(row.phone).toBe('01711999888');
    expect(row.age).toBe(40);
    expect(row.gender).toBe('female');
  });

  it('rejects an empty / whitespace-only name', () => {
    expect(() => buildOwnedPatientRow({ ownerOrgId: 'o', name: '   ' })).toThrow();
  });

  it('exposes the seeded holding-org name (matches migration 011)', () => {
    expect(KHAM_HOLDING_ORG_NAME).toBe('KhaM Holding (Provisional Patients)');
  });
});
