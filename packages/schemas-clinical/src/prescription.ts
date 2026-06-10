import { z } from "zod";
import { clinicalContext, diagnosis, entityRef, medication } from "./common";

/**
 * Prescription credential — the Rx. Subject is the patient's DID; issuer is the
 * prescribing physician. Verifiable independently by a pharmacy (the AMR loop).
 */
export const prescriptionData = clinicalContext.extend({
  prescriber: entityRef,
  diagnosis: z.array(diagnosis).optional(),
  medications: z.array(medication).min(1),
  /** Investigations ordered (Ix). */
  investigationsOrdered: z.array(z.string()).optional(),
  advice: z.array(z.string()).optional(),
  followUpDate: z.string().optional(),
});
export type PrescriptionData = z.infer<typeof prescriptionData>;
