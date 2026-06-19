import { z } from "zod";
import { clinicalContext, diagnosis, medication, entityRef } from "./common";

/**
 * Discharge-summary credential — issued by a hospital (institutional owner) when
 * a patient is discharged. Reserved shape (Hospital module, demo-grade); deepen
 * per the hospital build. Anchors to the patient DID like every clinical credential.
 */
export const dischargeSummaryData = clinicalContext.extend({
  hospital: entityRef,
  admissionDate: z.string().min(4),
  dischargeDate: z.string().min(4),
  admittingDiagnosis: z.array(diagnosis).optional(),
  dischargeDiagnosis: z.array(diagnosis).min(1),
  proceduresPerformed: z.array(z.string()).optional(),
  hospitalCourse: z.string().optional(),
  dischargeMedications: z.array(medication).optional(),
  followUpInstructions: z.array(z.string()).optional(),
  attendingClinician: entityRef.optional(),
  /** lama = left against medical advice (BD-common). */
  dischargeCondition: z
    .enum(["recovered", "improved", "unchanged", "referred", "deceased", "lama"])
    .optional(),
});
export type DischargeSummaryData = z.infer<typeof dischargeSummaryData>;
