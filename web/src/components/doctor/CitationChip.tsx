"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** Citation source types supported by the research chat. */
export type CitationType = "uptodate" | "pubmed" | "web" | "model";

export interface CitationChipProps {
  /** The type of citation source. */
  type: CitationType;
  /** Display title of the source. */
  title: string;
  /** Optional URL to the original source. */
  url?: string;
  /** Called when the chip is tapped to expand or navigate. */
  onTap?: () => void;
  className?: string;
}

/** Visual configuration for each citation type. */
const CITATION_CONFIG: Record<
  CitationType,
  { color: string; icon: string; label: string }
> = {
  uptodate: {
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: "U",
    label: "UpToDate",
  },
  pubmed: {
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "P",
    label: "PubMed",
  },
  web: {
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: "W",
    label: "Web",
  },
  model: {
    color: "bg-green-100 text-green-800 border-green-200",
    icon: "AI",
    label: "AI Model",
  },
};

/**
 * Small chip showing a citation in the AI research chat.
 *
 * Types and their colors:
 * - **UpToDate** (orange) -- clinical decision support reference
 * - **PubMed** (blue) -- peer-reviewed medical literature
 * - **Web** (gray) -- general web source
 * - **Model** (green) -- AI model's own knowledge
 *
 * Tappable to expand the citation details or open the source URL.
 *
 * @example
 * ```tsx
 * <CitationChip
 *   type="pubmed"
 *   title="Management of Type 2 Diabetes (2024)"
 *   url="https://pubmed.ncbi.nlm.nih.gov/12345678"
 *   onTap={() => expandCitation(id)}
 * />
 * ```
 */
export function CitationChip({
  type,
  title,
  url,
  onTap,
  className,
}: CitationChipProps) {
  const config = CITATION_CONFIG[type];

  const handleClick = () => {
    if (onTap) {
      onTap();
    } else if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex max-w-xs items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-opacity hover:opacity-80",
        config.color,
        className
      )}
      title={title}
      aria-label={`${config.label}: ${title}`}
    >
      {/* Source type badge */}
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold opacity-70">
        {config.icon}
      </span>
      {/* Title, truncated */}
      <span className="truncate">{title}</span>
      {/* External link indicator */}
      {url && (
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
          className="shrink-0 opacity-50"
          aria-hidden="true"
        >
          <path d="M7 7h10v10" />
          <path d="M7 17 17 7" />
        </svg>
      )}
    </button>
  );
}
