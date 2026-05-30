"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import {
  PatientTimeline,
  type TimelineVisit,
} from "@/components/doctor/PatientTimeline";
import {
  MedicationTimeline,
  type MedicationEntry,
} from "@/components/doctor/MedicationTimeline";
import {
  LabTrendChart,
  type LabTrend,
} from "@/components/doctor/LabTrendChart";

/** Tab options for the patient history page. */
type HistoryTab = "visits" | "medications" | "labs" | "prescriptions";

const TABS: Array<{ value: HistoryTab; label: string }> = [
  { value: "visits", label: "Visit History" },
  { value: "medications", label: "Medications" },
  { value: "labs", label: "Lab Trends" },
  { value: "prescriptions", label: "Prescriptions" },
];

/**
 * Longitudinal patient history page.
 *
 * Displays:
 * - Patient demographics header (name, age, gender, chronic conditions)
 * - Tab navigation between different history views
 * - PatientTimeline (all visits chronologically)
 * - MedicationTimeline (visual Gantt-chart style medication history)
 * - LabTrendChart (lab value trends over time as SVG line charts)
 * - List of all prescriptions and lab reports
 *
 * This page provides the doctor with a comprehensive longitudinal
 * view of the patient's medical history across all visits.
 */
export default function PatientHistoryPage() {
  const params = useParams<{ patientId: string }>();
  const router = useRouter();
  const patientId = params.patientId;

  const [activeTab, setActiveTab] = React.useState<HistoryTab>("visits");

  // Placeholder patient demographics
  const patient = MOCK_PATIENT;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Patient demographics header */}
      <header className="mb-6">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Go back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </button>

          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-bold text-slate-800">
                {patient.nameEn}
              </h1>
              <span className="text-sm text-slate-400">{patient.nameBn}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>
                {patient.age}y / {patient.gender}
              </span>
              <span className="text-slate-300">|</span>
              <span>ID: {patientId}</span>
              <span className="text-slate-300">|</span>
              <span>{patient.totalVisits} visits</span>
            </div>

            {/* Chronic conditions */}
            <div className="mt-2 flex flex-wrap gap-1">
              {patient.conditions.map((condition, i) => (
                <Badge key={i} variant="outline">
                  {condition}
                </Badge>
              ))}
            </div>

            {/* Allergies */}
            {patient.allergies.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-xs font-medium text-amber-600">
                  Allergies:
                </span>
                {patient.allergies.map((allergy, i) => (
                  <Badge key={i} variant="warning">
                    {allergy}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition",
              activeTab === tab.value
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
            aria-pressed={activeTab === tab.value}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === "visits" && (
          <PatientTimeline visits={MOCK_VISITS} />
        )}

        {activeTab === "medications" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">
                Medication Timeline
              </h2>
              <MedicationTimeline medications={MOCK_MEDICATIONS} />
            </div>

            {/* Current medications list */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">
                Current Medications
              </h2>
              <ul className="space-y-2">
                {MOCK_MEDICATIONS.filter((m) => m.isCurrent).map((med) => (
                  <li
                    key={med.id}
                    className="flex items-center justify-between rounded-lg bg-glyph-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {med.name}
                      </p>
                      <p className="text-xs text-slate-500">{med.dosage}</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      Since {formatShortDate(med.startDate)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === "labs" && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">
              Lab Value Trends
            </h2>
            <LabTrendChart trends={MOCK_LAB_TRENDS} />
          </div>
        )}

        {activeTab === "prescriptions" && (
          <div className="space-y-3">
            {MOCK_PRESCRIPTIONS.map((rx, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <time className="text-xs font-medium text-slate-500">
                    {formatShortDate(rx.date)}
                  </time>
                  <span className="text-[10px] text-slate-400">
                    {rx.doctorName}
                  </span>
                </div>
                <p className="mb-2 text-sm font-medium text-slate-700">
                  {rx.chiefComplaint}
                </p>
                <ul className="space-y-1">
                  {rx.items.map((item, j) => (
                    <li
                      key={j}
                      className="rounded bg-slate-50 px-2 py-1 text-xs text-slate-600"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ── */

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/* ── Mock data ── */

const MOCK_PATIENT = {
  nameEn: "Rahima Begum",
  nameBn: "\u09b0\u09b9\u09bf\u09ae\u09be \u09ac\u09c7\u0997\u09ae",
  age: 55,
  gender: "Female",
  totalVisits: 7,
  conditions: ["T2DM", "Hypertension", "Hyperlipidemia"],
  allergies: ["Penicillin"],
};

const MOCK_VISITS: TimelineVisit[] = [
  {
    visitId: "visit_007",
    date: new Date().toISOString(),
    chiefComplaint: "Chest pain for 2 days, exertional",
    keyFindings: [
      "BP 150/90, HR 88",
      "ECG: NSR, no ST changes",
      "HbA1c 8.2% (uncontrolled)",
      "TC 245 (new finding)",
    ],
    prescriptions: [
      "Aspirin 75mg OD",
      "Atorvastatin 20mg ON",
      "SL NTG 0.5mg SOS",
    ],
    doctorName: "Dr. Karim",
  },
  {
    visitId: "visit_006",
    date: new Date(Date.now() - 30 * 86400000).toISOString(),
    chiefComplaint: "Diabetes follow-up",
    keyFindings: [
      "HbA1c 8.2% (up from 7.5%)",
      "FBS 165 mg/dL",
      "BP 140/85",
    ],
    prescriptions: [
      "Metformin 500mg continued",
      "Amlodipine 5mg continued",
    ],
    doctorName: "Dr. Karim",
  },
  {
    visitId: "visit_005",
    date: new Date(Date.now() - 90 * 86400000).toISOString(),
    chiefComplaint: "Routine check-up, HTN follow-up",
    keyFindings: ["BP 135/82", "HbA1c 7.5%", "Creatinine 0.9"],
    prescriptions: [
      "Metformin 500mg continued",
      "Amlodipine 5mg continued",
      "Omeprazole 20mg OD",
    ],
    doctorName: "Dr. Karim",
  },
  {
    visitId: "visit_004",
    date: new Date(Date.now() - 180 * 86400000).toISOString(),
    chiefComplaint: "UTI symptoms",
    keyFindings: [
      "Dysuria for 3 days",
      "Urine R/E: pus cells 15-20/HPF",
      "Culture: E. coli",
    ],
    prescriptions: [
      "Nitrofurantoin 100mg BD x 5 days",
      "Increased water intake advised",
    ],
    doctorName: "Dr. Rahman",
  },
];

const MOCK_MEDICATIONS: MedicationEntry[] = [
  {
    id: "med_1",
    name: "Metformin",
    startDate: new Date(Date.now() - 365 * 3 * 86400000).toISOString(),
    endDate: null,
    dosage: "500mg BD",
    isCurrent: true,
    dosageChanges: [
      {
        date: new Date(Date.now() - 365 * 86400000).toISOString(),
        fromDosage: "500mg OD",
        toDosage: "500mg BD",
      },
    ],
  },
  {
    id: "med_2",
    name: "Amlodipine",
    startDate: new Date(Date.now() - 365 * 2 * 86400000).toISOString(),
    endDate: null,
    dosage: "5mg ON",
    isCurrent: true,
  },
  {
    id: "med_3",
    name: "Omeprazole",
    startDate: new Date(Date.now() - 90 * 86400000).toISOString(),
    endDate: new Date().toISOString(),
    dosage: "20mg OD",
    isCurrent: false,
  },
  {
    id: "med_4",
    name: "Aspirin",
    startDate: new Date().toISOString(),
    endDate: null,
    dosage: "75mg OD",
    isCurrent: true,
  },
  {
    id: "med_5",
    name: "Atorvastatin",
    startDate: new Date().toISOString(),
    endDate: null,
    dosage: "20mg ON",
    isCurrent: true,
  },
  {
    id: "med_6",
    name: "Pantoprazole",
    startDate: new Date().toISOString(),
    endDate: null,
    dosage: "40mg OD",
    isCurrent: true,
  },
];

const MOCK_LAB_TRENDS: LabTrend[] = [
  {
    id: "hba1c",
    testName: "HbA1c",
    unit: "%",
    refLow: 4.0,
    refHigh: 5.6,
    dataPoints: [
      {
        date: new Date(Date.now() - 365 * 86400000).toISOString(),
        value: 7.1,
      },
      {
        date: new Date(Date.now() - 270 * 86400000).toISOString(),
        value: 6.8,
      },
      {
        date: new Date(Date.now() - 180 * 86400000).toISOString(),
        value: 7.2,
      },
      {
        date: new Date(Date.now() - 90 * 86400000).toISOString(),
        value: 7.5,
      },
      {
        date: new Date(Date.now() - 30 * 86400000).toISOString(),
        value: 8.2,
      },
    ],
  },
  {
    id: "creatinine",
    testName: "Creatinine",
    unit: "mg/dL",
    refLow: 0.6,
    refHigh: 1.2,
    dataPoints: [
      {
        date: new Date(Date.now() - 365 * 86400000).toISOString(),
        value: 0.8,
      },
      {
        date: new Date(Date.now() - 180 * 86400000).toISOString(),
        value: 0.9,
      },
      {
        date: new Date(Date.now() - 30 * 86400000).toISOString(),
        value: 1.0,
      },
    ],
  },
  {
    id: "fbs",
    testName: "Fasting Glucose",
    unit: "mg/dL",
    refLow: 70,
    refHigh: 100,
    dataPoints: [
      {
        date: new Date(Date.now() - 365 * 86400000).toISOString(),
        value: 130,
      },
      {
        date: new Date(Date.now() - 180 * 86400000).toISOString(),
        value: 142,
      },
      {
        date: new Date(Date.now() - 90 * 86400000).toISOString(),
        value: 155,
      },
      {
        date: new Date(Date.now() - 30 * 86400000).toISOString(),
        value: 165,
      },
    ],
  },
];

const MOCK_PRESCRIPTIONS = [
  {
    date: new Date().toISOString(),
    doctorName: "Dr. Karim",
    chiefComplaint: "Chest pain, cardiac workup",
    items: [
      "Tab. Aspirin 75mg -- 0+1+0 x continue",
      "Tab. Atorvastatin 20mg -- 0+0+1 x continue",
      "Tab. Pantoprazole 40mg -- 1+0+0 x 14 days",
      "SL Nitroglycerin 0.5mg -- SOS",
    ],
  },
  {
    date: new Date(Date.now() - 90 * 86400000).toISOString(),
    doctorName: "Dr. Karim",
    chiefComplaint: "Routine check-up",
    items: [
      "Tab. Metformin 500mg -- 1+0+1 x continue",
      "Tab. Amlodipine 5mg -- 0+0+1 x continue",
      "Tab. Omeprazole 20mg -- 1+0+0 x continue",
    ],
  },
  {
    date: new Date(Date.now() - 180 * 86400000).toISOString(),
    doctorName: "Dr. Rahman",
    chiefComplaint: "UTI",
    items: [
      "Tab. Nitrofurantoin 100mg -- 1+0+1 x 5 days",
      "Tab. Metformin 500mg -- 1+0+1 x continue",
      "Tab. Amlodipine 5mg -- 0+0+1 x continue",
    ],
  },
];
