"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { DocumentCapture } from "@/components/intake/DocumentCapture";
import { ConsentPrompt } from "@/components/intake/ConsentPrompt";
import { useIntakeStore } from "@/lib/stores/intake-store";
import { uploadToStorage, deleteFromStorage } from "@/lib/services/camera";
import { extractDocument } from "@/lib/services/ai";
import { recordIntakeConsents } from "@/lib/services/consents";
import {
  buildDocumentPath,
  dataUrlToBlob,
  type CapturedDocumentType,
} from "@/lib/services/documents-logic";

/** A capture that hasn't reached storage yet (uploading or failed). */
interface PendingDoc {
  id: string;
  type: CapturedDocumentType;
  dataUrl: string;
  status: "uploading" | "error";
}

/**
 * Intake Step 2 — document capture, LIVE end to end.
 *
 * The "plastic bag" moment: the patient hands over old prescriptions and
 * lab reports; we photograph them. Each "Use Photo" uploads to the private
 * `documents` bucket and fires `extract-document` (Tier B egress — only
 * after the PDPO consent recorded here). Extracted medications and lab
 * values land in `prescriptions`/`lab_reports`, where the briefing reads
 * them; the cards are shown back on the summary step.
 */
export default function IntakeHistoryPage() {
  const router = useRouter();

  const visitId = useIntakeStore((s) => s.visitId);
  const patientId = useIntakeStore((s) => s.patientId);
  const isAttendant = useIntakeStore((s) => s.isAttendant);
  const capturedDocuments = useIntakeStore((s) => s.capturedDocuments);
  const addDocument = useIntakeStore((s) => s.addDocument);
  const removeDocument = useIntakeStore((s) => s.removeDocument);
  const updateDocumentExtraction = useIntakeStore((s) => s.updateDocumentExtraction);
  const setDocumentProcessed = useIntakeStore((s) => s.setDocumentProcessed);

  const [pending, setPending] = useState<PendingDoc[]>([]);
  /** Local thumbnails (data URLs never enter the store — paths only) */
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [captureMode, setCaptureMode] = useState<CapturedDocumentType | null>(null);

  /**
   * PDPO consent gate — photographing and storing documents is data
   * collection, so consent is collected at the FIRST capture attempt,
   * before any image exists. Shares the per-visit sessionStorage key with
   * the conversation step, so the patient is asked once per visit.
   */
  const [consented, setConsented] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const pendingModeRef = useRef<CapturedDocumentType | null>(null);

  useEffect(() => {
    if (visitId && typeof window !== "undefined") {
      setConsented(sessionStorage.getItem(`glyph-consent-${visitId}`) === "yes");
    }
  }, [visitId]);

  // No session → back to registration
  useEffect(() => {
    if (!visitId) router.replace("/intake");
  }, [visitId, router]);

  const requestCapture = useCallback(
    (type: CapturedDocumentType) => {
      if (!consented) {
        pendingModeRef.current = type;
        setShowConsent(true);
        return;
      }
      setCaptureMode(type);
    },
    [consented]
  );

  const handleConsentGranted = useCallback(async () => {
    if (!visitId || !patientId) return;
    try {
      // Rows first, UI second — no consent rows, no camera (fail closed).
      await recordIntakeConsents({
        patientId,
        visitId,
        grantedBy: isAttendant ? "attendant" : "patient",
      });
    } catch {
      // TODO: i18n key intake.consent.saveFailed
      toast.error("সম্মতি সংরক্ষণ করা যায়নি — আবার চেষ্টা করুন");
      setShowConsent(false);
      return;
    }
    sessionStorage.setItem(`glyph-consent-${visitId}`, "yes");
    setConsented(true);
    setShowConsent(false);
    setCaptureMode(pendingModeRef.current);
  }, [visitId, patientId, isAttendant]);

  /** Upload one capture, then fire extraction in the background. */
  const uploadDoc = useCallback(
    async (id: string, type: CapturedDocumentType, dataUrl: string) => {
      if (!patientId || !visitId) return;
      try {
        const blob = dataUrlToBlob(dataUrl);
        const path = await uploadToStorage(
          blob,
          buildDocumentPath(patientId, visitId, type, id)
        );

        setThumbs((t) => ({ ...t, [id]: dataUrl }));
        setPending((p) => p.filter((d) => d.id !== id));
        addDocument({
          id,
          type,
          imagePath: path,
          extractedData: null,
          isProcessing: true,
          capturedAt: new Date().toISOString(),
        });

        // Fire-and-forget: extraction keeps running while the intake
        // conversation proceeds; the summary step shows the result.
        extractDocument(path, type, patientId, visitId)
          .then((result) => {
            updateDocumentExtraction(id, {
              ...result.data,
              confidence: result.confidence,
            });
            setDocumentProcessed(id);
          })
          .catch(() => {
            setDocumentProcessed(id);
            // TODO: i18n key intake.history.extractFailed
            toast.error("কাগজটি পড়া যায়নি — ডাক্তার ছবিটি নিজে দেখবেন");
          });
      } catch {
        setPending((p) =>
          p.map((d) => (d.id === id ? { ...d, status: "error" as const } : d))
        );
        // TODO: i18n key intake.history.uploadFailed
        toast.error("ছবি আপলোড করা যায়নি — আবার চেষ্টা করুন");
      }
    },
    [patientId, visitId, addDocument, updateDocumentExtraction, setDocumentProcessed]
  );

  const handleCapture = useCallback(
    (dataUrl: string) => {
      if (!captureMode) return;
      const id = crypto.randomUUID();
      setPending((p) => [...p, { id, type: captureMode, dataUrl, status: "uploading" }]);
      setCaptureMode(null);
      void uploadDoc(id, captureMode, dataUrl);
    },
    [captureMode, uploadDoc]
  );

  const handleRetry = useCallback(
    (doc: PendingDoc) => {
      setPending((p) =>
        p.map((d) => (d.id === doc.id ? { ...d, status: "uploading" as const } : d))
      );
      void uploadDoc(doc.id, doc.type, doc.dataUrl);
    },
    [uploadDoc]
  );

  const handleRemovePending = useCallback((id: string) => {
    setPending((p) => p.filter((d) => d.id !== id));
  }, []);

  const handleRemoveUploaded = useCallback(
    async (id: string, imagePath: string) => {
      try {
        await deleteFromStorage(imagePath);
        removeDocument(id);
        setThumbs((t) => {
          const next = { ...t };
          delete next[id];
          return next;
        });
      } catch {
        // TODO: i18n key intake.history.removeFailed
        toast.error("ছবিটি মুছে ফেলা যায়নি");
      }
    },
    [removeDocument]
  );

  if (!visitId) return null;

  const totalDocs = pending.length + capturedDocuments.length;

  return (
    <div className="flex flex-1 flex-col">
      <ConsentPrompt
        open={showConsent}
        onConsent={() => void handleConsentGranted()}
        onDismiss={() => setShowConsent(false)}
      />

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
              onClick={() => requestCapture("prescription")}
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
              onClick={() => requestCapture("lab_report")}
              className={cn(
                "flex items-center gap-4 rounded-xl border-2 border-dashed border-clinical-border bg-clinical-bg px-5 py-5 transition",
                "hover:border-clinical-muted/50 hover:bg-clinical-surface active:scale-[0.98]"
              )}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-clinical-border text-clinical-muted">
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
      {totalDocs > 0 && (
        <div className="border-t border-clinical-border bg-white px-4 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-clinical-muted">
            {/* TODO: i18n key intake.history.captured */}
            Captured ({totalDocs})
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {/* In-flight / failed uploads */}
            {pending.map((doc) => (
              <DocTile
                key={doc.id}
                type={doc.type}
                thumb={doc.dataUrl}
                status={doc.status}
                onRemove={() => handleRemovePending(doc.id)}
                onRetry={doc.status === "error" ? () => handleRetry(doc) : undefined}
              />
            ))}
            {/* Uploaded documents (extraction may still be running) */}
            {capturedDocuments.map((doc) => (
              <DocTile
                key={doc.id}
                type={doc.type}
                thumb={thumbs[doc.id]}
                status={
                  doc.isProcessing
                    ? "extracting"
                    : doc.extractedData
                      ? "done"
                      : "unread"
                }
                onRemove={() => void handleRemoveUploaded(doc.id, doc.imagePath)}
              />
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
          onClick={() => router.push("/intake/conversation")}
        >
          {/* TODO: i18n key intake.history.skip */}
          Skip
        </Button>
        <Button
          variant="default"
          size="lg"
          className="flex-1"
          onClick={() => router.push("/intake/conversation")}
        >
          {/* TODO: i18n key intake.history.continue */}
          Continue
        </Button>
      </div>
    </div>
  );
}

/* ---------- Internal sub-component ---------- */

interface DocTileProps {
  type: CapturedDocumentType;
  /** Local data URL; absent after a refresh (paths persist, bytes don't) */
  thumb?: string;
  status: "uploading" | "error" | "extracting" | "done" | "unread";
  onRemove: () => void;
  onRetry?: () => void;
}

/**
 * Thumbnail tile with a status overlay for one captured document.
 * @internal
 */
function DocTile({ type, thumb, status, onRemove, onRetry }: DocTileProps) {
  return (
    <div className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-clinical-border bg-clinical-bg">
      {thumb ? (
        <img
          src={thumb}
          alt={type === "prescription" ? "Prescription" : "Lab report"}
          className={cn(
            "h-full w-full object-cover",
            (status === "uploading" || status === "error") && "opacity-50"
          )}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-clinical-muted">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
      )}

      {/* Status overlay */}
      {status === "uploading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      )}
      {status === "extracting" && (
        <div className="absolute bottom-5 left-1 right-1 rounded bg-black/60 px-1 py-0.5 text-center font-bangla text-[9px] text-white">
          {/* TODO: i18n key intake.history.reading */}
          পড়ছি…
        </div>
      )}
      {status === "done" && (
        <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-glyph-600 text-white">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
      )}
      {status === "error" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="absolute inset-0 flex items-center justify-center bg-red-600/40 font-bangla text-[10px] font-semibold text-white"
        >
          {/* TODO: i18n key intake.history.retry */}
          আবার
        </button>
      )}

      {/* Type badge */}
      <span
        className={cn(
          "absolute bottom-0 left-0 right-0 truncate px-1 py-0.5 text-center text-[10px] font-medium text-white",
          type === "prescription" ? "bg-glyph-600/80" : "bg-clinical-muted/85"
        )}
      >
        {type === "prescription" ? "Rx" : "Lab"}
      </span>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
        aria-label="Remove document"
      >
        &times;
      </button>
    </div>
  );
}
