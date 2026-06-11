/**
 * extract-document — Extract structured data from prescription or lab report images.
 *
 * POST { imageUrl, type: 'prescription' | 'lab_report', visitId, patientId }
 *
 * Downloads image from Supabase Storage, sends to MedGemma 4B multimodal,
 * parses the structured output, and stores in the appropriate table.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { callLLM } from "../_shared/llm-router.ts";
import type { ExtractionResult, EdgeFunctionResponse } from "../_shared/types.ts";

const PRESCRIPTION_PROMPT = `You are a medical document extraction system specializing in Bangladeshi prescriptions.

Analyze this prescription image and extract ALL information into JSON:
{
  "prescribing_doctor_name": "string",
  "prescription_date": "YYYY-MM-DD or null",
  "diagnosis": "string",
  "medications": [
    {
      "name": "brand name",
      "generic_name": "generic/chemical name",
      "dose": "e.g. 500mg",
      "unit": "mg/ml/units",
      "frequency": "e.g. 1+0+1 (Bangladeshi format) or BID/TID",
      "duration": "e.g. 7 days, 1 month",
      "route": "oral/IV/IM/topical/subcutaneous",
      "instructions": "any special instructions like 'before meals'"
    }
  ],
  "investigations_ordered": ["list of tests ordered if any"],
  "advice": "any lifestyle/dietary advice noted",
  "confidence": 0.0-1.0
}

Notes on Bangladeshi prescription format:
- Frequency often uses "1+0+1" meaning morning+afternoon+night
- "১+০+১" is Bangla numerals for the same
- Common abbreviations: Rx, Ix, Dx, OD, BD, TDS
- Look for both English and Bangla text
- If text is unclear, include what you can read and set lower confidence`;

const LAB_REPORT_PROMPT = `You are a medical document extraction system specializing in Bangladeshi lab reports.

Analyze this lab report image and extract ALL results into JSON:
{
  "lab_name": "string",
  "report_date": "YYYY-MM-DD or null",
  "patient_name": "string if visible",
  "test_category": "CBC/RFT/LFT/Lipid Profile/HbA1c/Thyroid/Urine/etc.",
  "results": [
    {
      "name": "test parameter name",
      "value": "numeric or string value",
      "unit": "measurement unit",
      "range": "normal reference range as shown",
      "isAbnormal": true/false,
      "severity": "normal/mild/moderate/severe"
    }
  ],
  "confidence": 0.0-1.0
}

Notes:
- Bangladeshi labs often show reference ranges inline
- Abnormal values may be marked with * or H/L
- Look for both English and Bangla text
- Common labs: Popular Diagnostics, Ibn Sina, Square, Labaid`;

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
    const { imageUrl, type, visitId, patientId } = await req.json();

    if (!imageUrl || !type || !patientId) {
      return jsonResponse(
        { success: false, error: "imageUrl, type, and patientId are required", code: "BAD_REQUEST" },
        400,
      );
    }

    if (type !== "prescription" && type !== "lab_report") {
      return jsonResponse(
        { success: false, error: "type must be 'prescription' or 'lab_report'", code: "BAD_REQUEST" },
        400,
      );
    }

    // ── Download image from Storage ─────────────────────────
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: imageData, error: downloadErr } = await serviceClient
      .storage
      .from("documents")
      .download(imageUrl);

    if (downloadErr || !imageData) {
      return jsonResponse(
        { success: false, error: `Failed to download image: ${downloadErr?.message ?? "unknown"}`, code: "STORAGE_ERROR" },
        500,
      );
    }

    // Convert to base64
    const arrayBuffer = await imageData.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""),
    );

    // ── Call MedGemma with image ────────────────────────────
    const prompt = type === "prescription" ? PRESCRIPTION_PROMPT : LAB_REPORT_PROMPT;
    const systemPrompt = "Extract all medical data from this image accurately. Output ONLY valid JSON.";

    const llmResult = await callLLM({
      primary: { provider: "medgemma", model: "medgemma-4b", temperature: 0.1, maxTokens: 3000 },
      fallback: { provider: "gemini", model: "gemini-2.0-flash", temperature: 0.1, maxTokens: 3000 },
      prompt,
      systemPrompt,
      images: [base64],
      visitId: visitId ?? undefined,
      edgeFunction: "extract-document",
    });

    const responseText = (llmResult as { text: string }).text;

    // ── Parse extracted JSON ────────────────────────────────
    let extracted: Record<string, unknown>;
    try {
      const jsonStr = responseText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      extracted = JSON.parse(jsonStr);
    } catch {
      console.error("[extract-document] Failed to parse extraction:", responseText);
      return jsonResponse(
        { success: false, error: "Failed to parse extraction from AI response", code: "PARSE_ERROR" },
        500,
      );
    }

    const confidence = typeof extracted.confidence === "number" ? extracted.confidence : 0.5;

    // ── Store in appropriate table ──────────────────────────
    if (type === "prescription") {
      const { error: insertErr } = await serviceClient.from("prescriptions").insert({
        patient_id: patientId,
        visit_id: visitId ?? null,
        source: visitId ? "photo_current" : "photo_historical",
        image_path: imageUrl,
        prescribing_doctor_name: extracted.prescribing_doctor_name ?? null,
        prescription_date: extracted.prescription_date ?? null,
        diagnosis: extracted.diagnosis ?? null,
        medications: extracted.medications ?? [],
        investigations_ordered: extracted.investigations_ordered ?? [],
        advice: extracted.advice ?? null,
        raw_extraction: responseText,
        extraction_confidence: confidence,
      });

      if (insertErr) {
        console.error("[extract-document] Insert prescription error:", insertErr);
        return jsonResponse(
          { success: false, error: `Failed to store prescription: ${insertErr.message}`, code: "DB_ERROR" },
          500,
        );
      }
    } else {
      const { error: insertErr } = await serviceClient.from("lab_reports").insert({
        patient_id: patientId,
        visit_id: visitId ?? null,
        source: visitId ? "photo_current" : "photo_historical",
        image_path: imageUrl,
        lab_name: extracted.lab_name ?? null,
        report_date: extracted.report_date ?? null,
        test_category: extracted.test_category ?? null,
        results: extracted.results ?? [],
        raw_extraction: responseText,
        extraction_confidence: confidence,
      });

      if (insertErr) {
        console.error("[extract-document] Insert lab_report error:", insertErr);
        return jsonResponse(
          { success: false, error: `Failed to store lab report: ${insertErr.message}`, code: "DB_ERROR" },
          500,
        );
      }
    }

    // Usage logging happens inside callLLM (visitId + edgeFunction passed) —
    // logging here too double-counted costs. (The old "no-visit" literal also
    // violated the api_usage_log.visit_id UUID column, so those rows never
    // actually landed; visitless extractions go unlogged until the router
    // supports a null visit id — M4.)

    const result: ExtractionResult = {
      type,
      data: extracted,
      confidence,
      rawText: responseText,
    };

    return jsonResponse<EdgeFunctionResponse>({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("[extract-document] Error:", err);
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
