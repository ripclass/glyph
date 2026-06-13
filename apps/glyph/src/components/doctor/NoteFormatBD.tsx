import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** Clinical note in Bangladesh prescription format. */
export interface BDNote {
  /** Chief Complaint. */
  cc: string;
  /** On Examination findings. */
  oe: string;
  /** Investigations ordered or results. */
  ix: string;
  /** Prescription / Treatment. */
  rx: string;
  /** Advice given to the patient. */
  advice: string;
}

export interface NoteFormatBDProps {
  /** The note content in BD format. */
  note: BDNote;
  className?: string;
}

/**
 * Renders a clinical note in Bangladesh prescription format.
 *
 * Sections:
 * - **CC** (Chief Complaint) -- reason for visit
 * - **O/E** (On Examination) -- physical exam findings
 * - **Ix** (Investigations) -- labs and imaging ordered
 * - **Rx** (Prescription/Treatment) -- medications prescribed
 * - **Advice** -- lifestyle guidance, follow-up instructions
 *
 * Uses professional clinical typography with clear section
 * delineation. Each section is rendered as a labeled block
 * for easy scanning.
 *
 * @example
 * ```tsx
 * <NoteFormatBD note={{
 *   cc: "Fever for 3 days with cough",
 *   oe: "Temp 101F, chest clear, throat congested",
 *   ix: "CBC, CXR PA view",
 *   rx: "Tab. Paracetamol 500mg 1+0+1 x 5 days",
 *   advice: "Plenty of fluids. Follow up in 5 days if no improvement."
 * }} />
 * ```
 */
export function NoteFormatBD({ note, className }: NoteFormatBDProps) {
  const sections: Array<{ key: keyof BDNote; label: string; fullLabel: string }> = [
    { key: "cc", label: "C/C", fullLabel: "Chief Complaint" },
    { key: "oe", label: "O/E", fullLabel: "On Examination" },
    { key: "ix", label: "Ix", fullLabel: "Investigations" },
    { key: "rx", label: "Rx", fullLabel: "Prescription" },
    { key: "advice", label: "Advice", fullLabel: "Advice" },
  ];

  return (
    <div
      className={cn("space-y-4 font-serif text-sm text-slate-800", className)}
      aria-label="Clinical note in Bangladesh format"
    >
      {sections.map(({ key, label, fullLabel }) => (
        <section key={key} className="relative">
          {/* Section header */}
          <div className="mb-1.5 flex items-baseline gap-2">
            <span className="inline-flex min-w-[3rem] items-center justify-center rounded-md bg-ink px-2 py-0.5 font-mono text-xs font-semibold text-bone-raise">
              {label}
            </span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-clinical-muted">
              {fullLabel}
            </span>
          </div>

          {/* Section content */}
          <div className="whitespace-pre-wrap border-l-2 border-glyph-300 pl-3.5 leading-relaxed text-clinical-text">
            {note[key] || (
              <span className="italic text-clinical-muted">Not documented</span>
            )}
          </div>

          {/* Divider except last */}
          {key !== "advice" && (
            <div className="mt-4 border-b border-dashed border-clinical-border" />
          )}
        </section>
      ))}
    </div>
  );
}
