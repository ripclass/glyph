import { z } from "zod";
import { entityRef } from "./common";

/**
 * Physician registration credential — subject is the doctor's DID.
 * Self-issued first (the writer's own Glyph key, trust level `self_declared`);
 * when BMDC later anchors the same key, the same credential becomes
 * `issuer_verified` with no data migration.
 */
export const physicianRegistrationData = z.object({
  fullName: z.string().min(1),
  fullNameBn: z.string().optional(),
  bmdcRegNo: z.string().min(1),
  registrationType: z.enum(["MBBS", "BDS", "specialist", "other"]).optional(),
  specialty: z.string().optional(),
  /** MBBS, FCPS, MD, MRCP, etc. */
  qualifications: z.array(z.string()).optional(),
  registrationDate: z.string().optional(),
  /** BMDC renewal date. */
  validUntil: z.string().optional(),
  issuingAuthority: z.string().default("BMDC"),
  facility: entityRef.optional(),
});
export type PhysicianRegistrationData = z.infer<typeof physicianRegistrationData>;
