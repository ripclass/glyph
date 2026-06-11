/**
 * @fileoverview Patient registration + visit creation — the front door of the
 * intake flow. This is the step the original scaffold never built (audit §C):
 * every downstream call (intake-turn, generate-briefing, generate-note) hangs
 * off a `visitId`, and until this service nothing created one.
 *
 * Flow: normalize input → find returning patient by exact phone within the
 * clinic → reuse only on phone AND name match (one phone serves a family in
 * Bangladesh — never merge on phone alone) → otherwise create the patient →
 * create the visit (with attendant details) → return both for the intake
 * store to track.
 *
 * Matching rules are pure and unit-tested in `registration-logic.ts`.
 *
 * @module lib/services/registration
 */

import type { Patient, Visit } from '@/lib/supabase/types';
import { createPatient, getPatientsByPhone } from './patients';
import { createVisit, type AttendantInfo } from './visits';
import {
  findMatchingPatient,
  normalizeBdPhone,
  normalizeName,
} from './registration-logic';

/** What the intake welcome screen captures before the conversation starts */
export interface RegistrationInput {
  /** Clinic the tablet is registered to */
  clinicId: string;
  /** Doctor the patient is queued for */
  doctorId: string;
  /** Patient name as entered (Bangla or Latin) */
  name: string;
  /** Contact phone — often the family's shared number */
  phone?: string;
  /** Age in years, if known */
  age?: number;
  /** Gender per the schema CHECK constraint */
  gender?: 'male' | 'female' | 'other';
  /** Attendant details when someone speaks for the patient */
  attendant?: AttendantInfo;
}

/** Result of registration: the resolved patient and the freshly created visit */
export interface RegistrationResult {
  patient: Patient;
  visit: Visit;
  /** True when an existing patient record was reused (returning patient) */
  isReturningPatient: boolean;
}

/**
 * Registers (or recognizes) a patient and opens a new visit in `intake`
 * status. THE entry point of the clinical flow — everything downstream
 * (intake conversation, briefing, note) references the returned `visit.id`.
 *
 * @param input - Registration data from the intake welcome screen
 * @returns The patient, the new visit, and whether the patient is returning
 * @throws {Error} If the name is empty or any DB operation fails
 *
 * @example
 * ```ts
 * const { patient, visit, isReturningPatient } = await registerAndStartVisit({
 *   clinicId,
 *   doctorId,
 *   name: 'আব্দুল রহমান',
 *   phone: '+880 1711-223344',
 *   attendant: { present: true, relation: 'ছেলে' },
 * });
 * useIntakeStore.getState().startIntake(visit.id, patient.id);
 * ```
 */
export async function registerAndStartVisit(
  input: RegistrationInput
): Promise<RegistrationResult> {
  const name = normalizeName(input.name);
  if (!name) {
    throw new Error('Patient name is required for registration');
  }

  /**
   * Invalid/missing phones skip the returning-patient lookup entirely —
   * we never match on garbage, and we store null rather than junk.
   */
  const phone = input.phone ? normalizeBdPhone(input.phone) : null;

  const candidates = phone
    ? await getPatientsByPhone(input.clinicId, phone)
    : [];
  const existing = findMatchingPatient(candidates, { name });

  const patient =
    existing ??
    (await createPatient({
      clinic_id: input.clinicId,
      name,
      phone,
      age: input.age ?? null,
      gender: input.gender ?? null,
    }));

  const visit = await createVisit(
    patient.id,
    input.doctorId,
    input.clinicId,
    input.attendant
  );

  return { patient, visit, isReturningPatient: existing !== null };
}
