import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Standard text input with glyph-green focus ring.
 * Supports an error state that applies a red border and red focus ring.
 *
 * @example
 * ```tsx
 * <Input
 *   placeholder="Patient name"
 *   error={!!errors.name}
 *   aria-describedby="name-error"
 * />
 * ```
 */
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    /** Applies destructive styling for validation errors. */
    error?: boolean;
  }
>(({ className, type = "text", error = false, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border bg-clinical-surface px-3 py-2 text-sm ring-offset-background",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-clinical-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        error
          ? "border-destructive focus-visible:ring-destructive"
          : "border-clinical-border focus-visible:ring-glyph-500",
        className
      )}
      ref={ref}
      aria-invalid={error || undefined}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
