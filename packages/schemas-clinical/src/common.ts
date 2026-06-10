import { z } from "zod";

/**
 * Shared building blocks for clinical credential payloads.
 *
 * Designed so future population credentials (ANC visit, factory encounter,
 * migrant assessment) reuse the SAME envelope (`clinicalContext`, `sourceTag`,
 * `entityRef`) and fit without a schema break — only their domain-specific
 * fields differ.
 */

/** JSON-LD context for v1 clinical credentials. */
export const CLINICAL_CONTEXT_V1 = "https://schemas.kham.health/clinical/v1";

/**
 * BD tri-slot dosing convention, e.g. "1+0+1" = morning+afternoon+night.
 * Accepts English or Bangla numerals and 2–4 slots. Exported for callers to
 * validate/normalize; `medication.frequency` itself stays a lenient string so
 * real-world entries like "SOS"/"stat" are not rejected.
 */
export const BD_DOSING_PATTERN = /^[0-9০-৯]+(\+[0-9০-৯]+){1,3}$/;

/** Provenance of a clinical claim — the attendant protocol, as data. */
export const sourceProvenance = z.enum([
  "patient_reported",
  "attendant_reported",
  "attendant_translated",
  "attendant_observed",
  "clinician_observed",
  "document_extracted",
  "device_measured",
]);
export type SourceProvenance = z.infer<typeof sourceProvenance>;

export const sourceTag = z.object({
  claim: z.string().min(1),
  source: sourceProvenance,
  confidence: z.number().min(0).max(1).optional(),
  note: z.string().optional(),
});
export type SourceTag = z.infer<typeof sourceTag>;

/** Reference to a DID-bearing entity without inlining full PII. */
export const entityRef = z
  .object({
    did: z.string().regex(/^did:/).optional(),
    name: z.string().optional(),
    /** BMDC reg no, lab licence, pharmacy licence, etc. */
    identifier: z.string().optional(),
  })
  .refine((v) => Boolean(v.did || v.name || v.identifier), {
    message: "entityRef needs at least one of did/name/identifier",
  });
export type EntityRef = z.infer<typeof entityRef>;

export const diagnosis = z.object({
  text: z.string().min(1),
  icd10: z.string().optional(),
});
export type Diagnosis = z.infer<typeof diagnosis>;

export const medication = z.object({
  /** BD brand or generic name (Napa, Seclo, Metformin). */
  name: z.string().min(1),
  genericName: z.string().optional(),
  dose: z.string().optional(),
  unit: z.string().optional(),
  /** BD dosing "1+0+1" (see BD_DOSING_PATTERN) or free text ("SOS", "stat"). */
  frequency: z.string().optional(),
  timing: z
    .enum(["before_meal", "after_meal", "with_meal", "empty_stomach"])
    .optional(),
  duration: z.string().optional(),
  route: z.string().optional(),
  instructions: z.string().optional(),
});
export type Medication = z.infer<typeof medication>;

export const labResultItem = z.object({
  testName: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  referenceRange: z.string().optional(),
  isAbnormal: z.boolean().optional(),
  severity: z.enum(["mild", "moderate", "severe", "critical"]).optional(),
});
export type LabResultItem = z.infer<typeof labResultItem>;

/**
 * Context carried by every encounter-based clinical credential. Reused as-is by
 * future population credentials.
 */
export const clinicalContext = z.object({
  /** ISO date/datetime of the encounter. */
  encounterDate: z.string().min(4),
  facility: entityRef.optional(),
  locale: z.enum(["bn", "en"]).default("bn"),
  /** Links credentials issued for the same visit (a visit id or visit DID). */
  visitRef: z.string().optional(),
  sourceTags: z.array(sourceTag).optional(),
});
export type ClinicalContext = z.infer<typeof clinicalContext>;
