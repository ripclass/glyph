"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import {
  PatientQueue,
  type QueuePatient,
  type QueueStatus,
} from "@/components/doctor/PatientQueue";

/** Filter tab option. */
type FilterTab = "all" | QueueStatus;

/** Tab configuration. */
const FILTER_TABS: Array<{ value: FilterTab; label: string }> = [
  { value: "all", label: "All" },
  { value: "waiting", label: "Waiting" },
  { value: "in_consultation", label: "In Consultation" },
  { value: "completed", label: "Completed" },
];

/**
 * Doctor dashboard -- today's patient queue.
 *
 * Displays:
 * - Header with current date, clinic name, and patient count
 * - Status filter tabs (All, Waiting, In Consultation, Completed)
 * - PatientQueue list with real-time updates via Supabase (placeholder)
 *
 * This is the landing page for the doctor after login. It shows
 * a quick overview of today's workload and allows rapid navigation
 * to any patient's briefing.
 */
export default function DoctorDashboardPage() {
  const [activeFilter, setActiveFilter] = React.useState<FilterTab>("all");

  // Placeholder: Supabase Realtime subscription for queue updates
  // TODO: Replace with real Supabase subscription
  // React.useEffect(() => {
  //   const channel = supabase
  //     .channel("doctor_queue")
  //     .on("postgres_changes", { event: "*", schema: "public", table: "visits" }, (payload) => {
  //       // Update patients state
  //     })
  //     .subscribe();
  //   return () => { supabase.removeChannel(channel); };
  // }, []);

  // Placeholder patient data
  const patients: QueuePatient[] = MOCK_PATIENTS;

  const filteredCount =
    activeFilter === "all"
      ? patients.length
      : patients.filter((p) => p.status === activeFilter).length;

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
            <h1 className="text-xl font-bold text-slate-800">
              Patient Queue
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">{todayString}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-glyph-700">
              {patients.length}
            </p>
            <p className="text-xs text-slate-400">patients today</p>
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Greenlife Medical Centre, Dhaka
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
      <PatientQueue patients={patients} activeFilter={activeFilter} />

      {/* Footer note */}
      <p className="mt-6 text-center text-[10px] text-slate-300">
        Queue updates automatically via Supabase Realtime
      </p>
    </div>
  );
}

/* ── Mock data for development ── */

const MOCK_PATIENTS: QueuePatient[] = [
  {
    visitId: "visit_001",
    nameBn: "\u09b0\u09b9\u09bf\u09ae\u09be \u09ac\u09c7\u0997\u09ae",
    nameEn: "Rahima Begum",
    age: 55,
    gender: "female",
    chiefComplaint: "Chest pain for 2 days, worse on exertion",
    status: "waiting",
    arrivedAt: new Date(Date.now() - 45 * 60_000).toISOString(),
    hasAttendant: true,
  },
  {
    visitId: "visit_002",
    nameBn: "\u0995\u09be\u09ae\u09b0\u09c1\u09b2 \u0987\u09b8\u09b2\u09be\u09ae",
    nameEn: "Kamrul Islam",
    age: 42,
    gender: "male",
    chiefComplaint: "Uncontrolled diabetes, HbA1c follow-up",
    status: "in_consultation",
    arrivedAt: new Date(Date.now() - 90 * 60_000).toISOString(),
    hasAttendant: false,
  },
  {
    visitId: "visit_003",
    nameBn: "\u09a8\u09be\u09b8\u09b0\u09c0\u09a8 \u0986\u0995\u09cd\u09a4\u09be\u09b0",
    nameEn: "Nasreen Akhtar",
    age: 38,
    gender: "female",
    chiefComplaint: "Persistent cough for 3 weeks",
    status: "waiting",
    arrivedAt: new Date(Date.now() - 30 * 60_000).toISOString(),
    hasAttendant: false,
  },
  {
    visitId: "visit_004",
    nameBn: "\u09ae\u09cb\u09b9\u09be\u09ae\u09cd\u09ae\u09a6 \u0986\u09b2\u09c0",
    nameEn: "Mohammad Ali",
    age: 67,
    gender: "male",
    chiefComplaint: "Routine follow-up, hypertension + CKD",
    status: "completed",
    arrivedAt: new Date(Date.now() - 180 * 60_000).toISOString(),
    hasAttendant: true,
  },
  {
    visitId: "visit_005",
    nameBn: "\u09ab\u09be\u09a4\u09c7\u09ae\u09be \u0996\u09be\u09a8\u09ae",
    nameEn: "Fatema Khanam",
    age: 29,
    gender: "female",
    chiefComplaint: "Severe headache with vomiting since yesterday",
    status: "waiting",
    arrivedAt: new Date(Date.now() - 15 * 60_000).toISOString(),
    hasAttendant: true,
  },
];
