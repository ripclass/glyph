/**
 * @fileoverview Patient CRUD service for the Glyph clinical PWA.
 * Provides typed data access for patient records including
 * search, creation, updates, and longitudinal history retrieval.
 *
 * Uses the browser-side Supabase client.
 *
 * @module lib/services/patients
 */

import { createClient } from '@/lib/supabase/client';
import type {
  Patient,
  PatientInsert,
  PatientUpdate,
  Visit,
  Prescription,
  LabReport,
} from '@/lib/supabase/types';

/** Full patient history including visits, prescriptions, and lab reports */
export interface PatientHistory {
  patient: Patient;
  visits: Visit[];
  prescriptions: Prescription[];
  labReports: LabReport[];
}

/**
 * Fetches a single patient by ID.
 *
 * @param id - Patient UUID
 * @returns The patient record
 * @throws {Error} If the patient is not found or the query fails
 *
 * @example
 * ```ts
 * const patient = await getPatient('uuid-here');
 * ```
 */
export async function getPatient(id: string): Promise<Patient> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch patient: ${error.message}`);
  }

  return data;
}

/**
 * Searches patients within a clinic by name or phone number.
 * Uses case-insensitive partial matching on both fields.
 *
 * @param clinicId - The clinic to search within
 * @param query - Search string (name or phone fragment)
 * @returns Array of matching patients, ordered by name
 *
 * @example
 * ```ts
 * const results = await searchPatients('clinic-id', 'রহমান');
 * const byPhone = await searchPatients('clinic-id', '01711');
 * ```
 */
export async function searchPatients(
  clinicId: string,
  query: string
): Promise<Patient[]> {
  const supabase = createClient();
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('clinic_id', clinicId)
    .or(`name.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`)
    .order('name', { ascending: true })
    .limit(20);

  if (error) {
    throw new Error(`Patient search failed: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Creates a new patient record.
 *
 * @param data - Patient data to insert (id is auto-generated if omitted)
 * @returns The newly created patient record
 * @throws {Error} If insertion fails (e.g. duplicate phone in same clinic)
 *
 * @example
 * ```ts
 * const patient = await createPatient({
 *   clinic_id: 'clinic-uuid',
 *   name: 'আব্দুল রহমান',
 *   phone: '01711223344',
 *   age: 45,
 *   gender: 'male',
 * });
 * ```
 */
export async function createPatient(data: PatientInsert): Promise<Patient> {
  const supabase = createClient();
  const { data: patient, error } = await supabase
    .from('patients')
    .insert(data as never)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create patient: ${error.message}`);
  }

  return patient;
}

/**
 * Updates an existing patient record.
 *
 * @param id - Patient UUID to update
 * @param data - Partial patient data to merge
 * @returns The updated patient record
 * @throws {Error} If the update fails
 *
 * @example
 * ```ts
 * const updated = await updatePatient('uuid', { phone: '01899887766' });
 * ```
 */
export async function updatePatient(
  id: string,
  data: PatientUpdate
): Promise<Patient> {
  const supabase = createClient();
  const { data: patient, error } = await supabase
    .from('patients')
    .update({ ...data, updated_at: new Date().toISOString() } as never)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update patient: ${error.message}`);
  }

  return patient;
}

/**
 * Fetches the full longitudinal history for a patient, including
 * all visits, prescriptions, and lab reports ordered by date.
 *
 * @param id - Patient UUID
 * @returns Complete patient history
 * @throws {Error} If the patient is not found or queries fail
 *
 * @example
 * ```ts
 * const history = await getPatientHistory('patient-uuid');
 * console.log(`${history.visits.length} total visits`);
 * ```
 */
export async function getPatientHistory(id: string): Promise<PatientHistory> {
  const supabase = createClient();

  /** Run all three queries in parallel for faster loading */
  const [patientResult, visitsResult, prescriptionsResult, labReportsResult] =
    await Promise.all([
      supabase.from('patients').select('*').eq('id', id).single(),
      supabase
        .from('visits')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('lab_reports')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false }),
    ]);

  if (patientResult.error) {
    throw new Error(`Failed to fetch patient: ${patientResult.error.message}`);
  }

  if (visitsResult.error) {
    throw new Error(`Failed to fetch visits: ${visitsResult.error.message}`);
  }

  if (prescriptionsResult.error) {
    throw new Error(`Failed to fetch prescriptions: ${prescriptionsResult.error.message}`);
  }

  if (labReportsResult.error) {
    throw new Error(`Failed to fetch lab reports: ${labReportsResult.error.message}`);
  }

  return {
    patient: patientResult.data,
    visits: visitsResult.data ?? [],
    prescriptions: prescriptionsResult.data ?? [],
    labReports: labReportsResult.data ?? [],
  };
}
