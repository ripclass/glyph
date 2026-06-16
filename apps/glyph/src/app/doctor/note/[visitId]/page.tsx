"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  NoteEditor,
  type NoteFormat,
  type NoteEdits,
  type SOAPNote,
} from "@/components/doctor/NoteEditor";
import type { BDNote } from "@/components/doctor/NoteFormatBD";
import { generateNote } from "@/lib/services/ai";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getVisit, type VisitWithRelations } from "@/lib/services/visits";
import { createClient } from "@/lib/supabase/client";
import { WalletHandoff } from "@/components/doctor/WalletHandoff";
import { checkPrescriptionSafety } from "@/lib/services/safety";
import type { SafetyResult, WarningVerdict } from "@/lib/services/safety-logic";
import { PrescriptionSafetyPanel } from "@/components/doctor/PrescriptionSafetyPanel";

/** Server note JSON shape (generate-note edge function, BD format) */
interface ServerNote {
  chiefComplaint?: string;
  onExamination?: string;
  investigations?: string;
  diagnosis?: string;
  prescription?: {
    medications?: Array<{
      name?: string;
      dose?: string;
      frequency?: string;
      duration?: string;
      instructions?: string;
    }>;
    investigationsOrdered?: string[];
  };
  advice?: string;
  followUp?: string;
}

function rxText(note: ServerNote): string {
  const meds = note.prescription?.medications ?? [];
  return meds
    .filter((m) => m.name)
    .map(
      (m, i) =>
        `${i + 1}. ${[m.name, m.dose, m.frequency, m.duration, m.instructions]
          .filter(Boolean)
          .join(" — ")}`
    )
    .join("\n");
}

function toBDNote(note: ServerNote): BDNote {
  return {
    cc: note.chiefComplaint ?? "",
    oe: note.onExamination ?? "",
    ix: [note.investigations, ...(note.prescription?.investigationsOrdered ?? [])]
      .filter(Boolean)
      .join("; "),
    rx: rxText(note),
    advice: [note.advice, note.followUp ? `Follow-up: ${note.followUp}` : ""]
      .filter(Boolean)
      .join("\n"),
  };
}

function toSOAPNote(note: ServerNote): SOAPNote {
  return {
    subjective: note.chiefComplaint ?? "",
    objective: note.onExamination ?? "",
    assessment: note.diagnosis ?? "",
    plan: [rxText(note), note.advice, note.followUp].filter(Boolean).join("\n"),
  };
}

/**
 * Note review + approval, LIVE.
 *
 * Generation streams server-side and the capture branch persists
 * `generated_note` — this page kicks generation off, then reads the
 * persisted note (single source of truth across transports). Approval goes
 * through /api/visits/approve-note, which issues the VisitNote +
 * Prescription credentials and freezes the note at the database level.
 */
export default function NotePage() {
  const params = useParams<{ visitId: string }>();
  const visitId = params.visitId;
  /**
   * Note format follows the doctor's saved preference (settings screen).
   * BD is the default; SOAP only when explicitly chosen — the §12 opt-in.
   */
  const preferredFormat = useAuthStore((s) =>
    s.doctor?.preferred_note_format === "soap" ? ("soap" as const) : ("bd" as const)
  );

  const [visit, setVisit] = React.useState<VisitWithRelations | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [approving, setApproving] = React.useState(false);
  const [credentials, setCredentials] = React.useState<{
    visitNoteVcId: string;
    prescriptionVcId: string | null;
  } | null>(null);
  const [safety, setSafety] = React.useState<SafetyResult | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [pendingApproval, setPendingApproval] = React.useState<
    { doctorEdits: ServerNote | undefined } | null
  >(null);
  const verdictsRef = React.useRef<WarningVerdict[]>([]);

  const refresh = React.useCallback(async () => {
    const v = await getVisit(visitId);
    setVisit(v);
    return v;
  }, [visitId]);

  React.useEffect(() => {
    void refresh().catch(() => setVisit(null));
  }, [refresh]);

  /** Kick off generation, drain the stream, then poll for the persisted note. */
  const handleGenerate = React.useCallback(async () => {
    setGenerating(true);
    try {
      const stream = await generateNote(visitId, preferredFormat);
      const reader = stream.getReader();
      while (!(await reader.read()).done) {
        /* drain — the server capture branch persists the parsed note */
      }
      for (let i = 0; i < 10; i++) {
        const v = await refresh();
        if (v.generated_note) return;
        await new Promise((r) => setTimeout(r, 1500));
      }
      toast.error("Note generation finished but no note was stored — check function logs");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Note generation failed");
    } finally {
      setGenerating(false);
    }
  }, [visitId, preferredFormat, refresh]);

  /**
   * Phase 1 of approval: intercept the NoteEditor's approve, run the
   * prescription safety check, and park the (possibly edited) note. The actual
   * POST that issues credentials happens in commitApproval, behind the panel's
   * Confirm — so the doctor always reviews the safety result before signing.
   * Doctor edits to the text sections are merged over the stored note; the
   * structured medication list stays as generated (structured Rx editing is a
   * follow-up) so the PrescriptionCredential always carries real structured data.
   */
  const handleApprove = React.useCallback(
    async (_note: BDNote | SOAPNote, format: NoteFormat, edits: NoteEdits) => {
      if (format === "soap") {
        toast.error("Approval is BD-format only for now");
        return;
      }
      if (checking || approving) return;
      const original = (visit?.generated_note ?? {}) as ServerNote;
      const edited = _note as BDNote;
      const hasEdits = Object.values(edits).some(Boolean);
      const doctorEdits = hasEdits
        ? {
            ...original,
            chiefComplaint: edited.cc,
            onExamination: edited.oe,
            investigations: edited.ix,
            advice: edited.advice,
          }
        : undefined;

      setChecking(true);
      verdictsRef.current = [];
      try {
        const meds = (original.prescription?.medications ?? []).filter((m) => m.name);
        const result = await checkPrescriptionSafety(visitId, meds);
        setSafety(result);
        setPendingApproval({ doctorEdits });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Safety check failed");
      } finally {
        setChecking(false);
      }
    },
    [visitId, visit, checking, approving]
  );

  /**
   * Phase 2 of approval: the panel's Confirm calls this. This is the original
   * approve POST, unchanged except it now carries the safetyCheck record. The
   * safety check NEVER blocks — a failed result still reaches here via the
   * panel's "Approve anyway".
   */
  const commitApproval = React.useCallback(async () => {
    if (!pendingApproval || !safety) return;
    setApproving(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const safetyCheck = { ...safety, verdicts: verdictsRef.current };
      const res = await fetch("/api/visits/approve-note", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          visitId,
          safetyCheck,
          ...(pendingApproval.doctorEdits ? { doctorEdits: pendingApproval.doctorEdits } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? `Approval failed (${res.status})`);
      }
      setCredentials({
        visitNoteVcId: json.data.visitNoteVcId,
        prescriptionVcId: json.data.prescriptionVcId,
      });
      toast.success("Note approved — credentials issued");
      setSafety(null);
      setPendingApproval(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setApproving(false);
    }
  }, [pendingApproval, safety, visitId, refresh]);

  if (!visit) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-glyph-200 border-t-glyph-600" />
      </div>
    );
  }

  const serverNote = visit.generated_note as ServerNote | null;
  const isApproved = Boolean(visit.note_credential_id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Clinical Note</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {visit.patients?.name_bn ?? visit.patients?.name ?? "—"}
            {isApproved ? " · approved & credentialed" : ""}
          </p>
        </div>
        {!serverNote && (
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? "Generating…" : "Generate Note"}
          </Button>
        )}
      </header>

      {(credentials || isApproved) && (
        <div className="mb-5 rounded-xl border border-glyph-200 bg-glyph-50 p-4 text-sm">
          <p className="font-semibold text-glyph-800">
            ✓ Signed credentials issued — this note is now immutable
          </p>
          {credentials && (
            <div className="mt-2 space-y-1 font-mono text-[11px] text-glyph-700">
              <p>VisitNote: {credentials.visitNoteVcId}</p>
              {credentials.prescriptionVcId && (
                <p>Prescription: {credentials.prescriptionVcId}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Patient wallet handoff — the record is now worth holding */}
      {(credentials || isApproved) && visit.patient_id && (
        <WalletHandoff patientId={visit.patient_id} />
      )}

      {serverNote ? (
        <>
          {checking && (
            <p className="mb-3 text-center text-sm text-slate-500">
              Running prescription safety check…
            </p>
          )}
          {safety && (
            <div className="mb-5">
              <PrescriptionSafetyPanel
                result={safety}
                onVerdict={(v) => {
                  verdictsRef.current = [
                    ...verdictsRef.current.filter((x) => x.index !== v.index),
                    v,
                  ];
                }}
                onAskGlyph={(text) => {
                  window.location.href = `/doctor/consult/${visitId}?q=${encodeURIComponent(text)}`;
                }}
                onConfirm={commitApproval}
                onCancel={() => {
                  setSafety(null);
                  setPendingApproval(null);
                }}
                confirming={approving}
              />
            </div>
          )}
          {approving && (
            <p className="mb-3 text-center text-sm text-slate-500">
              Issuing credentials…
            </p>
          )}
          <NoteEditor
            visitId={visitId}
            bdNote={toBDNote(serverNote)}
            soapNote={toSOAPNote(serverNote)}
            onApprove={handleApprove}
            isApproved={isApproved}
          />
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-500">
            {generating
              ? "The note is being generated from the visit record…"
              : "No note yet — generate one from the intake + consultation data"}
          </p>
        </div>
      )}
    </div>
  );
}
