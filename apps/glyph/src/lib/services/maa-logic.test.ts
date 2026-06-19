import { describe, it, expect } from 'vitest';
import { buildAntenatalVisitRow, buildAntenatalRecordData } from './maa-logic';
import { validateClinicalCredential } from '@kham/schemas-clinical';

describe('buildAntenatalVisitRow', () => {
  it('builds a draft row owned by the program', () => {
    expect(buildAntenatalVisitRow({ ownerOrgId: 'p1', patientId: 'm1', createdBy: 'u1' }))
      .toEqual({ owner_org_id: 'p1', patient_id: 'm1', created_by: 'u1', status: 'draft' });
  });
});

describe('buildAntenatalRecordData', () => {
  it('validates as an antenatal_record credential', () => {
    const data = buildAntenatalRecordData({
      orgDid: 'did:web:example:organization-p1', orgName: 'BRAC Maternal Program',
      encounterDate: '2026-06-19', visitNumber: 2, gestationalAgeWeeks: 24, bloodPressure: '110/70',
      riskFlags: ['anemia'],
    });
    expect(() => validateClinicalCredential('antenatal_record', data)).not.toThrow();
    expect(data.provider.did).toBe('did:web:example:organization-p1');
    expect(data.visitNumber).toBe(2);
  });
});
