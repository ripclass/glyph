"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** A single visit entry in the patient timeline. */
export interface TimelineVisit {
  /** Unique visit ID. */
  visitId: string;
  /** ISO date of the visit. */
  date: string;
  /** Chief complaint for this visit. */
  chiefComplaint: string;
  /** Key findings from this visit. */
  keyFindings: string[];
  /** Prescriptions given during this visit. */
  prescriptions: string[];
  /** Doctor who saw the patient (optional). */
  doctorName?: string;
}

export interface PatientTimelineProps {
  /** All visits in chronological order (most recent first). */
  visits: TimelineVisit[];
  className?: string;
}

/**
 * Longitudinal visit history as a vertical timeline.
 *
 * Displays all patient visits chronologically (most recent first).
 * Each entry shows:
 * - Date of visit
 * - Chief complaint
 * - Key findings summary
 * - Prescriptions given
 * - Expandable for full details
 *
 * Designed for quick scanning of patient history during consultation.
 *
 * @example
 * ```tsx
 * <PatientTimeline visits={patientVisits} />
 * ```
 */
export function PatientTimeline({
  visits,
  className,
}: PatientTimelineProps) {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  const toggleExpand = (visitId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(visitId)) {
        next.delete(visitId);
      } else {
        next.add(visitId);
      }
      return next;
    });
  };

  if (visits.length === 0) {
    return (
      <div className={cn("py-8 text-center", className)}>
        <p className="text-sm text-slate-400">No visit history available</p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} role="list" aria-label="Visit history">
      {/* Vertical line */}
      <div
        className="absolute left-4 top-0 bottom-0 w-px bg-slate-200"
        aria-hidden="true"
      />

      <div className="space-y-4">
        {visits.map((visit, index) => {
          const isExpanded = expandedIds.has(visit.visitId);
          const isFirst = index === 0;

          return (
            <div
              key={visit.visitId}
              className="relative pl-10"
              role="listitem"
            >
              {/* Timeline dot */}
              <div
                className={cn(
                  "absolute left-[11px] top-1.5 h-[10px] w-[10px] rounded-full border-2 border-white",
                  isFirst ? "bg-glyph-500" : "bg-slate-300"
                )}
                aria-hidden="true"
              />

              {/* Visit card */}
              <button
                type="button"
                onClick={() => toggleExpand(visit.visitId)}
                className={cn(
                  "w-full rounded-lg border bg-white p-3 text-left shadow-sm transition hover:shadow-md",
                  isFirst ? "border-glyph-200" : "border-slate-200"
                )}
                aria-expanded={isExpanded}
                aria-label={`Visit on ${formatVisitDate(visit.date)}: ${visit.chiefComplaint}`}
              >
                {/* Header: date + complaint */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <time
                      className="text-[10px] font-medium text-slate-400"
                      dateTime={visit.date}
                    >
                      {formatVisitDate(visit.date)}
                      {visit.doctorName && ` -- ${visit.doctorName}`}
                    </time>
                    <p className="mt-0.5 text-sm font-medium text-slate-800">
                      {visit.chiefComplaint}
                    </p>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(
                      "shrink-0 text-slate-400 transition-transform",
                      isExpanded && "rotate-180"
                    )}
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>

                {/* Collapsed preview: first finding */}
                {!isExpanded && visit.keyFindings.length > 0 && (
                  <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                    {visit.keyFindings[0]}
                    {visit.keyFindings.length > 1 &&
                      ` (+${visit.keyFindings.length - 1} more)`}
                  </p>
                )}

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                    {/* Key findings */}
                    {visit.keyFindings.length > 0 && (
                      <div>
                        <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Key Findings
                        </h4>
                        <ul className="space-y-1">
                          {visit.keyFindings.map((finding, fi) => (
                            <li
                              key={fi}
                              className="flex items-start gap-1.5 text-xs text-slate-600"
                            >
                              <span
                                className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300"
                                aria-hidden="true"
                              />
                              {finding}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Prescriptions */}
                    {visit.prescriptions.length > 0 && (
                      <div>
                        <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Prescriptions
                        </h4>
                        <ul className="space-y-1">
                          {visit.prescriptions.map((rx, ri) => (
                            <li
                              key={ri}
                              className="rounded bg-slate-50 px-2 py-1 text-xs text-slate-600"
                            >
                              {rx}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Format an ISO date for display in the timeline.
 */
function formatVisitDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
