/**
 * @fileoverview Prescription formatting utilities for the Bangladeshi
 * clinical prescription style. Produces human-readable medication strings
 * using the conventional "Form. Name Dose — Frequency — Duration" format
 * widely used in Bangladesh.
 *
 * @module lib/utils/format-prescription
 */

/** A single medication entry */
export interface Medication {
  /** Drug name (e.g. "Amlodipine") */
  name: string;
  /** Dose with unit (e.g. "5mg") */
  dose: string;
  /** BD-style frequency (e.g. "1+0+1" meaning morning+noon+night) */
  frequency: string;
  /** Duration of use (e.g. "30 days") */
  duration?: string;
}

/**
 * Known pharmaceutical dosage form prefixes.
 * Maps lowercase keywords in the drug name to their abbreviated form.
 */
const FORM_PREFIXES: Record<string, string> = {
  tablet: 'Tab.',
  tab: 'Tab.',
  capsule: 'Cap.',
  cap: 'Cap.',
  syrup: 'Syr.',
  syr: 'Syr.',
  injection: 'Inj.',
  inj: 'Inj.',
  cream: 'Cr.',
  ointment: 'Oint.',
  drop: 'Drop',
  drops: 'Drops',
  inhaler: 'Inh.',
  suppository: 'Supp.',
  suspension: 'Susp.',
};

/**
 * Infers the dosage form abbreviation from the drug name.
 * Returns `"Tab."` as the default (most common in BD outpatient practice).
 *
 * @param name - Drug name that may contain a form keyword
 * @returns Abbreviated form prefix and the cleaned drug name
 */
function inferForm(name: string): { form: string; cleanName: string } {
  const lower = name.toLowerCase().trim();

  for (const [keyword, abbrev] of Object.entries(FORM_PREFIXES)) {
    if (lower.startsWith(keyword + ' ') || lower.startsWith(keyword + '.')) {
      const cleanName = name.slice(keyword.length).replace(/^[.\s]+/, '').trim();
      return { form: abbrev, cleanName };
    }
  }

  /** Default to tablet form when no form is specified */
  return { form: 'Tab.', cleanName: name.trim() };
}

/**
 * Formats a single medication into the standard BD prescription line format.
 *
 * @param med - Medication details
 * @returns Formatted string (e.g. `"Tab. Amlodipine 5mg — 1+0+1 — 30 days"`)
 *
 * @example
 * ```ts
 * formatMedication({
 *   name: 'Amlodipine',
 *   dose: '5mg',
 *   frequency: '1+0+1',
 *   duration: '30 days',
 * });
 * // => "Tab. Amlodipine 5mg — 1+0+1 — 30 days"
 * ```
 */
export function formatMedication(med: Medication): string {
  const { form, cleanName } = inferForm(med.name);
  const parts = [`${form} ${cleanName} ${med.dose}`, med.frequency];

  if (med.duration) {
    parts.push(med.duration);
  }

  return parts.join(' \u2014 ');
}

/**
 * Formats an array of medications into a complete Rx section,
 * prefixed with the "Rx" header and numbered entries.
 *
 * @param meds - Array of medications to format
 * @returns Multi-line formatted prescription section
 *
 * @example
 * ```ts
 * formatPrescriptionSection([
 *   { name: 'Amlodipine', dose: '5mg', frequency: '1+0+1', duration: '30 days' },
 *   { name: 'Cap. Omeprazole', dose: '20mg', frequency: '1+0+0', duration: '14 days' },
 * ]);
 * // => "Rx\n1. Tab. Amlodipine 5mg — 1+0+1 — 30 days\n2. Cap. Omeprazole 20mg — 1+0+0 — 14 days"
 * ```
 */
export function formatPrescriptionSection(meds: Medication[]): string {
  if (meds.length === 0) {
    return 'Rx\n(No medications)';
  }

  const lines = meds.map((med, index) => `${index + 1}. ${formatMedication(med)}`);

  return `Rx\n${lines.join('\n')}`;
}
