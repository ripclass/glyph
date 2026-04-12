import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const logoVariants = cva("flex flex-col items-start leading-none select-none", {
  variants: {
    size: {
      sm: "",
      default: "",
      lg: "",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

const titleSizeMap = {
  sm: "text-lg",
  default: "text-2xl",
  lg: "text-4xl",
} as const;

const subtitleSizeMap = {
  sm: "text-[10px]",
  default: "text-xs",
  lg: "text-sm",
} as const;

/**
 * Glyph brand logo component.
 * Renders "Glyph" in bold glyph-green with a "by KhaM Health" subtitle.
 *
 * @example
 * ```tsx
 * <Logo size="lg" />
 * <Logo size="sm" className="opacity-80" />
 * ```
 */
const Logo = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof logoVariants>
>(({ className, size = "default", ...props }, ref) => {
  const resolvedSize = size ?? "default";

  return (
    <div
      ref={ref}
      className={cn(logoVariants({ size }), className)}
      aria-label="Glyph by KhaM Health"
      {...props}
    >
      <span
        className={cn(
          "font-bold tracking-tight text-glyph-600",
          titleSizeMap[resolvedSize]
        )}
      >
        Glyph
      </span>
      <span
        className={cn(
          "font-medium text-clinical-muted tracking-wide",
          subtitleSizeMap[resolvedSize]
        )}
      >
        by KhaM Health
      </span>
    </div>
  );
});
Logo.displayName = "Logo";

export { Logo };
