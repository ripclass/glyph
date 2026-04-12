"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { BriefingCard, type BriefingData } from "@/components/doctor/BriefingCard";

/**
 * Full briefing card page for a specific patient visit.
 *
 * THE most important screen in the doctor workflow. Displays:
 * - Top bar with patient name, age, gender, and visit number
 * - Complete BriefingCard with all clinical sections
 * - "Start Consultation" button at the bottom
 *
 * Fetches visit data on mount (placeholder implementation).
 * Client component for interactivity and data fetching.
 */
export default function BriefingPage() {
  const params = useParams<{ visitId: string }>();
  const router = useRouter();
  const visitId = params.visitId;

  const [isLoading, setIsLoading] = React.useState(true);

  // Placeholder: fetch visit data
  // TODO: Replace with real Supabase fetch
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, [visitId]);

  // Placeholder patient info
  const patient = MOCK_PATIENT;
  const briefing = MOCK_BRIEFING;

  const handleStartConsultation = () => {
    router.push(`/doctor/consult/${visitId}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="space-y-3 text-center">
          <svg
            className="mx-auto h-8 w-8 animate-spin text-glyph-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-sm text-slate-400">Loading briefing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Patient header bar */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back button */}
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
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

            {/* Patient info */}
            <div>
              <h1 className="text-base font-semibold text-slate-800">
                {patient.nameEn}
              </h1>
              <p className="text-xs text-slate-500">
                {patient.age}y / {patient.gender} &middot; Visit #{patient.visitNumber}
              </p>
            </div>
          </div>

          {/* Patient ID badge */}
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">
            {visitId}
          </span>
        </div>
      </div>

      {/* Briefing content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <BriefingCard data={briefing} />
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <Button
            size="lg"
            className="w-full"
            onClick={handleStartConsultation}
          >
            Start Consultation
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Mock data ── */

const MOCK_PATIENT = {
  nameEn: "Rahima Begum",
  nameBn: "\u09b0\u09b9\u09bf\u09ae\u09be \u09ac\u09c7\u0997\u09ae",
  age: 55,
  gender: "Female",
  visitNumber: 3,
};

const MOCK_BRIEFING: BriefingData = {
  redFlags: [
    {
      id: "rf_1",
      text: "Chest pain at rest with exertional worsening",
      reasoning:
        "New-onset chest pain in a 55-year-old female with diabetes warrants urgent cardiac evaluation. Reported directly by patient during intake.",
    },
  ],
  chiefComplaint: [
    {
      text: "Chest pain for 2 days, worse when walking, dull aching character, left-sided",
      sourceType: "patient",
      evidence: {
        id: "ev_1",
        sourceType: "patient",
        sourceLabel: "Per patient",
        content:
          "I have been having pain in my chest for 2 days. It gets worse when I walk. It is a dull ache on the left side.",
        timestamp: new Date().toISOString(),
        confidence: "high",
        fullContext:
          "Patient described the pain during structured intake interview, pointing to the left precordial region.",
      },
    },
  ],
  hpiClaims: [
    {
      text: "Pain started 2 days ago after climbing stairs",
      sourceType: "patient",
    },
    {
      text: "Son reports mother has been taking antacids thinking it was gas pain",
      sourceType: "attendant",
      sourceLabel: "Per attendant (son)",
    },
    {
      text: "No radiation to arm or jaw, no diaphoresis",
      sourceType: "patient",
    },
    {
      text: "Mild shortness of breath on exertion (new symptom)",
      sourceType: "attendant",
      sourceLabel: "Per attendant (son)",
    },
  ],
  pastMedicalHistory: [
    {
      text: "Type 2 Diabetes Mellitus, diagnosed 8 years ago",
      sourceType: "patient",
    },
    {
      text: "Hypertension, on medication for 5 years",
      sourceType: "rx_photo",
    },
  ],
  currentMedications: [
    { name: "Metformin", dosage: "500mg 1+0+1", sourceType: "rx_photo" },
    { name: "Amlodipine", dosage: "5mg 0+0+1", sourceType: "rx_photo" },
    { name: "Omeprazole", dosage: "20mg 1+0+0", sourceType: "patient" },
  ],
  recentLabs: [
    {
      testName: "HbA1c",
      value: "8.2%",
      referenceRange: "4.0-5.6%",
      isAbnormal: true,
      sourceType: "lab_report",
    },
    {
      testName: "Fasting Glucose",
      value: "165 mg/dL",
      referenceRange: "70-100 mg/dL",
      isAbnormal: true,
      sourceType: "lab_report",
    },
    {
      testName: "Creatinine",
      value: "1.0 mg/dL",
      referenceRange: "0.6-1.2 mg/dL",
      isAbnormal: false,
      sourceType: "lab_report",
    },
    {
      testName: "Total Cholesterol",
      value: "245 mg/dL",
      referenceRange: "<200 mg/dL",
      isAbnormal: true,
      sourceType: "lab_report",
    },
  ],
  allergies: [
    {
      text: "Penicillin -- rash (reported by patient, unverified)",
      sourceType: "patient",
    },
  ],
  socialHistory: [
    { text: "Homemaker, lives with son's family", sourceType: "patient" },
    { text: "Non-smoker, no betel nut use", sourceType: "patient" },
  ],
  assessment: [
    {
      text: "New-onset chest pain in a diabetic, hypertensive patient -- consider ACS workup",
      sourceType: "uptodate",
    },
    {
      text: "Suboptimal glycemic control (HbA1c 8.2%) -- medication adjustment needed",
      sourceType: "lab_report",
    },
    {
      text: "Elevated cholesterol -- statin therapy should be considered given cardiac risk factors",
      sourceType: "uptodate",
    },
  ],
};
