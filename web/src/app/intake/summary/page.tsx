"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

/** Structured intake summary to display for review. */
interface IntakeSummary {
  chiefComplaint: string;
  historyExtracted: string[];
  documentsCount: number;
  isAttendant: boolean;
  attendantRelation?: string;
}

/**
 * Intake Step 4 -- Review summary before sending to doctor.
 *
 * Displays a structured summary card containing the chief complaint,
 * extracted history points, captured document thumbnails, and attendant
 * info. The patient confirms before the data is transmitted to the
 * doctor's dashboard.
 */
export default function IntakeSummaryPage() {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);

  // TODO: replace with real data from Zustand store
  const [summary, setSummary] = useState<IntakeSummary>({
    chiefComplaint: "",
    historyExtracted: [],
    documentsCount: 0,
    isAttendant: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const role = sessionStorage.getItem("intake_role") ?? "patient";
    const docsRaw = sessionStorage.getItem("intake_docs");
    const docsCount = docsRaw ? parseInt(docsRaw, 10) : 0;

    // TODO: replace placeholder data with real extraction results
    setSummary({
      chiefComplaint: "মাথাব্যথা — তিন দিন ধরে",
      historyExtracted: [
        "ব্যথা মাথার ডান দিকে",
        "সকালে বেশি হয়",
        "বমি বমি ভাব আছে",
        "আগে মাইগ্রেনের ইতিহাস আছে",
      ],
      documentsCount: docsCount,
      isAttendant: role === "attendant",
    });
  }, []);

  const handleSendToDoctor = useCallback(async () => {
    setIsSending(true);
    // TODO: POST summary to backend API
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // TODO: navigate to a "waiting" screen or close flow
    setIsSending(false);
  }, []);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <div className="flex flex-1 flex-col">
      {/* ---------- Header ---------- */}
      <div className="px-6 pt-6 pb-2 text-center">
        {/* TODO: i18n key intake.summary.heading */}
        <h1 className="font-bangla text-2xl font-bold text-clinical-text">
          সারসংক্ষেপ
        </h1>
        <p className="mt-1 text-sm text-clinical-muted">
          {/* TODO: i18n key intake.summary.subtitle */}
          Review before sending to doctor
        </p>
      </div>

      {/* ---------- Summary card ---------- */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        <div className="rounded-2xl border border-clinical-border bg-white p-5 shadow-sm">
          {/* Chief complaint */}
          <section className="mb-5">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-clinical-muted">
              {/* TODO: i18n key intake.summary.chiefComplaint */}
              Chief Complaint
            </h2>
            <p className="font-bangla text-lg font-medium text-clinical-text">
              {summary.chiefComplaint || "N/A"}
            </p>
          </section>

          {/* Extracted history */}
          <section className="mb-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-clinical-muted">
              {/* TODO: i18n key intake.summary.history */}
              History Extracted
            </h2>
            {summary.historyExtracted.length > 0 ? (
              <ul className="space-y-2">
                {summary.historyExtracted.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span
                      className="mt-1.5 block h-2 w-2 shrink-0 rounded-full bg-glyph-500"
                      aria-hidden="true"
                    />
                    <span className="font-bangla text-base text-clinical-text">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-clinical-muted italic">
                No history extracted
              </p>
            )}
          </section>

          {/* Documents captured */}
          <section className="mb-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-clinical-muted">
              {/* TODO: i18n key intake.summary.documents */}
              Documents Captured
            </h2>
            {summary.documentsCount > 0 ? (
              <div className="flex gap-3">
                {Array.from({ length: summary.documentsCount }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex h-16 w-16 items-center justify-center rounded-lg border border-clinical-border bg-clinical-bg"
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-clinical-muted"
                      aria-hidden="true"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-clinical-muted italic">
                {/* TODO: i18n key intake.summary.noDocs */}
                No documents captured
              </p>
            )}
          </section>

          {/* Attendant info */}
          {summary.isAttendant && (
            <section>
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-clinical-muted">
                {/* TODO: i18n key intake.summary.attendant */}
                Attendant Info
              </h2>
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-amber-600"
                  aria-hidden="true"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span className="text-sm font-medium text-amber-800">
                  {/* TODO: i18n key intake.summary.historyByAttendant */}
                  History provided by attendant
                  {summary.attendantRelation
                    ? ` (${summary.attendantRelation})`
                    : ""}
                </span>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ---------- Bottom actions ---------- */}
      <div className="flex gap-3 border-t border-clinical-border bg-white px-6 py-4">
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={handleGoBack}
          disabled={isSending}
        >
          {/* TODO: i18n key intake.summary.goBack */}
          Go Back
        </Button>
        <Button
          variant="default"
          size="lg"
          className="flex-1"
          onClick={handleSendToDoctor}
          loading={isSending}
        >
          {/* TODO: i18n key intake.summary.send */}
          {/* TODO: i18n key intake.summary.sendBn */}
          ডাক্তারের কাছে পাঠান
        </Button>
      </div>
    </div>
  );
}
