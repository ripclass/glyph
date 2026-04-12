/**
 * intake-start — Initialize an intake session for a visit.
 *
 * POST { visitId, isAttendant, attendantName?, attendantRelation?, language }
 *
 * Creates consent records, stores attendant info if present,
 * and returns an AI-generated greeting via Gemini Flash.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { callLLM } from "../_shared/llm-router.ts";
import { logUsage } from "../_shared/cost-logger.ts";
import type { EdgeFunctionResponse } from "../_shared/types.ts";

serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    // ── Auth ────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse<EdgeFunctionResponse>(
        { success: false, error: "Missing authorization header", code: "UNAUTHORIZED" },
        401,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return jsonResponse<EdgeFunctionResponse>(
        { success: false, error: "Invalid token", code: "UNAUTHORIZED" },
        401,
      );
    }

    // ── Parse body ──────────────────────────────────────────
    const {
      visitId,
      isAttendant = false,
      attendantName,
      attendantRelation,
      language = "bn",
    } = await req.json();

    if (!visitId) {
      return jsonResponse<EdgeFunctionResponse>(
        { success: false, error: "visitId is required", code: "BAD_REQUEST" },
        400,
      );
    }

    // ── Verify visit exists and belongs to this doctor ──────
    const { data: visit, error: visitErr } = await supabase
      .from("visits")
      .select("id, patient_id, clinic_id, status")
      .eq("id", visitId)
      .single();

    if (visitErr || !visit) {
      return jsonResponse<EdgeFunctionResponse>(
        { success: false, error: "Visit not found", code: "NOT_FOUND" },
        404,
      );
    }

    // ── Service-role client for writes ──────────────────────
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Create consent records ──────────────────────────────
    const consentTypes = ["recording", "data_storage", "ai_processing"] as const;
    const consentRows = consentTypes.map((type) => ({
      patient_id: visit.patient_id,
      visit_id: visitId,
      consent_type: type,
      granted: true,
      granted_by: isAttendant ? "attendant" : "patient",
    }));

    await serviceClient.from("consent_records").insert(consentRows);

    // ── Update attendant info if present ────────────────────
    if (isAttendant && attendantName) {
      await serviceClient
        .from("visits")
        .update({
          attendant_present: true,
          attendant_name: attendantName,
          attendant_relation: attendantRelation ?? null,
          attendant_language: language,
        })
        .eq("id", visitId);
    }

    // ── Fetch patient name for greeting ─────────────────────
    const { data: patient } = await supabase
      .from("patients")
      .select("name, name_bn, age, gender")
      .eq("id", visit.patient_id)
      .single();

    // ── Generate AI greeting ────────────────────────────────
    const isBangla = language === "bn";
    const respondent = isAttendant ? attendantName ?? "attendant" : (patient?.name ?? "patient");

    const systemPrompt = `You are a warm, empathetic medical intake assistant for a clinic in Bangladesh.
You speak ${isBangla ? "Bangla (বাংলা)" : "English"}.
Your job is to greet the ${isAttendant ? "attendant" : "patient"} and ask the first intake question: "What brings you to the doctor today?" or its Bangla equivalent.
Keep it short (2-3 sentences), warm, and professional.
${isAttendant ? `The attendant's name is ${attendantName} and they are the patient's ${attendantRelation ?? "companion"}.` : ""}
Patient name: ${patient?.name_bn ?? patient?.name ?? "Unknown"}, Age: ${patient?.age ?? "Unknown"}, Gender: ${patient?.gender ?? "Unknown"}.`;

    const prompt = isBangla
      ? `রোগীর সাথে/রোগীর সঙ্গীর সাথে বাংলায় সম্ভাষণ করুন এবং প্রথম প্রশ্ন করুন: আজ ডাক্তারের কাছে কেন এসেছেন?`
      : `Greet the ${isAttendant ? "attendant" : "patient"} and ask the first intake question: What brings you to the doctor today?`;

    const llmResult = await callLLM({
      primary: { provider: "gemini", model: "gemini-2.0-flash", temperature: 0.7, maxTokens: 300 },
      fallback: { provider: "gemini", model: "gemini-1.5-flash", temperature: 0.7, maxTokens: 300 },
      prompt,
      systemPrompt,
      visitId,
      edgeFunction: "intake-start",
    });

    // ── Initialize transcript ───────────────────────────────
    const greeting = typeof llmResult === "string" ? llmResult : llmResult.text;
    const transcript = [
      {
        role: "assistant",
        content: greeting,
        timestamp: new Date().toISOString(),
      },
    ];

    await serviceClient
      .from("visits")
      .update({ intake_transcript: transcript, status: "intake" })
      .eq("id", visitId);

    // ── Log usage ───────────────────────────────────────────
    if ("inputTokens" in llmResult) {
      await logUsage({
        visitId,
        edgeFunction: "intake-start",
        model: llmResult.model,
        wasFallback: false,
        inputTokens: llmResult.inputTokens,
        outputTokens: llmResult.outputTokens,
        latencyMs: llmResult.latencyMs,
      });
    }

    return jsonResponse<EdgeFunctionResponse>({
      success: true,
      data: {
        greeting,
        visitId,
        respondent,
        language,
        isAttendant,
      },
    });
  } catch (err) {
    console.error("[intake-start] Error:", err);
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
