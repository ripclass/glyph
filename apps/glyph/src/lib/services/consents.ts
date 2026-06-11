/**
 * @fileoverview PDPO consent recording for the intake flow.
 *
 * Consent must exist BEFORE the data practice it covers: photographing
 * documents (image_capture), storing them (data_storage), and sending
 * them to external AI processors (ai_processing — the Tier B egress gate
 * checks for a live row of this type). The ConsentPrompt UI calls this at
 * grant time; `intake-start` later creates only the types still missing,
 * so a visit never accumulates duplicate active rows — withdrawal stays
 * a single-row operation.
 *
 * Writes go through the doctor-session client under the clinic-scoped
 * RLS policy from migration 001 (same pattern as registration).
 *
 * @module lib/services/consents
 */

import { createClient } from '@/lib/supabase/client';

/** Consent types the intake flow relies on, in PDPO terms */
const INTAKE_CONSENT_TYPES = [
  'image_capture',
  'data_storage',
  'ai_processing',
  'recording',
] as const;

/** Who granted the consent — attendants speak for patients routinely (§9) */
export type ConsentGrantor = 'patient' | 'attendant' | 'guardian';

export interface RecordConsentsInput {
  patientId: string;
  visitId: string;
  grantedBy: ConsentGrantor;
}

/**
 * Records the intake consent set for a visit. Idempotent: types that
 * already have an active (granted, not withdrawn) row for this visit are
 * skipped.
 *
 * @throws {Error} If reading or writing consent rows fails — callers must
 *   treat this as "no consent" and not proceed (fail closed).
 */
export async function recordIntakeConsents(
  input: RecordConsentsInput
): Promise<void> {
  const supabase = createClient();

  const { data: existing, error: readError } = await supabase
    .from('consent_records')
    .select('consent_type')
    .eq('visit_id', input.visitId)
    .eq('granted', true)
    .is('withdrawn_at', null);

  if (readError) {
    throw new Error(`Failed to read existing consents: ${readError.message}`);
  }

  const active = new Set((existing ?? []).map((row) => row.consent_type));
  const rows = INTAKE_CONSENT_TYPES.filter((type) => !active.has(type)).map(
    (type) => ({
      patient_id: input.patientId,
      visit_id: input.visitId,
      consent_type: type,
      granted: true,
      granted_by: input.grantedBy,
      device_info:
        typeof navigator !== 'undefined'
          ? navigator.userAgent.slice(0, 255)
          : null,
    })
  );

  if (rows.length === 0) return;

  const { error: insertError } = await supabase
    .from('consent_records')
    .insert(rows);

  if (insertError) {
    throw new Error(`Failed to record consent: ${insertError.message}`);
  }
}
