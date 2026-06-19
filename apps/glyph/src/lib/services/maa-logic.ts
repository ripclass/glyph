/** @fileoverview Pure builders for Glyph Maa (maternal antenatal records). Mirrors continuity-logic. */
import type { AntenatalRecordData } from '@kham/schemas-clinical';

export interface BuildAntenatalVisitRowInput { ownerOrgId: string; patientId: string; createdBy: string; }
export function buildAntenatalVisitRow(i: BuildAntenatalVisitRowInput) {
  return { owner_org_id: i.ownerOrgId, patient_id: i.patientId, created_by: i.createdBy, status: 'draft' as const };
}

export interface BuildAntenatalRecordInput {
  orgDid: string; orgName: string; encounterDate: string;
  visitNumber?: number; gestationalAgeWeeks?: number; lmp?: string; edd?: string;
  bloodPressure?: string; weightKg?: number; fundalHeightCm?: number; fetalHeartRateBpm?: number;
  riskFlags?: string[]; nextVisitDate?: string;
}
export function buildAntenatalRecordData(i: BuildAntenatalRecordInput): AntenatalRecordData {
  return {
    encounterDate: i.encounterDate, locale: 'bn',
    provider: { did: i.orgDid, name: i.orgName },
    ...(i.visitNumber != null ? { visitNumber: i.visitNumber } : {}),
    ...(i.gestationalAgeWeeks != null ? { gestationalAgeWeeks: i.gestationalAgeWeeks } : {}),
    ...(i.lmp ? { lmp: i.lmp } : {}),
    ...(i.edd ? { edd: i.edd } : {}),
    ...(i.bloodPressure ? { bloodPressure: i.bloodPressure } : {}),
    ...(i.weightKg != null ? { weightKg: i.weightKg } : {}),
    ...(i.fundalHeightCm != null ? { fundalHeightCm: i.fundalHeightCm } : {}),
    ...(i.fetalHeartRateBpm != null ? { fetalHeartRateBpm: i.fetalHeartRateBpm } : {}),
    ...(i.riskFlags?.length ? { riskFlags: i.riskFlags } : {}),
    ...(i.nextVisitDate ? { nextVisitDate: i.nextVisitDate } : {}),
  } as AntenatalRecordData;
}
