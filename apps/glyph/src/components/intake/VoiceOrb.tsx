"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

interface VoiceOrbProps {
  /** Current state of the voice orb. */
  state: "idle" | "listening" | "processing";
  /** Fired when the user presses (touch/mouse down) the orb. */
  onPress: () => void;
  /** Fired when the user releases (touch/mouse up) the orb. */
  onRelease: () => void;
}

/**
 * THE primary interaction element for the voice-first intake experience.
 *
 * A 120px circular button that serves as the push-to-talk control.
 *
 * **States:**
 * - `idle` -- green circle with mic icon, subtle glow
 * - `listening` -- pulsing animation, brighter glow, "Listening..." text
 * - `processing` -- spinning animation indicating transcription in progress
 *
 * Designed for large touch targets on mobile devices. Uses `onPointerDown`
 * and `onPointerUp` for unified touch/mouse handling.
 */
export function VoiceOrb({ state, onPress, onRelease }: VoiceOrbProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onPointerDown={onPress}
        onPointerUp={onRelease}
        onPointerCancel={onRelease}
        disabled={state === "processing"}
        aria-label={
          state === "idle"
            ? "Hold to speak"
            : state === "listening"
              ? "Release to send"
              : "Processing your speech"
        }
        className={cn(
          "relative flex h-[120px] w-[120px] items-center justify-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-glyph-300",
          // idle
          state === "idle" && [
            "bg-glyph-500 text-white shadow-lg",
            "hover:bg-glyph-600 active:scale-95",
            "animate-orb-glow",
          ],
          // listening
          state === "listening" && [
            "bg-glyph-400 text-white shadow-xl",
            "scale-110",
          ],
          // processing
          state === "processing" && [
            "bg-glyph-300 text-white shadow-md",
            "cursor-wait",
          ]
        )}
      >
        {/* Pulsing rings for listening state */}
        {state === "listening" && (
          <>
            <span className="absolute inset-0 animate-ping rounded-full bg-glyph-400 opacity-20" />
            <span className="absolute -inset-3 animate-pulse rounded-full border-2 border-glyph-300 opacity-40" />
          </>
        )}

        {/* Icon */}
        {state === "processing" ? (
          /* Spinner */
          <svg
            className="h-10 w-10 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              className="opacity-25"
            />
            <path
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              fill="currentColor"
              className="opacity-75"
            />
          </svg>
        ) : (
          /* Mic icon */
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        )}
      </button>

      {/* State label */}
      <span
        className={cn(
          "font-bangla text-sm font-medium transition-opacity",
          state === "listening"
            ? "animate-pulse text-glyph-600"
            : state === "processing"
              ? "text-clinical-muted"
              : "text-transparent"
        )}
        aria-live="polite"
      >
        {state === "listening" && (
          // TODO: i18n key intake.voiceOrb.listening
          <>শুনছি...</>
        )}
        {state === "processing" && (
          // TODO: i18n key intake.voiceOrb.processing
          <>প্রক্রিয়া করছি...</>
        )}
      </span>
    </div>
  );
}
