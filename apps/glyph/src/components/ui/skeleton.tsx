import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Loading skeleton placeholder with shimmer animation.
 * Used for all async content loading states throughout the app.
 *
 * Apply width/height via className or inline styles to match
 * the shape of the content being loaded.
 *
 * @example
 * ```tsx
 * // Text line skeleton
 * <Skeleton className="h-4 w-3/4" />
 *
 * // Avatar skeleton
 * <Skeleton className="h-12 w-12 rounded-full" />
 *
 * // Card skeleton
 * <div className="space-y-3">
 *   <Skeleton className="h-5 w-2/5" />
 *   <Skeleton className="h-4 w-full" />
 *   <Skeleton className="h-4 w-4/5" />
 * </div>
 * ```
 */
const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative isolate overflow-hidden rounded-md bg-muted",
      "before:absolute before:inset-0",
      "before:-translate-x-full before:animate-[shimmer_2s_infinite]",
      "before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent",
      className
    )}
    aria-hidden="true"
    {...props}
  />
));
Skeleton.displayName = "Skeleton";

export { Skeleton };
