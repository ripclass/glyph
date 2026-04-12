"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface AmbientRecorderProps {
  /** Whether recording is currently active. */
  isRecording: boolean;
  /** Elapsed recording time in seconds. */
  elapsedSeconds: number;
  /** Called when the user toggles pause/resume. */
  onTogglePause: () => void;
  /** Whether recording is currently paused (still counting but not capturing). */
  isPaused?: boolean;
  className?: string;
}

/**
 * Invisible ambient recording indicator bar.
 *
 * Follows the "ambient invisibility" principle -- minimal, non-intrusive UI
 * that sits at the bottom of the consultation view. Shows:
 * - Small red dot when actively recording
 * - Duration counter (HH:MM:SS)
 * - Subtle pause button
 * - Minimal waveform visualization
 *
 * The design is deliberately restrained so it does not distract
 * from the clinical interaction.
 *
 * @example
 * ```tsx
 * <AmbientRecorder
 *   isRecording={true}
 *   elapsedSeconds={345}
 *   isPaused={false}
 *   onTogglePause={() => toggleRecording()}
 * />
 * ```
 */
export function AmbientRecorder({
  isRecording,
  elapsedSeconds,
  onTogglePause,
  isPaused = false,
  className,
}: AmbientRecorderProps) {
  if (!isRecording) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-t-lg border-t border-slate-200 bg-slate-900 px-4 py-2",
        className
      )}
      role="status"
      aria-label={
        isPaused
          ? "Recording paused"
          : `Recording in progress, ${formatDuration(elapsedSeconds)}`
      }
    >
      {/* Left: Recording indicator + duration */}
      <div className="flex items-center gap-3">
        {/* Red dot -- pulses when active, static when paused */}
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
          )}
          aria-hidden="true"
        />
        <span className="font-mono text-xs text-slate-300">
          {formatDuration(elapsedSeconds)}
        </span>
        <span className="text-[10px] text-slate-500">
          {isPaused ? "PAUSED" : "REC"}
        </span>
      </div>

      {/* Center: Waveform visualization */}
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <WaveformBar key={i} index={i} active={!isPaused} />
        ))}
      </div>

      {/* Right: Pause button */}
      <button
        type="button"
        onClick={onTogglePause}
        className="flex h-7 items-center gap-1.5 rounded-md border border-slate-700 px-2.5 text-xs text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
        aria-label={isPaused ? "Resume recording" : "Pause recording"}
      >
        {isPaused ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
            Resume
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
            Pause
          </>
        )}
      </button>
    </div>
  );
}

/**
 * Individual waveform bar with pseudo-random animation.
 */
function WaveformBar({ index, active }: { index: number; active: boolean }) {
  // Use index to create varied heights and animation delays
  const heights = [12, 18, 8, 22, 14, 20, 10, 24, 16, 6, 19, 13];
  const height = heights[index % heights.length];

  return (
    <span
      className={cn(
        "w-0.5 rounded-full bg-slate-600 transition-all duration-300",
        active && "animate-pulse"
      )}
      style={{
        height: active ? `${height}px` : "4px",
        animationDelay: `${index * 100}ms`,
      }}
    />
  );
}

/**
 * Formats seconds into HH:MM:SS display.
 */
function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}
