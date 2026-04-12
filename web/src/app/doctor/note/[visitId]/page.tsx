"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import {
  NoteEditor,
  type NoteFormat,
  type NoteEdits,
} from "@/components/doctor/NoteEditor";
import type { BDNote } from "@/components/doctor/NoteFormatBD";
import type { SOAPNote } from "@/components/doctor/NoteEditor";
import {
  LinkedEvidence,
  type EvidenceItem,
} from "@/components/doctor/LinkedEvidence";

/**
 * Review, edit, and approve the AI-generated clinical note.
 *
 * Displays:
 * - NoteEditor with the generated note in BD format (CC/O-E/Ix/Rx/Advice)
 * - Side panel with source references (LinkedEvidence)
 * - "Approve & Send" button and "Edit" toggle
 * - Option to switch note format between BD and SOAP
 *
 * After approval, the note is locked and can be sent to the patient
 * or stored in the medical record system.
 */
export default function NotePage() {
  const params = useParams<{ visitId: string }>();
  const router = useRouter();
  const visitId = params.visitId;

  const [isSending, setIsSending] = React.useState(false);
  const [isSent, setIsSent] = React.useState(false);
  const [isApproved, setIsApproved] = React.useState(false);

  // Evidence panel state
  const [evidenceOpen, setEvidenceOpen] = React.useState(false);
  const [selectedEvidence, setSelectedEvidence] =
    React.useState<EvidenceItem | null>(null);

  // Placeholder generated notes
  const bdNote: BDNote = {
    cc: "Chest pain for 2 days, worse on exertion, dull aching, left-sided. No radiation to arm or jaw. Associated mild SOB on exertion (new).",
    oe: "BP: 150/90 mmHg. Pulse: 88/min, regular. Temp: 98.4\u00b0F. SpO2: 97% on RA.\nChest: Clear bilateral air entry, no added sounds.\nCVS: S1S2 normal, no murmur. JVP not raised.\nAbdomen: Soft, non-tender.",
    ix: "ECG: NSR, no ST changes (done at clinic).\n\nAdvised:\n- Troponin I (stat)\n- Lipid profile\n- Fasting glucose\n- Chest X-ray PA view\n- 2D Echo (if troponin negative)",
    rx: "1. Tab. Aspirin 75mg -- 0+1+0 (after lunch) x continue\n2. Tab. Atorvastatin 20mg -- 0+0+1 x continue\n3. Tab. Metformin 500mg -- 1+0+1 x continue (existing)\n4. Tab. Amlodipine 5mg -- 0+0+1 x continue (existing)\n5. Tab. Pantoprazole 40mg -- 1+0+0 x 14 days (replace Omeprazole)\n6. SL Nitroglycerin 0.5mg -- SOS for chest pain",
    advice: "1. Avoid heavy exertion until cardiac workup complete.\n2. If chest pain recurs at rest or becomes severe, go to nearest ER immediately.\n3. Get troponin and lipid profile done today.\n4. Follow up in 3 days with reports.\n5. Continue diabetic diet. Monitor blood sugar.\n6. Quit betel nut if applicable.",
  };

  const soapNote: SOAPNote = {
    subjective:
      "55-year-old female presents with chest pain for 2 days. Pain is dull, aching, left-sided, and worsens with exertion (e.g., climbing stairs). No radiation to arm or jaw. No diaphoresis. Son reports patient was self-treating with antacids. New-onset mild shortness of breath on exertion. PMH: T2DM (8y), HTN (5y). Current meds: Metformin 500mg BD, Amlodipine 5mg ON, Omeprazole 20mg OD. Allergy: Penicillin (rash, unverified).",
    objective:
      "VS: BP 150/90, HR 88 regular, Temp 98.4F, SpO2 97% RA. General: Alert, comfortable at rest. Chest: Clear B/L, no added sounds. CVS: S1S2 normal, no murmur, JVP normal. Abdomen: Soft, NT. ECG: NSR, no ST changes. Recent labs: HbA1c 8.2%, FBS 165, Cr 1.0, TC 245.",
    assessment:
      "1. Chest pain -- rule out ACS in high-risk patient (diabetic, hypertensive, hyperlipidemic)\n2. Uncontrolled T2DM (HbA1c 8.2%)\n3. Hypertension -- currently on Amlodipine, BP 150/90 (suboptimal)\n4. Hyperlipidemia -- new diagnosis, TC 245",
    plan: "1. Stat troponin I, lipid profile, FBS\n2. Start Aspirin 75mg daily, Atorvastatin 20mg ON\n3. Change Omeprazole to Pantoprazole 40mg (better with Aspirin)\n4. SL NTG 0.5mg SOS for chest pain\n5. Chest X-ray PA, 2D Echo if troponin negative\n6. Continue Metformin and Amlodipine\n7. Follow up in 3 days with results\n8. Counsel: avoid exertion, ER if worsening",
  };

  // Source references for the note
  const sourceReferences: EvidenceItem[] = [
    {
      id: "src_1",
      sourceType: "patient",
      sourceLabel: "Patient intake interview",
      content:
        "I have been having pain in my chest for 2 days. It gets worse when I walk.",
      timestamp: new Date().toISOString(),
      confidence: "high",
      fullContext:
        "Recorded during structured intake, patient pointed to left precordial area.",
    },
    {
      id: "src_2",
      sourceType: "attendant",
      sourceLabel: "Attendant (son)",
      content:
        "My mother has been taking Gaviscon thinking it is gas pain. She also gets breathless walking to the bathroom now.",
      timestamp: new Date().toISOString(),
      confidence: "high",
    },
    {
      id: "src_3",
      sourceType: "rx_photo",
      sourceLabel: "Previous prescription photo",
      content:
        "Extracted medications: Metformin 500mg 1+0+1, Amlodipine 5mg 0+0+1, Omeprazole 20mg 1+0+0",
      timestamp: new Date().toISOString(),
      confidence: "high",
    },
    {
      id: "src_4",
      sourceType: "lab_report",
      sourceLabel: "Lab report (2 weeks ago)",
      content:
        "HbA1c: 8.2%, FBS: 165 mg/dL, S. Creatinine: 1.0 mg/dL, Total Cholesterol: 245 mg/dL",
      timestamp: new Date().toISOString(),
      confidence: "high",
    },
  ];

  const handleApprove = (
    note: BDNote | SOAPNote,
    format: NoteFormat,
    edits: NoteEdits
  ) => {
    setIsApproved(true);
    // TODO: Save approved note to Supabase
    console.log("Note approved:", { visitId, format, edits });
  };

  const handleSend = async () => {
    setIsSending(true);
    // TODO: Send note via API
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSending(false);
    setIsSent(true);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Go back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </button>
          <div>
            <h1 className="text-sm font-semibold text-slate-800">
              Clinical Note
            </h1>
            <p className="text-[10px] text-slate-400">
              Rahima Begum &middot; {visitId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isApproved && !isSent && (
            <Button size="sm" onClick={handleSend} loading={isSending}>
              Approve &amp; Send
            </Button>
          )}
          {isSent && (
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
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
              Sent
            </span>
          )}
        </div>
      </div>

      {/* Main content: Note editor + Source references */}
      <div className="flex flex-1 overflow-hidden">
        {/* Note editor */}
        <div className="flex-1 overflow-y-auto">
          <NoteEditor
            visitId={visitId}
            bdNote={bdNote}
            soapNote={soapNote}
            onApprove={handleApprove}
            isApproved={isApproved}
            className="h-full"
          />
        </div>

        {/* Source references sidebar */}
        <aside className="hidden w-72 shrink-0 flex-col border-l border-slate-200 bg-slate-50 lg:flex">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Source References
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-2">
              {sourceReferences.map((ref) => (
                <button
                  key={ref.id}
                  type="button"
                  onClick={() => {
                    setSelectedEvidence(ref);
                    setEvidenceOpen(true);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-left transition hover:border-glyph-300 hover:shadow-sm"
                >
                  <span className="mb-1 block text-[10px] font-medium text-glyph-600">
                    {ref.sourceLabel}
                  </span>
                  <p className="line-clamp-2 text-xs text-slate-600">
                    &ldquo;{ref.content}&rdquo;
                  </p>
                  <span className="mt-1 block text-[9px] text-slate-400">
                    {ref.confidence} confidence
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Linked Evidence panel */}
      <LinkedEvidence
        open={evidenceOpen}
        evidence={selectedEvidence}
        onClose={() => setEvidenceOpen(false)}
      />
    </div>
  );
}
