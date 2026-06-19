import { z } from "zod";
import { clinicalContext, labResultItem, entityRef } from "./common";

/**
 * Medical-clearance / fitness-for-work credential — overseas employment (migrant
 * worker), pre-employment, or general fitness. Reserved shape (Continuity module,
 * demo-grade). Cross-border portability is why it anchors to a portable patient DID.
 */
export const medicalClearanceData = clinicalContext.extend({
  assessingFacility: entityRef,
  purpose: z.enum(["overseas_employment", "pre_employment", "periodic", "general"]),
  fitnessStatus: z.enum(["fit", "fit_with_restrictions", "temporarily_unfit", "unfit"]),
  restrictions: z.array(z.string()).optional(),
  findings: z.array(labResultItem).optional(),
  destinationCountry: z.string().optional(),
  validUntil: z.string().optional(),
  assessingClinician: entityRef.optional(),
});
export type MedicalClearanceData = z.infer<typeof medicalClearanceData>;
