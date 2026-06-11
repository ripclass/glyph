/**
 * @fileoverview Unit tests for the pure generated-note → credential-payload
 * mapping. Validated against the REAL zod schemas from @kham/schemas-clinical
 * so a mapping that drifts from the registry fails here, not at issuance.
 */

import { describe, it, expect } from 'vitest';
import { validateClinicalCredential } from '@kham/schemas-clinical';
import { mapGeneratedNote, type NoteMappingContext } from './note-mapping';

/** Shape produced by the generate-note edge function (BD format) */
const GENERATED_NOTE = {
  format: 'bd',
  chiefComplaint: 'Fever and headache for 3 days',
  onExamination: 'Temp 102F, BP 110/70, no neck rigidity',
  investigations: 'CBC, NS1 antigen, Widal test',
  diagnosis: 'Acute febrile illness, rule out dengue',
  prescription: {
    medications: [
      {
        name: 'Napa',
        genericName: 'Paracetamol',
        dose: '500mg',
        frequency: '1+0+1',
        duration: '5 days',
        route: 'oral',
        instructions: 'after meals',
      },
      { name: 'Orsaline', frequency: 'SOS' },
    ],
    investigationsOrdered: ['CBC', 'NS1 antigen'],
  },
  advice: 'Plenty of fluids, rest, return if fever persists beyond 48 hours',
  followUp: 'Return in 3 days with reports',
  icdCodes: ['R50.9'],
  evidenceLinks: { 'NS1 for dengue': 'WHO dengue guidelines 2024' },
};

const CTX: NoteMappingContext = {
  visitId: 'visit-uuid-1',
  encounterDate: '2026-06-12',
  prescriber: { did: 'did:web:khamhealth.com:.well-known:did:doctor-x', name: 'Dr. Path Test' },
};

describe('mapGeneratedNote', () => {
  it('produces a prescription payload that passes the registry schema', () => {
    const { prescription } = mapGeneratedNote(GENERATED_NOTE, CTX);
    expect(prescription).not.toBeNull();
    const validated = validateClinicalCredential('prescription', prescription);
    expect(validated.medications).toHaveLength(2);
    expect(validated.medications[0].name).toBe('Napa');
    expect(validated.medications[0].frequency).toBe('1+0+1');
    expect(validated.visitRef).toBe('visit-uuid-1');
  });

  it('produces a visit-note payload that passes the registry schema', () => {
    const { visitNote } = mapGeneratedNote(GENERATED_NOTE, CTX);
    const validated = validateClinicalCredential('visit_note', visitNote);
    expect(validated.format).toBe('bd');
    expect(validated.chiefComplaint).toBe('Fever and headache for 3 days');
    expect(validated.diagnosis?.[0]).toEqual({
      text: 'Acute febrile illness, rule out dengue',
      icd10: 'R50.9',
    });
    expect(validated.investigations).toEqual(['CBC, NS1 antigen, Widal test']);
    expect(validated.advice).toEqual([
      'Plenty of fluids, rest, return if fever persists beyond 48 hours',
    ]);
  });

  it('returns null prescription when the note has no medications', () => {
    const noMeds = { ...GENERATED_NOTE, prescription: { medications: [] } };
    const { prescription, visitNote } = mapGeneratedNote(noMeds, CTX);
    expect(prescription).toBeNull();
    expect(() => validateClinicalCredential('visit_note', visitNote)).not.toThrow();
  });

  it('drops malformed medication entries instead of failing the whole Rx', () => {
    const messy = {
      ...GENERATED_NOTE,
      prescription: {
        medications: [{ name: 'Seclo', dose: '20mg' }, { dose: 'orphan-no-name' }, null],
      },
    };
    const { prescription } = mapGeneratedNote(messy, CTX);
    const validated = validateClinicalCredential('prescription', prescription);
    expect(validated.medications).toHaveLength(1);
    expect(validated.medications[0].name).toBe('Seclo');
  });

  it('tolerates a minimal/degenerate note (LLM output is not trusted)', () => {
    const minimal = { chiefComplaint: 'Follow-up visit' };
    const { visitNote, prescription } = mapGeneratedNote(minimal, CTX);
    expect(prescription).toBeNull();
    const validated = validateClinicalCredential('visit_note', visitNote);
    expect(validated.chiefComplaint).toBe('Follow-up visit');
  });

  it('falls back to a recorded-elsewhere CC rather than an invalid BD note', () => {
    const ccless = { onExamination: 'BP 120/80' };
    const { visitNote } = mapGeneratedNote(ccless, CTX);
    expect(() => validateClinicalCredential('visit_note', visitNote)).not.toThrow();
  });
});
