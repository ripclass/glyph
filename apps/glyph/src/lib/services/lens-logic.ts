/**
 * @fileoverview Pure builders for the Lens order/result pipeline. No Supabase —
 * orchestration is in the /api/center routes. Bridges the extract-document
 * output shape ({name,range,severity:'normal'|...}) to the @kham/schemas-clinical
 * LabResultItem shape ({testName,referenceRange,severity:'mild'|...}).
 *
 * @module lib/services/lens-logic
 */

export const KNOWN_TEST_CATEGORIES = [
  'CBC', 'RFT', 'LFT', 'HbA1c', 'Lipid Profile', 'Thyroid', 'Urine R/E',
  'Blood Sugar', 'Electrolytes', 'CRP', 'Other',
] as const;

const SEVERITIES = ['mild', 'moderate', 'severe', 'critical'] as const;
type Severity = (typeof SEVERITIES)[number];

export interface LabResultItem {
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
  severity?: Severity;
}

export interface BuildLabOrderInput {
  ownerOrgId: string;
  patientId: string;
  testCategory: string;
  orderedBy: string;
}

export function buildLabOrderRow(input: BuildLabOrderInput) {
  const test_category = input.testCategory.trim();
  if (!test_category) throw new Error('Test category is required');
  return {
    owner_org_id: input.ownerOrgId,
    patient_id: input.patientId,
    test_category,
    ordered_by: input.orderedBy,
    status: 'ordered' as const,
  };
}

export interface BuildLabResultInput {
  orgId: string;
  orgName: string;
  testCategory: string;
  reportDate: string; // ISO date
  normalized: LabResultItem[];
}

/**
 * Builds the LabResultData payload (credentialSubject.data) for issueCredential.
 * `lab` is an entityRef to the centre org (the issuer); encounterDate mirrors the
 * report date. Matches labResultData in @kham/schemas-clinical.
 */
export function buildLabResultData(input: BuildLabResultInput) {
  if (!input.normalized.length) throw new Error('LabResult requires at least one result');
  return {
    encounterDate: input.reportDate,
    locale: 'bn' as const,
    lab: { did: `did:org:${input.orgId}`, name: input.orgName },
    testCategory: input.testCategory,
    reportDate: input.reportDate,
    results: input.normalized,
  };
}

/** Normalizes one raw result row (extract-document or manual) to a LabResultItem. */
export function normalizeRawItem(raw: Record<string, unknown>): LabResultItem {
  const testName = String((raw.testName ?? raw.name ?? '')).trim();
  if (!testName) throw new Error('Result item requires a test name');
  const sevRaw = String(raw.severity ?? '').toLowerCase();
  const severity = (SEVERITIES as readonly string[]).includes(sevRaw) ? (sevRaw as Severity) : undefined;
  const unit = raw.unit != null ? String(raw.unit) : undefined;
  const referenceRange = (raw.referenceRange ?? raw.range) != null ? String(raw.referenceRange ?? raw.range) : undefined;
  return {
    testName,
    value: String(raw.value ?? ''),
    ...(unit ? { unit } : {}),
    ...(referenceRange ? { referenceRange } : {}),
    ...(raw.isAbnormal != null ? { isAbnormal: Boolean(raw.isAbnormal) } : {}),
    ...(severity ? { severity } : {}),
  };
}
