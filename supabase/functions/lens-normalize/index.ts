/**
 * lens-normalize — AI normalization + sanity-check for lab results.
 *
 * POST { testCategory, rawResults, patientContext, orderId }
 *
 * Server-to-server only: deployed --no-verify-jwt.
 * Auth: LENS_SHARED_SECRET (Bearer token, same pattern as TRIAGE_SHARED_SECRET).
 *
 * Tier A egress: the caller sends ONLY de-identified structured context
 * (age/gender, never name/phone/NID). No consent row required.
 *
 * Returns { success: true, data: { normalized, sanityFlags }, orderId }.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors } from "../_shared/cors.ts";
import { callLLM } from "../_shared/llm-router.ts";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

const SYSTEM = `You are a clinical lab-result normalizer for Bangladeshi diagnostic centres.
You receive raw lab values and a test category. You DO NOT diagnose or prescribe.
Return STRICT JSON:
{
  "normalized": [
    { "testName": "...", "value": "...", "unit": "...", "referenceRange": "...", "isAbnormal": true|false, "severity": "mild|moderate|severe|critical" }
  ],
  "sanityFlags": [ { "message": "...", "severity": "info|warning|critical" } ]
}
Rules:
- Standardize test names (e.g. "Hb" -> "Hemoglobin"), units, and reference-range formatting so the SAME test reads the SAME way across centres.
- Set isAbnormal/severity from the value vs the reference range. Omit severity when normal.
- sanityFlags: implausible values, internal inconsistency, or value inconsistent with the supplied patient context. Empty array if none.
- Never invent results not present in the input.`;

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  // Server-to-server only: deployed --no-verify-jwt, trusts LENS_SHARED_SECRET.
  const secret = Deno.env.get("LENS_SHARED_SECRET");
  const auth = req.headers.get("Authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return jsonResponse({ success: false, error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }

  const { testCategory, rawResults, patientContext, orderId } = await req.json();
  if (!testCategory || !Array.isArray(rawResults)) {
    return jsonResponse({ success: false, error: "testCategory and rawResults[] required", code: "BAD_REQUEST" }, 400);
  }

  const prompt = JSON.stringify({ testCategory, rawResults, patientContext: patientContext ?? null });

  // Tier A: structured de-identified fields only (no name/phone/NID). The caller
  // must strip direct identifiers from patientContext before sending.
  const llm = await callLLM({
    primary: { provider: "claude", model: "claude-opus-4-8", temperature: 0.1, maxTokens: 2000 },
    fallback: { provider: "gemini", model: "gemini-2.0-flash", temperature: 0.1, maxTokens: 2000 },
    prompt,
    systemPrompt: SYSTEM,
    edgeFunction: "lens-normalize",
    egress: { tier: "A", containsUnredactable: false },
  });

  let parsed: unknown;
  try {
    const text = (llm as { text: string }).text ?? "";
    parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
  } catch {
    return jsonResponse({ success: false, error: "Model returned non-JSON", code: "PARSE_ERROR" }, 502);
  }

  return jsonResponse({ success: true, data: parsed, orderId: orderId ?? null });
});
