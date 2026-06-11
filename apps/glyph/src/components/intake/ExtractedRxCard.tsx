import React from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

/** Structured prescription data extracted from a document image. */
interface RxData {
  doctor?: string;
  date?: string;
  medications: Array<{
    name: string;
    dose: string;
    frequency: string;
  }>;
}

interface ExtractedRxCardProps {
  /** Extracted prescription data. */
  data: RxData;
  /** Confidence score from 0 to 1. */
  confidence: number;
  /** Called when the user confirms the extracted data. */
  onConfirm?: () => void;
  /** Called when the user wants to edit the extracted data. */
  onEdit?: () => void;
}

/**
 * Displays extracted prescription data for patient confirmation.
 *
 * Card showing the prescribing doctor, date, and a list of medications
 * with dose and frequency. A confidence indicator helps the user gauge
 * extraction reliability. "Confirm" and "Edit" buttons let the user
 * verify or correct the data before it enters the clinical record.
 */
export function ExtractedRxCard({
  data,
  confidence,
  onConfirm,
  onEdit,
}: ExtractedRxCardProps) {
  const confidencePercent = Math.round(confidence * 100);
  const confidenceColor =
    confidence >= 0.85
      ? "text-glyph-600 bg-glyph-50"
      : confidence >= 0.6
        ? "text-amber-600 bg-amber-50"
        : "text-red-600 bg-red-50";

  return (
    <div className="rounded-2xl border border-clinical-border bg-white p-4 shadow-sm">
      {/* Card header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-glyph-100 text-glyph-700">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-clinical-text">
            {/* TODO: i18n key intake.rx.title */}
            Prescription
          </h3>
        </div>

        {/* Confidence badge */}
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            confidenceColor
          )}
        >
          {confidencePercent}% confident
        </span>
      </div>

      {/* Doctor & date */}
      {(data.doctor || data.date) && (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-clinical-muted">
          {data.doctor && (
            <span>
              <span className="font-medium text-clinical-text">Dr.</span>{" "}
              {data.doctor}
            </span>
          )}
          {data.date && <span>{data.date}</span>}
        </div>
      )}

      {/* Medications list */}
      <div className="space-y-2">
        {data.medications.map((med, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-lg bg-clinical-bg px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-clinical-text">
                {med.name}
              </p>
              <p className="text-xs text-clinical-muted">
                {med.dose} &middot; {med.frequency}
              </p>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-glyph-400"
              aria-hidden="true"
            >
              <path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
            </svg>
          </div>
        ))}

        {data.medications.length === 0 && (
          <p className="py-2 text-center text-sm text-clinical-muted italic">
            {/* TODO: i18n key intake.rx.noMeds */}
            No medications detected
          </p>
        )}
      </div>

      {/* Action buttons */}
      {(onConfirm || onEdit) && (
        <div className="mt-4 flex gap-3">
          {onEdit && (
            <Button variant="outline" size="default" className="flex-1" onClick={onEdit}>
              {/* TODO: i18n key intake.rx.edit */}
              Edit
            </Button>
          )}
          {onConfirm && (
            <Button variant="default" size="default" className="flex-1" onClick={onConfirm}>
              {/* TODO: i18n key intake.rx.confirm */}
              Confirm
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
