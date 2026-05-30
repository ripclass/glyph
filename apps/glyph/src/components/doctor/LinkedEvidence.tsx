"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { SourceType } from "@/components/doctor/SourceTag";

/** A single piece of source evidence linked to a clinical claim. */
export interface EvidenceItem {
  /** Unique identifier. */
  id: string;
  /** Source type (mirrors SourceTag types). */
  sourceType: SourceType;
  /** Human-readable source label. */
  sourceLabel: string;
  /** The original content -- transcript excerpt, photo crop description, citation text. */
  content: string;
  /** ISO timestamp of when this evidence was captured. */
  timestamp: string;
  /** Confidence level of the extraction / claim. */
  confidence: "high" | "medium" | "low";
  /** Additional context or surrounding text. */
  fullContext?: string;
}

export interface LinkedEvidenceProps {
  /** Whether the panel is visible. */
  open: boolean;
  /** The evidence item to display. */
  evidence: EvidenceItem | null;
  /** Called when the panel should close. */
  onClose: () => void;
  className?: string;
}

/** Confidence level visual configuration. */
const CONFIDENCE_MAP: Record<
  EvidenceItem["confidence"],
  { label: string; className: string }
> = {
  high: { label: "High confidence", className: "text-green-700 bg-green-100" },
  medium: {
    label: "Medium confidence",
    className: "text-amber-700 bg-amber-100",
  },
  low: { label: "Low confidence", className: "text-red-700 bg-red-100" },
};

/** Source type colors (matching SourceTag). */
const SOURCE_COLORS: Record<SourceType, string> = {
  patient: "border-blue-300 bg-blue-50",
  attendant: "border-amber-300 bg-amber-50",
  rx_photo: "border-purple-300 bg-purple-50",
  lab_report: "border-teal-300 bg-teal-50",
  uptodate: "border-orange-300 bg-orange-50",
  pubmed: "border-gray-300 bg-gray-50",
};

/**
 * Linked Evidence slide-in panel -- Abridge pattern.
 *
 * When a doctor taps a SourceTag on any clinical claim, this panel
 * slides in from the right showing:
 * - The original source content (transcript excerpt, photo crop, citation)
 * - Timestamp of when the evidence was captured
 * - Confidence level of the extraction
 * - Full surrounding context for verification
 *
 * This follows the "trust but verify" principle: every AI-generated
 * claim must be traceable back to its source.
 *
 * @example
 * ```tsx
 * <LinkedEvidence
 *   open={showEvidence}
 *   evidence={selectedEvidence}
 *   onClose={() => setShowEvidence(false)}
 * />
 * ```
 */
export function LinkedEvidence({
  open,
  evidence,
  onClose,
  className,
}: LinkedEvidenceProps) {
  // Close on Escape key
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!evidence) return null;

  const confidenceConfig = CONFIDENCE_MAP[evidence.confidence];
  const sourceColor = SOURCE_COLORS[evidence.sourceType];

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-in panel */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Linked Evidence"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Linked Evidence
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close evidence panel"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Source type + timestamp */}
          <div className="mb-4 flex items-center justify-between">
            <span
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-semibold",
                sourceColor
              )}
            >
              {evidence.sourceLabel}
            </span>
            <time className="text-xs text-slate-400" dateTime={evidence.timestamp}>
              {formatTimestamp(evidence.timestamp)}
            </time>
          </div>

          {/* Confidence */}
          <div className="mb-4">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                confidenceConfig.className
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  evidence.confidence === "high"
                    ? "bg-green-600"
                    : evidence.confidence === "medium"
                      ? "bg-amber-600"
                      : "bg-red-600"
                )}
                aria-hidden="true"
              />
              {confidenceConfig.label}
            </span>
          </div>

          {/* Original content */}
          <div className="mb-4">
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Original Source
            </h3>
            <blockquote className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700 italic">
              &ldquo;{evidence.content}&rdquo;
            </blockquote>
          </div>

          {/* Full context */}
          {evidence.fullContext && (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Full Context
              </h3>
              <p className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                {evidence.fullContext}
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

/**
 * Formats an ISO timestamp into a human-readable string.
 */
function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleString("en-BD", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
