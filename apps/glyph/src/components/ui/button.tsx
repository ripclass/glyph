"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "bg-glyph-600 text-white shadow hover:bg-glyph-700 active:bg-glyph-800",
        /* The lime accent — high-emphasis positive actions (approve, confirm) */
        accent:
          "bg-glyph-400 text-glyph-600 shadow hover:bg-glyph-500",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-clinical-text/20 bg-transparent font-medium text-clinical-text hover:border-clinical-text/50",
        ghost:
          "font-medium hover:bg-secondary hover:text-secondary-foreground",
        link: "font-medium text-clinical-text underline decoration-glyph-400 decoration-2 underline-offset-4 hover:decoration-glyph-500",
      },
      size: {
        sm: "h-8 px-4 text-xs",
        default: "h-10 px-5 py-2",
        lg: "h-12 px-7 text-base",
        xl: "h-14 px-9 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

/**
 * Primary button component for clinical workflows.
 *
 * Anchored design: pill-shaped, ink default (glyph-600 maps to ink),
 * `accent` variant is the lime high-emphasis action (approve/confirm).
 * Supports loading state with an inline spinner, disabling interaction during async operations.
 * The `xl` size variant is designed for patient-facing touch targets.
 *
 * @example
 * ```tsx
 * <Button variant="default" size="lg" loading={isSaving}>
 *   Save Note
 * </Button>
 * ```
 */
const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof buttonVariants> & {
      /** Renders a spinner and disables the button. */
      loading?: boolean;
    }
>(({ className, variant, size, loading = false, disabled, children, ...props }, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
