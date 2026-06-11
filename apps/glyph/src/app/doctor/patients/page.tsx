"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  listRecentPatients,
  searchPatients,
  type PatientWithLastVisit,
} from "@/lib/services/patients";
import { formatDateBD } from "@/lib/utils/format-date-bd";

/**
 * Doctor's patient directory — find any patient in the clinic, not just
 * today's queue. Search understands names (Bangla or Latin) and phone
 * numbers however they're typed (+880, Bangla numerals, fragments — one
 * family phone often covers several patients, see §9). Rows open the
 * longitudinal patient timeline.
 */
export default function DoctorPatientsPage() {
  const router = useRouter();
  const doctor = useAuthStore((s) => s.doctor);

  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientWithLastVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  /** Guards against out-of-order responses from stale keystrokes */
  const requestRef = useRef(0);

  useEffect(() => {
    if (!doctor?.clinic_id) return;
    const clinicId = doctor.clinic_id;
    const requestId = ++requestRef.current;

    const run = () => {
      setIsLoading(true);
      const fetcher = query.trim()
        ? searchPatients(clinicId, query)
        : listRecentPatients(clinicId);
      fetcher
        .then((rows) => {
          if (requestRef.current === requestId) setPatients(rows);
        })
        .catch((err) => {
          if (requestRef.current === requestId) {
            toast.error(err instanceof Error ? err.message : "Search failed");
          }
        })
        .finally(() => {
          if (requestRef.current === requestId) setIsLoading(false);
        });
    };

    // Debounce typing; load immediately when the box is empty (first paint)
    const timer = setTimeout(run, query.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [doctor?.clinic_id, query]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      {/* ── Header ── */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Patients</h1>
          <p className="text-sm text-slate-500">
            {/* TODO: i18n key doctor.patients.subtitle */}
            সব রোগী — নাম বা ফোন নম্বর দিয়ে খুঁজুন
          </p>
        </div>
        {!isLoading && (
          <p className="text-sm text-slate-400">
            {patients.length}
            {query.trim() ? " found" : " recent"}
          </p>
        )}
      </div>

      {/* ── Search ── */}
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="নাম বা ফোন — Rahman, জাহানারা, 01711…"
        className="mb-4 font-bangla"
        autoFocus
      />

      {/* ── Results ── */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
          <p className="font-bangla text-slate-500">
            {/* TODO: i18n key doctor.patients.empty */}
            {query.trim()
              ? "কোনো রোগী পাওয়া যায়নি"
              : "এখনও কোনো রোগী নিবন্ধিত হয়নি"}
          </p>
          {query.trim() === "" && (
            <p className="mt-1 text-sm text-slate-400">
              Patients appear here after their first intake
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Patients">
          {patients.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => router.push(`/doctor/patient/${p.id}`)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-glyph-300 hover:bg-glyph-50/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bangla text-sm font-medium text-slate-600">
                  {(p.name_bn ?? p.name).slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bangla font-medium text-slate-800">
                    {p.name}
                    {p.name_bn && p.name_bn !== p.name && (
                      <span className="ml-2 font-normal text-slate-400">
                        {p.name_bn}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {[
                      p.age != null ? `${p.age}y` : null,
                      p.gender ? p.gender.charAt(0).toUpperCase() : null,
                      p.phone,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-slate-400">
                  {p.visits[0]?.visit_date ? (
                    <>
                      {/* TODO: i18n key doctor.patients.lastVisit */}
                      <p>শেষ ভিজিট</p>
                      <p className="font-medium text-slate-500">
                        {formatDateBD(p.visits[0].visit_date)}
                      </p>
                    </>
                  ) : (
                    <p>—</p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
