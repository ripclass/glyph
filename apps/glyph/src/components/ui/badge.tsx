import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-glyph-600 text-white",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline:
          "border-clinical-border text-clinical-text",
        warning:
          "border-transparent bg-amber-100 text-amber-800",
        success:
          "border-transparent bg-green-100 text-green-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/**
 * Badge component for status chips, tags, and clinical red-flag alerts.
 *
 * Use the `destructive` variant for red-flag clinical alerts.
 * Use `warning` (amber) for caution indicators.
 * Use `success` (green) for positive status indicators.
 *
 * @example
 * ```tsx
 * <Badge variant="destructive">Red Flag</Badge>
 * <Badge variant="warning">Follow-up Needed</Badge>
 * <Badge variant="success">Stable</Badge>
 * ```
 */
const Badge = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>
>(({ className, variant, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(badgeVariants({ variant }), className)}
    {...props}
  />
));
Badge.displayName = "Badge";

export { Badge, badgeVariants };
