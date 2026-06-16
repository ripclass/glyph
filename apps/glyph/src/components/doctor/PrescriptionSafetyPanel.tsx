// apps/glyph/src/components/doctor/PrescriptionSafetyPanel.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import type { SafetyResult, Verdict, WarningVerdict } from "@/lib/services/safety-logic";

const SEVERITY_STYLE: Record<string, string> = {
  critical: "border-red_flag/40 bg-red_flag/5 text-red_flag",
  moderate: "border-amber-300 bg-amber-50 text-amber-800",
  low: "border-bone-line bg-bone-raise text-ink-soft",
};

const COMPLETENESS_NOTE: Record<string, string> = {
  rich: "Checked against this patient's known medications, allergies, and conditions.",
  partial: "Limited record — checked against what little is on file. Verify manually.",
  thin: "Almost no medication history on file — this is NOT a clean bill of health.",
};

/**
 * Renders the safety check at approval time. Suggest, never block: the parent's
 * Confirm button proceeds regardless of verdicts. "Ask Glyph" hands the warning
 * to the consult for sourced detail.
 */
export function PrescriptionSafetyPanel(props: {
  result: SafetyResult;
  onVerdict: (v: WarningVerdict) => void;
  onAskGlyph: (warningText: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirming: boolean;
}) {
  const { result, onVerdict, onAskGlyph, onConfirm, onCancel, confirming } = props;
  const [verdicts, setVerdicts] = React.useState<Record<number, Verdict>>({});

  const setV = (index: number, verdict: Verdict) => {
    setVerdicts((p) => ({ ...p, [index]: verdict }));
    onVerdict({ index, verdict });
  };

  const isThinEmpty = result.warnings.length === 0 && result.dataCompleteness === "thin";

  if (result.status === "failed") {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">⚠ Safety check couldn&apos;t run — review the prescription manually.</p>
        <p className="mt-1 text-xs text-amber-700">{result.reason}</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={onConfirm} disabled={confirming}>{confirming ? "Approving…" : "Approve anyway"}</Button>
          <Button variant="outline" onClick={onCancel} disabled={confirming}>Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-bone-line bg-white p-4">
      {result.warnings.length === 0 ? (
        isThinEmpty ? (
          <p className="text-sm font-medium text-amber-800">⚠ No interactions found, but there is almost no medication history on file — this is NOT a clean bill of health. Review the prescription manually.</p>
        ) : (
          <p className="text-sm font-medium text-glyph-800">✓ No interactions found based on the medications on file.</p>
        )
      ) : (
        <>
          <p className="text-sm font-semibold text-ink">Review {result.warnings.length} possible concern{result.warnings.length > 1 ? "s" : ""} before approving:</p>
          {result.warnings.map((w, i) => (
            <div key={i} className={`rounded-lg border p-3 ${SEVERITY_STYLE[w.severity] ?? SEVERITY_STYLE.low}`}>
              <p className="text-[13px] font-semibold uppercase tracking-wide">{w.severity} · {w.type}</p>
              <p className="mt-1 text-sm text-ink">{w.subject} ↔ {w.object}</p>
              <p className="mt-1 text-sm text-ink-soft">{w.explanation}</p>
              <p className="mt-1 text-xs text-ink-faint">Basis: {w.basis}{w.confidence === "low" ? " · low confidence, verify" : ""}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => onAskGlyph(`${w.subject} with ${w.object}: ${w.explanation}`)} className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-bone-raise">Ask Glyph</button>
                {(["adjust", "accept", "dismiss"] as Verdict[]).map((v) => (
                  <button type="button" key={v} aria-pressed={verdicts[i] === v} onClick={() => setV(i, v)} className={`rounded-full border px-3 py-1 text-xs capitalize ${verdicts[i] === v ? "border-ink bg-ink text-bone-raise" : "border-ink/20 text-ink"}`}>{v}</button>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
      {!isThinEmpty && <p className="text-xs text-ink-faint">{COMPLETENESS_NOTE[result.dataCompleteness]}</p>}
      <div className="flex gap-2 pt-1">
        <Button onClick={onConfirm} disabled={confirming}>{confirming ? "Approving…" : "Confirm & approve"}</Button>
        <Button variant="outline" onClick={onCancel} disabled={confirming}>Back to note</Button>
      </div>
    </div>
  );
}
