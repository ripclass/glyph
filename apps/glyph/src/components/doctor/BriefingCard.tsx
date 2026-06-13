"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { RedFlagAlert, type RedFlag } from "@/components/doctor/RedFlagAlert";
import { SourceTag, type SourceType } from "@/components/doctor/SourceTag";
import { LinkedEvidence, type EvidenceItem } from "@/components/doctor/LinkedEvidence";

/** A clinical claim with source attribution. */
export interface SourcedClaim {
  /** The claim text. */
  text: string;
  /** Source type for the claim. */
  sourceType: SourceType;
  /** Optional human-readable source label override. */
  sourceLabel?: string;
  /** Evidence item linked to this claim (for the evidence panel). */
  evidence?: EvidenceItem;
}

/** Lab result with abnormal flagging. */
export interface LabResult {
  /** Test name, e.g., "HbA1c". */
  testName: string;
  /** Result value with units, e.g., "8.2%". */
  value: string;
  /** Reference range, e.g., "4.0-5.6%". */
  referenceRange?: string;
  /** Whether this value is abnormal. */
  isAbnormal: boolean;
  /** Source info. */
  sourceType?: SourceType;
}

/** Medication extracted from prescriptions. */
export interface Medication {
  /** Drug name. */
  name: string;
  /** Dosage, e.g., "500mg 1+0+1". */
  dosage: string;
  /** Source of this medication data. */
  sourceType?: SourceType;
}

/** Full briefing data for a patient visit. */
export interface BriefingData {
  /** Red flags requiring immediate attention. */
  redFlags: RedFlag[];
  /** Chief complaint claims. */
  chiefComplaint: SourcedClaim[];
  /** History of present illness claims. */
  hpiClaims: SourcedClaim[];
  /** Past medical history claims. */
  pastMedicalHistory: SourcedClaim[];
  /** Current medications. */
  currentMedications: Medication[];
  /** Recent lab results. */
  recentLabs: LabResult[];
  /** Known allergies. */
  allergies: SourcedClaim[];
  /** Social history claims. */
  socialHistory: SourcedClaim[];
  /** Assessment and key clinical considerations. */
  assessment: SourcedClaim[];
}

export interface BriefingCardProps {
  /** Full briefing data. */
  data: BriefingData;
  className?: string;
}

/**
 * THE core UI component -- structured patient briefing card.
 *
 * Sections (in clinical priority order):
 * 1. **Red Flags** -- prominent red banner for critical findings
 * 2. **Chief Complaint** -- reason for visit
 * 3. **History of Present Illness** -- with source attribution tags
 * 4. **Past Medical History** -- chronic conditions, surgeries
 * 5. **Current Medications** -- extracted from Rx photos
 * 6. **Recent Lab Results** -- with abnormal value flags
 * 7. **Allergies** -- drug and other allergies
 * 8. **Social History** -- occupation, habits
 * 9. **Assessment / Key Considerations** -- AI-generated clinical notes
 *
 * Every claim has a SourceTag showing where the information came from.
 * Dense, clinical layout optimized for rapid scanning during consultation.
 *
 * @example
 * ```tsx
 * <BriefingCard data={briefingData} />
 * ```
 */
export function BriefingCard({ data, className }: BriefingCardProps) {
  const [evidencePanel, setEvidencePanel] = React.useState<{
    open: boolean;
    evidence: EvidenceItem | null;
  }>({ open: false, evidence: null });

  const openEvidence = React.useCallback((evidence?: EvidenceItem) => {
    if (evidence) {
      setEvidencePanel({ open: true, evidence });
    }
  }, []);

  const closeEvidence = React.useCallback(() => {
    setEvidencePanel({ open: false, evidence: null });
  }, []);

  return (
    <>
      <div className={cn("space-y-4", className)}>
        {/* 1. Red Flags */}
        {data.redFlags.length > 0 && <RedFlagAlert flags={data.redFlags} />}

        {/* 2. Chief Complaint */}
        <BriefingSection title="Chief Complaint" priority="high">
          <ClaimList claims={data.chiefComplaint} onEvidenceTap={openEvidence} />
        </BriefingSection>

        {/* 3. History of Present Illness */}
        {data.hpiClaims.length > 0 && (
          <BriefingSection title="History of Present Illness">
            <ClaimList claims={data.hpiClaims} onEvidenceTap={openEvidence} />
          </BriefingSection>
        )}

        {/* 4. Past Medical History */}
        {data.pastMedicalHistory.length > 0 && (
          <BriefingSection title="Past Medical History">
            <ClaimList
              claims={data.pastMedicalHistory}
              onEvidenceTap={openEvidence}
            />
          </BriefingSection>
        )}

        {/* 5. Current Medications */}
        {data.currentMedications.length > 0 && (
          <BriefingSection title="Current Medications">
            <ul className="space-y-1">
              {data.currentMedications.map((med, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-lg bg-clinical-bg px-2.5 py-1.5 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-clinical-text">
                      {med.name}
                    </span>
                    <span className="ml-2 font-mono text-xs text-ink-soft">
                      {med.dosage}
                    </span>
                  </div>
                  {med.sourceType && (
                    <SourceTag type={med.sourceType} className="shrink-0" />
                  )}
                </li>
              ))}
            </ul>
          </BriefingSection>
        )}

        {/* 6. Recent Lab Results */}
        {data.recentLabs.length > 0 && (
          <BriefingSection title="Recent Lab Results">
            <div className="space-y-1">
              {data.recentLabs.map((lab, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm",
                    lab.isAbnormal
                      ? "border border-red-200 bg-red-50"
                      : "bg-clinical-bg"
                  )}
                >
                  <span className="font-medium text-clinical-text">
                    {lab.testName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-mono text-xs",
                        lab.isAbnormal ? "font-bold text-red-700" : "text-ink-soft"
                      )}
                    >
                      {lab.value}
                    </span>
                    {lab.referenceRange && (
                      <span className="font-mono text-[10px] text-clinical-muted">
                        ({lab.referenceRange})
                      </span>
                    )}
                    {lab.isAbnormal && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-700">
                        !
                      </span>
                    )}
                    {lab.sourceType && <SourceTag type={lab.sourceType} />}
                  </div>
                </div>
              ))}
            </div>
          </BriefingSection>
        )}

        {/* 7. Allergies */}
        {data.allergies.length > 0 && (
          <BriefingSection title="Allergies" priority="medium">
            <ClaimList claims={data.allergies} onEvidenceTap={openEvidence} />
          </BriefingSection>
        )}

        {/* 8. Social History */}
        {data.socialHistory.length > 0 && (
          <BriefingSection title="Social History">
            <ClaimList claims={data.socialHistory} onEvidenceTap={openEvidence} />
          </BriefingSection>
        )}

        {/* 9. Assessment / Key Considerations — KhaM-Med's own suggestions.
            Stated once as decision support, not dressed up as citations. */}
        {data.assessment.length > 0 && (
          <BriefingSection title="Assessment / Key Considerations" priority="high">
            <p className="mb-2.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" aria-hidden="true" />
              Generated by Glyph as decision support. Not a diagnosis; weigh clinically.
            </p>
            <ClaimList claims={data.assessment} onEvidenceTap={openEvidence} showTags={false} />
          </BriefingSection>
        )}
      </div>

      {/* Linked Evidence panel */}
      <LinkedEvidence
        open={evidencePanel.open}
        evidence={evidencePanel.evidence}
        onClose={closeEvidence}
      />
    </>
  );
}

/* ── Internal sub-components ── */

/**
 * A labeled section within the briefing card.
 */
function BriefingSection({
  title,
  priority,
  children,
}: {
  title: string;
  priority?: "high" | "medium";
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border bg-clinical-surface p-4",
        priority === "high"
          ? "border-glyph-300"
          : priority === "medium"
            ? "border-amber-200"
            : "border-clinical-border"
      )}
    >
      <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
        {priority && (
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              priority === "high" ? "bg-glyph-400" : "bg-amber-400"
            )}
            aria-hidden="true"
          />
        )}
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Renders a list of sourced claims with inline SourceTags.
 */
function ClaimList({
  claims,
  onEvidenceTap,
  showTags = true,
}: {
  claims: SourcedClaim[];
  onEvidenceTap: (evidence?: EvidenceItem) => void;
  /** Hide per-claim source tags (e.g. the AI-assessment section labels its
      whole block at once instead of tagging every line). */
  showTags?: boolean;
}) {
  return (
    <ul className="space-y-1.5">
      {claims.map((claim, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-glyph-400" aria-hidden="true" />
          <span className="flex-1 text-clinical-text">{claim.text}</span>
          {showTags && (
            <SourceTag
              type={claim.sourceType}
              label={claim.sourceLabel}
              onTap={() => onEvidenceTap(claim.evidence)}
              className="mt-0.5 shrink-0"
            />
          )}
        </li>
      ))}
    </ul>
  );
}
