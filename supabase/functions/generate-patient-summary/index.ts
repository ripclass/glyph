/**
 * generate-patient-summary — Generate a patient-friendly Bangla summary for WhatsApp.
 *
 * POST { visitId }
 *
 * Fetches the approved clinical note and generates a simple,
 * jargon-free Bangla summary suitable for sending to the patient
 * via WhatsApp.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { callLLM } from "../_shared/llm-router.ts";
import { logUsage } from "../_shared/cost-logger.ts";
import type { EdgeFunctionResponse } from "../_shared/types.ts";

const SUMMARY_SYSTEM_PROMPT = `আপনি একজন সহানুভূতিশীল চিকিৎসা সহকারী। ডাক্তারের ক্লিনিকাল নোট থেকে রোগীর জন্য সহজ বাংলায় সারসংক্ষেপ তৈরি করুন।

নিয়মাবলী:
- সহজ, দৈনন্দিন বাংলায় লিখুন — কোনো চিকিৎসা পরিভাষা নয়
- রোগী বা তার পরিবার যেন সহজে বুঝতে পারে
- নিম্নলিখিত বিষয়গুলো অন্তর্ভুক্ত করুন:
  1. কী সমস্যা পাওয়া গেছে (সহজ ভাষায়)
  2. কোন ওষুধ দেওয়া হয়েছে (নাম, কখন খাবেন, কতদিন)
  3. কী কী পরামর্শ দেওয়া হয়েছে
  4. কখন আবার আসতে হবে (ফলো-আপ তারিখ)
  5. কোন লক্ষণ দেখলে জরুরি ভিত্তিতে আসতে হবে
- ইমোজি ব্যবহার করবেন না
- হোয়াটসঅ্যাপে পাঠানোর উপযোগী ফরম্যাটে রাখুন
- ২০০-৩০০ শব্দের মধ্যে রাখুন

You MUST write the output entirely in Bangla (Bengali script). Do NOT use English except for medication brand names.`;

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

    // ── Fetch visit and doctor info ─────────────────────────
    const { data: visit, error: visitErr } = await supabase
      .from("visits")
      .select("id, patient_id, doctor_id, approved_note, generated_note, followup_scheduled_at")
      .eq("id", visitId)
      .single();

    if (visitErr || !visit) {
      return jsonResponse({ success: false, error: "Visit not found", code: "NOT_FOUND" }, 404);
    }

    const note = visit.approved_note ?? visit.generated_note;
    if (!note) {
      return jsonResponse(
        { success: false, error: "No clinical note found for this visit", code: "BAD_REQUEST" },
        400,
      );
    }

    // ── Fetch patient and doctor names ──────────────────────
    const [patientRes, doctorRes] = await Promise.all([
      supabase.from("patients").select("name, name_bn").eq("id", visit.patient_id).single(),
      supabase.from("doctors").select("name, name_bn").eq("id", visit.doctor_id).single(),
    ]);

    const patientName = patientRes.data?.name_bn ?? patientRes.data?.name ?? "রোগী";
    const doctorName = doctorRes.data?.name_bn ?? doctorRes.data?.name ?? "ডাক্তার";

    // ── Build prompt ────────────────────────────────────────
    const followUpDate = visit.followup_scheduled_at
      ? new Date(visit.followup_scheduled_at).toLocaleDateString("bn-BD", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;

    const prompt = `ক্লিনিকাল নোট:
${JSON.stringify(note, null, 2)}

রোগীর নাম: ${patientName}
ডাক্তারের নাম: ${doctorName}
${followUpDate ? `ফলো-আপ তারিখ: ${followUpDate}` : "ফলো-আপ তারিখ: ডাক্তার জানাবেন"}

উপরের ক্লিনিকাল নোট থেকে রোগীর জন্য সহজ বাংলায় একটি সারসংক্ষেপ তৈরি করুন।
হোয়াটসঅ্যাপে পাঠানোর জন্য উপযুক্ত ফরম্যাটে লিখুন।`;

    // ── Call LLM ────────────────────────────────────────────
    const llmResult = await callLLM({
      primary: { provider: "gemini", model: "gemini-2.0-flash", temperature: 0.4, maxTokens: 1500 },
      fallback: { provider: "gemini", model: "gemini-1.5-flash", temperature: 0.4, maxTokens: 1500 },
      prompt,
      systemPrompt: SUMMARY_SYSTEM_PROMPT,
      visitId,
      edgeFunction: "generate-patient-summary",
    });

    const summaryText = (llmResult as { text: string }).text;

    // ── Log usage ───────────────────────────────────────────
    const llm = llmResult as { model: string; inputTokens: number; outputTokens: number; latencyMs: number };
    await logUsage({
      visitId,
      edgeFunction: "generate-patient-summary",
      model: llm.model,
      wasFallback: false,
      inputTokens: llm.inputTokens,
      outputTokens: llm.outputTokens,
      latencyMs: llm.latencyMs,
    });

    return jsonResponse<EdgeFunctionResponse>({
      success: true,
      data: {
        summary: summaryText,
        patientName,
        language: "bn",
      },
    });
  } catch (err) {
    console.error("[generate-patient-summary] Error:", err);
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
