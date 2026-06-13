/**
 * triage — Pocket v2 patient symptom triage (the egress-gated LLM call).
 *
 * POST { messages: [{role:"patient"|"glyph", content}], patientContext, questionCount }
 *
 * Server-to-server only: called by the trusted Next route
 * /api/wallet/[token]/triage, which has already validated the patient's wallet
 * bearer token and run the deterministic red-flag pre-screen. Auth here is the
 * service-role key (patients never reach this function directly).
 *
 * Free-text symptoms are Tier B egress (consent-gated, best-effort scrub). The
 * function returns the model's RAW structured reply; the Next route validates
 * and clamps it with the tested triage-logic (single place for the safety
 * clamp). The safety contract lives in prompts/patient/triage.md — keep the
 * condensed SYSTEM_PROMPT below in sync with it.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { callLLM } from "../_shared/llm-router.ts";
import type { EdgeFunctionResponse } from "../_shared/types.ts";

const SYSTEM_PROMPT = `You are Glyph, helping a Bangladeshi patient decide what to do about a symptom before they go to a drug seller. You are NOT a doctor and you say so. Reply in simple Bangla.

HARD RULES (never break):
1. Never diagnose — say what a symptom "could be related to", never "you have X".
2. Never prescribe — never name a medicine, brand, or dose. If a pharmacy is fine, say to ask the pharmacist.
3. Conservative escalation always wins. When unsure, route to a doctor. Never route to "pharmacy" for anything that could be serious.
4. Every final answer's text ends with: "আমি ডাক্তার নই — এটি শুধু পরামর্শ। প্রয়োজনে ডাক্তার দেখান।"
5. Danger signs (chest pain, breathlessness, stroke signs, severe bleeding, unconsciousness, poisoning, self-harm) → route "urgent", go to hospital now.

GUIDED EXCHANGE: Ask at most THREE short, targeted follow-ups (duration, severity, the red-flag screen for that symptom), one at a time, then give the final answer.

CONTEXT: You receive the patient's age, gender, and chronic conditions. Use them only to escalate (febrile diabetic, pregnant, elderly, heart/kidney disease → lower threshold for "see a doctor"), never to reassure.

OUTPUT: reply with a SINGLE JSON object and nothing else:
{"mode":"question"|"answer","text":"Bangla","route":"pharmacy"|"doctor"|"urgent","watchFor":["Bangla",...],"specialty":"Bangla","redFlag":"Bangla"}
- mode "question": only "text" (the next follow-up).
- mode "answer": "text" is the plain-Bangla explanation ending with the not-a-doctor line, plus route, watchFor, and specialty (when route=doctor) or redFlag (when route=urgent).`;

interface Msg {
  role: "patient" | "glyph";
  content: string;
}

serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    // ── Auth: service-role only (trusted server-to-server) ────
    const authHeader = req.headers.get("Authorization") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (authHeader !== `Bearer ${serviceKey}`) {
      return jsonResponse<EdgeFunctionResponse>(
        { success: false, error: "Forbidden", code: "FORBIDDEN" },
        403,
      );
    }

    const { messages = [], patientContext = {}, questionCount = 0, consentId } =
      await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonResponse<EdgeFunctionResponse>(
        { success: false, error: "messages required", code: "BAD_REQUEST" },
        400,
      );
    }
    // Tier B fails closed without a consent record. The Next route resolves the
    // patient's granted ai_processing consent and passes its id here.
    if (!consentId) {
      return jsonResponse<EdgeFunctionResponse>(
        { success: false, error: "consentId required for Tier B egress", code: "BAD_REQUEST" },
        400,
      );
    }

    // ── Build the prompt ──────────────────────────────────────
    const ctx = [
      patientContext.age ? `Age: ${patientContext.age}` : null,
      patientContext.gender ? `Gender: ${patientContext.gender}` : null,
      Array.isArray(patientContext.conditions) && patientContext.conditions.length
        ? `Chronic conditions: ${patientContext.conditions.join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join(". ");

    const transcript = (messages as Msg[])
      .map((m) => `${m.role === "patient" ? "Patient" : "Glyph"}: ${m.content}`)
      .join("\n");

    const prompt =
      `Patient context: ${ctx || "unknown"}.\n` +
      `You have asked ${questionCount} follow-up question(s) so far ` +
      `(${questionCount >= 3 ? "you MUST answer now, no more questions" : "you may ask one more if needed"}).\n\n` +
      `Conversation so far:\n${transcript}\n\nReply with the JSON object.`;

    const llmResult = await callLLM({
      primary: { provider: "claude", model: "claude-sonnet-4-20250514", temperature: 0.2, maxTokens: 700 },
      fallback: { provider: "gemini", model: "gemini-2.0-flash", temperature: 0.2, maxTokens: 700 },
      prompt,
      systemPrompt: SYSTEM_PROMPT,
      edgeFunction: "triage",
      // Tier B: free-text symptoms. Consent-gated + best-effort scrub at the
      // egress chokepoint. consentId is the patient's granted ai_processing
      // consent (resolved by the Next route). No structured identifiers to pin
      // as literals here.
      egress: { tier: "B", consentId },
    });

    const raw = typeof llmResult === "string" ? llmResult : llmResult.text;
    return jsonResponse<EdgeFunctionResponse>({ success: true, data: { raw } });
  } catch (err) {
    console.error("[triage] Error:", err);
    return jsonResponse<EdgeFunctionResponse>(
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
