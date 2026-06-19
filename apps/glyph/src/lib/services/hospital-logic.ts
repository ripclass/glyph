/**
 * @fileoverview Pure builders for the Hospital discharge flow. Mirrors lens-logic.
 * No Supabase — orchestration lives in the /api/hospital routes.
 *
 * @module lib/services/hospital-logic
 */
import type { DischargeSummaryData } from '@kham/schemas-clinical';

// ---------------------------------------------------------------------------
// Discharge record row builder
// ---------------------------------------------------------------------------

export interface BuildDischargeRecordInput {
  ownerOrgId: string;
  patientId: string;
  createdBy: string;
  admissionDate?: string | null;
  dischargeDate?: string | null;
}

/** Builds the Supabase Insert row for discharge_records (status=draft). */
export function buildDischargeRecordRow(i: BuildDischargeRecordInput) {
  return {
    owner_org_id: i.ownerOrgId,
    patient_id: i.patientId,
    created_by: i.createdBy,
    status: 'draft' as const,
    admission_date: i.admissionDate ?? null,
    discharge_date: i.dischargeDate ?? null,
  };
}

// ---------------------------------------------------------------------------
// Discharge summary data builder (credentialSubject.data payload)
// ---------------------------------------------------------------------------

export interface BuildDischargeSummaryInput {
  orgDid: string;
  orgName: string;
  dischargeDate: string;
  admissionDate?: string;
  dischargeDiagnosis: Array<{ text: string; icd10?: string }>;
  dischargeMedications?: Array<Record<string, unknown>>;
  procedures?: string[];
  hospitalCourse?: string;
  followUpInstructions?: string[];
  dischargeCondition?: string;
}

/**
 * Builds the DischargeSummaryData payload that `validateClinicalCredential('discharge_summary', data)`
 * accepts. Throws if dischargeDiagnosis is empty (schema min(1) guard).
 */
export function buildDischargeSummaryData(i: BuildDischargeSummaryInput): DischargeSummaryData {
  if (!i.dischargeDiagnosis?.length) {
    throw new Error('DischargeSummary requires at least one diagnosis');
  }
  return {
    encounterDate: i.dischargeDate,
    locale: 'bn',
    hospital: { did: i.orgDid, name: i.orgName },
    admissionDate: i.admissionDate ?? i.dischargeDate,
    dischargeDate: i.dischargeDate,
    dischargeDiagnosis: i.dischargeDiagnosis,
    ...(i.dischargeMedications?.length ? { dischargeMedications: i.dischargeMedications as DischargeSummaryData['dischargeMedications'] } : {}),
    ...(i.procedures?.length ? { proceduresPerformed: i.procedures } : {}),
    ...(i.hospitalCourse ? { hospitalCourse: i.hospitalCourse } : {}),
    ...(i.followUpInstructions?.length ? { followUpInstructions: i.followUpInstructions } : {}),
    ...(i.dischargeCondition ? { dischargeCondition: i.dischargeCondition as DischargeSummaryData['dischargeCondition'] } : {}),
  };
}
