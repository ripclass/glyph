/** @fileoverview Pure builders for Glyph Karigor (garment occupational-health). Mirrors hospital-logic. */
import type { OccupationalHealthData } from '@kham/schemas-clinical';

export interface BuildAssessmentRowInput { ownerOrgId: string; patientId: string; createdBy: string; }
export function buildAssessmentRow(i: BuildAssessmentRowInput) {
  return { owner_org_id: i.ownerOrgId, patient_id: i.patientId, created_by: i.createdBy, status: 'draft' as const };
}

export interface BuildOccupationalHealthInput {
  orgDid: string; orgName: string; encounterDate: string;
  assessmentType: OccupationalHealthData['assessmentType'];
  exposures?: string[]; findings?: Array<Record<string, unknown>>;
  fitnessForRole?: OccupationalHealthData['fitnessForRole'];
  restrictions?: string[]; recommendations?: string[];
}
export function buildOccupationalHealthData(i: BuildOccupationalHealthInput): OccupationalHealthData {
  if (!i.assessmentType) throw new Error('OccupationalHealth requires an assessmentType');
  return {
    encounterDate: i.encounterDate, locale: 'bn',
    employer: { did: i.orgDid, name: i.orgName },
    assessmentType: i.assessmentType,
    ...(i.exposures?.length ? { exposures: i.exposures } : {}),
    ...(i.findings?.length ? { findings: i.findings } : {}),
    ...(i.fitnessForRole ? { fitnessForRole: i.fitnessForRole } : {}),
    ...(i.restrictions?.length ? { restrictions: i.restrictions } : {}),
    ...(i.recommendations?.length ? { recommendations: i.recommendations } : {}),
  } as OccupationalHealthData;
}
