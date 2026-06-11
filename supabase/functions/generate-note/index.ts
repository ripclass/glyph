/**
 * generate-note — Post-consultation clinical note generation.
 *
 * POST { visitId, format: 'bd' | 'soap' }
 *
 * Fetches intake summary, briefing card, consultation transcript,
 * consultation queries, and patient history. Generates a structured
 * ClinicalNote in the requested format (BD default: CC/O-E/Ix/Rx/Advice).
 * Attaches evidence links mapping each claim to its source.
 * Returns a streaming response.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { callLLM } from "../_shared/llm-router.ts";
import { logUsage } from "../_shared/cost-logger.ts";
import type { ClinicalNote, EdgeFunctionResponse } from "../_shared/types.ts";

const BD_NOTE_SYSTEM_PROMPT = `You are a clinical note generation system for doctors in Bangladesh.
Generate a clinical note in the standard Bangladeshi prescription format.

Output ONLY valid JSON matching this schema:
{
  "format": "bd",
  "chiefComplaint": "concise CC statement",
  "onExamination": "O/E findings — organized by system. If no exam data, note 'Examination findings to be added by doctor'",
  "investigations": "Ix — relevant investigations done or to be ordered",
  "diagnosis": "working diagnosis with ICD-10 if possible",
  "prescription": {
    "medications": [
      {
        "name": "brand name (available in Bangladesh)",
        "genericName": "generic name",
        "dose": "e.g. 500mg",
        "frequency": "e.g. 1+0+1 (Bangladeshi format)",
        "duration": "e.g. 7 days",
        "route": "oral/IV/IM/topical/subcutaneous",
        "instructions": "e.g. after meals"
      }
    ],
    "investigationsOrdered": ["list of new investigations to order"]
  },
  "advice": "patient advice — diet, lifestyle, warning signs to watch for",
  "followUp": "follow-up plan — when to return, what to monitor",
  "icdCodes": ["ICD-10 codes"],
  "evidenceLinks": {
    "claim or recommendation": "source or guideline citation"
  }
}

Rules:
- Use Bangladeshi prescription conventions (1+0+1 format for frequency)
- Prefer drugs available in Bangladesh (check common brands)
- Include ICD-10 codes where confident
- Map each medication and recommendation to evidence in evidenceLinks
- If consultation queries provided evidence, reference those sources
- Be concise but thorough`;

const SOAP_NOTE_SYSTEM_PROMPT = `You are a clinical note generation system.
Generate a SOAP note.

Output ONLY valid JSON:
{
  "format": "soap",
  "subjective": "S — patient's reported symptoms, HPI, review of systems",
  "objective": "O — examination findings, vitals, lab results",
  "assessment": "A — diagnosis, differential, clinical reasoning",
  "plan": "P — treatment plan, medications, follow-up, patient education",
  "icdCodes": ["ICD-10 codes"],
  "evidenceLinks": {
    "claim or recommendation": "source or guideline citation"
  }
}`;

serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    // ── Auth ────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ success: false, error: "Missing authorization header", code: "UNAUTHORIZED" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return jsonResponse({ success: false, error: "Invalid token", code: "UNAUTHORIZED" }, 401);
    }

    // ── Parse body ──────────────────────────────────────────
    const { visitId, format = "bd" } = await req.json();
    if (!visitId) {
      return jsonResponse({ success: false, error: "visitId is required", code: "BAD_REQUEST" }, 400);
    }

    if (format !== "bd" && format !== "soap") {
      return jsonResponse({ success: false, error: "format must be 'bd' or 'soap'", code: "BAD_REQUEST" }, 400);
    }

    // ── Fetch visit ─────────────────────────────────────────
    const { data: visit, error: visitErr } = await supabase
      .from("visits")
      .select(`
        id, patient_id, visit_number,
        intake_summary, briefing_card,
        consultation_transcript, consultation_queries
      `)
      .eq("id", visitId)
      .single();

    if (visitErr || !visit) {
      return jsonResponse({ success: false, error: "Visit not found", code: "NOT_FOUND" }, 404);
    }

    // ── Fetch patient + history in parallel ──────────────────
    const [patientRes, prescriptionsRes, labReportsRes] = await Promise.all([
      supabase
        .from("patients")
        .select("name, name_bn, age, gender, blood_group, known_allergies, chronic_conditions")
        .eq("id", visit.patient_id)
        .single(),
      supabase
        .from("prescriptions")
        .select("prescribing_doctor_name, prescription_date, diagnosis, medications")
        .eq("patient_id", visit.patient_id)
        .order("prescription_date", { ascending: false })
        .limit(5),
      supabase
        .from("lab_reports")
        .select("report_date, test_category, results")
        .eq("patient_id", visit.patient_id)
        .order("report_date", { ascending: false })
        .limit(10),
    ]);

    const patient = patientRes.data;
    const prescriptions = prescriptionsRes.data ?? [];
    const labReports = labReportsRes.data ?? [];

    if (!patient) {
      return jsonResponse({ success: false, error: "Patient not found", code: "NOT_FOUND" }, 404);
    }

    // ── Extract evidence from consultation queries ──────────
    const queryEvidence: string[] = [];
    const consultQueries = (visit.consultation_queries as Record<string, unknown>[] | null) ?? [];
    for (const q of consultQueries) {
      const resp = q.response as Record<string, unknown> | undefined;
      if (resp?.sources) {
        const sources = resp.sources as Array<{ title?: string; citation?: string; url?: string }>;
        for (const s of sources) {
          if (s.citation || s.title) {
            queryEvidence.push(`${s.title ?? ""}: ${s.citation ?? ""} ${s.url ?? ""}`);
          }
        }
      }
    }

    // ── Build comprehensive prompt ──────────────────────────
    const prompt = `Generate a ${format === "bd" ? "Bangladeshi-format" : "SOAP"} clinical note for this visit.

=== PATIENT ===
Name: ${patient.name_bn ?? patient.name}
Age: ${patient.age}, Gender: ${patient.gender}, Blood Group: ${patient.blood_group ?? "N/A"}
Allergies: ${JSON.stringify(patient.known_allergies ?? [])}
Chronic Conditions: ${JSON.stringify(patient.chronic_conditions ?? [])}

=== INTAKE SUMMARY ===
${JSON.stringify(visit.intake_summary ?? {}, null, 2)}

=== BRIEFING CARD ===
${JSON.stringify(visit.briefing_card ?? {}, null, 2)}

=== CONSULTATION TRANSCRIPT ===
${visit.consultation_transcript ? JSON.stringify(visit.consultation_transcript, null, 2) : "No transcript recorded."}

=== CONSULTATION QUERIES & ANSWERS ===
${consultQueries.length > 0 ? JSON.stringify(consultQueries, null, 2) : "No queries during consultation."}

=== RECENT PRESCRIPTIONS ===
${prescriptions.length > 0 ? JSON.stringify(prescriptions, null, 2) : "None on file."}

=== RECENT LAB REPORTS ===
${labReports.length > 0 ? JSON.stringify(labReports, null, 2) : "None on file."}

=== EVIDENCE SOURCES FROM CONSULTATION ===
${queryEvidence.length > 0 ? queryEvidence.join("\n") : "None."}

Generate the complete clinical note. Map each recommendation to its evidence source in evidenceLinks.`;

    const systemPrompt = format === "bd" ? BD_NOTE_SYSTEM_PROMPT : SOAP_NOTE_SYSTEM_PROMPT;

    // ── Call LLM (streaming) ────────────────────────────────
    const stream = await callLLM({
      // MedGemma demoted until Vertex OAuth exists - native streaming now works.
      primary: { provider: "claude", model: "claude-sonnet-4-20250514", temperature: 0.2, maxTokens: 5000 },
      fallback: { provider: "gemini", model: "gemini-2.0-flash", temperature: 0.2, maxTokens: 5000 },
      prompt,
      systemPrompt,
      stream: true,
      visitId,
      edgeFunction: "generate-note",
      // Tier A: structured record portions — name literals scrubbed, the
      // response stream re-identified before the tee.
      egress: {
        tier: "A",
        knownIdentifiers: [patient.name, patient.name_bn],
      },
    });

    // ── Tee stream: client + capture ────────────────────────
    const [clientStream, captureStream] = (stream as ReadableStream).tee();

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fire-and-forget: capture, parse, store
    (async () => {
      try {
        const reader = captureStream.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
        }

        const cleanedText = extractTextFromStream(fullText);

        let note: ClinicalNote;
        try {
          const jsonStr = cleanedText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
          note = JSON.parse(jsonStr);
        } catch {
          console.error("[generate-note] Failed to parse note:", cleanedText.slice(0, 500));
          return;
        }

        // Extract evidence links from the note
        const evidenceLinks = note.evidenceLinks ?? {};

        await serviceClient
          .from("visits")
          .update({
            generated_note: note,
            evidence_links: evidenceLinks,
            note_format: format,
            status: "note_review",
          })
          .eq("id", visitId);

        await logUsage({
          visitId,
          edgeFunction: "generate-note",
          model: "claude-sonnet-4-20250514",
          wasFallback: false,
          inputTokens: Math.ceil(prompt.length / 4),
          outputTokens: Math.ceil(cleanedText.length / 4),
          latencyMs: 0,
        });
      } catch (captureErr) {
        console.error("[generate-note] Capture/store error:", captureErr);
      }
    })();

    return new Response(clientStream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[generate-note] Error:", err);
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : "Internal error", code: "INTERNAL_ERROR" },
      500,
    );
  }
});

function extractTextFromStream(raw: string): string {
  const lines = raw.split("\n");
  let text = "";

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      try {
        const json = JSON.parse(line.slice(6));
        const part = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (part) text += part;
      } catch {
        // Skip non-JSON SSE lines
      }
    }
  }

  return text || raw;
}

function jsonResponse<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
