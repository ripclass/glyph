import { z } from "zod";
import { CLINICAL_CONTEXT_V1 } from "./common";
import { physicianRegistrationData } from "./physician-registration";
import { visitNoteData } from "./visit-note";
import { prescriptionData } from "./prescription";
import { labResultData } from "./lab-result";
import { dispensingEventData } from "./dispensing-event";

/**
 * The registry binds each clinical credential type to its Zod schema and the
 * envelope metadata `@kham/identity`'s `buildAndSignCredential` needs
 * (`credentialType`, the VC `type` entry, the JSON-LD context). The issuance
 * seam (Glyph app, M3) reads from here so adding a credential type is a
 * one-line registry change, not a seam rewrite.
 */
export interface ClinicalCredentialDef {
  /** Stored in credentialSubject.credentialType. */
  credentialType: string;
  /** Appended to VC `type` after "VerifiableCredential". */
  vcType: string;
  /** Appended to `@context` after the VC 2.0 base context. */
  context: string;
  schema: z.ZodTypeAny;
}

export const CLINICAL_CREDENTIALS = {
  physician_registration: {
    credentialType: "physician_registration",
    vcType: "PhysicianRegistrationCredential",
    context: CLINICAL_CONTEXT_V1,
    schema: physicianRegistrationData,
  },
  visit_note: {
    credentialType: "visit_note",
    vcType: "VisitNoteCredential",
    context: CLINICAL_CONTEXT_V1,
    schema: visitNoteData,
  },
  prescription: {
    credentialType: "prescription",
    vcType: "PrescriptionCredential",
    context: CLINICAL_CONTEXT_V1,
    schema: prescriptionData,
  },
  lab_result: {
    credentialType: "lab_result",
    vcType: "LabResultCredential",
    context: CLINICAL_CONTEXT_V1,
    schema: labResultData,
  },
  dispensing_event: {
    credentialType: "dispensing_event",
    vcType: "DispensingEventCredential",
    context: CLINICAL_CONTEXT_V1,
    schema: dispensingEventData,
  },
} as const satisfies Record<string, ClinicalCredentialDef>;

export type ClinicalCredentialType = keyof typeof CLINICAL_CREDENTIALS;

/**
 * Validate `credentialSubject.data` for a clinical credential type. Throws
 * (ZodError) on invalid input — never accept freeform credential data.
 */
export function validateClinicalCredential<T extends ClinicalCredentialType>(
  type: T,
  data: unknown,
): z.infer<(typeof CLINICAL_CREDENTIALS)[T]["schema"]> {
  const def = CLINICAL_CREDENTIALS[type];
  if (!def) {
    throw new Error(`Unknown clinical credential type: ${String(type)}`);
  }
  return def.schema.parse(data);
}
