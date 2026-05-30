"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * Intake Step 1 -- "Are you the patient or attendant?"
 *
 * Two large, full-width buttons with Bangla primary text and English subtitles.
 * Stores the user's role choice and navigates to `/intake/history`.
 */
export default function IntakeRolePage() {
  const router = useRouter();

  const handleChoice = useCallback(
    (role: "patient" | "attendant") => {
      // TODO: persist role in Zustand store / session context
      if (typeof window !== "undefined") {
        sessionStorage.setItem("intake_role", role);
      }
      router.push("/intake/history");
    },
    [router]
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      {/* Heading */}
      <div className="mb-10 text-center">
        {/* TODO: i18n key intake.role.heading */}
        <h1 className="font-bangla text-3xl font-bold leading-snug text-clinical-text">
          আপনি কে?
        </h1>
        <p className="mt-2 text-base text-clinical-muted">
          {/* TODO: i18n key intake.role.subtitle */}
          Who are you?
        </p>
      </div>

      {/* Choice buttons */}
      <div className="flex w-full max-w-md flex-col gap-5">
        {/* Patient */}
        <button
          type="button"
          onClick={() => handleChoice("patient")}
          className={cn(
            "group flex items-center gap-5 rounded-2xl border-2 border-glyph-200 bg-white px-6 py-7 shadow-sm transition",
            "hover:border-glyph-400 hover:shadow-md active:scale-[0.98]"
          )}
        >
          {/* Patient icon */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-glyph-100 text-glyph-700 transition group-hover:bg-glyph-200">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="text-left">
            {/* TODO: i18n key intake.role.patient */}
            <span className="block font-bangla text-2xl font-semibold text-clinical-text">
              আমি রোগী
            </span>
            <span className="mt-1 block text-sm text-clinical-muted">
              I am the patient
            </span>
          </div>
        </button>

        {/* Attendant */}
        <button
          type="button"
          onClick={() => handleChoice("attendant")}
          className={cn(
            "group flex items-center gap-5 rounded-2xl border-2 border-glyph-200 bg-white px-6 py-7 shadow-sm transition",
            "hover:border-glyph-400 hover:shadow-md active:scale-[0.98]"
          )}
        >
          {/* Attendant icon */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 transition group-hover:bg-amber-200">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="text-left">
            {/* TODO: i18n key intake.role.attendant */}
            <span className="block font-bangla text-2xl font-semibold text-clinical-text">
              আমি সাথে এসেছি
            </span>
            <span className="mt-1 block text-sm text-clinical-muted">
              I am the attendant
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
