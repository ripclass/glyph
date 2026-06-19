import { z } from "zod";
import { clinicalContext, labResultItem, entityRef } from "./common";

/**
 * Occupational-health credential — a factory/employer-scoped worker health record
 * (e.g. RMG garment worker). Reserved shape (Karigor module, demo-grade).
 */
export const occupationalHealthData = clinicalContext.extend({
  employer: entityRef,
  assessmentType: z.enum(["pre_placement", "periodic", "return_to_work", "incident", "exit"]),
  exposures: z.array(z.string()).optional(),
  findings: z.array(labResultItem).optional(),
  fitnessForRole: z.enum(["fit", "fit_with_restrictions", "unfit"]).optional(),
  restrictions: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  assessingClinician: entityRef.optional(),
});
export type OccupationalHealthData = z.infer<typeof occupationalHealthData>;
