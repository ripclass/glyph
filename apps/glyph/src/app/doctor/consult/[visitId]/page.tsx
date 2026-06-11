"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConsultChat, type ChatMessage } from "@/components/doctor/ConsultChat";
import { useConsultChat } from "@/lib/hooks/useConsultChat";
import { getVisit, type VisitWithRelations } from "@/lib/services/visits";

/**
 * Consultation workspace, LIVE.
 *
 * LEFT: patient context from the real visit (summary, meds, allergies).
 * RIGHT: the AI research chat backed by consult-query (UpToDate/Claude/
 * Perplexity routing with de-identification + the egress gate server-side).
 */
export default function ConsultPage() {
  const params = useParams<{ visitId: string }>();
  const router = useRouter();
  const visitId = params.visitId;

  const [visit, setVisit] = React.useState<VisitWithRelations | null>(null);
  const { messages, isQuerying, sendQuery } = useConsultChat(visitId);

  React.useEffect(() => {
    getVisit(visitId)
      .then(setVisit)
      .catch(() => setVisit(null));
  }, [visitId]);

  /** Map hook messages onto the ConsultChat display model */
  const chatMessages: ChatMessage[] = React.useMemo(
    () =>
      messages.map((m, i) => ({
        id: `msg-${i}`,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
        citations: m.sources?.map((s, j) => ({
          id: `cit-${i}-${j}`,
          type: "model" as const,
          title: s.label,
          url: s.reference?.startsWith("http") ? s.reference : undefined,
        })),
      })),
    [messages]
  );

  const summary = (visit?.intake_summary ?? {}) as {
    chiefComplaint?: string;
    hpiSummary?: string;
    currentMedications?: string[];
    allergies?: string[];
  };
  const patient = visit?.patients;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-base font-bold text-slate-800">
            {patient?.name_bn ?? patient?.name ?? "Consultation"}
          </h1>
          <p className="text-xs text-slate-500">
            {patient?.age ?? "?"}y · {patient?.gender ?? "—"}
            {visit?.attendant_present ? " · with attendant" : ""}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/doctor/note/${visitId}`)}>
          End Consultation → Note
        </Button>
      </header>

      {/* Split view */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: patient context */}
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4 md:block">
          <ContextSection title="Chief Complaint">
            {summary.chiefComplaint ?? "—"}
          </ContextSection>
          {summary.hpiSummary && (
            <ContextSection title="History">{summary.hpiSummary}</ContextSection>
          )}
          <ContextSection title="Current Medications">
            {summary.currentMedications?.length
              ? summary.currentMedications.join(", ")
              : "None recorded"}
          </ContextSection>
          <ContextSection title="Allergies">
            {summary.allergies?.length ? (
              <span className="font-medium text-red-600">{summary.allergies.join(", ")}</span>
            ) : (
              "None recorded"
            )}
          </ContextSection>
        </aside>

        {/* RIGHT: AI research chat */}
        <div className="flex-1 overflow-hidden">
          <ConsultChat
            visitId={visitId}
            messages={chatMessages}
            onSend={sendQuery}
            isLoading={isQuerying}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}

function ContextSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h2>
      <p className="text-sm text-slate-700">{children}</p>
    </div>
  );
}
