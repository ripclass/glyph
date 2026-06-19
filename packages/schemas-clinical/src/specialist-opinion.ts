import { z } from "zod";
import { clinicalContext, diagnosis, entityRef } from "./common";

/**
 * Specialist-opinion credential — a remote/diaspora specialist's opinion on a
 * patient-presented record (oncology first). Reserved shape (Bridge module,
 * demo-grade). Cross-clinic ingest is why presentedRecordRefs are DIDs/VC ids.
 */
export const specialistOpinionData = clinicalContext.extend({
  specialist: entityRef,
  specialty: z.string().min(1),
  referralReason: z.string().optional(),
  presentedRecordRefs: z.array(z.string()).optional(),
  opinion: z.string().min(1),
  recommendations: z.array(z.string()).optional(),
  differentialDiagnosis: z.array(diagnosis).optional(),
});
export type SpecialistOpinionData = z.infer<typeof specialistOpinionData>;
