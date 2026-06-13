import React from "react";
import { cn } from "@/lib/utils/cn";

interface PatientMessageProps {
  /** Transcribed speech text. */
  message: string;
  /** Who provided this input. */
  source: "patient" | "attendant";
  /** Attendant relationship label, e.g. "son", "daughter", "wife". */
  attendantRelation?: string;
  /** Interim (still-being-spoken) transcript renders lighter. */
  interim?: boolean;
}

/**
 * The patient or attendant's answer in the intake conversation — editorial,
 * not a chat bubble. Indented under a thin accent rule, with a small
 * source tag so the doctor reviewing later knows who spoke. Calm-presence
 * design: the answer reads as quiet flowing type, distinct from Glyph's
 * question by indentation and the lime rule, not by a coloured box.
 */
export function PatientMessage({
  message,
  source,
  attendantRelation,
  interim = false,
}: PatientMessageProps) {
  const badgeLabel =
    source === "patient"
      ? "রোগী"
      : attendantRelation
        ? `সাথে · ${attendantRelation}`
        : "সাথে";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="border-l-2 border-glyph-400 pl-4">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-clinical-muted">
          {badgeLabel}
        </p>
        <p
          className={cn(
            "font-bangla text-lg leading-[1.7]",
            interim ? "text-clinical-muted" : "text-clinical-text"
          )}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
