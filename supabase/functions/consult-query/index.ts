/**
 * consult-query — Doctor's real-time clinical question router.
 *
 * POST { visitId, query, patientContext }
 *
 * The most complex edge function. Detects query type and routes to
 * the appropriate source:
 *   - Guideline/evidence  -> UpToDate Connect API, Claude fallback
 *   - Drug interactions    -> Claude for Healthcare
 *   - Differential Dx      -> Claude for Healthcare
 *   - Recent studies       -> Perplexity API
 *   - Lab interpretation   -> MedGemma 27B
 *   - Generic clinical     -> Claude for Healthcare
 *
 * De-identifies patient context before external calls.
 * Returns streaming response with sources and confidence.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { callLLM } from "../_shared/llm-router.ts";
import { deidentify, reidentify } from "../_shared/deidentify.ts";
import type { ConsultQueryResponse, Source, EdgeFunctionResponse } from "../_shared/types.ts";

// ── Query type detection ────────────────────────────────────────

type QueryType =
  | "guideline"
  | "drug_interaction"
  | "differential"
  | "recent_studies"
  | "lab_interpretation"
  | "generic_clinical";

const QUERY_PATTERNS: { type: QueryType; patterns: RegExp[] }[] = [
  {
    type: "drug_interaction",
    patterns: [
      /drug.?interact/i,
      /interact.*(?:with|between)/i,
      /can.*(?:take|give|prescribe).*(?:with|together|along)/i,
      /contraindic/i,
      /safe.*(?:combine|together|with)/i,
      /adverse.*(?:effect|reaction).*(?:combin|together)/i,
    ],
  },
  {
    type: "lab_interpretation",
    patterns: [
      /interpret.*(?:lab|result|report|value)/i,
      /(?:lab|result|report|value).*(?:mean|suggest|indicate|interpret|signif)/i,
      /(?:creatinine|hba1c|hemoglobin|wbc|platelet|alt|ast|tsh|t[34]|egfr|bun|esr|crp)/i,
      /(?:normal|abnormal|high|low|elevated|decreased).*(?:level|value|count)/i,
    ],
  },
  {
    type: "differential",
    patterns: [
      /differenti/i,
      /what.*(?:could|can|might).*(?:be|cause)/i,
      /possible.*(?:diagnos|cause|condition)/i,
      /ddx/i,
      /rule.*out/i,
    ],
  },
  {
    type: "recent_studies",
    patterns: [
      /recent.*(?:stud|research|trial|evidence|paper|publication)/i,
      /latest.*(?:guid|recommend|evidence|research)/i,
      /(?:2024|2025|2026).*(?:stud|guid|trial)/i,
      /new.*(?:evidence|research|finding)/i,
      /(?:pubmed|cochrane|lancet|nejm|bmj)/i,
    ],
  },
  {
    type: "guideline",
    patterns: [
      /guideline/i,
      /recommend.*(?:treat|manag|dos|protocol)/i,
      /standard.*(?:of care|treat|protocol)/i,
      /first.?line/i,
      /(?:how|what).*(?:treat|manage|protocol)/i,
      /(?:uptodate|evidence.?based)/i,
      /(?:step.?up|step.?down).*therap/i,
    ],
  },
];

function detectQueryType(query: string): QueryType {
  for (const { type, patterns } of QUERY_PATTERNS) {
    if (patterns.some((p) => p.test(query))) {
      return type;
    }
  }
  return "generic_clinical";
}

// ── Route-specific handlers ─────────────────────────────────────

async function handleGuideline(
  query: string,
  deidentifiedContext: string,
  visitId: string,
  authHeader: string,
): Promise<ConsultQueryResponse> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const start = performance.now();

  // Try UpToDate first via our edge function
  try {
    const utdRes = await fetch(`${supabaseUrl}/functions/v1/consult-uptodate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ query }),
    });

    if (utdRes.ok) {
      const utdJson = await utdRes.json();
      if (utdJson.success && utdJson.data) {
        const utd = utdJson.data;
        return {
          answer: utd.recommendations.join("\n\n"),
          sources: [
            {
              type: "uptodate",
              title: utd.topic,
              url: utd.url,
              citation: `UpToDate — Evidence Grade: ${utd.evidenceGrade}`,
            },
          ],
          confidence: utd.source === "uptodate_api" ? "high" : "moderate",
          evidenceLevel: utd.evidenceGrade,
          modelUsed: utd.source === "uptodate_api" ? "uptodate-api" : "claude-fallback",
          latencyMs: Math.round(performance.now() - start),
        };
      }
    }
  } catch (err) {
    console.warn("[consult-query] UpToDate lookup failed, falling back to Claude:", err);
  }

  // Fallback: Claude for evidence synthesis
  const llmResult = await callLLM({
    primary: { provider: "claude", model: "claude-sonnet-4-20250514", temperature: 0.2, maxTokens: 3000 },
    fallback: { provider: "gemini", model: "gemini-2.0-pro", temperature: 0.2, maxTokens: 3000 },
    prompt: buildClinicalPrompt(query, deidentifiedContext, "guideline"),
    systemPrompt: CLINICAL_SYSTEM_PROMPT,
    visitId,
    edgeFunction: "consult-query",
  });

  return parseConsultResponse(llmResult as { text: string; model: string; latencyMs: number }, "guideline");
}

async function handleDrugInteraction(
  query: string,
  deidentifiedContext: string,
  visitId: string,
): Promise<ConsultQueryResponse> {
  const llmResult = await callLLM({
    primary: { provider: "claude", model: "claude-sonnet-4-20250514", temperature: 0.1, maxTokens: 3000 },
    fallback: { provider: "gemini", model: "gemini-2.0-pro", temperature: 0.1, maxTokens: 3000 },
    prompt: buildClinicalPrompt(query, deidentifiedContext, "drug_interaction"),
    systemPrompt: CLINICAL_SYSTEM_PROMPT,
    visitId,
    edgeFunction: "consult-query",
  });

  return parseConsultResponse(llmResult as { text: string; model: string; latencyMs: number }, "drug_interaction");
}

async function handleDifferential(
  query: string,
  deidentifiedContext: string,
  visitId: string,
): Promise<ConsultQueryResponse> {
  const llmResult = await callLLM({
    primary: { provider: "claude", model: "claude-sonnet-4-20250514", temperature: 0.3, maxTokens: 3000 },
    fallback: { provider: "gemini", model: "gemini-2.0-pro", temperature: 0.3, maxTokens: 3000 },
    prompt: buildClinicalPrompt(query, deidentifiedContext, "differential"),
    systemPrompt: CLINICAL_SYSTEM_PROMPT,
    visitId,
    edgeFunction: "consult-query",
  });

  return parseConsultResponse(llmResult as { text: string; model: string; latencyMs: number }, "differential");
}

async function handleRecentStudies(
  query: string,
  deidentifiedContext: string,
  visitId: string,
): Promise<ConsultQueryResponse> {
  const start = performance.now();

  const llmResult = await callLLM({
    primary: { provider: "perplexity", model: "sonar-pro", temperature: 0.2, maxTokens: 3000 },
    fallback: { provider: "claude", model: "claude-sonnet-4-20250514", temperature: 0.2, maxTokens: 3000 },
    prompt: `Clinical research query. Patient context (de-identified): ${deidentifiedContext}\n\nQuestion: ${query}\n\nProvide recent (2024-2026) evidence, citing specific studies, trials, and guidelines. Include journal names, publication years, and key findings.`,
    systemPrompt: "You are a medical research assistant. Cite specific studies with authors, journals, and years. Focus on the most recent and highest-quality evidence.",
    visitId,
    edgeFunction: "consult-query",
  });

  const text = (llmResult as { text: string }).text;
  const model = (llmResult as { model: string }).model;
  const latency = (llmResult as { latencyMs: number }).latencyMs ?? Math.round(performance.now() - start);

  return {
    answer: text,
    sources: [{ type: "web", title: "Perplexity Research", citation: "AI-powered research synthesis" }],
    confidence: "moderate",
    evidenceLevel: "Recent literature search",
    modelUsed: model,
    latencyMs: latency,
  };
}

async function handleLabInterpretation(
  query: string,
  deidentifiedContext: string,
  visitId: string,
): Promise<ConsultQueryResponse> {
  const llmResult = await callLLM({
    primary: { provider: "medgemma", model: "medgemma-27b", temperature: 0.1, maxTokens: 3000 },
    fallback: { provider: "claude", model: "claude-sonnet-4-20250514", temperature: 0.1, maxTokens: 3000 },
    prompt: buildClinicalPrompt(query, deidentifiedContext, "lab_interpretation"),
    systemPrompt: CLINICAL_SYSTEM_PROMPT,
    visitId,
    edgeFunction: "consult-query",
  });

  return parseConsultResponse(llmResult as { text: string; model: string; latencyMs: number }, "lab_interpretation");
}

async function handleGenericClinical(
  query: string,
  deidentifiedContext: string,
  visitId: string,
): Promise<ConsultQueryResponse> {
  const llmResult = await callLLM({
    primary: { provider: "claude", model: "claude-sonnet-4-20250514", temperature: 0.3, maxTokens: 3000 },
    fallback: { provider: "gemini", model: "gemini-2.0-pro", temperature: 0.3, maxTokens: 3000 },
    prompt: buildClinicalPrompt(query, deidentifiedContext, "generic_clinical"),
    systemPrompt: CLINICAL_SYSTEM_PROMPT,
    visitId,
    edgeFunction: "consult-query",
  });

  return parseConsultResponse(llmResult as { text: string; model: string; latencyMs: number }, "generic_clinical");
}

// ── Shared prompt infrastructure ────────────────────────────────

const CLINICAL_SYSTEM_PROMPT = `You are a clinical decision support system for doctors in Bangladesh.
You provide evidence-based, clinically accurate answers.

ALWAYS output valid JSON matching this schema:
{
  "answer": "string — detailed clinical answer with evidence",
  "sources": [
    {"type": "uptodate|pubmed|web|model", "title": "source title", "url": "url if available", "citation": "citation text"}
  ],
  "confidence": "high|moderate|low",
  "evidenceLevel": "string — e.g., 'Level 1 — RCT', 'Level 2 — Cohort', 'Expert consensus', 'Guidelines-based'"
}

Rules:
- Be specific and actionable
- Cite guidelines by name and year where possible
- If uncertain, say so and set confidence accordingly
- Consider Bangladesh-specific drug availability and practice patterns
- Include dosing when relevant
- Flag any safety concerns prominently
- Never fabricate citations — if you don't have a specific source, use type "model"`;

function buildClinicalPrompt(
  query: string,
  deidentifiedContext: string,
  queryType: QueryType,
): string {
  const typeInstructions: Record<QueryType, string> = {
    guideline: "Focus on current clinical guidelines and standard-of-care recommendations. Cite specific guidelines (e.g., ADA, ESC, GOLD, NICE).",
    drug_interaction: "Analyze potential drug interactions. For each interaction found, specify: severity (major/moderate/minor), mechanism, clinical significance, and recommended action. Check against the patient's allergies and conditions.",
    differential: "Generate a ranked differential diagnosis list. For each: estimated probability, key distinguishing features, and recommended workup to confirm/exclude. Consider common conditions in Bangladesh.",
    recent_studies: "Focus on the most recent clinical evidence, trials, and meta-analyses. Cite specific studies.",
    lab_interpretation: "Interpret the lab values in clinical context. Identify abnormalities, trends, and clinical significance. Suggest follow-up tests if needed.",
    generic_clinical: "Provide a comprehensive, evidence-based clinical answer.",
  };

  return `Query type: ${queryType}
${typeInstructions[queryType]}

Patient context (de-identified):
${deidentifiedContext}

Clinical question:
${query}

Respond with the JSON format specified in your instructions.`;
}

function parseConsultResponse(
  llmResult: { text: string; model: string; latencyMs: number },
  queryType: QueryType,
): ConsultQueryResponse {
  try {
    const jsonStr = llmResult.text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    return {
      answer: parsed.answer ?? llmResult.text,
      sources: (parsed.sources ?? []).map((s: Source) => ({
        type: s.type ?? "model",
        title: s.title ?? "AI Analysis",
        url: s.url,
        citation: s.citation,
      })),
      confidence: parsed.confidence ?? "moderate",
      evidenceLevel: parsed.evidenceLevel ?? "Model-generated",
      modelUsed: llmResult.model,
      latencyMs: llmResult.latencyMs,
    };
  } catch {
    // If parsing fails, return raw text with model source
    return {
      answer: llmResult.text,
      sources: [{ type: "model", title: `${llmResult.model} analysis` }],
      confidence: "moderate",
      evidenceLevel: "Model-generated",
      modelUsed: llmResult.model,
      latencyMs: llmResult.latencyMs,
    };
  }
}

// ── Main handler ────────────────────────────────────────────────

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
    const { visitId, query, patientContext } = await req.json();
    if (!visitId || !query) {
      return jsonResponse({ success: false, error: "visitId and query are required", code: "BAD_REQUEST" }, 400);
    }

    // ── Detect query type ───────────────────────────────────
    const queryType = detectQueryType(query);
    console.log(`[consult-query] Detected type: ${queryType} for query: "${query.slice(0, 80)}..."`);

    // ── De-identify patient context ─────────────────────────
    const contextStr = typeof patientContext === "string"
      ? patientContext
      : JSON.stringify(patientContext ?? {});
    const { cleaned: deidentifiedContext, mappings } = deidentify(contextStr);

    // ── Route to appropriate handler ────────────────────────
    let result: ConsultQueryResponse;

    switch (queryType) {
      case "guideline":
        result = await handleGuideline(query, deidentifiedContext, visitId, authHeader);
        break;
      case "drug_interaction":
        result = await handleDrugInteraction(query, deidentifiedContext, visitId);
        break;
      case "differential":
        result = await handleDifferential(query, deidentifiedContext, visitId);
        break;
      case "recent_studies":
        result = await handleRecentStudies(query, deidentifiedContext, visitId);
        break;
      case "lab_interpretation":
        result = await handleLabInterpretation(query, deidentifiedContext, visitId);
        break;
      case "generic_clinical":
      default:
        result = await handleGenericClinical(query, deidentifiedContext, visitId);
        break;
    }

    // ── Re-identify the answer ──────────────────────────────
    result.answer = reidentify(result.answer, mappings);

    // ── Append to visit consultation_queries ─────────────────
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: visit } = await supabase
      .from("visits")
      .select("consultation_queries")
      .eq("id", visitId)
      .single();

    const queries = (visit?.consultation_queries as Record<string, unknown>[] | null) ?? [];
    queries.push({
      query,
      queryType,
      response: result,
      timestamp: new Date().toISOString(),
    });

    await serviceClient
      .from("visits")
      .update({ consultation_queries: queries })
      .eq("id", visitId);

    // Usage logging happens inside callLLM per provider call (visitId +
    // edgeFunction passed at each route's call site) with REAL token counts —
    // the estimated aggregate that used to be logged here both double-counted
    // and was less accurate than the per-call rows.

    return jsonResponse<EdgeFunctionResponse>({
      success: true,
      data: {
        ...result,
        queryType,
      },
    });
  } catch (err) {
    console.error("[consult-query] Error:", err);
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
