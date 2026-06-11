/**
 * intake-complete — Finalize intake and generate a structured summary.
 *
 * POST { visitId }
 *
 * Fetches the full transcript, generates an IntakeSummary via Gemini Flash,
 * updates the visit record, and triggers briefing generation.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { callLLM } from "../_shared/llm-router.ts";
import type { IntakeSummary, EdgeFunctionResponse } from "../_shared/types.ts";

const SUMMARY_SYSTEM_PROMPT = `You are a medical data extraction system. Given a patient intake conversation transcript, extract a structured JSON summary.

Output ONLY valid JSON matching this schema (no markdown, no explanation):
{
  "chiefComplaint": "string — main reason for visit in concise medical language",
  "hpiSummary": "string — narrative summary of history of present illness",
  "pastHistory": ["string array of past medical/surgical history items"],
  "currentMedications": ["string array of current medications with doses if mentioned"],
  "allergies": ["string array of known allergies"],
  "socialHistory": "string — smoking, alcohol, occupation, relevant lifestyle",
  "attendantInfo": {
    "name": "string or null",
    "relation": "string or null",
    "reliability": "high | moderate | low — how reliable the attendant's information seems"
  }
}

If information was not discussed, use empty string or empty array. Do NOT invent information.`;

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
      .select("id, patient_id, intake_transcript, attendant_present, attendant_name, attendant_relation, created_at")
      .eq("id", visitId)
      .single();

    if (visitErr || !visit) {
      return jsonResponse({ success: false, error: "Visit not found", code: "NOT_FOUND" }, 404);
    }

    const transcript: Array<{ role: string; content: string; timestamp: string }> =
      visit.intake_transcript ?? [];

    if (transcript.length === 0) {
      return jsonResponse({ success: false, error: "No intake transcript found", code: "BAD_REQUEST" }, 400);
    }

    // ── Build transcript text ───────────────────────────────
    const transcriptText = transcript
      .map((t) => `${t.role.toUpperCase()}: ${t.content}`)
      .join("\n\n");

    const attendantNote = visit.attendant_present
      ? `\nNote: Attendant "${visit.attendant_name}" (${visit.attendant_relation}) was providing information.`
      : "";

    const prompt = `Here is the complete intake conversation transcript:

${transcriptText}
${attendantNote}

Extract the structured intake summary as JSON.`;

    // ── Call LLM ────────────────────────────────────────────
    const llmResult = await callLLM({
      primary: { provider: "gemini", model: "gemini-2.0-flash", temperature: 0.1, maxTokens: 2000 },
      fallback: { provider: "claude", model: "claude-3-haiku-20240307", temperature: 0.1, maxTokens: 2000 },
      prompt,
      systemPrompt: SUMMARY_SYSTEM_PROMPT,
      visitId,
      edgeFunction: "intake-complete",
    });

    const responseText = (llmResult as { text: string }).text;

    // ── Parse JSON from response ────────────────────────────
    let summary: IntakeSummary;
    try {
      // Strip potential markdown code fences
      const jsonStr = responseText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      summary = JSON.parse(jsonStr);
    } catch {
      console.error("[intake-complete] Failed to parse LLM JSON:", responseText);
      return jsonResponse(
        { success: false, error: "Failed to parse intake summary from AI response", code: "PARSE_ERROR" },
        500,
      );
    }

    // ── Calculate intake duration ───────────────────────────
    const firstTimestamp = transcript[0]?.timestamp;
    const intakeDuration = firstTimestamp
      ? Math.round((Date.now() - new Date(firstTimestamp).getTime()) / 1000)
      : null;

    // ── Update visit ────────────────────────────────────────
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    await serviceClient
      .from("visits")
      .update({
        intake_summary: summary,
        intake_completed_at: new Date().toISOString(),
        intake_duration_seconds: intakeDuration,
        status: "intake_complete",
      })
      .eq("id", visitId);

    // Usage logging happens inside callLLM (visitId + edgeFunction passed) —
    // logging here too double-counts costs.

    // ── Trigger briefing generation (fire-and-forget) ───────
    const briefingUrl = `${supabaseUrl}/functions/v1/generate-briefing`;
    fetch(briefingUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ visitId }),
    }).catch((err) => {
      console.error("[intake-complete] Failed to trigger briefing:", err);
    });

    return jsonResponse<EdgeFunctionResponse>({
      success: true,
      data: {
        summary,
        intakeDurationSeconds: intakeDuration,
        transcriptTurns: transcript.length,
      },
    });
  } catch (err) {
    console.error("[intake-complete] Error:", err);
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : "Internal error", code: "INTERNAL_ERROR" },
      500,
    );
  }
});

function jsonResponse<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
