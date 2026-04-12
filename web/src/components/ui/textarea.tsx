"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Textarea component for clinical note editing.
 * Supports auto-resize that grows with content and an error state.
 *
 * @example
 * ```tsx
 * <Textarea
 *   autoResize
 *   placeholder="Enter clinical notes..."
 *   rows={4}
 * />
 * ```
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    /** Automatically grow the textarea height to fit content. */
    autoResize?: boolean;
    /** Applies destructive styling for validation errors. */
    error?: boolean;
  }
>(({ className, autoResize = false, error = false, onChange, ...props }, ref) => {
  const internalRef = React.useRef<HTMLTextAreaElement | null>(null);

  const setRef = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      internalRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }
    },
    [ref]
  );

  const adjustHeight = React.useCallback(() => {
    const textarea = internalRef.current;
    if (!textarea || !autoResize) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [autoResize]);

  // Adjust on mount for pre-filled content
  React.useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    adjustHeight();
    onChange?.(e);
  };

  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border bg-clinical-surface px-3 py-2 text-sm ring-offset-background",
        "placeholder:text-clinical-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        autoResize && "resize-none overflow-hidden",
        error
          ? "border-destructive focus-visible:ring-destructive"
          : "border-clinical-border focus-visible:ring-glyph-500",
        className
      )}
      ref={setRef}
      onChange={handleChange}
      aria-invalid={error || undefined}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
