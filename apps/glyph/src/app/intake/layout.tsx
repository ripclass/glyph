"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Intake layout: patient-facing, voice-first UI with minimal chrome.
 *
 * Renders full-height with large text optimized for accessibility.
 * Bangla is the primary language. A top bar shows the Glyph logo and
 * a language toggle (Bangla / English). All child pages inherit the
 * warm, large-font environment.
 */
export default function IntakeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: replace with i18n context provider
  const [lang, setLang] = useState<"bn" | "en">("bn");

  return (
    <div className="flex min-h-[100dvh] flex-col bg-clinical-bg">
      {/* ---------- Top bar ---------- */}
      <header className="flex items-center justify-between border-b border-clinical-border bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Glyph logo mark */}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-glyph-600"
            aria-hidden="true"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-glyph-800">Glyph</span>
        </div>

        {/* Language toggle */}
        <button
          type="button"
          onClick={() => setLang((prev) => (prev === "bn" ? "en" : "bn"))}
          className={cn(
            "rounded-full border border-clinical-border px-4 py-1.5 text-sm font-medium transition-colors",
            "hover:bg-glyph-50 active:bg-glyph-100"
          )}
          aria-label={
            lang === "bn"
              ? "Switch to English"
              : "বাংলায় পরিবর্তন করুন"
          }
        >
          {lang === "bn" ? "EN" : "বাংলা"}
        </button>
      </header>

      {/* ---------- Page content ---------- */}
      <main className="flex flex-1 flex-col overflow-hidden text-lg">
        {children}
      </main>
    </div>
  );
}
