"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** All possible source types for clinical claims. */
export type SourceType =
  | "patient"
  | "attendant"
  | "rx_photo"
  | "lab_report"
  | "uptodate"
  | "pubmed";

/** Props for the SourceTag component. */
export interface SourceTagProps {
  /** The type of source this claim originates from. */
  type: SourceType;
  /** Optional label override (e.g., "Per attendant (son)"). */
  label?: string;
  /** Called when the tag is tapped, typically to open LinkedEvidence. */
  onTap?: (type: SourceType) => void;
  className?: string;
}

/** Color and label configuration for each source type. */
const SOURCE_CONFIG: Record<SourceType, { label: string; className: string }> = {
  patient: {
    label: "Per patient",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  attendant: {
    label: "Per attendant",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  rx_photo: {
    label: "From Rx photo",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  lab_report: {
    label: "From lab report",
    className: "bg-teal-100 text-teal-800 border-teal-200",
  },
  uptodate: {
    label: "UpToDate",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  pubmed: {
    label: "PubMed",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

/**
 * Small inline tag showing the source of a clinical claim.
 *
 * Color-coded by source type:
 * - **Patient** (blue) -- information reported directly by the patient
 * - **Attendant** (amber) -- reported by a family member / attendant
 * - **Rx photo** (purple) -- extracted from a prescription photograph
 * - **Lab report** (teal) -- extracted from uploaded lab results
 * - **UpToDate** (orange) -- evidence from UpToDate clinical resource
 * - **PubMed** (gray) -- evidence from PubMed literature
 *
 * Tappable to open the LinkedEvidence detail panel.
 *
 * @example
 * ```tsx
 * <SourceTag type="patient" onTap={(t) => openEvidence(t)} />
 * <SourceTag type="attendant" label="Per attendant (son)" />
 * ```
 */
export function SourceTag({ type, label, onTap, className }: SourceTagProps) {
  const config = SOURCE_CONFIG[type];
  const displayLabel = label ?? config.label;

  const handleClick = React.useCallback(() => {
    onTap?.(type);
  }, [onTap, type]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium leading-tight transition-opacity hover:opacity-80",
        config.className,
        onTap ? "cursor-pointer" : "cursor-default",
        className
      )}
      aria-label={`Source: ${displayLabel}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      {displayLabel}
    </button>
  );
}
