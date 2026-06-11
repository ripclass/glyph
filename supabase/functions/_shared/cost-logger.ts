/**
 * Logs model usage and estimated cost to the api_usage_log table.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Cost per 1 M tokens (input / output) in USD. */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Gemini
  "gemini-2.0-flash": { input: 0.10, output: 0.40 },
  "gemini-2.0-pro": { input: 1.25, output: 5.00 },
  "gemini-1.5-flash": { input: 0.075, output: 0.30 },
  "gemini-1.5-pro": { input: 1.25, output: 5.00 },
  // MedGemma (Vertex AI — priced like base Gemma for now)
  "medgemma-4b": { input: 0.075, output: 0.30 },
  "medgemma-27b": { input: 0.15, output: 0.60 },
  // Claude
  "claude-sonnet-4-20250514": { input: 3.00, output: 15.00 },
  "claude-3-5-sonnet-20241022": { input: 3.00, output: 15.00 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  // OpenAI
  "gpt-4o": { input: 2.50, output: 10.00 },
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  // Perplexity
  "sonar-pro": { input: 3.00, output: 15.00 },
  "sonar": { input: 1.00, output: 1.00 },
};

function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  );
}

export interface UsageParams {
  /** Null for server-to-server calls with no visit context */
  visitId: string | null;
  edgeFunction: string;
  model: string;
  wasFallback: boolean;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  error?: string;
}

/**
 * Insert a row into api_usage_log using the service-role client
 * so RLS is bypassed for internal logging.
 */
export async function logUsage(params: UsageParams): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[cost-logger] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const cost = estimateCost(params.model, params.inputTokens, params.outputTokens);

    const { error } = await supabase.from("api_usage_log").insert({
      visit_id: params.visitId,
      edge_function: params.edgeFunction,
      model_used: params.model,
      was_fallback: params.wasFallback,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      latency_ms: params.latencyMs,
      estimated_cost_usd: cost,
      error: params.error ?? null,
    });

    if (error) {
      console.error("[cost-logger] Insert failed:", error.message);
    }
  } catch (err) {
    // Never let logging failures propagate to callers
    console.error("[cost-logger] Unexpected error:", err);
  }
}
