"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { NoteFormatBD, type BDNote } from "@/components/doctor/NoteFormatBD";

/** SOAP format note (alternative to BD). */
export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

/** Supported note formats. */
export type NoteFormat = "bd" | "soap";

/** Track which sections the doctor edited. */
export interface NoteEdits {
  /** Which section keys were modified by the doctor. */
  modifiedSections: string[];
  /** Timestamp of last edit. */
  lastEditedAt: string | null;
}

export interface NoteEditorProps {
  /** Visit ID this note belongs to. */
  visitId: string;
  /** The AI-generated note in BD format. */
  bdNote: BDNote;
  /** The AI-generated note in SOAP format. */
  soapNote: SOAPNote;
  /** Called when the doctor approves the note. */
  onApprove: (note: BDNote | SOAPNote, format: NoteFormat, edits: NoteEdits) => void;
  /** Whether the note has already been approved (locked). */
  isApproved?: boolean;
  /** True while approval is mid-flight (safety check running or its panel shown) — hides the editor's own approve/edit controls so the safety panel owns the action. */
  approvalPending?: boolean;
  className?: string;
}

/**
 * Clinical note editor for reviewing, editing, and approving AI-generated notes.
 *
 * Features:
 * - Displays the generated note in BD format (CC/O-E/Ix/Rx/Advice) or SOAP
 * - Toggle between read-only and edit mode
 * - Tracks which sections the doctor modified from the AI-generated version
 * - "Approve" button locks the note for the medical record
 * - Format switcher (BD vs SOAP)
 *
 * The editor preserves the original AI output and records all doctor edits
 * for audit and model improvement purposes.
 *
 * @example
 * ```tsx
 * <NoteEditor
 *   visitId="visit_123"
 *   bdNote={generatedBDNote}
 *   soapNote={generatedSOAPNote}
 *   onApprove={(note, format, edits) => saveNote(note, format, edits)}
 * />
 * ```
 */
export function NoteEditor({
  visitId,
  bdNote,
  soapNote,
  onApprove,
  isApproved = false,
  approvalPending = false,
  className,
}: NoteEditorProps) {
  const [format, setFormat] = React.useState<NoteFormat>("bd");
  const [isEditing, setIsEditing] = React.useState(false);

  // BD note editable state
  const [editedBD, setEditedBD] = React.useState<BDNote>(bdNote);
  // SOAP note editable state
  const [editedSOAP, setEditedSOAP] = React.useState<SOAPNote>(soapNote);
  // Track edits
  const [modifiedSections, setModifiedSections] = React.useState<Set<string>>(
    new Set()
  );

  const handleBDChange = (key: keyof BDNote, value: string) => {
    setEditedBD((prev) => ({ ...prev, [key]: value }));
    setModifiedSections((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const handleSOAPChange = (key: keyof SOAPNote, value: string) => {
    setEditedSOAP((prev) => ({ ...prev, [key]: value }));
    setModifiedSections((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const handleApprove = () => {
    const edits: NoteEdits = {
      modifiedSections: Array.from(modifiedSections),
      lastEditedAt:
        modifiedSections.size > 0 ? new Date().toISOString() : null,
    };
    const note = format === "bd" ? editedBD : editedSOAP;
    onApprove(note, format, edits);
    setIsEditing(false);
  };

  const bdSections: Array<{ key: keyof BDNote; label: string }> = [
    { key: "cc", label: "C/C (Chief Complaint)" },
    { key: "oe", label: "O/E (On Examination)" },
    { key: "ix", label: "Ix (Investigations)" },
    { key: "rx", label: "Rx (Prescription)" },
    { key: "advice", label: "Advice" },
  ];

  const soapSections: Array<{ key: keyof SOAPNote; label: string }> = [
    { key: "subjective", label: "Subjective" },
    { key: "objective", label: "Objective" },
    { key: "assessment", label: "Assessment" },
    { key: "plan", label: "Plan" },
  ];

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
        {/* Format switcher */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
          <button
            type="button"
            onClick={() => setFormat("bd")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition",
              format === "bd"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
            disabled={isApproved || approvalPending}
          >
            BD Format
          </button>
          <button
            type="button"
            onClick={() => setFormat("soap")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition",
              format === "soap"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
            disabled={isApproved || approvalPending}
          >
            SOAP
          </button>
        </div>

        {/* Edit / Approve controls */}
        <div className="flex items-center gap-2">
          {isApproved && (
            <span className="flex items-center gap-1 rounded-full bg-glyph-100 px-2.5 py-0.5 text-xs font-medium text-glyph-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Approved
            </span>
          )}
          {!isApproved && !approvalPending && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "Preview" : "Edit"}
              </Button>
              <Button size="sm" onClick={handleApprove}>
                Approve
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Note content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Visit ID reference */}
        <p className="mb-3 text-[10px] uppercase tracking-wider text-slate-400">
          Visit: {visitId}
          {modifiedSections.size > 0 && (
            <span className="ml-2 text-amber-500">
              ({modifiedSections.size} section{modifiedSections.size > 1 ? "s" : ""} edited)
            </span>
          )}
        </p>

        {/* Read-only mode */}
        {!isEditing && format === "bd" && <NoteFormatBD note={editedBD} />}
        {!isEditing && format === "soap" && (
          <SOAPNoteView note={editedSOAP} />
        )}

        {/* Edit mode */}
        {isEditing && format === "bd" && (
          <div className="space-y-4">
            {bdSections.map(({ key, label }) => (
              <EditableSection
                key={key}
                label={label}
                value={editedBD[key]}
                onChange={(v) => handleBDChange(key, v)}
                isModified={modifiedSections.has(key)}
                disabled={isApproved}
              />
            ))}
          </div>
        )}
        {isEditing && format === "soap" && (
          <div className="space-y-4">
            {soapSections.map(({ key, label }) => (
              <EditableSection
                key={key}
                label={label}
                value={editedSOAP[key]}
                onChange={(v) => handleSOAPChange(key, v)}
                isModified={modifiedSections.has(key)}
                disabled={isApproved}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Internal sub-components ── */

/**
 * Editable text section with a label and modification indicator.
 */
function EditableSection({
  label,
  value,
  onChange,
  isModified,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isModified: boolean;
  disabled: boolean;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-600">
        {label}
        {isModified && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
            edited
          </span>
        )}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={4}
        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 font-serif text-sm leading-relaxed text-slate-700 focus:border-glyph-400 focus:outline-none focus:ring-1 focus:ring-glyph-400 disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  );
}

/**
 * Read-only view of a SOAP format note.
 */
function SOAPNoteView({ note }: { note: SOAPNote }) {
  const sections: Array<{ key: keyof SOAPNote; label: string; shortLabel: string }> = [
    { key: "subjective", label: "Subjective", shortLabel: "S" },
    { key: "objective", label: "Objective", shortLabel: "O" },
    { key: "assessment", label: "Assessment", shortLabel: "A" },
    { key: "plan", label: "Plan", shortLabel: "P" },
  ];

  return (
    <div className="space-y-4 font-serif text-sm text-slate-800">
      {sections.map(({ key, label, shortLabel }) => (
        <section key={key}>
          <div className="mb-1 flex items-baseline gap-2">
            <span className="inline-flex min-w-[2rem] items-center justify-center rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
              {shortLabel}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">
              {label}
            </span>
          </div>
          <div className="whitespace-pre-wrap border-l-2 border-slate-200 pl-3 leading-relaxed text-slate-700">
            {note[key] || (
              <span className="text-slate-300 italic">Not documented</span>
            )}
          </div>
          {key !== "plan" && (
            <div className="mt-4 border-b border-dashed border-slate-200" />
          )}
        </section>
      ))}
    </div>
  );
}
