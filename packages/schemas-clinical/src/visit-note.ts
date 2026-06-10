import { z } from "zod";
import { clinicalContext, diagnosis, entityRef } from "./common";

const soapSection = z.object({
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
});

/**
 * Visit-note credential — the clinical reasoning in BD format
 * (CC / H-O / O-E / Ix / Dx / Advice). The Rx itself is a separate
 * PrescriptionCredential, linked via `prescriptionRef`. SOAP is opt-in.
 */
export const visitNoteData = clinicalContext
  .extend({
    prescriber: entityRef,
    format: z.enum(["bd", "soap"]).default("bd"),
    // BD format sections
    chiefComplaint: z.string().optional(), // CC
    history: z.string().optional(), // H/O
    onExamination: z.string().optional(), // O/E
    investigations: z.array(z.string()).optional(), // Ix
    diagnosis: z.array(diagnosis).optional(), // Dx
    advice: z.array(z.string()).optional(),
    followUp: z.string().optional(),
    icdCodes: z.array(z.string()).optional(),
    /** Links to the PrescriptionCredential issued for this visit. */
    prescriptionRef: z.string().optional(),
    // SOAP variant
    soap: soapSection.optional(),
  })
  .refine((v) => (v.format === "soap" ? Boolean(v.soap) : Boolean(v.chiefComplaint)), {
    message: "BD notes require a chiefComplaint; SOAP notes require a soap block",
  });
export type VisitNoteData = z.infer<typeof visitNoteData>;
