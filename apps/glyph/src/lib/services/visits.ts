/**
 * @fileoverview Visit lifecycle service for the Glyph clinical PWA.
 * Manages the full encounter lifecycle from creation through follow-up,
 * including queue retrieval and briefing card access.
 *
 * Column names mirror `supabase/migrations/001_initial_schema.sql` exactly.
 * There is no queue_position column — today's queue is arrival order
 * (`created_at`); `visit_number` is a per-patient counter set by a DB trigger.
 *
 * Uses the browser-side Supabase client.
 *
 * @module lib/services/visits
 */

import { createClient } from '@/lib/supabase/client';
import type { Json, Visit, VisitStatus, VisitUpdate } from '@/lib/supabase/types';

/** Visit record enriched with related patient, prescription, and lab data */
export interface VisitWithRelations extends Visit {
  patients: {
    id: string;
    name: string;
    name_bn: string | null;
    phone: string | null;
    age: number | null;
    gender: string | null;
    blood_group: string | null;
  } | null;
  prescriptions: Array<{
    id: string;
    source: string;
    image_path: string | null;
    medications: Json | null;
    extraction_confidence: number | null;
    created_at: string | null;
  }>;
  lab_reports: Array<{
    id: string;
    source: string;
    image_path: string | null;
    test_category: string | null;
    results: Json | null;
    created_at: string | null;
  }>;
  consent_records: Array<{
    id: string;
    consent_type: string;
    granted: boolean;
    granted_by: string;
    granted_at: string | null;
  }>;
}

/** Attendant details recorded on the visit at registration time */
export interface AttendantInfo {
  /** Whether an attendant (family member) is speaking for the patient */
  present: boolean;
  /** Attendant's name, if given */
  name?: string | null;
  /** Relationship to the patient (e.g. "spouse", "ছেলে") */
  relation?: string | null;
}

/** Nested relation selection shared by getVisit and getTodayQueue */
const VISIT_RELATIONS_SELECT = `
  *,
  patients (id, name, name_bn, phone, age, gender, blood_group),
  prescriptions (id, source, image_path, medications, extraction_confidence, created_at),
  lab_reports (id, source, image_path, test_category, results, created_at),
  consent_records (id, consent_type, granted, granted_by, granted_at)
`;

/**
 * Creates a new visit record in `intake` status.
 * `visit_number` is assigned by the `set_visit_number()` DB trigger;
 * `visit_date` defaults to CURRENT_DATE server-side.
 *
 * @param patientId - The patient UUID
 * @param doctorId - The attending doctor UUID
 * @param clinicId - The clinic UUID
 * @param attendant - Optional attendant details captured at registration
 * @returns The newly created visit record
 * @throws {Error} If creation fails
 *
 * @example
 * ```ts
 * const visit = await createVisit('patient-id', 'doctor-id', 'clinic-id', {
 *   present: true,
 *   relation: 'spouse',
 * });
 * ```
 */
export async function createVisit(
  patientId: string,
  doctorId: string,
  clinicId: string,
  attendant?: AttendantInfo
): Promise<Visit> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('visits')
    .insert({
      patient_id: patientId,
      doctor_id: doctorId,
      clinic_id: clinicId,
      status: 'intake' as VisitStatus,
      attendant_present: attendant?.present ?? false,
      attendant_name: attendant?.name ?? null,
      attendant_relation: attendant?.relation ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create visit: ${error.message}`);
  }

  return data;
}

/**
 * Fetches a single visit with all related data (patient, prescriptions,
 * lab reports, and consent records) via Supabase joins.
 *
 * @param id - Visit UUID
 * @returns The visit with nested relations
 * @throws {Error} If the visit is not found
 *
 * @example
 * ```ts
 * const visit = await getVisit('visit-uuid');
 * console.log(visit.patients?.name);
 * ```
 */
export async function getVisit(id: string): Promise<VisitWithRelations> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('visits')
    .select(VISIT_RELATIONS_SELECT)
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch visit: ${error.message}`);
  }

  return data as unknown as VisitWithRelations;
}

/**
 * Updates a visit's status in the lifecycle.
 * Sets `consultation_started_at` when entering consultation and
 * `consultation_ended_at` when completing. (`updated_at` is maintained
 * by the `update_timestamp()` DB trigger.)
 *
 * @param id - Visit UUID
 * @param status - New visit status
 * @returns The updated visit record
 * @throws {Error} If the update fails
 *
 * @example
 * ```ts
 * await updateVisitStatus('visit-id', 'in_consultation');
 * ```
 */
export async function updateVisitStatus(
  id: string,
  status: VisitStatus
): Promise<Visit> {
  const supabase = createClient();

  const updateData: VisitUpdate = { status };

  /** Track consultation lifecycle timestamps */
  if (status === 'in_consultation') {
    updateData.consultation_started_at = new Date().toISOString();
  } else if (status === 'completed') {
    updateData.consultation_ended_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('visits')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update visit status: ${error.message}`);
  }

  return data;
}

/**
 * Fetches today's patient queue for a clinic in arrival order (created_at).
 * Filters on `visit_date` (DATE column, server default CURRENT_DATE), which
 * is covered by the `idx_visits_clinic_date` index.
 *
 * @param clinicId - The clinic UUID
 * @returns Array of today's visits with patient names
 *
 * @example
 * ```ts
 * const queue = await getTodayQueue('clinic-id');
 * queue.forEach((v) => console.log(v.patients?.name, v.status));
 * ```
 */
export async function getTodayQueue(
  clinicId: string
): Promise<VisitWithRelations[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('visits')
    .select(VISIT_RELATIONS_SELECT)
    .eq('clinic_id', clinicId)
    .eq('visit_date', localDateISO())
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch today's queue: ${error.message}`);
  }

  return (data ?? []) as unknown as VisitWithRelations[];
}

/**
 * Fetches a visit with its briefing card data.
 * The briefing card is a JSON blob stored on the visit record containing
 * a structured summary for the doctor.
 *
 * @param id - Visit UUID
 * @returns The visit with briefing card and patient info
 * @throws {Error} If the visit is not found
 *
 * @example
 * ```ts
 * const visit = await getVisitWithBriefing('visit-id');
 * if (visit.briefing_card) {
 *   renderBriefing(visit.briefing_card);
 * }
 * ```
 */
export async function getVisitWithBriefing(id: string): Promise<VisitWithRelations> {
  return getVisit(id);
}

/**
 * Today's date as YYYY-MM-DD in the device's local timezone (Asia/Dhaka in
 * production). Matches Postgres CURRENT_DATE as long as the DB runs in the
 * same timezone — revisit if the DB is hosted in UTC.
 */
function localDateISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
