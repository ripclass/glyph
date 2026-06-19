import { describe, it, expect } from 'vitest';
import { buildDischargeRecordRow, buildDischargeSummaryData } from './hospital-logic';
import { validateClinicalCredential } from '@kham/schemas-clinical';

describe('buildDischargeRecordRow', () => {
  it('builds a draft row owned by the hospital', () => {
    expect(buildDischargeRecordRow({ ownerOrgId: 'h1', patientId: 'p1', createdBy: 'u1' }))
      .toEqual({ owner_org_id: 'h1', patient_id: 'p1', created_by: 'u1', status: 'draft', admission_date: null, discharge_date: null });
  });
});

describe('buildDischargeSummaryData', () => {
  it('produces a payload that validates as a DischargeSummary credential', () => {
    const data = buildDischargeSummaryData({
      orgDid: 'did:web:example:organization-h1', orgName: 'Dev District Hospital',
      admissionDate: '2026-06-10', dischargeDate: '2026-06-14',
      dischargeDiagnosis: [{ text: 'Dengue fever', icd10: 'A90' }],
      dischargeMedications: [{ name: 'Napa', frequency: '1+1+1' }],
      dischargeCondition: 'recovered',
    });
    expect(() => validateClinicalCredential('discharge_summary', data)).not.toThrow();
    expect(data.hospital.did).toBe('did:web:example:organization-h1');
    expect(data.encounterDate).toBe('2026-06-14');
  });

  it('throws when there is no discharge diagnosis (schema min 1)', () => {
    expect(() => buildDischargeSummaryData({ orgDid: 'd', orgName: 'H', dischargeDate: '2026-06-14', dischargeDiagnosis: [] })).toThrow();
  });
});
