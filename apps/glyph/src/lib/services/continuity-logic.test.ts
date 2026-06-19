import { describe, it, expect } from 'vitest';
import { buildClearanceRow, buildMedicalClearanceData } from './continuity-logic';
import { validateClinicalCredential } from '@kham/schemas-clinical';

describe('buildClearanceRow', () => {
  it('builds a draft row owned by the recruiter', () => {
    expect(buildClearanceRow({ ownerOrgId:'r1', patientId:'w1', createdBy:'u1' }))
      .toEqual({ owner_org_id:'r1', patient_id:'w1', created_by:'u1', status:'draft' });
  });
});
describe('buildMedicalClearanceData', () => {
  it('validates as a medical_clearance credential', () => {
    const data = buildMedicalClearanceData({
      orgDid:'did:web:example:organization-r1', orgName:'GAMCA Medical Centre',
      encounterDate:'2026-06-19', purpose:'overseas_employment', fitnessStatus:'fit',
      destinationCountry:'UAE',
    });
    expect(() => validateClinicalCredential('medical_clearance', data)).not.toThrow();
    expect(data.assessingFacility.did).toBe('did:web:example:organization-r1');
  });
  it('throws on missing purpose or fitnessStatus', () => {
    expect(() => buildMedicalClearanceData({ orgDid:'d', orgName:'R', encounterDate:'2026-06-19' } as never)).toThrow();
  });
});
