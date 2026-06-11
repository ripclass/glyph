import { describe, it, expect } from 'vitest';
import {
  buildDocumentPath,
  dataUrlToBlob,
  mapLabExtraction,
  mapRxExtraction,
  readConfidence,
} from './documents-logic';

describe('buildDocumentPath', () => {
  it('puts the patient id first — the storage policy derives clinic scope from it', () => {
    const path = buildDocumentPath('pat-1', 'vis-2', 'prescription', 'doc-3');
    expect(path).toBe('pat-1/vis-2/prescription-doc-3.jpg');
    expect(path.split('/')[0]).toBe('pat-1');
  });

  it('distinguishes document types in the filename', () => {
    expect(buildDocumentPath('p', 'v', 'lab_report', 'd')).toBe('p/v/lab_report-d.jpg');
  });
});

describe('dataUrlToBlob', () => {
  it('decodes a base64 data URL into a typed blob', () => {
    // "GLYPH" base64-encoded
    const blob = dataUrlToBlob('data:image/jpeg;base64,R0xZUEg=');
    expect(blob.type).toBe('image/jpeg');
    expect(blob.size).toBe(5);
  });

  it('rejects non-data-URL input', () => {
    expect(() => dataUrlToBlob('https://example.com/x.jpg')).toThrow();
    expect(() => dataUrlToBlob('data:image/jpeg,notbase64')).toThrow();
  });
});

describe('readConfidence', () => {
  it('passes through a sane model confidence', () => {
    expect(readConfidence({ confidence: 0.85 })).toBe(0.85);
  });

  it('defaults to 0.5 when missing or mistyped (matches extract-document)', () => {
    expect(readConfidence({})).toBe(0.5);
    expect(readConfidence({ confidence: 'high' })).toBe(0.5);
    expect(readConfidence({ confidence: NaN })).toBe(0.5);
  });

  it('clamps out-of-range values', () => {
    expect(readConfidence({ confidence: 7 })).toBe(1);
    expect(readConfidence({ confidence: -1 })).toBe(0);
  });
});

describe('mapRxExtraction', () => {
  it('maps a full extraction to the card shape', () => {
    const card = mapRxExtraction({
      prescribing_doctor_name: 'Dr. Rahman',
      prescription_date: '2026-05-01',
      medications: [
        { name: 'Napa', generic_name: 'Paracetamol', dose: '500mg', frequency: '1+0+1' },
      ],
    });
    expect(card.doctor).toBe('Rahman');
    expect(card.date).toBe('2026-05-01');
    expect(card.medications).toEqual([
      { name: 'Napa', dose: '500mg', frequency: '1+0+1' },
    ]);
  });

  it('strips a leading honorific — the card adds "Dr." itself', () => {
    expect(mapRxExtraction({ prescribing_doctor_name: 'Dr. Rahim Uddin' }).doctor).toBe('Rahim Uddin');
    expect(mapRxExtraction({ prescribing_doctor_name: 'DR Rahim' }).doctor).toBe('Rahim');
    expect(mapRxExtraction({ prescribing_doctor_name: 'Rahim Uddin' }).doctor).toBe('Rahim Uddin');
  });

  it('falls back to the generic name when the brand is missing', () => {
    const card = mapRxExtraction({
      medications: [{ generic_name: 'Omeprazole', dose: '20mg', frequency: '1+0+0' }],
    });
    expect(card.medications[0].name).toBe('Omeprazole');
  });

  it('survives hostile model output (wrong types everywhere)', () => {
    const card = mapRxExtraction({
      prescribing_doctor_name: 42,
      medications: [null, 'Napa', { dose: '500mg' }, { name: '  ' }],
    });
    expect(card.doctor).toBeUndefined();
    expect(card.medications).toEqual([]);
  });

  it('treats a non-array medications field as empty', () => {
    expect(mapRxExtraction({ medications: 'none' }).medications).toEqual([]);
  });
});

describe('mapLabExtraction', () => {
  it('maps a full extraction to the card shape', () => {
    const card = mapLabExtraction({
      lab_name: 'Popular Diagnostics',
      report_date: '2026-04-20',
      results: [
        { name: 'HbA1c', value: '8.1', unit: '%', range: '4.0-5.6', isAbnormal: true },
      ],
    });
    expect(card.labName).toBe('Popular Diagnostics');
    expect(card.results).toEqual([
      { name: 'HbA1c', value: '8.1', unit: '%', range: '4.0-5.6', isAbnormal: true },
    ]);
  });

  it('only true means abnormal — strings and numbers do not flag red', () => {
    const card = mapLabExtraction({
      results: [
        { name: 'TSH', value: 2.1, unit: '', range: '', isAbnormal: 'yes' },
      ],
    });
    expect(card.results[0].isAbnormal).toBe(false);
    expect(card.results[0].value).toBe('2.1');
  });

  it('drops rows without a test name and survives non-array results', () => {
    expect(mapLabExtraction({ results: [{ value: '5' }] }).results).toEqual([]);
    expect(mapLabExtraction({ results: {} }).results).toEqual([]);
  });
});
