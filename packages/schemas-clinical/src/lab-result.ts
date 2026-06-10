import { z } from "zod";
import { clinicalContext, entityRef, labResultItem } from "./common";

/**
 * Lab-result credential — issued by a diagnostic centre (Popular, Ibn Sina,
 * Square, Labaid…). Subject is the patient's DID.
 */
export const labResultData = clinicalContext.extend({
  lab: entityRef,
  /** CBC, RFT, LFT, HbA1c, Thyroid, Urine R/E, etc. */
  testCategory: z.string().optional(),
  reportDate: z.string().optional(),
  results: z.array(labResultItem).min(1),
  orderedBy: entityRef.optional(),
  interpretation: z.string().optional(),
});
export type LabResultData = z.infer<typeof labResultData>;
