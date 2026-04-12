/**
 * consult-uptodate — UpToDate-specific clinical lookup.
 *
 * POST { query, specialty? }
 *
 * Queries the UpToDate Connect API for clinical evidence.
 * Currently a placeholder implementation pending real API key provisioning.
 * Falls back to Claude for evidence synthesis when API is unavailable.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { callLLM } from "../_shared/llm-router.ts";
import { logUsage } from "../_shared/cost-logger.ts";
import type { EdgeFunctionResponse } from "../_shared/types.ts";

interface UpToDateResult {
  topic: string;
  recommendations: string[];
  evidenceGrade: string;
  lastUpdated: string;
  url: string;
  source: "uptodate_api" | "llm_synthesis";
}

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
    const { query, specialty } = await req.json();
    if (!query) {
      return jsonResponse({ success: false, error: "query is required", code: "BAD_REQUEST" }, 400);
    }

    // ── Try UpToDate Connect API ────────────────────────────
    const uptodateApiKey = Deno.env.get("UPTODATE_API_KEY");
    let result: UpToDateResult | null = null;

    if (uptodateApiKey) {
      try {
        const searchParams = new URLSearchParams({
          search: query,
          ...(specialty ? { specialty } : {}),
        });

        const utdRes = await fetch(
          `https://connect.uptodate.com/services/search/v1/search?${searchParams}`,
          {
            headers: {
              Authorization: `Bearer ${uptodateApiKey}`,
              Accept: "application/json",
            },
          },
        );

        if (utdRes.ok) {
          const utdJson = await utdRes.json();
          const topResult = utdJson.data?.searchResults?.[0];

          if (topResult) {
            result = {
              topic: topResult.title ?? query,
              recommendations: topResult.snippets?.map((s: Record<string, string>) => s.text) ?? [],
              evidenceGrade: topResult.gradeStrength ?? "Not graded",
              lastUpdated: topResult.lastUpdated ?? "Unknown",
              url: topResult.url ?? `https://www.uptodate.com/contents/search?search=${encodeURIComponent(query)}`,
              source: "uptodate_api",
            };
          }
        } else {
          console.warn("[consult-uptodate] UpToDate API returned:", utdRes.status);
        }
      } catch (utdErr) {
        console.error("[consult-uptodate] UpToDate API error:", utdErr);
      }
    }

    // ── Fallback: LLM synthesis ─────────────────────────────
    if (!result) {
      const systemPrompt = `You are a clinical evidence synthesis system. Given a clinical query, provide evidence-based recommendations.
Output ONLY valid JSON:
{
  "topic": "string — the clinical topic being addressed",
  "recommendations": ["array of evidence-based recommendation strings"],
  "evidenceGrade": "Grade A/B/C or 'Expert consensus' or 'Limited evidence'",
  "lastUpdated": "Based on training data",
  "url": "https://www.uptodate.com/contents/search?search=<url-encoded-query>",
  "source": "llm_synthesis"
}

${specialty ? `Specialty context: ${specialty}` : ""}
Be specific, cite guideline names where possible (e.g., ADA 2025, JNC-8, GOLD 2024).`;

      const llmResult = await callLLM({
        primary: { provider: "claude", model: "claude-sonnet-4-20250514", temperature: 0.2, maxTokens: 2000 },
        fallback: { provider: "gemini", model: "gemini-2.0-flash", temperature: 0.2, maxTokens: 2000 },
        prompt: `Clinical query: ${query}`,
        systemPrompt,
        edgeFunction: "consult-uptodate",
      });

      const responseText = (llmResult as { text: string }).text;

      try {
        const jsonStr = responseText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        result = JSON.parse(jsonStr);
      } catch {
        result = {
          topic: query,
          recommendations: [responseText],
          evidenceGrade: "LLM synthesis — verify independently",
          lastUpdated: "Based on training data",
          url: `https://www.uptodate.com/contents/search?search=${encodeURIComponent(query)}`,
          source: "llm_synthesis",
        };
      }

      // Log LLM usage
      const llm = llmResult as { model: string; inputTokens: number; outputTokens: number; latencyMs: number };
      await logUsage({
        visitId: "no-visit",
        edgeFunction: "consult-uptodate",
        model: llm.model,
        wasFallback: false,
        inputTokens: llm.inputTokens,
        outputTokens: llm.outputTokens,
        latencyMs: llm.latencyMs,
      });
    }

    return jsonResponse<EdgeFunctionResponse>({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("[consult-uptodate] Error:", err);
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
