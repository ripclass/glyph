/**
 * @fileoverview Doctor profile service — reads and preference updates for
 * the signed-in doctor. Writes go through the `own_doctor` self-access RLS
 * policy (`id = auth.uid()`), so a doctor can only ever touch their own
 * row; identity fields (BMDC, clinic) stay operator-managed via
 * `scripts/create-doctor.mjs`.
 *
 * @module lib/services/doctors
 */

import { createClient } from '@/lib/supabase/client';
import type { Doctor } from '@/lib/supabase/types';

/** The self-editable subset of the doctors row */
export interface DoctorPreferences {
  /** UI/record language preference ('bn' | 'en') */
  preferred_language: string;
  /** Clinical note format: 'bd' (CC/O-E/Ix/Rx/Advice, the default) or 'soap' (explicit opt-in, §12) */
  preferred_note_format: string;
}

/**
 * Updates the signed-in doctor's preferences and returns the fresh row.
 *
 * @param doctorId - The doctor's own id (must equal auth.uid() under RLS)
 * @param prefs - Preference fields to persist
 * @throws {Error} If the update fails (including RLS denial)
 */
export async function updateDoctorPreferences(
  doctorId: string,
  prefs: DoctorPreferences
): Promise<Doctor> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('doctors')
    .update(prefs)
    .eq('id', doctorId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update preferences: ${error.message}`);
  }

  return data;
}

/**
 * Fetches the doctor's clinic name for the settings profile card.
 * Readable under the `own_clinic` RLS policy.
 */
export async function getClinicName(clinicId: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('clinics')
    .select('name')
    .eq('id', clinicId)
    .maybeSingle();

  if (error || !data) return null;
  return data.name;
}
