/**
 * @fileoverview API cost estimation for AI model usage tracking.
 * Provides per-model token pricing and cost calculation utilities
 * so that per-visit AI spending can be monitored and budgeted.
 *
 * Prices are in USD per 1,000 tokens and should be updated when
 * provider pricing changes.
 *
 * @module lib/utils/cost-tracker
 */

/** Per-1K-token pricing for a single model */
interface TokenPricing {
  /** Cost per 1,000 input (prompt) tokens in USD */
  input: number;
  /** Cost per 1,000 output (completion) tokens in USD */
  output: number;
}

/**
 * Pricing table for supported AI models.
 * Prices are per 1,000 tokens in USD.
 *
 * Keep this table in sync with your Edge Function model configuration.
 */
export const COST_PER_1K_TOKENS: Record<string, TokenPricing> = {
  /** Claude 3.5 Sonnet — primary clinical reasoning model */
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  /** Claude 3.5 Haiku — fast intake and extraction */
  'claude-3-5-haiku': { input: 0.001, output: 0.005 },
  /** Claude 3 Opus — complex differential diagnosis */
  'claude-3-opus': { input: 0.015, output: 0.075 },
  /** Claude 4 Sonnet */
  'claude-sonnet-4': { input: 0.003, output: 0.015 },
  /** Claude 4 Opus */
  'claude-opus-4': { input: 0.015, output: 0.075 },
  /** GPT-4o — fallback multimodal */
  'gpt-4o': { input: 0.005, output: 0.015 },
  /** GPT-4o Mini — lightweight tasks */
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  /** Gemini 1.5 Pro — document extraction alternative */
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  /** Gemini 1.5 Flash — fast extraction */
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
  /** Google Speech-to-Text (estimated per-minute cost normalized to tokens) */
  'google-speech': { input: 0.006, output: 0.0 },
};

/**
 * Estimates the USD cost of an AI API call based on token counts.
 *
 * If the model is not in the pricing table, falls back to a conservative
 * estimate using Claude 3.5 Sonnet pricing.
 *
 * @param model - The model identifier (must match a key in `COST_PER_1K_TOKENS`)
 * @param inputTokens - Number of input (prompt) tokens consumed
 * @param outputTokens - Number of output (completion) tokens generated
 * @returns Estimated cost in USD, rounded to 6 decimal places
 *
 * @example
 * ```ts
 * const cost = estimateCost('claude-3-5-sonnet', 2000, 500);
 * // => 0.0135  (2 * 0.003 + 0.5 * 0.015)
 * ```
 */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = COST_PER_1K_TOKENS[model] ?? COST_PER_1K_TOKENS['claude-3-5-sonnet'];

  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;

  /** Round to 6 decimal places to avoid floating-point noise */
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}
