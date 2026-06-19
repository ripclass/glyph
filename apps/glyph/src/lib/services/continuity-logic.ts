/** @fileoverview Pure builders for Glyph Continuity (migrant medical clearance). Mirrors karigor-logic. */
import type { MedicalClearanceData } from '@kham/schemas-clinical';

export interface BuildClearanceRowInput { ownerOrgId: string; patientId: string; createdBy: string; }
export function buildClearanceRow(i: BuildClearanceRowInput) {
  return { owner_org_id: i.ownerOrgId, patient_id: i.patientId, created_by: i.createdBy, status: 'draft' as const };
}

export interface BuildMedicalClearanceInput {
  orgDid: string; orgName: string; encounterDate: string;
  purpose: MedicalClearanceData['purpose'];
  fitnessStatus: MedicalClearanceData['fitnessStatus'];
  restrictions?: string[]; findings?: Array<Record<string, unknown>>;
  destinationCountry?: string; validUntil?: string;
}
export function buildMedicalClearanceData(i: BuildMedicalClearanceInput): MedicalClearanceData {
  if (!i.purpose || !i.fitnessStatus) throw new Error('MedicalClearance requires purpose and fitnessStatus');
  return {
    encounterDate: i.encounterDate, locale: 'bn',
    assessingFacility: { did: i.orgDid, name: i.orgName },
    purpose: i.purpose, fitnessStatus: i.fitnessStatus,
    ...(i.restrictions?.length ? { restrictions: i.restrictions } : {}),
    ...(i.findings?.length ? { findings: i.findings } : {}),
    ...(i.destinationCountry ? { destinationCountry: i.destinationCountry } : {}),
    ...(i.validUntil ? { validUntil: i.validUntil } : {}),
  } as MedicalClearanceData;
}
