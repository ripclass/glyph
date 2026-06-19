/** @fileoverview Pure builders for Glyph Bridge (specialist opinions). Mirrors maa-logic. */
import type { SpecialistOpinionData } from '@kham/schemas-clinical';

export interface BuildOpinionRowInput { ownerOrgId: string; patientId: string; createdBy: string; }
export function buildOpinionRow(i: BuildOpinionRowInput) {
  return { owner_org_id: i.ownerOrgId, patient_id: i.patientId, created_by: i.createdBy, status: 'draft' as const };
}

export interface BuildSpecialistOpinionInput {
  orgDid: string; orgName: string; encounterDate: string;
  specialty: string; opinion: string;
  referralReason?: string; presentedRecordRefs?: string[];
  recommendations?: string[]; differentialDiagnosis?: Array<{ text: string; icd10?: string }>;
}
export function buildSpecialistOpinionData(i: BuildSpecialistOpinionInput): SpecialistOpinionData {
  if (!i.specialty || !i.opinion) throw new Error('SpecialistOpinion requires specialty and opinion');
  return {
    encounterDate: i.encounterDate, locale: 'bn',
    specialist: { did: i.orgDid, name: i.orgName },
    specialty: i.specialty, opinion: i.opinion,
    ...(i.referralReason ? { referralReason: i.referralReason } : {}),
    ...(i.presentedRecordRefs?.length ? { presentedRecordRefs: i.presentedRecordRefs } : {}),
    ...(i.recommendations?.length ? { recommendations: i.recommendations } : {}),
    ...(i.differentialDiagnosis?.length ? { differentialDiagnosis: i.differentialDiagnosis } : {}),
  } as SpecialistOpinionData;
}
