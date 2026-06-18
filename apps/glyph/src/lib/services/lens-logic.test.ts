import { describe, it, expect } from 'vitest';
import { buildLabOrderRow, normalizeRawItem, KNOWN_TEST_CATEGORIES, buildLabResultData } from './lens-logic';

describe('buildLabOrderRow', () => {
  it('builds an ordered row with the centre as owner', () => {
    const row = buildLabOrderRow({ ownerOrgId: 'org1', patientId: 'p1', testCategory: 'CBC', orderedBy: 'u1' });
    expect(row).toEqual({ owner_org_id: 'org1', patient_id: 'p1', test_category: 'CBC', ordered_by: 'u1', status: 'ordered' });
  });
  it('trims the test category and rejects empty', () => {
    expect(buildLabOrderRow({ ownerOrgId: 'o', patientId: 'p', testCategory: '  RFT ', orderedBy: 'u' }).test_category).toBe('RFT');
    expect(() => buildLabOrderRow({ ownerOrgId: 'o', patientId: 'p', testCategory: '   ', orderedBy: 'u' })).toThrow();
  });
});

describe('normalizeRawItem', () => {
  it('maps extract-document shape ({name,range}) to LabResultItem ({testName,referenceRange})', () => {
    const item = normalizeRawItem({ name: 'Hemoglobin', value: '9.1', unit: 'g/dL', range: '13-17', isAbnormal: true, severity: 'moderate' });
    expect(item).toEqual({ testName: 'Hemoglobin', value: '9.1', unit: 'g/dL', referenceRange: '13-17', isAbnormal: true, severity: 'moderate' });
  });
  it('coerces value to string and drops a non-enum severity', () => {
    const item = normalizeRawItem({ name: 'WBC', value: 11000 });
    expect(item.value).toBe('11000');
    expect(item.severity).toBeUndefined();
  });
  it('throws on a missing test name', () => {
    expect(() => normalizeRawItem({ value: '1' })).toThrow();
  });
});

describe('KNOWN_TEST_CATEGORIES', () => {
  it('includes the common BD panels', () => {
    expect(KNOWN_TEST_CATEGORIES).toEqual(expect.arrayContaining(['CBC', 'RFT', 'LFT', 'HbA1c', 'Lipid Profile', 'Thyroid', 'Urine R/E']));
  });
});

describe('buildLabResultData', () => {
  it('builds a LabResultData payload with the real org DID as lab.did + encounterDate', () => {
    const data = buildLabResultData({
      orgDid: 'did:web:khamhealth.com:org:org-1', orgName: 'Popular Diagnostics', testCategory: 'CBC',
      reportDate: '2026-06-18',
      normalized: [{ testName: 'Hemoglobin', value: '9.1', unit: 'g/dL', referenceRange: '13-17', isAbnormal: true, severity: 'moderate' }],
    });
    expect(data.testCategory).toBe('CBC');
    expect(data.reportDate).toBe('2026-06-18');
    expect(data.encounterDate).toBe('2026-06-18');
    expect(data.lab).toEqual({ did: 'did:web:khamhealth.com:org:org-1', name: 'Popular Diagnostics' });
    expect(data.results).toHaveLength(1);
    expect(data.results[0].testName).toBe('Hemoglobin');
    expect(data.locale).toBe('bn');
  });
  it('throws when there are no results (schema requires min 1)', () => {
    expect(() => buildLabResultData({ orgDid: 'did:web:example.com:org:o', orgName: 'X', testCategory: 'CBC', reportDate: '2026-06-18', normalized: [] })).toThrow();
  });
});
