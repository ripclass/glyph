"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Locale = "bn" | "en";

const STORAGE_KEY = "glyph-locale";

/**
 * Language toggle between Bangla (bn) and English (en).
 * Persists the user's preference in localStorage and updates the document's lang attribute.
 *
 * Renders as a compact pill toggle suitable for headers and settings panels.
 *
 * @example
 * ```tsx
 * <LanguageToggle onChange={(locale) => setLocale(locale)} />
 * ```
 */
function LanguageToggle({
  className,
  defaultLocale,
  onChange,
}: {
  className?: string;
  /** Override the initial locale (otherwise reads from localStorage, defaulting to "bn"). */
  defaultLocale?: Locale;
  /** Called when the user switches language. */
  onChange?: (locale: Locale) => void;
}) {
  const [locale, setLocale] = React.useState<Locale>(() => {
    if (defaultLocale) return defaultLocale;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "bn" || stored === "en") return stored;
    }
    return "bn";
  });

  // Sync to localStorage and document lang on change
  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const toggle = () => {
    const next: Locale = locale === "bn" ? "en" : "bn";
    setLocale(next);
    onChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={locale === "en"}
      aria-label={`Switch language. Currently ${locale === "bn" ? "Bangla" : "English"}`}
      onClick={toggle}
      className={cn(
        "relative inline-flex h-8 w-[88px] shrink-0 cursor-pointer items-center rounded-full border border-clinical-border bg-clinical-surface p-0.5 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glyph-500 focus-visible:ring-offset-2",
        className
      )}
    >
      {/* Sliding indicator */}
      <span
        className={cn(
          "pointer-events-none absolute h-7 w-[42px] rounded-full bg-glyph-600 shadow-sm transition-transform duration-200",
          locale === "en" ? "translate-x-[42px]" : "translate-x-0"
        )}
      />
      {/* Labels */}
      <span
        className={cn(
          "relative z-10 flex h-full w-[42px] items-center justify-center text-xs font-semibold transition-colors",
          locale === "bn" ? "text-white" : "text-clinical-muted"
        )}
      >
        বাং
      </span>
      <span
        className={cn(
          "relative z-10 flex h-full w-[42px] items-center justify-center text-xs font-semibold transition-colors",
          locale === "en" ? "text-white" : "text-clinical-muted"
        )}
      >
        EN
      </span>
    </button>
  );
}

export { LanguageToggle };
export type { Locale };
