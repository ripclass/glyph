"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SourceTag } from "@/components/doctor/SourceTag";
import { ConsultChat, type ChatMessage } from "@/components/doctor/ConsultChat";
import { AmbientRecorder } from "@/components/doctor/AmbientRecorder";

/**
 * Split-view consultation screen for active patient encounters.
 *
 * Layout:
 * - **LEFT panel**: Patient context (briefing summary, current meds, allergies, red flags)
 * - **RIGHT panel**: AI research chat (ConsultChat component)
 * - **Bottom bar**: Ambient recording indicator (AmbientRecorder)
 * - "End Consultation" button in the header
 *
 * This is the main workspace during an active consultation.
 * The split view allows the doctor to reference patient data
 * while querying the AI research assistant.
 */
export default function ConsultPage() {
  const params = useParams<{ visitId: string }>();
  const router = useRouter();
  const visitId = params.visitId;

  // Recording state
  const [isRecording, setIsRecording] = React.useState(true);
  const [isPaused, setIsPaused] = React.useState(false);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);

  // Chat state
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = React.useState(false);

  // Timer for recording elapsed time
  React.useEffect(() => {
    if (!isRecording || isPaused) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const handleSendMessage = (content: string) => {
    const doctorMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "doctor",
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, doctorMsg]);

    // Simulate AI response
    setIsAiLoading(true);
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        role: "ai",
        content:
          "Based on the patient's presentation (chest pain, diabetes, hypertension, elevated cholesterol), this aligns with a high cardiovascular risk profile. Current guidelines recommend an ECG and troponin levels as initial workup. Given the exertional nature, a stress test may be considered after ruling out ACS.",
        timestamp: new Date().toISOString(),
        citations: [
          {
            id: "cit_1",
            type: "uptodate",
            title: "Evaluation of chest pain in adults",
            url: "https://www.uptodate.com/contents/evaluation-of-chest-pain",
          },
          {
            id: "cit_2",
            type: "pubmed",
            title: "ACC/AHA Chest Pain Guideline 2021",
          },
        ],
        confidence: "high",
        evidenceLevel: "Level I",
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsAiLoading(false);
    }, 2000);
  };

  const handleEndConsultation = () => {
    setIsRecording(false);
    router.push(`/doctor/note/${visitId}`);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Top header */}
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
              Consultation
            </h1>
            <p className="text-[10px] text-slate-400">
              Rahima Begum &middot; 55y/F &middot; {visitId}
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleEndConsultation}
        >
          End Consultation
        </Button>
      </div>

      {/* Split panels */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Patient context */}
        <aside className="hidden w-80 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white md:flex">
          <div className="p-4 space-y-4">
            {/* Red flags */}
            <section>
              <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-red-600">
                Red Flags
              </h2>
              <div className="rounded-md bg-red-50 border border-red-200 p-2">
                <p className="text-xs font-medium text-red-800">
                  Chest pain at rest with exertional worsening
                </p>
                <p className="mt-0.5 text-[10px] text-red-600">
                  New-onset in diabetic, hypertensive patient
                </p>
              </div>
            </section>

            {/* Briefing summary */}
            <section>
              <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Briefing Summary
              </h2>
              <div className="space-y-1.5 text-xs text-slate-700">
                <p>
                  <span className="font-medium">CC:</span> Chest pain 2 days,
                  exertional, left-sided
                  <SourceTag type="patient" className="ml-1" />
                </p>
                <p>
                  <span className="font-medium">HPI:</span> Onset after stair
                  climbing, no radiation, mild SOB
                </p>
                <p>
                  <span className="font-medium">PMH:</span> T2DM (8y), HTN (5y)
                </p>
              </div>
            </section>

            {/* Current medications */}
            <section>
              <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Current Medications
              </h2>
              <ul className="space-y-1">
                {[
                  { name: "Metformin 500mg", dosage: "1+0+1" },
                  { name: "Amlodipine 5mg", dosage: "0+0+1" },
                  { name: "Omeprazole 20mg", dosage: "1+0+0" },
                ].map((med, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-xs"
                  >
                    <span className="text-slate-700">{med.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {med.dosage}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Allergies */}
            <section>
              <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                Allergies
              </h2>
              <Badge variant="warning">Penicillin (rash)</Badge>
            </section>

            {/* Key labs */}
            <section>
              <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Recent Labs
              </h2>
              <div className="space-y-1">
                {[
                  { test: "HbA1c", value: "8.2%", abnormal: true },
                  { test: "FBS", value: "165 mg/dL", abnormal: true },
                  { test: "Creatinine", value: "1.0 mg/dL", abnormal: false },
                  { test: "Cholesterol", value: "245 mg/dL", abnormal: true },
                ].map((lab, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center justify-between rounded px-2 py-1 text-xs",
                      lab.abnormal ? "bg-red-50" : "bg-slate-50"
                    )}
                  >
                    <span className="text-slate-600">{lab.test}</span>
                    <span
                      className={cn(
                        "font-mono text-[10px]",
                        lab.abnormal ? "font-bold text-red-700" : "text-slate-500"
                      )}
                    >
                      {lab.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </aside>

        {/* RIGHT: AI Research Chat */}
        <div className="flex flex-1 flex-col">
          <ConsultChat
            visitId={visitId}
            messages={messages}
            onSend={handleSendMessage}
            isLoading={isAiLoading}
            className="flex-1"
          />
        </div>
      </div>

      {/* Bottom: Ambient recorder */}
      <AmbientRecorder
        isRecording={isRecording}
        elapsedSeconds={elapsedSeconds}
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
      />
    </div>
  );
}
