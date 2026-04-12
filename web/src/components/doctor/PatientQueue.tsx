"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";

/** Status of a patient in the queue. */
export type QueueStatus = "waiting" | "in_consultation" | "completed";

/** A single patient entry in the doctor's queue. */
export interface QueuePatient {
  /** Unique visit identifier. */
  visitId: string;
  /** Patient name in Bangla. */
  nameBn: string;
  /** Patient name in English. */
  nameEn: string;
  /** Age in years. */
  age: number;
  /** Gender of the patient. */
  gender: "male" | "female" | "other";
  /** Brief chief complaint snippet. */
  chiefComplaint: string;
  /** Current queue status. */
  status: QueueStatus;
  /** ISO timestamp of when the patient arrived / was queued. */
  arrivedAt: string;
  /** Whether an attendant is present with the patient. */
  hasAttendant: boolean;
}

export interface PatientQueueProps {
  /** The list of patients in today's queue. */
  patients: QueuePatient[];
  /** Currently applied status filter. */
  activeFilter?: QueueStatus | "all";
  className?: string;
}

/** Status badge configuration. */
const STATUS_CONFIG: Record<
  QueueStatus,
  { label: string; variant: "default" | "warning" | "success" | "secondary" }
> = {
  waiting: { label: "Waiting", variant: "warning" },
  in_consultation: { label: "In Consultation", variant: "default" },
  completed: { label: "Completed", variant: "success" },
};

/**
 * Today's patient queue list for the doctor dashboard.
 *
 * Each queue item displays:
 * - Patient name in both Bangla and English
 * - Age and gender
 * - Chief complaint snippet
 * - Color-coded status badge (Waiting/In Consultation/Completed)
 * - Time since arrival
 * - Attendant indicator icon
 *
 * Tapping a patient card navigates to their briefing page.
 * Designed for Supabase Realtime updates (placeholder subscription included).
 *
 * @example
 * ```tsx
 * <PatientQueue patients={todayPatients} activeFilter="waiting" />
 * ```
 */
export function PatientQueue({
  patients,
  activeFilter = "all",
  className,
}: PatientQueueProps) {
  // Supabase Realtime placeholder
  // TODO: Subscribe to realtime queue updates
  // useEffect(() => {
  //   const channel = supabase.channel('queue').on('postgres_changes', ...)
  //   return () => { supabase.removeChannel(channel) }
  // }, [])

  const filteredPatients =
    activeFilter === "all"
      ? patients
      : patients.filter((p) => p.status === activeFilter);

  if (filteredPatients.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-16 text-center",
          className
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-3 text-slate-300"
          aria-hidden="true"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <p className="text-sm text-slate-400">No patients in queue</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)} role="list" aria-label="Patient queue">
      {filteredPatients.map((patient) => (
        <PatientQueueItem key={patient.visitId} patient={patient} />
      ))}
    </div>
  );
}

/**
 * Individual patient queue card. Links to the briefing page.
 */
function PatientQueueItem({ patient }: { patient: QueuePatient }) {
  const statusConfig = STATUS_CONFIG[patient.status];

  return (
    <Link
      href={`/doctor/briefing/${patient.visitId}`}
      className="group block rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-glyph-300 hover:shadow-md"
      role="listitem"
      aria-label={`${patient.nameEn}, ${patient.age} year old ${patient.gender}, ${statusConfig.label}`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Patient info */}
        <div className="min-w-0 flex-1">
          {/* Name */}
          <div className="flex items-baseline gap-2">
            <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-glyph-700">
              {patient.nameBn}
            </p>
            <p className="hidden truncate text-xs text-slate-400 sm:block">
              {patient.nameEn}
            </p>
          </div>

          {/* Age / Gender */}
          <p className="mt-0.5 text-xs text-slate-500">
            {patient.age}y / {patient.gender === "male" ? "M" : patient.gender === "female" ? "F" : "O"}
            {patient.hasAttendant && (
              <span className="ml-2 inline-flex items-center gap-0.5 text-slate-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                +attendant
              </span>
            )}
          </p>

          {/* Chief complaint */}
          <p className="mt-1 line-clamp-1 text-xs text-slate-600">
            {patient.chiefComplaint}
          </p>
        </div>

        {/* Right: Status + time */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          <span className="text-[10px] text-slate-400">
            {getTimeSince(patient.arrivedAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * Computes a human-readable "time since" string from an ISO timestamp.
 */
function getTimeSince(isoTimestamp: string): string {
  try {
    const now = Date.now();
    const then = new Date(isoTimestamp).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60_000);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.floor(diffHrs / 24)}d ago`;
  } catch {
    return "";
  }
}
