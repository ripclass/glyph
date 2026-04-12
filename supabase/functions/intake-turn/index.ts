/**
 * intake-turn — Process one turn of the intake conversation.
 *
 * POST { visitId, message, messageSource: 'patient' | 'attendant' }
 *
 * Fetches conversation history, sends to Gemini Flash,
 * appends both user and assistant messages to transcript,
 * and returns a streaming response.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { callLLM } from "../_shared/llm-router.ts";
import { logUsage } from "../_shared/cost-logger.ts";
import type { EdgeFunctionResponse } from "../_shared/types.ts";

const INTAKE_SYSTEM_PROMPT = `You are a medical intake assistant at a clinic in Bangladesh.
Your goal is to gather a thorough medical history through natural conversation.

**Information to collect (in order of priority):**
1. Chief complaint — what brings them in today
2. History of present illness — onset, duration, severity, progression, aggravating/relieving factors
3. Associated symptoms
4. Past medical history
5. Current medications
6. Allergies
7. Family history (relevant)
8. Social history (smoking, occupation, etc.)

**Rules:**
- Ask ONE question at a time
- Use simple, empathetic language
- If the patient/attendant speaks Bangla, respond in Bangla
- If answers are vague, probe gently for specifics
- Acknowledge pain/discomfort with empathy
- After gathering sufficient information, say "ধন্যবাদ, আমি সব তথ্য পেয়েছি" (or English equivalent) to signal completion
- Never diagnose or suggest treatments
- Keep responses concise (2-4 sentences max)`;

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
    const { visitId, message, messageSource = "patient" } = await req.json();

    if (!visitId || !message) {
      return jsonResponse({ success: false, error: "visitId and message are required", code: "BAD_REQUEST" }, 400);
    }

    // ── Fetch visit + transcript ────────────────────────────
    const { data: visit, error: visitErr } = await supabase
      .from("visits")
      .select("id, patient_id, intake_transcript, attendant_present, attendant_name, attendant_relation")
      .eq("id", visitId)
      .single();

    if (visitErr || !visit) {
      return jsonResponse({ success: false, error: "Visit not found", code: "NOT_FOUND" }, 404);
    }

    // ── Fetch patient context ───────────────────────────────
    const { data: patient } = await supabase
      .from("patients")
      .select("name, name_bn, age, gender, known_allergies, chronic_conditions")
      .eq("id", visit.patient_id)
      .single();

    // ── Build conversation history for LLM ──────────────────
    const transcript: Array<{ role: string; content: string; timestamp: string }> =
      visit.intake_transcript ?? [];

    // Format existing transcript into chat messages
    const chatHistory = transcript
      .map((t) => `${t.role === "assistant" ? "Assistant" : "Patient/Attendant"}: ${t.content}`)
      .join("\n");

    const patientContext = patient
      ? `Patient: ${patient.name_bn ?? patient.name}, Age: ${patient.age}, Gender: ${patient.gender}
Known allergies: ${JSON.stringify(patient.known_allergies ?? [])}
Chronic conditions: ${JSON.stringify(patient.chronic_conditions ?? [])}`
      : "";

    const attendantContext = visit.attendant_present
      ? `\nNote: An attendant (${visit.attendant_name}, ${visit.attendant_relation}) is answering on behalf of the patient.`
      : "";

    const prompt = `${patientContext}${attendantContext}

--- Conversation so far ---
${chatHistory}

--- New message from ${messageSource} ---
${message}

Respond with your next question or acknowledgment. Remember to speak in the same language the patient/attendant is using.`;

    // ── Append user message to transcript ───────────────────
    transcript.push({
      role: messageSource,
      content: message,
      timestamp: new Date().toISOString(),
    });

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── Call LLM (streaming) ────────────────────────────────
    const stream = await callLLM({
      primary: { provider: "gemini", model: "gemini-2.0-flash", temperature: 0.5, maxTokens: 500 },
      fallback: { provider: "gemini", model: "gemini-1.5-flash", temperature: 0.5, maxTokens: 500 },
      prompt,
      systemPrompt: INTAKE_SYSTEM_PROMPT,
      stream: true,
      visitId,
      edgeFunction: "intake-turn",
    });

    // ── Tee the stream: one branch for the client, one to capture full text ──
    const [clientStream, captureStream] = (stream as ReadableStream).tee();

    // Fire-and-forget: read the capture stream, save to transcript, log usage
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

        // Parse SSE to extract text (Gemini streams SSE with JSON payloads)
        const cleanedText = extractTextFromSSE(fullText);

        transcript.push({
          role: "assistant",
          content: cleanedText,
          timestamp: new Date().toISOString(),
        });

        await serviceClient
          .from("visits")
          .update({ intake_transcript: transcript })
          .eq("id", visitId);

        // Estimate tokens and log (rough estimate for streaming)
        await logUsage({
          visitId,
          edgeFunction: "intake-turn",
          model: "gemini-2.0-flash",
          wasFallback: false,
          inputTokens: Math.ceil(prompt.length / 4),
          outputTokens: Math.ceil(cleanedText.length / 4),
          latencyMs: 0,
        });
      } catch (captureErr) {
        console.error("[intake-turn] Capture error:", captureErr);
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
    console.error("[intake-turn] Error:", err);
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : "Internal error", code: "INTERNAL_ERROR" },
      500,
    );
  }
});

/**
 * Extract plain text from Gemini SSE stream data.
 * Each SSE event has `data: {...}` with candidates[0].content.parts[0].text
 */
function extractTextFromSSE(raw: string): string {
  const lines = raw.split("\n");
  let text = "";

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      try {
        const json = JSON.parse(line.slice(6));
        const part = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (part) text += part;
      } catch {
        // Not all lines are valid JSON (e.g. [DONE])
      }
    }
  }

  return text || raw;
}

function jsonResponse(body: EdgeFunctionResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
