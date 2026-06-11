/**
 * @fileoverview Pure mapping from the generate-note edge function's BD-note
 * JSON to clinical credential payloads (@kham/schemas-clinical shapes).
 *
 * LLM output is NOT trusted: every field is defensively coerced, malformed
 * medication entries are dropped rather than failing the whole prescription,
 * and the result is still zod-validated by the registry inside
 * `issueCredential` — this module just shapes, it does not certify.
 *
 * No I/O, no framework — unit-tested in note-mapping.test.ts.
 *
 * @module lib/identity/note-mapping
 */

/** Prescriber/visit context the payloads need beyond the note itself */
export interface NoteMappingContext {
  visitId: string;
  /** ISO date of the encounter (visits.visit_date) */
  encounterDate: string;
  prescriber: { did: string; name?: string; identifier?: string };
}

export interface MappedNotePayloads {
  /** visit_note credential payload (prescriptionRef left for the caller) */
  visitNote: Record<string, unknown>;
  /** prescription credential payload, or null when the note has no usable Rx */
  prescription: Record<string, unknown> | null;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}

function strArray(v: unknown): string[] | undefined {
  if (typeof v === 'string') return str(v) ? [v.trim()] : undefined;
  if (Array.isArray(v)) {
    const out = v.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
    return out.length ? out : undefined;
  }
  return undefined;
}

/** Keep only well-formed medication entries (a name is the minimum) */
function mapMedications(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  const out: Record<string, unknown>[] = [];
  for (const m of v) {
    if (!m || typeof m !== 'object') continue;
    const med = m as Record<string, unknown>;
    const name = str(med.name);
    if (!name) continue;
    out.push({
      name,
      ...(str(med.genericName) ? { genericName: str(med.genericName) } : {}),
      ...(str(med.dose) ? { dose: str(med.dose) } : {}),
      ...(str(med.unit) ? { unit: str(med.unit) } : {}),
      ...(str(med.frequency) ? { frequency: str(med.frequency) } : {}),
      ...(str(med.duration) ? { duration: str(med.duration) } : {}),
      ...(str(med.route) ? { route: str(med.route) } : {}),
      ...(str(med.instructions) ? { instructions: str(med.instructions) } : {}),
    });
  }
  return out;
}

function mapDiagnosis(note: Record<string, unknown>): Array<{ text: string; icd10?: string }> | undefined {
  const text = str(note.diagnosis);
  if (!text) return undefined;
  const icd = strArray(note.icdCodes)?.[0];
  return [{ text, ...(icd ? { icd10: icd } : {}) }];
}

/**
 * Maps a generated BD note to visit_note + prescription credential payloads.
 *
 * @param rawNote - The generated_note JSON (untrusted LLM output)
 * @param ctx - Visit/prescriber context
 * @returns Payloads ready for registry validation in issueCredential
 */
export function mapGeneratedNote(
  rawNote: unknown,
  ctx: NoteMappingContext
): MappedNotePayloads {
  const note = (rawNote && typeof rawNote === 'object' ? rawNote : {}) as Record<string, unknown>;
  const rx = (note.prescription && typeof note.prescription === 'object'
    ? note.prescription
    : {}) as Record<string, unknown>;

  const medications = mapMedications(rx.medications);
  const diagnosis = mapDiagnosis(note);
  const advice = strArray(note.advice);

  const base = {
    encounterDate: ctx.encounterDate,
    visitRef: ctx.visitId,
    prescriber: {
      did: ctx.prescriber.did,
      ...(ctx.prescriber.name ? { name: ctx.prescriber.name } : {}),
      ...(ctx.prescriber.identifier ? { identifier: ctx.prescriber.identifier } : {}),
    },
  };

  const prescription =
    medications.length > 0
      ? {
          ...base,
          medications,
          ...(diagnosis ? { diagnosis } : {}),
          ...(strArray(rx.investigationsOrdered)
            ? { investigationsOrdered: strArray(rx.investigationsOrdered) }
            : {}),
          ...(advice ? { advice } : {}),
          ...(str(note.followUp) ? { followUpDate: str(note.followUp) } : {}),
        }
      : null;

  const visitNote = {
    ...base,
    format: 'bd' as const,
    /** BD notes require a CC; degenerate LLM output falls back honestly */
    chiefComplaint: str(note.chiefComplaint) ?? 'Not recorded in generated note',
    ...(str(note.onExamination) ? { onExamination: str(note.onExamination) } : {}),
    ...(strArray(note.investigations) ? { investigations: strArray(note.investigations) } : {}),
    ...(diagnosis ? { diagnosis } : {}),
    ...(advice ? { advice } : {}),
    ...(str(note.followUp) ? { followUp: str(note.followUp) } : {}),
    ...(strArray(note.icdCodes) ? { icdCodes: strArray(note.icdCodes) } : {}),
  };

  return { visitNote, prescription };
}
