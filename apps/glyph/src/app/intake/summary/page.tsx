"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useIntakeStore, type CapturedDocument } from "@/lib/stores/intake-store";
import { completeIntake, type IntakeSummary } from "@/lib/services/ai";
import { ExtractedRxCard } from "@/components/intake/ExtractedRxCard";
import { ExtractedLabCard } from "@/components/intake/ExtractedLabCard";
import {
  mapLabExtraction,
  mapRxExtraction,
  readConfidence,
} from "@/lib/services/documents-logic";

/**
 * Intake Step 4 — completion. Calls intake-complete (which persists the
 * structured summary, advances the visit, and fires briefing generation for
 * the doctor), then shows the patient a confirmation of what was captured.
 */
export default function IntakeSummaryPage() {
  const router = useRouter();
  const visitId = useIntakeStore((s) => s.visitId);
  const capturedDocuments = useIntakeStore((s) => s.capturedDocuments);
  const setIntakeSummary = useIntakeStore((s) => s.setIntakeSummary);
  const reset = useIntakeStore((s) => s.reset);

  const [summary, setSummary] = useState<IntakeSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!visitId) {
      router.replace("/intake");
      return;
    }
    if (ranRef.current) return;
    ranRef.current = true;

    completeIntake(visitId)
      .then((s) => {
        setSummary(s);
        setIntakeSummary(s);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "সারাংশ তৈরি করা যায়নি";
        setError(msg);
        toast.error(msg);
      });
  }, [visitId, router, setIntakeSummary]);

  if (!visitId) return null;

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="font-bangla text-lg text-red-600">{error}</p>
        <Button className="mt-6" variant="outline" onClick={() => router.back()}>
          ফিরে যান
        </Button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-glyph-200 border-t-glyph-600" />
        <p className="mt-5 font-bangla text-lg text-clinical-muted">
          আপনার তথ্য গুছিয়ে নিচ্ছি…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-6 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-glyph-100 text-glyph-700">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1 className="font-bangla text-2xl font-bold text-clinical-text">
            ধন্যবাদ! ডাক্তার আপনার তথ্য পেয়ে যাবেন
          </h1>
          <p className="mt-1 text-sm text-clinical-muted">
            Your information has been sent to the doctor
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-clinical-border bg-white p-5 shadow-sm">
          <SummaryRow label="প্রধান সমস্যা" value={summary.chiefComplaint} />
          {summary.hpiSummary && <SummaryRow label="বিবরণ" value={summary.hpiSummary} />}
          {summary.currentMedications?.length > 0 && (
            <SummaryRow label="বর্তমান ওষুধ" value={summary.currentMedications.join(", ")} />
          )}
          {summary.allergies?.length > 0 && (
            <SummaryRow label="অ্যালার্জি" value={summary.allergies.join(", ")} />
          )}
        </div>

        {/* Documents captured at the history step — extraction results */}
        {capturedDocuments.length > 0 && (
          <div className="mt-6 space-y-3">
            {/* TODO: i18n key intake.summary.documents */}
            <p className="font-bangla text-xs font-medium uppercase tracking-wide text-clinical-muted">
              আপনার দেওয়া কাগজপত্র ({capturedDocuments.length})
            </p>
            {capturedDocuments.map((doc) => (
              <DocumentResult key={doc.id} doc={doc} />
            ))}
          </div>
        )}

        <Button
          className="mt-6 w-full"
          onClick={() => {
            reset();
            router.push("/intake");
          }}
        >
          পরবর্তী রোগী / Next patient
        </Button>
      </div>
    </div>
  );
}

/**
 * One captured document's extraction state: the Rx/lab card when extraction
 * finished, a quiet placeholder while it runs, and an honest "the doctor
 * will read the photo" note when it failed. @internal
 */
function DocumentResult({ doc }: { doc: CapturedDocument }) {
  if (doc.isProcessing) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-clinical-border bg-white p-4 shadow-sm">
        <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-glyph-200 border-t-glyph-600" />
        {/* TODO: i18n key intake.summary.docProcessing */}
        <p className="font-bangla text-sm text-clinical-muted">
          {doc.type === "prescription" ? "প্রেসক্রিপশন" : "ল্যাব রিপোর্ট"} পড়া হচ্ছে…
        </p>
      </div>
    );
  }

  if (!doc.extractedData) {
    return (
      <div className="rounded-2xl border border-clinical-border bg-white p-4 shadow-sm">
        {/* TODO: i18n key intake.summary.docUnread */}
        <p className="font-bangla text-sm text-clinical-muted">
          {doc.type === "prescription" ? "প্রেসক্রিপশনটি" : "রিপোর্টটি"} স্বয়ংক্রিয়ভাবে
          পড়া যায়নি — ডাক্তার ছবিটি নিজে দেখবেন
        </p>
      </div>
    );
  }

  const confidence = readConfidence(doc.extractedData);
  return doc.type === "prescription" ? (
    <ExtractedRxCard data={mapRxExtraction(doc.extractedData)} confidence={confidence} />
  ) : (
    <ExtractedLabCard data={mapLabExtraction(doc.extractedData)} confidence={confidence} />
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-bangla text-xs font-medium uppercase tracking-wide text-clinical-muted">
        {label}
      </p>
      <p className="mt-0.5 font-bangla text-base text-clinical-text">{value}</p>
    </div>
  );
}
