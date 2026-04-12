"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Displays text that streams in word-by-word with a blinking cursor at the end.
 * Uses the `.streaming-cursor` CSS class defined in globals.css for the cursor effect.
 *
 * Ideal for displaying AI-generated clinical notes as they arrive,
 * giving doctors visual feedback that processing is in progress.
 *
 * @example
 * ```tsx
 * <LoadingStream
 *   text="রোগী ৪৫ বছর বয়সী পুরুষ, প্রধান অভিযোগ বুকে ব্যথা।"
 *   speed={80}
 *   onComplete={() => setIsStreaming(false)}
 * />
 * ```
 */
function LoadingStream({
  text,
  speed = 60,
  onComplete,
  className,
}: {
  /** The full text to stream in word-by-word. */
  text: string;
  /** Milliseconds between each word appearing. Defaults to 60ms. */
  speed?: number;
  /** Called once all words have been rendered. */
  onComplete?: () => void;
  className?: string;
}) {
  const [visibleCount, setVisibleCount] = React.useState(0);
  const words = React.useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const isComplete = visibleCount >= words.length;
  const onCompleteRef = React.useRef(onComplete);

  // Keep callback ref fresh without re-triggering the effect
  React.useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Reset when text changes
  React.useEffect(() => {
    setVisibleCount(0);
  }, [text]);

  // Stream words in one at a time
  React.useEffect(() => {
    if (words.length === 0) return;

    const timer = setInterval(() => {
      setVisibleCount((prev) => {
        const next = prev + 1;
        if (next >= words.length) {
          clearInterval(timer);
          // Defer callback to avoid setState-during-render in parent
          queueMicrotask(() => onCompleteRef.current?.());
          return words.length;
        }
        return next;
      });
    }, speed);

    return () => clearInterval(timer);
  }, [words, speed]);

  if (words.length === 0) return null;

  return (
    <span className={cn("inline", className)}>
      <span>{words.slice(0, visibleCount).join(" ")}</span>
      {!isComplete && (
        <span className="streaming-cursor" aria-hidden="true" />
      )}
    </span>
  );
}

export { LoadingStream };
