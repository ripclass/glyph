import React from "react";
import { cn } from "@/lib/utils/cn";

interface AttendantBannerProps {
  /** Relationship of the attendant to the patient, e.g. "son", "wife". */
  relation?: string;
}

/**
 * Persistent banner displayed at the top of the conversation when an
 * attendant (not the patient) is providing history.
 *
 * Amber/yellow background to make it visually distinct. Shows the
 * attendant relationship if known.
 */
export function AttendantBanner({ relation }: AttendantBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2.5"
      )}
      role="status"
      aria-live="polite"
    >
      {/* Info icon */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-amber-600"
        aria-hidden="true"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>

      <p className="font-bangla text-sm font-medium text-amber-800">
        {/* TODO: i18n key intake.attendantBanner.label */}
        ইতিহাস প্রদানকারী:{" "}
        <span className="font-semibold">
          {relation ? (
            // TODO: i18n key intake.attendantBanner.relation
            <>সাথে ({relation})</>
          ) : (
            // TODO: i18n key intake.attendantBanner.attendant
            <>সাথে</>
          )}
        </span>
      </p>
    </div>
  );
}
