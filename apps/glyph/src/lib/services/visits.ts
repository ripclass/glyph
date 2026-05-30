/**
 * @fileoverview Visit lifecycle service for the Glyph clinical PWA.
 * Manages the full encounter lifecycle from creation through follow-up,
 * including queue management and briefing card retrieval.
 *
 * Uses the browser-side Supabase client.
 *
 * @module lib/services/visits
 */

import { createClient } from '@/lib/supabase/client';
import type { Visit, VisitStatus, VisitUpdate } from '@/lib/supabase/types';

/** Visit record enriched with related patient, prescription, and lab data */
export interface VisitWithRelations extends Visit {
  patients: {
    id: string;
    name: string;
    phone: string;
    age: number | null;
    gender: string | null;
    blood_group: string | null;
  } | null;
  prescriptions: Array<{
    id: string;
    source: string;
    image_url: string | null;
    extracted_data: Record<string, unknown> | null;
    medications: Record<string, unknown>[] | null;
    created_at: string;
  }>;
  lab_reports: Array<{
    id: string;
    source: string;
    image_url: string | null;
    extracted_data: Record<string, unknown> | null;
    report_type: string | null;
    created_at: string;
  }>;
  consent_records: Array<{
    id: string;
    consent_type: string;
    granted: boolean;
    granted_by: string;
    granted_at: string;
  }>;
}

/**
 * Creates a new visit record and assigns a queue position.
 *
 * @param patientId - The patient UUID
 * @param doctorId - The attending doctor UUID
 * @param clinicId - The clinic UUID
 * @returns The newly created visit record
 * @throws {Error} If creation fails
 *
 * @example
 * ```ts
 * const visit = await createVisit('patient-id', 'doctor-id', 'clinic-id');
 * ```
 */
export async function createVisit(
  patientId: string,
  doctorId: string,
  clinicId: string
): Promise<Visit> {
  const supabase = createClient();

  /** Determine next queue position for today */
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .gte('created_at', todayStart.toISOString());

  const queuePosition = (count ?? 0) + 1;

  const { data, error } = await supabase
    .from('visits')
    .insert({
      patient_id: patientId,
      doctor_id: doctorId,
      clinic_id: clinicId,
      status: 'intake' as VisitStatus,
      queue_position: queuePosition,
    } as never)
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
    .select(`
      *,
      patients (id, name, phone, age, gender, blood_group),
      prescriptions (id, source, image_url, extracted_data, medications, created_at),
      lab_reports (id, source, image_url, extracted_data, report_type, created_at),
      consent_records (id, consent_type, granted, granted_by, granted_at)
    `)
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch visit: ${error.message}`);
  }

  return data as unknown as VisitWithRelations;
}

/**
 * Updates a visit's status in the lifecycle.
 * Automatically sets `started_at` when entering consultation
 * and `completed_at` when completing.
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

  const updateData: VisitUpdate = {
    status,
    updated_at: new Date().toISOString(),
  };

  /** Track lifecycle timestamps */
  if (status === 'in_consultation') {
    updateData.started_at = new Date().toISOString();
  } else if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('visits')
    .update(updateData as never)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update visit status: ${error.message}`);
  }

  return data;
}

/**
 * Fetches today's patient queue for a clinic, ordered by queue position.
 * Includes basic patient info for the queue display.
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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('visits')
    .select(`
      *,
      patients (id, name, phone, age, gender, blood_group),
      prescriptions (id, source, image_url, extracted_data, medications, created_at),
      lab_reports (id, source, image_url, extracted_data, report_type, created_at),
      consent_records (id, consent_type, granted, granted_by, granted_at)
    `)
    .eq('clinic_id', clinicId)
    .gte('created_at', todayStart.toISOString())
    .lte('created_at', todayEnd.toISOString())
    .order('queue_position', { ascending: true });

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
