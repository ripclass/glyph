"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { DocumentCapture } from "@/components/intake/DocumentCapture";

/** A captured document entry. */
interface CapturedDoc {
  id: string;
  type: "prescription" | "lab_report";
  dataUrl: string;
  capturedAt: Date;
}

/**
 * Intake Step 2 -- Document capture page.
 *
 * Lets the patient photograph prescriptions and lab reports using the
 * device camera. Shows a live viewfinder with capture controls, plus a
 * scrollable list of already-captured documents. Skip and Continue buttons
 * at the bottom allow moving to the conversation step.
 */
export default function IntakeHistoryPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<CapturedDoc[]>([]);
  const [captureMode, setCaptureMode] = useState<
    "prescription" | "lab_report" | null
  >(null);

  const handleCapture = useCallback((dataUrl: string) => {
    if (!captureMode) return;
    setDocs((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: captureMode,
        dataUrl,
        capturedAt: new Date(),
      },
    ]);
    setCaptureMode(null);
  }, [captureMode]);

  const handleRemoveDoc = useCallback((id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleContinue = useCallback(() => {
    // TODO: persist docs in Zustand store / upload to backend
    if (typeof window !== "undefined") {
      sessionStorage.setItem("intake_docs", JSON.stringify(docs.length));
    }
    router.push("/intake/conversation");
  }, [router, docs]);

  const handleSkip = useCallback(() => {
    router.push("/intake/conversation");
  }, [router]);

  return (
    <div className="flex flex-1 flex-col">
      {/* ---------- Header ---------- */}
      <div className="px-6 pt-6 pb-4 text-center">
        {/* TODO: i18n key intake.history.heading */}
        <h1 className="font-bangla text-2xl font-bold text-clinical-text">
          কাগজপত্র তুলুন
        </h1>
        <p className="mt-1 text-sm text-clinical-muted">
          {/* TODO: i18n key intake.history.subtitle */}
          Take photos of prescriptions or lab reports
        </p>
      </div>

      {/* ---------- Camera / capture area ---------- */}
      <div className="flex-1 px-4">
        {captureMode ? (
          <DocumentCapture
            onCapture={handleCapture}
            onCancel={() => setCaptureMode(null)}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Capture trigger buttons */}
            <button
              type="button"
              onClick={() => setCaptureMode("prescription")}
              className={cn(
                "flex items-center gap-4 rounded-xl border-2 border-dashed border-glyph-300 bg-glyph-50 px-5 py-5 transition",
                "hover:border-glyph-400 hover:bg-glyph-100 active:scale-[0.98]"
              )}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-glyph-200 text-glyph-700">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </div>
              <div className="text-left">
                {/* TODO: i18n key intake.history.captureRx */}
                <span className="block font-bangla text-lg font-semibold text-clinical-text">
                  প্রেসক্রিপশনের ছবি তুলুন
                </span>
                <span className="text-sm text-clinical-muted">
                  Take Photo of Prescription
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCaptureMode("lab_report")}
              className={cn(
                "flex items-center gap-4 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 px-5 py-5 transition",
                "hover:border-blue-400 hover:bg-blue-100 active:scale-[0.98]"
              )}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-200 text-blue-700">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 2h6l2 3h5v16H2V5h5l2-3z" />
                  <path d="M8 13h8" />
                  <path d="M12 9v8" />
                </svg>
              </div>
              <div className="text-left">
                {/* TODO: i18n key intake.history.captureLab */}
                <span className="block font-bangla text-lg font-semibold text-clinical-text">
                  ল্যাব রিপোর্টের ছবি তুলুন
                </span>
                <span className="text-sm text-clinical-muted">
                  Take Photo of Lab Report
                </span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* ---------- Captured document thumbnails ---------- */}
      {docs.length > 0 && (
        <div className="border-t border-clinical-border bg-white px-4 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-clinical-muted">
            {/* TODO: i18n key intake.history.captured */}
            Captured ({docs.length})
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-clinical-border"
              >
                <img
                  src={doc.dataUrl}
                  alt={doc.type === "prescription" ? "Prescription" : "Lab report"}
                  className="h-full w-full object-cover"
                />
                {/* Type badge */}
                <span
                  className={cn(
                    "absolute bottom-0 left-0 right-0 truncate px-1 py-0.5 text-center text-[10px] font-medium text-white",
                    doc.type === "prescription"
                      ? "bg-glyph-600/80"
                      : "bg-blue-600/80"
                  )}
                >
                  {doc.type === "prescription" ? "Rx" : "Lab"}
                </span>
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveDoc(doc.id)}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Remove document"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Bottom actions ---------- */}
      <div className="flex gap-3 border-t border-clinical-border bg-white px-6 py-4">
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={handleSkip}
        >
          {/* TODO: i18n key intake.history.skip */}
          Skip
        </Button>
        <Button
          variant="default"
          size="lg"
          className="flex-1"
          onClick={handleContinue}
        >
          {/* TODO: i18n key intake.history.continue */}
          Continue
        </Button>
      </div>
    </div>
  );
}
