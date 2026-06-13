import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** Evidence grade from UpToDate. */
export type EvidenceGrade = "1A" | "1B" | "1C" | "2A" | "2B" | "2C";

/** A single recommendation from an UpToDate topic. */
export interface UpToDateRecommendation {
  id: string;
  text: string;
  grade: EvidenceGrade;
}

export interface UpToDatePanelProps {
  /** Title of the UpToDate topic. */
  topicTitle: string;
  /** Key recommendations from this topic. */
  recommendations: UpToDateRecommendation[];
  /** Link to the full UpToDate article. */
  articleUrl?: string;
  /** Last updated date of the topic. */
  lastUpdated?: string;
  className?: string;
}

/** Evidence grade color mapping. */
const GRADE_COLORS: Record<EvidenceGrade, string> = {
  "1A": "bg-glyph-100 text-glyph-800",
  "1B": "bg-glyph-50 text-glyph-700",
  "1C": "bg-glyph-50 text-glyph-700",
  "2A": "bg-amber-100 text-amber-800",
  "2B": "bg-amber-50 text-amber-700",
  "2C": "bg-amber-100 text-amber-800",
};

/**
 * Embedded UpToDate evidence panel.
 *
 * Displays clinical decision support content from UpToDate:
 * - Topic title with "Powered by UpToDate" attribution
 * - Key recommendations with evidence grades (1A-2C)
 * - Link to the full UpToDate article
 * - Last updated date
 *
 * This is a placeholder implementation. Real integration requires
 * an UpToDate API key and content licensing agreement.
 *
 * @example
 * ```tsx
 * <UpToDatePanel
 *   topicTitle="Type 2 Diabetes Mellitus: Treatment"
 *   recommendations={[
 *     { id: "1", text: "Metformin as first-line therapy", grade: "1A" },
 *   ]}
 *   articleUrl="https://www.uptodate.com/contents/..."
 * />
 * ```
 */
export function UpToDatePanel({
  topicTitle,
  recommendations,
  articleUrl,
  lastUpdated,
  className,
}: UpToDatePanelProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-glyph-300 bg-glyph-50/60 shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="border-b border-glyph-300/70 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-clinical-text">{topicTitle}</h3>
          <span className="shrink-0 rounded-full bg-glyph-200 px-2 py-0.5 text-[10px] font-semibold text-glyph-800">
            UpToDate
          </span>
        </div>
        {lastUpdated && (
          <p className="mt-1 text-[10px] text-slate-400">
            Last updated: {lastUpdated}
          </p>
        )}
      </div>

      {/* Recommendations */}
      <div className="px-4 py-3">
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Key Recommendations
        </h4>
        <ul className="space-y-2">
          {recommendations.map((rec) => (
            <li key={rec.id} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold",
                  GRADE_COLORS[rec.grade]
                )}
                title={`Evidence grade ${rec.grade}`}
              >
                {rec.grade}
              </span>
              <p className="text-xs leading-relaxed text-slate-700">{rec.text}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-glyph-300/70 px-4 py-2.5">
        <span className="text-[10px] text-slate-400">
          Powered by UpToDate&reg;
        </span>
        {articleUrl && (
          <a
            href={articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-medium text-glyph-700 transition hover:text-clinical-text"
          >
            View full article
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
              <path d="M7 7h10v10" />
              <path d="M7 17 17 7" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
