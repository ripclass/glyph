/**
 * @fileoverview Projection maintenance — rebuilding Postgres rows FROM the
 * canonical credential store.
 *
 * Projections are write-once mirrors: rows carrying a credential_id have
 * their clinical facts frozen by DB trigger. So a rebuild NEVER updates a
 * frozen row — it inserts what is missing and reports integrity mismatches
 * (a frozen row disagreeing with its credential is an alarm, not something
 * to silently "fix").
 *
 * @module lib/identity/projections
 */

import type { AdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/types';

interface RebuildReport {
  checked: number;
  inserted: number;
  skippedExisting: number;
  /** credential vc_ids whose projection could not be derived */
  unprojectable: string[];
}

interface CredentialSubjectData {
  data?: Record<string, unknown>;
}

function payloadOf(credentialJson: Json): Record<string, unknown> {
  const vc = credentialJson as unknown as { credentialSubject?: CredentialSubjectData };
  return vc.credentialSubject?.data ?? {};
}

/**
 * Rebuilds prescription projections for a subject DID from active
 * prescription credentials. Insert-missing-only (see module docs).
 *
 * @param admin - Service-role client
 * @param subjectDid - The patient's DID
 * @returns Counts of what was checked/inserted/skipped
 */
export async function rebuildProjections(
  admin: AdminClient,
  subjectDid: string
): Promise<RebuildReport> {
  const report: RebuildReport = {
    checked: 0,
    inserted: 0,
    skippedExisting: 0,
    unprojectable: [],
  };

  const { data: patient } = await admin
    .from('patients')
    .select('id')
    .eq('did', subjectDid)
    .maybeSingle();

  if (!patient) {
    throw new Error(`No patient row holds DID ${subjectDid} — cannot anchor projections`);
  }

  const { data: creds, error } = await admin
    .from('credentials')
    .select('id, vc_id, credential_json, types, issued_at')
    .eq('subject_did', subjectDid)
    .eq('status', 'active');

  if (error) {
    throw new Error(`Failed to load credentials for ${subjectDid}: ${error.message}`);
  }

  for (const cred of creds ?? []) {
    if (!cred.types.includes('PrescriptionCredential')) continue;
    report.checked++;

    const { data: existing } = await admin
      .from('prescriptions')
      .select('id')
      .eq('credential_id', cred.id)
      .maybeSingle();

    if (existing) {
      report.skippedExisting++;
      continue;
    }

    const data = payloadOf(cred.credential_json);
    const medications = data.medications;
    if (!Array.isArray(medications) || medications.length === 0) {
      report.unprojectable.push(cred.vc_id);
      continue;
    }

    const diagnosis = Array.isArray(data.diagnosis)
      ? (data.diagnosis as Array<{ text?: string; icd10?: string }>)
      : [];
    const prescriber = (data.prescriber ?? {}) as { name?: string };
    const visitRef = typeof data.visitRef === 'string' ? data.visitRef : null;
    const encounterDate =
      typeof data.encounterDate === 'string' ? data.encounterDate.slice(0, 10) : null;

    const { error: insErr } = await admin.from('prescriptions').insert({
      patient_id: patient.id,
      visit_id: visitRef,
      source: 'generated',
      medications: medications as Json,
      diagnosis: diagnosis.map((d) => d.text).filter(Boolean).join('; ') || null,
      diagnosis_icd10: diagnosis[0]?.icd10 ?? null,
      investigations_ordered: (data.investigationsOrdered ?? []) as Json,
      advice: Array.isArray(data.advice) ? (data.advice as string[]).join(' ') : null,
      prescribing_doctor_name: prescriber.name ?? null,
      prescription_date: encounterDate,
      credential_id: cred.id,
    });

    if (insErr) {
      report.unprojectable.push(cred.vc_id);
    } else {
      report.inserted++;
    }
  }

  return report;
}
