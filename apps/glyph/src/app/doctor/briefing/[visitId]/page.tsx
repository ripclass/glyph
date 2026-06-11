"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  BriefingCard,
  type BriefingData,
  type SourcedClaim,
} from "@/components/doctor/BriefingCard";
import { getVisitWithBriefing, updateVisitStatus, type VisitWithRelations } from "@/lib/services/visits";
import { generateBriefing } from "@/lib/services/ai";

/** Server briefing JSON shape (generate-briefing edge function) */
interface ServerBriefing {
  patientSnapshot?: { name?: string; age?: number; gender?: string; visitNumber?: number };
  chiefComplaint?: string;
  hpiSummary?: string;
  relevantHistory?: {
    chronicConditions?: string[];
    pastMedical?: string[];
    surgicalHistory?: string[];
    familyHistory?: string[];
  };
  currentMedications?: Array<{ name?: string; dose?: string; frequency?: string }>;
  allergies?: string[];
  recentLabs?: Array<{
    testName?: string;
    value?: string;
    unit?: string;
    normalRange?: string;
    isAbnormal?: boolean;
  }>;
  redFlags?: Array<{ severity?: string; message?: string; details?: string }>;
  suggestedFocus?: string[];
  differentialConsiderations?: string[];
}

const claim = (text: string, sourceType: SourcedClaim["sourceType"] = "patient"): SourcedClaim => ({
  text,
  sourceType,
});

/** Adapt the server briefing JSON to the BriefingCard display model. */
function toBriefingData(b: ServerBriefing, attendantPresent: boolean): BriefingData {
  const personSource = attendantPresent ? "attendant" : "patient";
  return {
    redFlags: (b.redFlags ?? []).map((f, i) => ({
      id: `flag-${i}`,
      text: f.message ?? "Red flag",
      reasoning: f.details ?? f.severity ?? "",
    })),
    chiefComplaint: b.chiefComplaint ? [claim(b.chiefComplaint, personSource)] : [],
    hpiClaims: b.hpiSummary ? [claim(b.hpiSummary, personSource)] : [],
    pastMedicalHistory: [
      ...(b.relevantHistory?.chronicConditions ?? []),
      ...(b.relevantHistory?.pastMedical ?? []),
      ...(b.relevantHistory?.surgicalHistory ?? []),
    ].map((t) => claim(t, personSource)),
    currentMedications: (b.currentMedications ?? [])
      .filter((m) => m.name)
      .map((m) => ({
        name: m.name!,
        dosage: [m.dose, m.frequency].filter(Boolean).join(" ") || "—",
        sourceType: "rx_photo" as const,
      })),
    recentLabs: (b.recentLabs ?? [])
      .filter((l) => l.testName)
      .map((l) => ({
        testName: l.testName!,
        value: [l.value, l.unit].filter(Boolean).join(" "),
        referenceRange: l.normalRange,
        isAbnormal: l.isAbnormal ?? false,
        sourceType: "lab_report" as const,
      })),
    allergies: (b.allergies ?? []).map((t) => claim(t, personSource)),
    socialHistory: [],
    assessment: [
      ...(b.suggestedFocus ?? []),
      ...(b.differentialConsiderations ?? []),
    ].map((t) => claim(t, "uptodate")),
  };
}

/**
 * THE doctor briefing screen, LIVE: loads the visit, polls briefly while the
 * briefing card is still generating (it is produced asynchronously after
 * intake completes), and renders the full source-attributed card.
 */
export default function BriefingPage() {
  const params = useParams<{ visitId: string }>();
  const router = useRouter();
  const visitId = params.visitId;

  const [visit, setVisit] = React.useState<VisitWithRelations | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function load() {
      try {
        const v = await getVisitWithBriefing(visitId);
        if (cancelled) return;
        setVisit(v);
        // Briefing generates async after intake-complete — poll up to ~60s
        if (!v.briefing_card && attempts < 20) {
          attempts++;
          setTimeout(load, 3000);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load visit");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [visitId]);

  const startConsultation = React.useCallback(async () => {
    try {
      await updateVisitStatus(visitId, "in_consultation");
    } catch {
      /* non-fatal — navigate anyway */
    }
    router.push(`/doctor/consult/${visitId}`);
  }, [visitId, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-glyph-200 border-t-glyph-600" />
        <p className="mt-4 text-sm text-slate-500">Loading visit…</p>
      </div>
    );
  }

  const patient = visit.patients;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Patient header */}
      <header className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {patient?.name_bn ?? patient?.name ?? "—"}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {patient?.name} · {patient?.age ?? "?"}y · {patient?.gender ?? "—"}
            {visit.visit_number ? ` · Visit #${visit.visit_number}` : ""}
            {visit.attendant_present ? " · with attendant" : ""}
          </p>
        </div>
        <Button onClick={startConsultation}>Start Consultation →</Button>
      </header>

      {visit.briefing_card ? (
        <BriefingCard
          data={toBriefingData(
            visit.briefing_card as ServerBriefing,
            visit.attendant_present ?? false
          )}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-[3px] border-glyph-200 border-t-glyph-600" />
          <p className="mt-3 text-sm font-medium text-slate-500">
            Briefing is being generated…
          </p>
          <p className="mt-1 text-xs text-slate-400">
            This appears automatically when ready (usually under a minute)
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={async () => {
              // Generation can fail transiently (network) — re-kick it and
              // let the existing poll pick the result up.
              try {
                const stream = await generateBriefing(visitId);
                const reader = stream.getReader();
                while (!(await reader.read()).done) {
                  /* drain — capture branch persists */
                }
                const v = await getVisitWithBriefing(visitId);
                setVisit(v);
              } catch {
                /* the empty state remains; doctor can retry again */
              }
            }}
          >
            Retry generation
          </Button>
        </div>
      )}
    </div>
  );
}
