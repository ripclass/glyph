"use client";

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

interface ConsentPromptProps {
  /** Whether the consent dialog is open. */
  open: boolean;
  /** Called when consent is granted with the selected consent types. */
  onConsent: (consents: ConsentTypes) => void;
  /** Called when the user dismisses the dialog without consenting. */
  onDismiss: () => void;
}

/** Individual consent categories collected per PDPO requirements. */
interface ConsentTypes {
  dataCollection: boolean;
  aiProcessing: boolean;
  audioRecording: boolean;
  dataStorage: boolean;
}

/**
 * PDPO consent collection UI for the patient intake flow.
 *
 * Modal dialog explaining what data will be collected (audio, text,
 * documents), how it will be processed by AI, and how it will be stored.
 * Presented primarily in Bangla with checkboxes for each consent
 * category. All checkboxes must be checked before the "I Agree" button
 * becomes active.
 */
export function ConsentPrompt({
  open,
  onConsent,
  onDismiss,
}: ConsentPromptProps) {
  const [consents, setConsents] = useState<ConsentTypes>({
    dataCollection: false,
    aiProcessing: false,
    audioRecording: false,
    dataStorage: false,
  });

  const allConsented = Object.values(consents).every(Boolean);

  const toggleConsent = useCallback(
    (key: keyof ConsentTypes) => {
      setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    []
  );

  const handleAgree = useCallback(() => {
    if (allConsented) {
      onConsent(consents);
    }
  }, [allConsented, consents, onConsent]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onDismiss}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative z-10 mx-4 mb-0 w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-2xl sm:mb-0 sm:rounded-2xl">
        {/* Header */}
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-glyph-100 text-glyph-700">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <h2
              id="consent-title"
              className="font-bangla text-xl font-bold text-clinical-text"
            >
              {/* TODO: i18n key intake.consent.title */}
              তথ্য সংগ্রহের সম্মতি
            </h2>
            <p className="mt-0.5 text-sm text-clinical-muted">
              {/* TODO: i18n key intake.consent.subtitle */}
              Data Collection Consent (PDPO)
            </p>
          </div>
        </div>

        {/* Explanation */}
        <p className="mb-5 font-bangla text-sm leading-relaxed text-clinical-text">
          {/* TODO: i18n key intake.consent.description */}
          আপনার চিকিৎসা সেবা উন্নত করতে আমরা কিছু তথ্য সংগ্রহ করব। নিচের
          প্রতিটি বিষয়ে আপনার সম্মতি প্রয়োজন। আপনার তথ্য সুরক্ষিতভাবে
          সংরক্ষণ করা হবে এবং শুধুমাত্র আপনার চিকিৎসার জন্য ব্যবহৃত হবে।
        </p>

        {/* Consent checkboxes */}
        <div className="mb-6 space-y-3">
          <ConsentCheckbox
            checked={consents.dataCollection}
            onChange={() => toggleConsent("dataCollection")}
            titleBn="তথ্য সংগ্রহ"
            titleEn="Data Collection"
            descriptionBn="আপনার লক্ষণ, চিকিৎসা ইতিহাস এবং নথিপত্র সংগ্রহ"
            descriptionEn="Collection of your symptoms, medical history, and documents"
          />

          <ConsentCheckbox
            checked={consents.aiProcessing}
            onChange={() => toggleConsent("aiProcessing")}
            titleBn="AI প্রক্রিয়াকরণ"
            titleEn="AI Processing"
            descriptionBn="আপনার তথ্য কৃত্রিম বুদ্ধিমত্তা দিয়ে বিশ্লেষণ"
            descriptionEn="Analysis of your data using artificial intelligence"
          />

          <ConsentCheckbox
            checked={consents.audioRecording}
            onChange={() => toggleConsent("audioRecording")}
            titleBn="অডিও রেকর্ডিং"
            titleEn="Audio Recording"
            descriptionBn="কথোপকথনের অডিও রেকর্ড ও টেক্সটে রূপান্তর"
            descriptionEn="Recording and transcription of conversation audio"
          />

          <ConsentCheckbox
            checked={consents.dataStorage}
            onChange={() => toggleConsent("dataStorage")}
            titleBn="তথ্য সংরক্ষণ"
            titleEn="Data Storage"
            descriptionBn="নিরাপদ সার্ভারে আপনার তথ্য সংরক্ষণ"
            descriptionEn="Storage of your data on secure servers"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={onDismiss}
          >
            {/* TODO: i18n key intake.consent.decline */}
            বাতিল
          </Button>
          <Button
            variant="default"
            size="lg"
            className="flex-1"
            onClick={handleAgree}
            disabled={!allConsented}
          >
            {/* TODO: i18n key intake.consent.agree */}
            আমি রাজি
          </Button>
        </div>

        {/* Helper text */}
        {!allConsented && (
          <p className="mt-3 text-center text-xs text-clinical-muted">
            {/* TODO: i18n key intake.consent.allRequired */}
            সব বিষয়ে সম্মতি দিতে হবে / All items must be checked
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------- Internal sub-component ---------- */

interface ConsentCheckboxProps {
  checked: boolean;
  onChange: () => void;
  titleBn: string;
  titleEn: string;
  descriptionBn: string;
  descriptionEn: string;
}

/**
 * Individual consent checkbox row with bilingual label.
 * @internal
 */
function ConsentCheckbox({
  checked,
  onChange,
  titleBn,
  titleEn,
  descriptionBn,
  descriptionEn,
}: ConsentCheckboxProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition",
        checked
          ? "border-glyph-300 bg-glyph-50"
          : "border-clinical-border bg-white hover:border-glyph-200 hover:bg-clinical-bg"
      )}
    >
      {/* Custom checkbox */}
      <div className="mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded border-2 transition",
            checked
              ? "border-glyph-600 bg-glyph-600"
              : "border-clinical-border bg-white"
          )}
          aria-hidden="true"
        >
          {checked && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </div>

      {/* Label text */}
      <div>
        <p className="font-bangla text-sm font-semibold text-clinical-text">
          {titleBn}
        </p>
        <p className="text-xs text-clinical-muted">{titleEn}</p>
        <p className="mt-1 font-bangla text-xs leading-relaxed text-clinical-muted">
          {descriptionBn}
        </p>
        <p className="text-[11px] text-clinical-muted">{descriptionEn}</p>
      </div>
    </label>
  );
}
