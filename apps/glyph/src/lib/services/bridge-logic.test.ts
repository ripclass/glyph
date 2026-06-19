import { describe, it, expect } from 'vitest';
import { buildOpinionRow, buildSpecialistOpinionData } from './bridge-logic';
import { validateClinicalCredential } from '@kham/schemas-clinical';

describe('buildOpinionRow', () => {
  it('builds a draft row owned by the panel', () => {
    expect(buildOpinionRow({ ownerOrgId:'sp1', patientId:'p1', createdBy:'u1' }))
      .toEqual({ owner_org_id:'sp1', patient_id:'p1', created_by:'u1', status:'draft' });
  });
});
describe('buildSpecialistOpinionData', () => {
  it('validates as a specialist_opinion credential', () => {
    const data = buildSpecialistOpinionData({
      orgDid:'did:web:example:organization-sp1', orgName:'Diaspora Oncology Panel',
      encounterDate:'2026-06-19', specialty:'Oncology',
      opinion:'Findings consistent with early-stage disease; biopsy advised.',
      recommendations:['Core-needle biopsy'],
    });
    expect(() => validateClinicalCredential('specialist_opinion', data)).not.toThrow();
    expect(data.specialist.did).toBe('did:web:example:organization-sp1');
  });
  it('throws on missing specialty or opinion', () => {
    expect(() => buildSpecialistOpinionData({ orgDid:'d', orgName:'P', encounterDate:'2026-06-19' } as never)).toThrow();
  });
});
