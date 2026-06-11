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
import { buildPatientSearchTerm } from './patients-logic';
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

/** Patient row with its most recent visit date embedded (for list screens) */
export type PatientWithLastVisit = Patient & {
  visits: { visit_date: string | null }[];
};

/** Shared embed: each patient row carries only its latest visit date */
const WITH_LAST_VISIT = '*, visits(visit_date)';

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
 * Searches patients within a clinic by name (Bangla or Latin) or phone.
 *
 * The input is interpreted by `buildPatientSearchTerm`: digits — however
 * typed (+880, Bangla numerals, dashes) — search the phone column;
 * everything else matches `name` and `name_bn` case-insensitively. Each
 * result embeds its most recent visit date.
 *
 * @param clinicId - The clinic to search within
 * @param query - Search string (name or phone fragment)
 * @returns Matching patients ordered by name, with last visit embedded
 *
 * @example
 * ```ts
 * const results = await searchPatients('clinic-id', 'রহমান');
 * const byPhone = await searchPatients('clinic-id', '+880 1711-223344');
 * ```
 */
export async function searchPatients(
  clinicId: string,
  query: string
): Promise<PatientWithLastVisit[]> {
  const term = buildPatientSearchTerm(query);
  if (term.kind === 'empty') {
    return [];
  }

  const supabase = createClient();
  const filter =
    term.kind === 'phone'
      ? `phone.ilike.%${term.value}%`
      : `name.ilike.%${term.value}%,name_bn.ilike.%${term.value}%`;

  const { data, error } = await supabase
    .from('patients')
    .select(WITH_LAST_VISIT)
    .eq('clinic_id', clinicId)
    .or(filter)
    .order('name', { ascending: true })
    .limit(20)
    .order('visit_date', { referencedTable: 'visits', ascending: false })
    .limit(1, { referencedTable: 'visits' });

  if (error) {
    throw new Error(`Patient search failed: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Lists the clinic's most recently active patients — the default content
 * of the Patients screen before the doctor types a search. Each row
 * embeds its most recent visit date.
 *
 * @param clinicId - The clinic to list within
 * @returns Up to 30 patients by recent activity, with last visit embedded
 */
export async function listRecentPatients(
  clinicId: string
): Promise<PatientWithLastVisit[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('patients')
    .select(WITH_LAST_VISIT)
    .eq('clinic_id', clinicId)
    .order('updated_at', { ascending: false })
    .limit(30)
    .order('visit_date', { referencedTable: 'visits', ascending: false })
    .limit(1, { referencedTable: 'visits' });

  if (error) {
    throw new Error(`Failed to list patients: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Fetches all patients in a clinic registered under an exact phone number.
 * Used by registration to find returning patients. May return several rows —
 * in Bangladesh one phone often serves a whole family, so callers must apply
 * a name match before reusing a record (see `registration-logic.ts`).
 *
 * @param clinicId - The clinic to search within
 * @param phone - Canonical local phone (01XXXXXXXXX — normalize first)
 * @returns All patients registered under this phone in the clinic
 *
 * @example
 * ```ts
 * const family = await getPatientsByPhone('clinic-id', '01711223344');
 * ```
 */
export async function getPatientsByPhone(
  clinicId: string,
  phone: string
): Promise<Patient[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('phone', phone);

  if (error) {
    throw new Error(`Phone lookup failed: ${error.message}`);
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
    .insert(data)
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
  /** `updated_at` is maintained by the `update_timestamp()` DB trigger */
  const supabase = createClient();
  const { data: patient, error } = await supabase
    .from('patients')
    .update(data)
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
