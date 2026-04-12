/**
 * @fileoverview React hook for fetching a patient's full longitudinal history.
 * Loads patient demographics, all visits, prescriptions, and lab reports.
 *
 * @module lib/hooks/usePatientHistory
 */

'use client';

import { useState, useEffect } from 'react';
import { getPatientHistory } from '@/lib/services/patients';
import type { Patient, Visit, Prescription, LabReport } from '@/lib/supabase/types';

/** Return type of the `usePatientHistory` hook */
export interface UsePatientHistoryReturn {
  /** The patient record, or null while loading */
  patient: Patient | null;
  /** All visits for this patient, newest first */
  visits: Visit[];
  /** All prescriptions for this patient */
  prescriptions: Prescription[];
  /** All lab reports for this patient */
  labReports: LabReport[];
  /** Whether data is currently being loaded */
  isLoading: boolean;
  /** Error message if data fetching failed */
  error: string | null;
}

/**
 * Hook that fetches the complete longitudinal history for a patient.
 * Automatically loads data when the `patientId` changes.
 *
 * @param patientId - The patient UUID to fetch history for
 * @returns Patient data, related records, and loading state
 *
 * @example
 * ```tsx
 * function PatientProfile({ patientId }: { patientId: string }) {
 *   const { patient, visits, isLoading, error } = usePatientHistory(patientId);
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorMessage message={error} />;
 *   if (!patient) return null;
 *
 *   return (
 *     <div>
 *       <h1>{patient.name}</h1>
 *       <p>{visits.length} previous visits</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePatientHistory(patientId: string): UsePatientHistoryReturn {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchHistory() {
      setIsLoading(true);
      setError(null);

      try {
        const history = await getPatientHistory(patientId);

        if (cancelled) return;

        setPatient(history.patient);
        setVisits(history.visits);
        setPrescriptions(history.prescriptions);
        setLabReports(history.labReports);
      } catch (err) {
        if (cancelled) return;

        const message =
          err instanceof Error ? err.message : 'Failed to load patient history';
        setError(message);
        setPatient(null);
        setVisits([]);
        setPrescriptions([]);
        setLabReports([]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchHistory();

    /** Cleanup to prevent state updates on unmounted component */
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  return {
    patient,
    visits,
    prescriptions,
    labReports,
    isLoading,
    error,
  };
}
