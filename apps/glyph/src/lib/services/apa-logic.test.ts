import { describe, it, expect } from 'vitest';
import { buildAssessmentRow, buildOccupationalHealthData } from './apa-logic';
import { validateClinicalCredential } from '@kham/schemas-clinical';

describe('buildAssessmentRow', () => {
  it('builds a draft row owned by the employer', () => {
    expect(buildAssessmentRow({ ownerOrgId: 'e1', patientId: 'w1', createdBy: 'u1' }))
      .toEqual({ owner_org_id: 'e1', patient_id: 'w1', created_by: 'u1', status: 'draft' });
  });
});

describe('buildOccupationalHealthData', () => {
  it('validates as an occupational_health credential', () => {
    const data = buildOccupationalHealthData({
      orgDid: 'did:web:example:organization-e1', orgName: 'Beximco RMG Unit 4',
      encounterDate: '2026-06-19', assessmentType: 'periodic', fitnessForRole: 'fit',
      exposures: ['cotton dust', 'noise'],
    });
    expect(() => validateClinicalCredential('occupational_health', data)).not.toThrow();
    expect(data.employer.did).toBe('did:web:example:organization-e1');
  });
  it('throws on a missing assessmentType', () => {
    expect(() => buildOccupationalHealthData({ orgDid: 'd', orgName: 'E', encounterDate: '2026-06-19' } as never)).toThrow();
  });
});
