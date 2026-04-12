"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** A single red flag item. */
export interface RedFlag {
  /** Unique identifier for the flag. */
  id: string;
  /** Short flag text, e.g., "Chest pain at rest". */
  text: string;
  /** Clinical reasoning for why this is a red flag. */
  reasoning: string;
}

export interface RedFlagAlertProps {
  /** One or more red flag findings. */
  flags: RedFlag[];
  /** Called when the user dismisses a specific flag. */
  onDismiss?: (flagId: string) => void;
  className?: string;
}

/**
 * Warning badge/banner for critical clinical findings.
 *
 * Renders a prominent red background with white text to draw immediate
 * attention to potentially dangerous findings. Each flag shows a short
 * description and expandable reasoning. Can be dismissed by the doctor
 * once acknowledged.
 *
 * Follows the clinical principle: red flags should never be hidden
 * or require scrolling to discover.
 *
 * @example
 * ```tsx
 * <RedFlagAlert
 *   flags={[
 *     { id: "1", text: "Chest pain at rest", reasoning: "Reported by patient during intake." },
 *   ]}
 *   onDismiss={(id) => dismissFlag(id)}
 * />
 * ```
 */
export function RedFlagAlert({ flags, onDismiss, className }: RedFlagAlertProps) {
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());

  const visibleFlags = flags.filter((f) => !dismissed.has(f.id));

  if (visibleFlags.length === 0) return null;

  const handleDismiss = (flagId: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(flagId);
      return next;
    });
    onDismiss?.(flagId);
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-red-300 bg-red-600 p-3 shadow-md",
        className
      )}
      role="alert"
      aria-label="Red flag clinical alerts"
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
        <span className="text-sm font-bold text-white">
          Red Flag{visibleFlags.length > 1 ? "s" : ""} ({visibleFlags.length})
        </span>
      </div>

      {/* Flag items */}
      <ul className="space-y-2">
        {visibleFlags.map((flag) => (
          <li
            key={flag.id}
            className="flex items-start justify-between gap-2 rounded-md bg-red-700/60 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{flag.text}</p>
              <p className="mt-0.5 text-xs text-red-100">{flag.reasoning}</p>
            </div>
            {onDismiss && (
              <button
                type="button"
                onClick={() => handleDismiss(flag.id)}
                className="shrink-0 rounded p-1 text-red-200 transition hover:bg-red-500 hover:text-white"
                aria-label={`Dismiss: ${flag.text}`}
              >
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
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
