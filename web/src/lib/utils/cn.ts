import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and resolves Tailwind CSS conflicts with tailwind-merge.
 *
 * @param inputs - Any number of class values (strings, arrays, objects, conditionals)
 * @returns A single merged class string with Tailwind conflicts resolved
 *
 * @example
 * ```tsx
 * cn("px-4 py-2", isActive && "bg-glyph-600", className)
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
