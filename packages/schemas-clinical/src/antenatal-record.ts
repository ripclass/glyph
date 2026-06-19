import { z } from "zod";
import { clinicalContext, entityRef } from "./common";

/**
 * Antenatal-record credential — one ANC visit for a mother (maternal program).
 * Reserved shape (Maa module, demo-grade). Maa is a protected population (Tier-C
 * egress) — that constraint lives in the egress layer, not this schema.
 */
export const antenatalRecordData = clinicalContext.extend({
  provider: entityRef,
  visitNumber: z.number().int().positive().optional(),
  gestationalAgeWeeks: z.number().min(0).max(45).optional(),
  lmp: z.string().optional(),
  edd: z.string().optional(),
  bloodPressure: z.string().optional(),
  weightKg: z.number().positive().optional(),
  fundalHeightCm: z.number().positive().optional(),
  fetalHeartRateBpm: z.number().int().positive().optional(),
  riskFlags: z.array(z.string()).optional(),
  nextVisitDate: z.string().optional(),
});
export type AntenatalRecordData = z.infer<typeof antenatalRecordData>;
