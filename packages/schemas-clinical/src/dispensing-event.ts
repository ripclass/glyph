import { z } from "zod";
import { clinicalContext, entityRef } from "./common";

export const dispensedItem = z.object({
  drug: z.string().min(1),
  quantity: z.string().optional(),
  batchNo: z.string().optional(),
  expiry: z.string().optional(),
});
export type DispensedItem = z.infer<typeof dispensedItem>;

/**
 * Dispensing-event credential — issued by the dispensing pharmacy against a
 * specific PrescriptionCredential. Closes the AMR loop: a controlled drug
 * cannot be re-dispensed without a new physician-signed prescription.
 */
export const dispensingEventData = clinicalContext.extend({
  pharmacy: entityRef,
  /** The PrescriptionCredential being dispensed against (id or DID). */
  prescriptionRef: z.string().min(1),
  dispensedItems: z.array(dispensedItem).min(1),
  dispensedBy: entityRef.optional(),
  partial: z.boolean().default(false),
});
export type DispensingEventData = z.infer<typeof dispensingEventData>;
