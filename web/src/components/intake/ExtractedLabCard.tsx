import React from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

/** A single lab test result row. */
interface LabResult {
  name: string;
  value: string;
  unit: string;
  range: string;
  isAbnormal: boolean;
}

/** Structured lab report data extracted from a document image. */
interface LabData {
  labName?: string;
  date?: string;
  results: LabResult[];
}

interface ExtractedLabCardProps {
  /** Extracted lab report data. */
  data: LabData;
  /** Confidence score from 0 to 1. */
  confidence: number;
  /** Called when the user confirms the extracted data. */
  onConfirm?: () => void;
  /** Called when the user wants to edit the extracted data. */
  onEdit?: () => void;
}

/**
 * Displays extracted lab report data with abnormal value flags.
 *
 * Card showing the lab name, date, and a results table with test name,
 * value, unit, and reference range. Abnormal values are highlighted in
 * red for clinical visibility. A confidence indicator and action buttons
 * allow the user to verify or correct the extraction.
 */
export function ExtractedLabCard({
  data,
  confidence,
  onConfirm,
  onEdit,
}: ExtractedLabCardProps) {
  const confidencePercent = Math.round(confidence * 100);
  const confidenceColor =
    confidence >= 0.85
      ? "text-glyph-600 bg-glyph-50"
      : confidence >= 0.6
        ? "text-amber-600 bg-amber-50"
        : "text-red-600 bg-red-50";

  const abnormalCount = data.results.filter((r) => r.isAbnormal).length;

  return (
    <div className="rounded-2xl border border-clinical-border bg-white p-4 shadow-sm">
      {/* Card header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
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
              <path d="M12 18v-6" />
              <path d="M9 15h6" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-clinical-text">
            {/* TODO: i18n key intake.lab.title */}
            Lab Report
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

      {/* Lab name & date */}
      {(data.labName || data.date) && (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-clinical-muted">
          {data.labName && (
            <span className="font-medium text-clinical-text">
              {data.labName}
            </span>
          )}
          {data.date && <span>{data.date}</span>}
        </div>
      )}

      {/* Abnormal count warning */}
      {abnormalCount > 0 && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {/* TODO: i18n key intake.lab.abnormalCount */}
          {abnormalCount} abnormal value{abnormalCount > 1 ? "s" : ""}
        </div>
      )}

      {/* Results table */}
      <div className="overflow-hidden rounded-lg border border-clinical-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-clinical-border bg-clinical-bg">
              <th className="px-3 py-2 font-medium text-clinical-muted">
                {/* TODO: i18n key intake.lab.test */}
                Test
              </th>
              <th className="px-3 py-2 text-right font-medium text-clinical-muted">
                {/* TODO: i18n key intake.lab.value */}
                Value
              </th>
              <th className="hidden px-3 py-2 text-right font-medium text-clinical-muted sm:table-cell">
                {/* TODO: i18n key intake.lab.range */}
                Range
              </th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((result, idx) => (
              <tr
                key={idx}
                className={cn(
                  "border-b border-clinical-border last:border-0",
                  result.isAbnormal && "bg-red-50"
                )}
              >
                <td className="px-3 py-2 text-clinical-text">{result.name}</td>
                <td
                  className={cn(
                    "px-3 py-2 text-right font-medium",
                    result.isAbnormal
                      ? "text-red-700 font-bold"
                      : "text-clinical-text"
                  )}
                >
                  {result.value}{" "}
                  <span className="text-xs text-clinical-muted">
                    {result.unit}
                  </span>
                  {result.isAbnormal && (
                    <span
                      className="ml-1 inline-block text-red-500"
                      aria-label="Abnormal"
                    >
                      *
                    </span>
                  )}
                </td>
                <td className="hidden px-3 py-2 text-right text-clinical-muted sm:table-cell">
                  {result.range}
                </td>
              </tr>
            ))}

            {data.results.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-4 text-center text-clinical-muted italic"
                >
                  {/* TODO: i18n key intake.lab.noResults */}
                  No results detected
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Action buttons */}
      {(onConfirm || onEdit) && (
        <div className="mt-4 flex gap-3">
          {onEdit && (
            <Button variant="outline" size="default" className="flex-1" onClick={onEdit}>
              {/* TODO: i18n key intake.lab.edit */}
              Edit
            </Button>
          )}
          {onConfirm && (
            <Button variant="default" size="default" className="flex-1" onClick={onConfirm}>
              {/* TODO: i18n key intake.lab.confirm */}
              Confirm
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
