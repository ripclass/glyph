"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** A medication entry spanning one or more time periods. */
export interface MedicationEntry {
  /** Unique ID. */
  id: string;
  /** Drug name. */
  name: string;
  /** ISO date when this medication was first prescribed. */
  startDate: string;
  /** ISO date when this medication was discontinued (null if current). */
  endDate: string | null;
  /** Dosage string, e.g., "500mg 1+0+1". */
  dosage: string;
  /** Whether this medication is currently active. */
  isCurrent: boolean;
  /** Dosage changes over time. */
  dosageChanges?: Array<{
    date: string;
    fromDosage: string;
    toDosage: string;
  }>;
}

export interface MedicationTimelineProps {
  /** All medication entries across visits. */
  medications: MedicationEntry[];
  className?: string;
}

/**
 * Visual medication history timeline (Gantt-chart style).
 *
 * Displays a horizontal timeline showing which medications were prescribed
 * when, with dosage changes marked. Each medication is a horizontal bar
 * spanning its active period. Current medications are highlighted with
 * a distinct color.
 *
 * Features:
 * - Gantt-chart style horizontal bars for each medication
 * - Dosage change markers along the bar
 * - Current medications highlighted in green
 * - Discontinued medications shown in gray
 * - Date labels along the bottom axis
 *
 * @example
 * ```tsx
 * <MedicationTimeline medications={patientMeds} />
 * ```
 */
export function MedicationTimeline({
  medications,
  className,
}: MedicationTimelineProps) {
  if (medications.length === 0) {
    return (
      <div className={cn("py-8 text-center", className)}>
        <p className="text-sm text-slate-400">No medication history available</p>
      </div>
    );
  }

  // Compute timeline range
  const allDates = medications.flatMap((m) => {
    const dates = [new Date(m.startDate).getTime()];
    if (m.endDate) dates.push(new Date(m.endDate).getTime());
    return dates;
  });
  const minTime = Math.min(...allDates);
  const maxTime = Math.max(...allDates, Date.now());
  const totalSpan = maxTime - minTime || 1;

  // Generate month ticks for the axis
  const ticks = generateMonthTicks(minTime, maxTime);

  const getPosition = (isoDate: string): number => {
    const time = new Date(isoDate).getTime();
    return ((time - minTime) / totalSpan) * 100;
  };

  const getWidth = (start: string, end: string | null): number => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    return ((endTime - startTime) / totalSpan) * 100;
  };

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="min-w-[500px]">
        {/* Medication bars */}
        <div className="space-y-2">
          {medications.map((med) => (
            <div key={med.id} className="flex items-center gap-3">
              {/* Drug name */}
              <div className="w-32 shrink-0 text-right">
                <p
                  className={cn(
                    "truncate text-xs font-medium",
                    med.isCurrent ? "text-slate-800" : "text-slate-400"
                  )}
                  title={med.name}
                >
                  {med.name}
                </p>
                <p className="truncate text-[10px] text-slate-400">
                  {med.dosage}
                </p>
              </div>

              {/* Timeline bar */}
              <div className="relative h-6 flex-1">
                {/* Background track */}
                <div className="absolute inset-0 rounded bg-slate-100" />

                {/* Medication span bar */}
                <div
                  className={cn(
                    "absolute top-0.5 h-5 rounded transition-all",
                    med.isCurrent
                      ? "bg-glyph-500/80 shadow-sm"
                      : "bg-slate-300/80"
                  )}
                  style={{
                    left: `${getPosition(med.startDate)}%`,
                    width: `${Math.max(getWidth(med.startDate, med.endDate), 1)}%`,
                  }}
                  title={`${med.name}: ${formatDate(med.startDate)} - ${med.endDate ? formatDate(med.endDate) : "Present"}`}
                >
                  {/* Dosage change markers */}
                  {med.dosageChanges?.map((change, i) => {
                    const changePos = getPosition(change.date);
                    const barStart = getPosition(med.startDate);
                    const barWidth = getWidth(med.startDate, med.endDate);
                    const relativePos =
                      barWidth > 0
                        ? ((changePos - barStart) / barWidth) * 100
                        : 0;

                    return (
                      <div
                        key={i}
                        className="absolute top-0 h-full w-0.5 bg-white/60"
                        style={{ left: `${relativePos}%` }}
                        title={`${change.date}: ${change.fromDosage} -> ${change.toDosage}`}
                      />
                    );
                  })}

                  {/* Current indicator */}
                  {med.isCurrent && (
                    <div className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-white bg-glyph-600" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Time axis */}
        <div className="relative ml-[calc(8rem+0.75rem)] mt-2 h-5 border-t border-slate-200">
          {ticks.map((tick, i) => (
            <span
              key={i}
              className="absolute -top-px text-[9px] text-slate-400"
              style={{ left: `${tick.position}%`, transform: "translateX(-50%)" }}
            >
              <span className="inline-block border-l border-slate-300 pl-1 pt-1">
                {tick.label}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ── */

/**
 * Generate month tick marks for the timeline axis.
 */
function generateMonthTicks(
  minTime: number,
  maxTime: number
): Array<{ label: string; position: number }> {
  const ticks: Array<{ label: string; position: number }> = [];
  const totalSpan = maxTime - minTime || 1;
  const start = new Date(minTime);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const current = new Date(start);
  while (current.getTime() <= maxTime) {
    const pos = ((current.getTime() - minTime) / totalSpan) * 100;
    if (pos >= 0 && pos <= 100) {
      ticks.push({
        label: current.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        position: pos,
      });
    }
    current.setMonth(current.getMonth() + 1);
  }

  // Limit to ~8 ticks to avoid clutter
  if (ticks.length > 8) {
    const step = Math.ceil(ticks.length / 8);
    return ticks.filter((_, i) => i % step === 0);
  }
  return ticks;
}

/**
 * Format an ISO date string to a short display format.
 */
function formatDate(iso: string): string {
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
