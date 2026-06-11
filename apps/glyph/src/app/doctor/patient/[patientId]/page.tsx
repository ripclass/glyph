"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { usePatientHistory } from "@/lib/hooks/usePatientHistory";
import type { Json } from "@/lib/supabase/types";

/**
 * Longitudinal patient view, LIVE — the anti-plastic-bag screen.
 * Every visit, prescription, and lab report for this patient, newest first,
 * loaded through the RLS-scoped patient history service.
 */
export default function PatientPage() {
  const params = useParams<{ patientId: string }>();
  const { patient, visits, prescriptions, labReports, isLoading, error } =
    usePatientHistory(params.patientId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-glyph-200 border-t-glyph-600" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-red-600">{error ?? "Patient not found"}</p>
      </div>
    );
  }

  const allergies = asStringArray(patient.known_allergies);
  const conditions = asStringArray(patient.chronic_conditions);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Patient header */}
      <header className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">
          {patient.name_bn ?? patient.name}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {patient.name} · {patient.age ?? "?"}y · {patient.gender ?? "—"}
          {patient.blood_group ? ` · ${patient.blood_group}` : ""}
          {patient.phone ? ` · ${patient.phone}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {conditions.map((c) => (
            <Badge key={c} variant="secondary">
              {c}
            </Badge>
          ))}
          {allergies.map((a) => (
            <Badge key={a} variant="destructive">
              ⚠ {a}
            </Badge>
          ))}
        </div>
      </header>

      {/* Visits */}
      <Section title={`Visits (${visits.length})`}>
        {visits.length === 0 && <Empty>No visits on record</Empty>}
        {visits.map((v) => {
          const summary = (v.intake_summary ?? {}) as { chiefComplaint?: string };
          return (
            <Link
              key={v.id}
              href={`/doctor/briefing/${v.id}`}
              className="block rounded-lg border border-slate-200 bg-white px-4 py-3 transition hover:border-glyph-300"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  {summary.chiefComplaint ?? "No summary"}
                </p>
                <Badge variant={v.note_credential_id ? "success" : "secondary"}>
                  {v.note_credential_id ? "credentialed" : v.status ?? "—"}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                {formatDate(v.visit_date ?? v.created_at)} · Visit #{v.visit_number ?? "?"}
              </p>
            </Link>
          );
        })}
      </Section>

      {/* Prescriptions */}
      <Section title={`Prescriptions (${prescriptions.length})`}>
        {prescriptions.length === 0 && <Empty>No prescriptions on record</Empty>}
        {prescriptions.map((rx) => {
          const meds = Array.isArray(rx.medications)
            ? (rx.medications as Array<{ name?: string; dose?: string; frequency?: string }>)
            : [];
          return (
            <div key={rx.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  {meds.map((m) => m.name).filter(Boolean).join(", ") || "—"}
                </p>
                {rx.credential_id && <Badge variant="success">signed</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                {formatDate(rx.prescription_date ?? rx.created_at)}
                {rx.prescribing_doctor_name ? ` · ${rx.prescribing_doctor_name}` : ""}
                {rx.diagnosis ? ` · ${rx.diagnosis}` : ""}
              </p>
              {meds.length > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  {meds
                    .map((m) => [m.name, m.dose, m.frequency].filter(Boolean).join(" "))
                    .join("; ")}
                </p>
              )}
            </div>
          );
        })}
      </Section>

      {/* Lab reports */}
      <Section title={`Lab Reports (${labReports.length})`}>
        {labReports.length === 0 && <Empty>No lab reports on record</Empty>}
        {labReports.map((lab) => {
          const results = Array.isArray(lab.results)
            ? (lab.results as Array<{ name?: string; value?: string; unit?: string; isAbnormal?: boolean }>)
            : [];
          const abnormal = results.filter((r) => r.isAbnormal);
          return (
            <div key={lab.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  {lab.test_category ?? "Report"}
                  {lab.lab_name ? ` · ${lab.lab_name}` : ""}
                </p>
                {abnormal.length > 0 && (
                  <Badge variant="destructive">{abnormal.length} abnormal</Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{formatDate(lab.report_date ?? lab.created_at)}</p>
              {abnormal.length > 0 && (
                <p className="mt-1 text-xs text-red-600">
                  {abnormal
                    .map((r) => `${r.name}: ${r.value}${r.unit ? ` ${r.unit}` : ""}`)
                    .join("; ")}
                </p>
              )}
            </div>
          );
        })}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-400">
      {children}
    </p>
  );
}

function asStringArray(v: Json | null): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
