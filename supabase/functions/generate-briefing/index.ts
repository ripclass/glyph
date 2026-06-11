/**
 * generate-briefing — Generate the doctor briefing card for a visit.
 *
 * POST { visitId }
 *
 * Fetches intake summary, patient history, prescriptions, lab reports,
 * chronic conditions, and allergies. Sends to MedGemma 27B to produce
 * a structured BriefingCard with red-flag identification.
 * Returns a streaming response.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { callLLM } from "../_shared/llm-router.ts";
import { logUsage } from "../_shared/cost-logger.ts";
import type { BriefingCard, EdgeFunctionResponse } from "../_shared/types.ts";

const BRIEFING_SYSTEM_PROMPT = `You are a clinical decision support system generating a doctor briefing card.
You must output ONLY valid JSON matching this exact schema (no markdown, no explanation):

{
  "patientSnapshot": {
    "name": "string",
    "age": number,
    "gender": "string",
    "bloodGroup": "string or null",
    "visitNumber": number
  },
  "chiefComplaint": "concise chief complaint",
  "hpiSummary": "narrative HPI in 2-3 sentences",
  "relevantHistory": {
    "chronicConditions": ["string array"],
    "pastMedical": ["string array"],
    "surgicalHistory": ["string array"],
    "familyHistory": ["string array"]
  },
  "currentMedications": [
    {"name": "string", "dose": "string", "frequency": "string", "duration": "string or null"}
  ],
  "allergies": ["string array"],
  "recentLabs": [
    {
      "testName": "string",
      "value": "string",
      "unit": "string",
      "normalRange": "string",
      "isAbnormal": boolean,
      "date": "YYYY-MM-DD"
    }
  ],
  "redFlags": [
    {
      "type": "drug_interaction | abnormal_lab | allergy_conflict | contradiction | clinical_alert",
      "severity": "critical | warning | info",
      "message": "short alert message",
      "details": "optional explanation"
    }
  ],
  "suggestedFocus": ["string array of suggested examination/investigation focus areas"],
  "differentialConsiderations": ["string array of differential diagnoses to consider"]
}

RED FLAG RULES:
1. DRUG INTERACTIONS: Check ALL current medications against each other AND against allergies. Flag critical interactions.
2. ALLERGY CONFLICTS: If any current medication belongs to a class the patient is allergic to, flag as CRITICAL.
3. ABNORMAL LABS: Flag lab values that are significantly out of range, especially worsening trends.
4. CONTRADICTIONS: Flag if a current medication is contraindicated given the patient's conditions (e.g., Metformin in severe CKD).
5. CLINICAL ALERTS: Flag any urgent clinical concerns based on the history.`;

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
    const { visitId } = await req.json();
    if (!visitId) {
      return jsonResponse({ success: false, error: "visitId is required", code: "BAD_REQUEST" }, 400);
    }

    // ── Fetch visit ─────────────────────────────────────────
    const { data: visit, error: visitErr } = await supabase
      .from("visits")
      .select("id, patient_id, visit_number, intake_summary")
      .eq("id", visitId)
      .single();

    if (visitErr || !visit) {
      return jsonResponse({ success: false, error: "Visit not found", code: "NOT_FOUND" }, 404);
    }

    // ── Fetch all related data in parallel ──────────────────
    const [patientRes, prescriptionsRes, labReportsRes] = await Promise.all([
      supabase
        .from("patients")
        .select("name, name_bn, age, gender, blood_group, known_allergies, chronic_conditions")
        .eq("id", visit.patient_id)
        .single(),
      supabase
        .from("prescriptions")
        .select("prescribing_doctor_name, prescription_date, diagnosis, medications, investigations_ordered")
        .eq("patient_id", visit.patient_id)
        .order("prescription_date", { ascending: false })
        .limit(10),
      supabase
        .from("lab_reports")
        .select("lab_name, report_date, test_category, results")
        .eq("patient_id", visit.patient_id)
        .order("report_date", { ascending: false })
        .limit(20),
    ]);

    const patient = patientRes.data;
    const prescriptions = prescriptionsRes.data ?? [];
    const labReports = labReportsRes.data ?? [];

    if (!patient) {
      return jsonResponse({ success: false, error: "Patient not found", code: "NOT_FOUND" }, 404);
    }

    // ── Build context prompt ────────────────────────────────
    const prompt = `Generate a comprehensive briefing card for this patient visit.

=== PATIENT ===
Name: ${patient.name_bn ?? patient.name}
Age: ${patient.age}
Gender: ${patient.gender}
Blood Group: ${patient.blood_group ?? "Unknown"}
Visit Number: ${visit.visit_number ?? 1}

=== KNOWN ALLERGIES ===
${JSON.stringify(patient.known_allergies ?? [], null, 2)}

=== CHRONIC CONDITIONS ===
${JSON.stringify(patient.chronic_conditions ?? [], null, 2)}

=== INTAKE SUMMARY (from today's visit) ===
${JSON.stringify(visit.intake_summary ?? {}, null, 2)}

=== PRESCRIPTION HISTORY (most recent first) ===
${prescriptions.length > 0 ? JSON.stringify(prescriptions, null, 2) : "No prescriptions on file."}

=== LAB REPORT HISTORY (most recent first) ===
${labReports.length > 0 ? JSON.stringify(labReports, null, 2) : "No lab reports on file."}

Generate the briefing card JSON. Pay special attention to:
1. Drug interactions among current medications
2. Medications that conflict with known allergies
3. Abnormal lab trends (compare values across dates if available)
4. Contraindications given chronic conditions
5. Relevant differential diagnoses for the chief complaint`;

    // ── Call LLM (streaming) ────────────────────────────────
    const stream = await callLLM({
      // MedGemma demoted until Vertex OAuth exists - native streaming now works.
      primary: { provider: "claude", model: "claude-sonnet-4-20250514", temperature: 0.2, maxTokens: 4000 },
      fallback: { provider: "gemini", model: "gemini-2.0-flash", temperature: 0.2, maxTokens: 4000 },
      prompt,
      systemPrompt: BRIEFING_SYSTEM_PROMPT,
      stream: true,
      visitId,
      edgeFunction: "generate-briefing",
      // Tier A: structured record — name literals scrubbed before egress,
      // restored in the stream before the tee (client + capture both clean).
      egress: {
        tier: "A",
        knownIdentifiers: [patient.name, patient.name_bn],
      },
    });

    // ── Tee stream: one for client, one to capture and store ──
    const [clientStream, captureStream] = (stream as ReadableStream).tee();

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fire-and-forget: capture full response and store briefing card
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

        // Parse the briefing card JSON
        const cleanedText = extractTextFromStream(fullText);
        let briefingCard: BriefingCard;
        try {
          const jsonStr = cleanedText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
          briefingCard = JSON.parse(jsonStr);
        } catch {
          console.error("[generate-briefing] Failed to parse briefing card:", cleanedText.slice(0, 500));
          return;
        }

        await serviceClient
          .from("visits")
          .update({
            briefing_card: briefingCard,
            briefing_generated_at: new Date().toISOString(),
          })
          .eq("id", visitId);

        // Log usage (estimate tokens)
        await logUsage({
          visitId,
          edgeFunction: "generate-briefing",
          model: "claude-sonnet-4-20250514",
          wasFallback: false,
          inputTokens: Math.ceil(prompt.length / 4),
          outputTokens: Math.ceil(cleanedText.length / 4),
          latencyMs: 0,
        });
      } catch (captureErr) {
        console.error("[generate-briefing] Capture/store error:", captureErr);
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
    console.error("[generate-briefing] Error:", err);
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : "Internal error", code: "INTERNAL_ERROR" },
      500,
    );
  }
});

/** Extract plain text from an SSE or raw stream. */
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
        // Skip non-JSON lines
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
