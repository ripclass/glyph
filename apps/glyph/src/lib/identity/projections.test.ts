/**
 * @fileoverview Unit tests for rebuildProjections — exercises both the
 * PrescriptionCredential and LabResultCredential branches.
 *
 * The admin client is mocked with chained vi.fn() stubs that mirror the
 * Supabase query-builder API. We test the insert-once / idempotent contract
 * that guards the DB-trigger-frozen rows.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rebuildProjections } from './projections';

// ---------------------------------------------------------------------------
// Shared fixture: a LabResultCredential row (as returned by `credentials`
// query with id, vc_id, types, issued_at, credential_json).
// ---------------------------------------------------------------------------
const LAB_CRED = {
  id: 'cred-lab-1',
  vc_id: 'urn:uuid:lab-vc-1',
  types: ['VerifiableCredential', 'LabResultCredential'],
  issued_at: '2026-06-18T00:00:00Z',
  credential_json: {
    credentialSubject: {
      data: {
        encounterDate: '2026-06-18',
        locale: 'bn',
        lab: { did: 'did:org:org1', name: 'Popular Diagnostics' },
        testCategory: 'CBC',
        reportDate: '2026-06-18',
        results: [{ testName: 'Hemoglobin', value: '9.1', unit: 'g/dL', referenceRange: '13-17', isAbnormal: true }],
      },
    },
  },
};

// A PrescriptionCredential row (minimal — only what the branch needs).
const RX_CRED = {
  id: 'cred-rx-1',
  vc_id: 'urn:uuid:rx-vc-1',
  types: ['VerifiableCredential', 'PrescriptionCredential'],
  issued_at: '2026-06-18T00:00:00Z',
  credential_json: {
    credentialSubject: {
      data: {
        encounterDate: '2026-06-18',
        medications: [{ name: 'Napa', frequency: '1+0+1' }],
        prescriber: { name: 'Dr. Test' },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Helpers: build a minimal Supabase query-builder mock chain.
// Each method returns `this` so chains work; terminal methods (maybeSingle,
// insert) resolve with `{ data, error }`.
// ---------------------------------------------------------------------------
function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const fn = () => chain;
  chain.select = vi.fn(fn);
  chain.eq = vi.fn(fn);
  chain.is = vi.fn(fn);
  chain.insert = vi.fn(() => Promise.resolve(result));
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

// Build a mock admin client that returns different data per table.
function makeAdmin(opts: {
  patientData: unknown;
  credsData: unknown;
  existingLab?: unknown;      // already-existing lab_reports row (for idempotency test)
  insertLabResult?: unknown;  // error from inserting lab_reports
}) {
  const patientChain = makeChain({ data: opts.patientData, error: null });
  // Credentials query-builder: .select().eq() chain; .then() makes it thenable
  // (Supabase resolves the chain as a promise). We use a plain object + cast to
  // avoid recursive-type inference errors in strict mode.
  const credsChainObj = {
    select: (_col: string) => credsChainObj,
    eq: (_col: string, _val: unknown) => credsChainObj,
    then: (resolve: (v: unknown) => void) =>
      resolve({ data: opts.credsData, error: null }),
  };
  const credsChain = credsChainObj as unknown as Record<string, unknown>;
  // lab_reports: first .select call checks existing; second .insert call inserts.
  const labSelectChain = makeChain({ data: opts.existingLab ?? null, error: null });
  const labInsertChain = { insert: vi.fn(() => Promise.resolve({ data: null, error: opts.insertLabResult ?? null })) };

  // prescriptions: no existing row, no error on insert (not the focus here).
  const rxSelectChain = makeChain({ data: null, error: null });
  const rxInsertChain = { insert: vi.fn(() => Promise.resolve({ data: null, error: null })) };

  let labCallCount = 0;
  let rxCallCount = 0;

  const admin = {
    from: vi.fn((table: string) => {
      if (table === 'patients') return patientChain;
      if (table === 'credentials') return credsChain;
      if (table === 'lab_reports') {
        labCallCount++;
        // First call is .select().eq().maybeSingle() — existence check.
        // Second call is .insert().
        return labCallCount % 2 === 1 ? labSelectChain : labInsertChain;
      }
      if (table === 'prescriptions') {
        rxCallCount++;
        return rxCallCount % 2 === 1 ? rxSelectChain : rxInsertChain;
      }
      return makeChain({ data: null, error: null });
    }),
  };

  return { admin, labInsertChain, rxInsertChain };
}

// ---------------------------------------------------------------------------

describe('rebuildProjections — LabResultCredential branch', () => {
  it('inserts one lab_reports row when a LabResultCredential has no projection yet', async () => {
    const { admin, labInsertChain } = makeAdmin({
      patientData: { id: 'patient-row-1' },
      credsData: [LAB_CRED],
      existingLab: null, // no row yet
    });

    const report = await rebuildProjections(admin as never, 'did:web:khamhealth.com:.well-known:did:patient-1');

    expect(report.checked).toBe(1);
    expect(report.inserted).toBe(1);
    expect(report.skippedExisting).toBe(0);
    expect(report.unprojectable).toHaveLength(0);

    expect(labInsertChain.insert).toHaveBeenCalledOnce();
    const insertArg = (labInsertChain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(insertArg.credential_id).toBe('cred-lab-1');
    expect(insertArg.source).toBe('digital');
    expect(insertArg.verified_by_doctor).toBe(true);
    expect(insertArg.patient_id).toBe('patient-row-1');
    expect(insertArg.test_category).toBe('CBC');
    expect(insertArg.lab_name).toBe('Popular Diagnostics');
    expect(insertArg.visit_id).toBeNull();
  });

  it('skips insert when a lab_reports row already exists for the credential_id (idempotent)', async () => {
    const { admin, labInsertChain } = makeAdmin({
      patientData: { id: 'patient-row-1' },
      credsData: [LAB_CRED],
      existingLab: { id: 'existing-lab-row' }, // already projected
    });

    const report = await rebuildProjections(admin as never, 'did:web:khamhealth.com:.well-known:did:patient-1');

    expect(report.skippedExisting).toBe(1);
    expect(report.inserted).toBe(0);
    expect(labInsertChain.insert).not.toHaveBeenCalled();
  });

  it('records unprojectable when insert returns an error', async () => {
    const { admin } = makeAdmin({
      patientData: { id: 'patient-row-1' },
      credsData: [LAB_CRED],
      existingLab: null,
      insertLabResult: { message: 'frozen row' },
    });

    const report = await rebuildProjections(admin as never, 'did:web:khamhealth.com:.well-known:did:patient-1');

    expect(report.inserted).toBe(0);
    expect(report.unprojectable).toContain('urn:uuid:lab-vc-1');
  });

  it('throws when the patient DID has no row', async () => {
    const { admin } = makeAdmin({
      patientData: null,
      credsData: [],
    });

    await expect(
      rebuildProjections(admin as never, 'did:web:khamhealth.com:.well-known:did:unknown')
    ).rejects.toThrow('No patient row holds DID');
  });
});

describe('rebuildProjections — PrescriptionCredential branch is unaffected', () => {
  it('inserts a prescriptions row and does not touch lab_reports', async () => {
    const { admin, rxInsertChain, labInsertChain } = makeAdmin({
      patientData: { id: 'patient-row-2' },
      credsData: [RX_CRED],
    });

    const report = await rebuildProjections(admin as never, 'did:web:khamhealth.com:.well-known:did:patient-2');

    expect(report.inserted).toBe(1);
    expect(rxInsertChain.insert).toHaveBeenCalledOnce();
    expect(labInsertChain.insert).not.toHaveBeenCalled();
  });

  it('handles both credential types in one rebuild', async () => {
    // Need a fresh admin that can handle two lab calls and two rx calls.
    const patientChain = makeChain({ data: { id: 'patient-row-3' }, error: null });
    const cc2Obj = {
      select: (_col: string) => cc2Obj,
      eq: (_col: string, _val: unknown) => cc2Obj,
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: [RX_CRED, LAB_CRED], error: null }),
    };
    const credsChain = cc2Obj as unknown as Record<string, unknown>;
    const rxSelectChain = makeChain({ data: null, error: null });
    const rxInsertResult = { insert: vi.fn(() => Promise.resolve({ data: null, error: null })) };
    const labSelectChain = makeChain({ data: null, error: null });
    const labInsertResult = { insert: vi.fn(() => Promise.resolve({ data: null, error: null })) };

    let rxCalls = 0;
    let labCalls = 0;
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'patients') return patientChain;
        if (table === 'credentials') return credsChain;
        if (table === 'prescriptions') { rxCalls++; return rxCalls % 2 === 1 ? rxSelectChain : rxInsertResult; }
        if (table === 'lab_reports') { labCalls++; return labCalls % 2 === 1 ? labSelectChain : labInsertResult; }
        return makeChain({ data: null, error: null });
      }),
    };

    const report = await rebuildProjections(admin as never, 'did:web:khamhealth.com:.well-known:did:patient-3');

    expect(report.checked).toBe(2);
    expect(report.inserted).toBe(2);
    expect(rxInsertResult.insert).toHaveBeenCalledOnce();
    expect(labInsertResult.insert).toHaveBeenCalledOnce();
  });
});
