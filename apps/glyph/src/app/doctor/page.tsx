"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import {
  PatientQueue,
  type QueuePatient,
  type QueueStatus,
} from "@/components/doctor/PatientQueue";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useRealtimeQueue } from "@/lib/hooks/useRealtimeQueue";
import type { VisitWithRelations } from "@/lib/services/visits";

/** Filter tab option. */
type FilterTab = "all" | QueueStatus;

/** Tab configuration. */
const FILTER_TABS: Array<{ value: FilterTab; label: string }> = [
  { value: "all", label: "All" },
  { value: "waiting", label: "Waiting" },
  { value: "in_consultation", label: "In Consultation" },
  { value: "completed", label: "Completed" },
];

/** Map a visit lifecycle status onto the queue's three display buckets. */
function toQueueStatus(status: string | null): QueueStatus {
  switch (status) {
    case "in_consultation":
    case "note_review":
      return "in_consultation";
    case "completed":
    case "followup_sent":
      return "completed";
    default:
      return "waiting";
  }
}

/** Map a fully-joined visit row to the queue display model. */
function toQueuePatient(v: VisitWithRelations): QueuePatient {
  const summary = (v.intake_summary ?? {}) as { chiefComplaint?: string };
  const gender = v.patients?.gender;
  return {
    visitId: v.id,
    nameBn: v.patients?.name_bn ?? v.patients?.name ?? "—",
    nameEn: v.patients?.name ?? "—",
    age: v.patients?.age ?? 0,
    gender: gender === "male" || gender === "female" ? gender : "other",
    chiefComplaint:
      summary.chiefComplaint ??
      (v.status === "intake" ? "Intake in progress…" : "Awaiting intake summary"),
    status: toQueueStatus(v.status),
    arrivedAt: v.created_at ?? new Date().toISOString(),
    hasAttendant: v.attendant_present ?? false,
  };
}

/**
 * Doctor dashboard — today's patient queue, LIVE.
 *
 * Backed by Supabase Realtime on the visits table: a patient finishing
 * registration on the intake tablet appears here without a refresh.
 */
export default function DoctorDashboardPage() {
  const doctor = useAuthStore((s) => s.doctor);
  const { queue, isConnected } = useRealtimeQueue(doctor?.clinic_id ?? "");
  const [activeFilter, setActiveFilter] = React.useState<FilterTab>("all");

  const patients = React.useMemo(() => queue.map(toQueuePatient), [queue]);

  const todayString = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Patient Queue</h1>
            <p className="mt-0.5 text-sm text-slate-500">{todayString}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-glyph-700">{patients.length}</p>
            <p className="text-xs text-slate-400">patients today</p>
          </div>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
          <span
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              isConnected ? "bg-glyph-500" : "bg-slate-300"
            )}
          />
          {isConnected ? "Live" : "Connecting…"}
        </p>
      </header>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.value === "all"
              ? patients.length
              : patients.filter((p) => p.status === tab.value).length;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveFilter(tab.value)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition",
                activeFilter === tab.value
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
              aria-pressed={activeFilter === tab.value}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px]",
                  activeFilter === tab.value
                    ? "bg-glyph-100 text-glyph-700"
                    : "bg-slate-200 text-slate-500"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Patient queue */}
      {patients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-500">No patients yet today</p>
          <p className="mt-1 text-xs text-slate-400">
            New intake registrations appear here automatically
          </p>
        </div>
      ) : (
        <PatientQueue patients={patients} activeFilter={activeFilter} />
      )}
    </div>
  );
}
