import React from "react";
import { cn } from "@/lib/utils/cn";

interface PatientMessageProps {
  /** Transcribed speech text. */
  message: string;
  /** Who provided this input. */
  source: "patient" | "attendant";
  /** Attendant relationship label, e.g. "son", "daughter", "wife". */
  attendantRelation?: string;
}

/**
 * Patient/attendant speech bubble in the intake conversation.
 *
 * Right-aligned with a white background and border. Shows the transcribed
 * text along with a badge indicating whether the speaker is the patient
 * or an attendant (with optional relationship descriptor).
 */
export function PatientMessage({
  message,
  source,
  attendantRelation,
}: PatientMessageProps) {
  const badgeLabel =
    source === "patient"
      ? // TODO: i18n key intake.chat.patient
        "রোগী"
      : attendantRelation
        ? // TODO: i18n key intake.chat.attendantWith
          `সাথে (${attendantRelation})`
        : // TODO: i18n key intake.chat.attendant
          "সাথে";

  return (
    <div className="flex items-start justify-end gap-2.5">
      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl rounded-tr-sm bg-white px-4 py-3",
          "border border-clinical-border shadow-sm"
        )}
      >
        {/* Source badge */}
        <p
          className={cn(
            "mb-1 text-[11px] font-semibold uppercase tracking-wide",
            source === "patient" ? "text-glyph-600" : "text-amber-600"
          )}
        >
          {badgeLabel}
        </p>

        {/* Transcribed text */}
        <p className="font-bangla text-base leading-relaxed text-clinical-text">
          {message}
        </p>
      </div>

      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          source === "patient"
            ? "bg-glyph-100 text-glyph-700"
            : "bg-amber-100 text-amber-700"
        )}
        aria-hidden="true"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
    </div>
  );
}
