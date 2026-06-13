import React from "react";
import { cn } from "@/lib/utils/cn";

interface SaaraMessageProps {
  /** The AI message text to display. */
  message: string;
  /** Whether the message is currently being streamed in. */
  isStreaming?: boolean;
  /** The most recent Glyph turn is given more presence (calm-presence layout). */
  emphasized?: boolean;
}

/**
 * Glyph's turn in the intake conversation — editorial, not a chat bubble.
 *
 * Calm-presence design: a small lime-dot + "Glyph" label, then the question
 * in large, warm Bangla type with generous leading. The most recent turn
 * (emphasized) is larger, so the patient always sees the question being asked
 * as the focus of the screen.
 *
 * Sender label is NEVER "Saara": the soul behind Glyph is internal design
 * language only and must not appear in rendered copy (CLAUDE.md §12).
 */
export function SaaraMessage({
  message,
  isStreaming = false,
  emphasized = false,
}: SaaraMessageProps) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-clinical-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-glyph-400" />
        Glyph
      </p>
      <p
        className={cn(
          "font-bangla text-clinical-text",
          emphasized
            ? "text-2xl leading-[1.7] md:text-[28px]"
            : "text-lg leading-[1.7] text-clinical-text/80",
          isStreaming && "streaming-cursor"
        )}
      >
        {message || (
          <span className="inline-flex gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-glyph-400" />
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-glyph-400"
              style={{ animationDelay: "0.2s" }}
            />
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-glyph-400"
              style={{ animationDelay: "0.4s" }}
            />
          </span>
        )}
      </p>
    </div>
  );
}
