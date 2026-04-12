import React from "react";
import { cn } from "@/lib/utils/cn";

interface SaaraMessageProps {
  /** The AI message text to display. */
  message: string;
  /** Whether the message is currently being streamed in. */
  isStreaming?: boolean;
}

/**
 * AI conversation bubble for the Saara clinical assistant.
 *
 * Left-aligned with a soft green background. Displays the AI's message
 * in Bangla. When `isStreaming` is true, a blinking cursor is appended
 * to indicate that text is still arriving.
 */
export function SaaraMessage({ message, isStreaming = false }: SaaraMessageProps) {
  return (
    <div className="flex items-start gap-2.5">
      {/* Avatar */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-glyph-100 text-glyph-700"
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
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl rounded-tl-sm bg-glyph-50 px-4 py-3",
          "border border-glyph-100"
        )}
      >
        {/* Sender label */}
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-glyph-600">
          Saara
        </p>

        {/* Message body */}
        <p
          className={cn(
            "font-bangla text-base leading-relaxed text-clinical-text",
            isStreaming && "streaming-cursor"
          )}
        >
          {message || (
            <span className="inline-block h-4 w-4 animate-pulse rounded-full bg-glyph-300" />
          )}
        </p>
      </div>
    </div>
  );
}
