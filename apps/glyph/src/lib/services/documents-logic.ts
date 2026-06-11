/**
 * @fileoverview Pure logic for the document-capture pipeline: storage path
 * construction, data-URL decoding, and mapping the extraction JSON (untrusted
 * model output) into the shapes the ExtractedRxCard / ExtractedLabCard
 * components render. No I/O — everything here is unit-tested.
 *
 * @module lib/services/documents-logic
 */

/** Document types the intake flow can capture */
export type CapturedDocumentType = 'prescription' | 'lab_report';

/** Shape consumed by ExtractedRxCard */
export interface RxCardData {
  doctor?: string;
  date?: string;
  medications: Array<{ name: string; dose: string; frequency: string }>;
}

/** Shape consumed by ExtractedLabCard */
export interface LabCardData {
  labName?: string;
  date?: string;
  results: Array<{
    name: string;
    value: string;
    unit: string;
    range: string;
    isAbnormal: boolean;
  }>;
}

/**
 * Builds the storage path for a captured document.
 *
 * The first segment MUST be the patient UUID — migration 004's storage
 * policies derive clinic scope from it. Changing this convention breaks
 * upload authorization.
 *
 * @example
 * ```ts
 * buildDocumentPath(patientId, visitId, 'prescription', docId);
 * // → "0f3a…/9bc1…/prescription-77de….jpg"
 * ```
 */
export function buildDocumentPath(
  patientId: string,
  visitId: string,
  type: CapturedDocumentType,
  docId: string
): string {
  return `${patientId}/${visitId}/${type}-${docId}.jpg`;
}

/**
 * Decodes a base64 data URL (from canvas capture or the file-input
 * fallback) into a Blob for upload.
 *
 * @throws {Error} If the input is not a base64 data URL
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error('Expected a base64 data URL');
  }
  const [, mimeType, payload] = match;
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/** Safe string coercion for untrusted extraction fields */
function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Confidence as the edge function computes it: a number if the model
 * provided one, else 0.5, clamped to [0, 1].
 */
export function readConfidence(extracted: Record<string, unknown>): number {
  const raw = extracted.confidence;
  const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0.5;
  return Math.min(1, Math.max(0, value));
}

/**
 * Maps prescription-extraction JSON (model output — treat every field as
 * possibly missing or mistyped) to the ExtractedRxCard shape.
 */
export function mapRxExtraction(extracted: Record<string, unknown>): RxCardData {
  const medications = Array.isArray(extracted.medications)
    ? extracted.medications.flatMap((med): RxCardData['medications'] => {
        if (med === null || typeof med !== 'object') return [];
        const m = med as Record<string, unknown>;
        const name = asText(m.name) ?? asText(m.generic_name);
        if (!name) return [];
        return [
          {
            name,
            dose: asText(m.dose) ?? '—',
            frequency: asText(m.frequency) ?? '—',
          },
        ];
      })
    : [];

  // The card prefixes "Dr." itself — strip a leading honorific so an
  // extraction of "Dr. Rahim Uddin" doesn't render as "Dr. Dr. Rahim Uddin".
  const doctor = asText(extracted.prescribing_doctor_name)?.replace(
    /^dr\.?\s+/i,
    ''
  );

  return {
    doctor,
    date: asText(extracted.prescription_date),
    medications,
  };
}

/**
 * Maps lab-report-extraction JSON to the ExtractedLabCard shape.
 */
export function mapLabExtraction(extracted: Record<string, unknown>): LabCardData {
  const results = Array.isArray(extracted.results)
    ? extracted.results.flatMap((row): LabCardData['results'] => {
        if (row === null || typeof row !== 'object') return [];
        const r = row as Record<string, unknown>;
        const name = asText(r.name);
        if (!name) return [];
        return [
          {
            name,
            value: asText(r.value) ?? String(r.value ?? '—'),
            unit: asText(r.unit) ?? '',
            range: asText(r.range) ?? '',
            isAbnormal: r.isAbnormal === true,
          },
        ];
      })
    : [];

  return {
    labName: asText(extracted.lab_name),
    date: asText(extracted.report_date),
    results,
  };
}
