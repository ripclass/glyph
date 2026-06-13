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
  | "pubmed"
  | "ai_assessment";

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

/**
 * Epistemic colour logic (anchored design): a claim is tagged not by an
 * arbitrary per-source colour but by WHERE its authority comes from. Three
 * groups, mapped to the palette so the briefing reads coherent and scans by
 * category, not rainbow:
 *
 *   reported  — a person said this (patient / attendant). Warm ink/amber.
 *   document  — a paper says this (Rx photo / lab report). Quiet neutral.
 *   evidence  — the literature says this (UpToDate / PubMed). Lime, the
 *               trust accent: cited evidence is the thing Glyph makes visible.
 */
type Group = "reported-self" | "reported-other" | "document" | "evidence" | "ai";

const GROUP_CLASS: Record<Group, string> = {
  "reported-self": "bg-clinical-bg text-ink-soft border-clinical-border",
  "reported-other": "bg-amber-50 text-amber-800 border-amber-200",
  document: "bg-clinical-bg text-ink-soft border-clinical-border",
  evidence: "bg-glyph-100 text-glyph-800 border-glyph-300",
  // AI's own reasoning is NOT a citation — neutral and dashed, never lime,
  // so it can never be mistaken for cited evidence.
  ai: "bg-clinical-bg text-ink-faint border-dashed border-clinical-border",
};

const SOURCE_CONFIG: Record<
  SourceType,
  { label: string; group: Group; icon: React.ReactNode }
> = {
  patient: { label: "Per patient", group: "reported-self", icon: <PersonIcon /> },
  attendant: { label: "Per attendant", group: "reported-other", icon: <PeopleIcon /> },
  rx_photo: { label: "From Rx photo", group: "document", icon: <DocIcon /> },
  lab_report: { label: "From lab report", group: "document", icon: <FlaskIcon /> },
  uptodate: { label: "UpToDate", group: "evidence", icon: <BookIcon /> },
  pubmed: { label: "PubMed", group: "evidence", icon: <BookIcon /> },
  ai_assessment: { label: "AI assessment", group: "ai", icon: <SparkIcon /> },
};

/**
 * Small inline tag showing the source of a clinical claim, coloured by
 * epistemic group (see above) and distinguished within a group by its icon.
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
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight transition-opacity hover:opacity-75",
        GROUP_CLASS[config.group],
        onTap ? "cursor-pointer" : "cursor-default",
        className
      )}
      aria-label={`Source: ${displayLabel}`}
    >
      {config.icon}
      {displayLabel}
    </button>
  );
}

/* ── Icons (10px, currentColor) ── */

function iconProps() {
  return {
    width: 10,
    height: 10,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

function PersonIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}
function FlaskIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M10 2v7.5L4.5 19a1 1 0 0 0 .9 1.5h13.2a1 1 0 0 0 .9-1.5L14 9.5V2" />
      <path d="M8.5 2h7" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  );
}
