/**
 * Unified LLM routing with fallback support.
 * Dispatches to Gemini, MedGemma (self-hosted), Claude, OpenAI, or Perplexity.
 */

import type { LLMResponse, ModelConfig } from "./types.ts";
import { logUsage, type UsageParams } from "./cost-logger.ts";
import {
  EgressDeniedError,
  openEgress,
  recordEgressEvidence,
  reidentifyStream,
  type EgressDeclaration,
  type EgressTier,
} from "./egress.ts";
import { reidentify } from "./deidentify.ts";

// ── Env-key mapping ─────────────────────────────────────────────

const ENV_KEYS: Record<ModelConfig["provider"], string> = {
  gemini: "GEMINI_API_KEY",
  medgemma: "MEDGEMMA_BASE_URL",
  claude: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
};

/**
 * OpenRouter: a single OpenAI-compatible gateway that can serve the Gemini,
 * Claude, Perplexity, and OpenAI models in our routing table. Used as the
 * transport ONLY when the provider's native key is absent — native keys
 * always win, so moving to direct keys later requires no code change.
 * MedGemma (KhaM-Med) is a SELF-HOSTED OpenAI-compatible endpoint (MEDGEMMA_BASE_URL)
 * and deliberately has no OpenRouter path. Dormant until the endpoint is configured.
 */
const OPENROUTER_KEY_ENV = "OPENROUTER_API_KEY";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function hasNativeKey(provider: ModelConfig["provider"]): boolean {
  return Boolean(Deno.env.get(ENV_KEYS[provider]));
}

function hasOpenRouterKey(): boolean {
  return Boolean(Deno.env.get(OPENROUTER_KEY_ENV));
}

function openRouterEligible(provider: ModelConfig["provider"]): boolean {
  return provider !== "medgemma";
}

function getApiKey(provider: ModelConfig["provider"]): string {
  const key = Deno.env.get(ENV_KEYS[provider]);
  if (!key) {
    throw new Error(`Missing env var ${ENV_KEYS[provider]} for provider "${provider}"`);
  }
  return key;
}

// ── Provider implementations ────────────────────────────────────

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string,
  images?: string[],
  temperature = 0.3,
  maxTokens = 4096,
): Promise<LLMResponse> {
  const start = performance.now();

  const parts: Record<string, unknown>[] = [];
  if (images?.length) {
    for (const img of images) {
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: img,
        },
      });
    }
  }
  parts.push({ text: prompt });

  const contents: Record<string, unknown>[] = [{ role: "user", parts }];
  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };
  if (systemPrompt) {
    body.system_instruction = { parts: [{ text: systemPrompt }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${model} error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const candidate = json.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text ?? "";
  const usage = json.usageMetadata ?? {};

  return {
    text,
    model,
    inputTokens: usage.promptTokenCount ?? 0,
    outputTokens: usage.candidatesTokenCount ?? 0,
    latencyMs: Math.round(performance.now() - start),
  };
}

async function callGeminiStream(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string,
  images?: string[],
  temperature = 0.3,
  maxTokens = 4096,
): Promise<{ stream: ReadableStream; model: string }> {
  const parts: Record<string, unknown>[] = [];
  if (images?.length) {
    for (const img of images) {
      parts.push({ inline_data: { mime_type: "image/jpeg", data: img } });
    }
  }
  parts.push({ text: prompt });

  const contents: Record<string, unknown>[] = [{ role: "user", parts }];
  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };
  if (systemPrompt) {
    body.system_instruction = { parts: [{ text: systemPrompt }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini stream ${model} error ${res.status}: ${errText}`);
  }

  return { stream: res.body!, model };
}

/** 27B on a scale-to-zero GPU can cold-start in 20-60s; don't abort early. */
const MEDGEMMA_TIMEOUT_MS = 120_000;

/** Pure: build an OpenAI chat-completions body from the router's call shape. */
function buildMedGemmaChatBody(
  model: string,
  prompt: string,
  systemPrompt?: string,
  images?: string[],
  temperature = 0.2,
  maxTokens = 4096,
): Record<string, unknown> {
  const userContent = images?.length
    ? [
        { type: "text", text: prompt },
        ...images.map((img) => ({
          type: "image_url",
          image_url: { url: img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}` },
        })),
      ]
    : prompt;
  const messages: Array<Record<string, unknown>> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userContent });
  return { model, messages, temperature, max_tokens: maxTokens };
}

/** Pure: pull assistant text + token usage out of an OpenAI chat-completions response. */
function parseOpenAIChatText(
  json: { choices?: Array<{ message?: { content?: unknown } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } },
): { text: string; inputTokens: number; outputTokens: number } {
  const content = json?.choices?.[0]?.message?.content;
  const usage = json?.usage ?? {};
  return {
    text: typeof content === "string" ? content : "",
    inputTokens: usage.prompt_tokens ?? 0,
    outputTokens: usage.completion_tokens ?? 0,
  };
}

/**
 * Self-hosted KhaM-Med (MedGemma) via an OpenAI-compatible endpoint.
 * `baseUrl` arrives from resolveProvider (ENV_KEYS.medgemma = MEDGEMMA_BASE_URL).
 * Optional MEDGEMMA_API_KEY (bearer) + MEDGEMMA_MODEL (overrides the route's model id).
 * Dormant until MEDGEMMA_BASE_URL is set; no OpenRouter path.
 */
async function callSelfHostedMedGemma(
  baseUrl: string,
  model: string,
  prompt: string,
  systemPrompt?: string,
  images?: string[],
  temperature = 0.2,
  maxTokens = 4096,
): Promise<LLMResponse> {
  const start = performance.now();
  const apiKey = Deno.env.get("MEDGEMMA_API_KEY");
  const resolvedModel = Deno.env.get("MEDGEMMA_MODEL") ?? model;
  const body = buildMedGemmaChatBody(resolvedModel, prompt, systemPrompt, images, temperature, maxTokens);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(MEDGEMMA_TIMEOUT_MS),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MedGemma ${resolvedModel} error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const { text, inputTokens, outputTokens } = parseOpenAIChatText(json);
  return {
    text,
    model: resolvedModel,
    inputTokens,
    outputTokens,
    latencyMs: Math.round(performance.now() - start),
  };
}

async function callClaude(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string,
  images?: string[],
  temperature = 0.3,
  maxTokens = 4096,
): Promise<LLMResponse> {
  const start = performance.now();

  const content: Record<string, unknown>[] = [];
  if (images?.length) {
    for (const img of images) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: img },
      });
    }
  }
  content.push({ type: "text", text: prompt });

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: "user", content }],
  };
  if (systemPrompt) {
    body.system = systemPrompt;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude ${model} error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const text =
    json.content
      ?.filter((b: Record<string, unknown>) => b.type === "text")
      .map((b: Record<string, unknown>) => b.text)
      .join("") ?? "";

  return {
    text,
    model,
    inputTokens: json.usage?.input_tokens ?? 0,
    outputTokens: json.usage?.output_tokens ?? 0,
    latencyMs: Math.round(performance.now() - start),
  };
}

async function callClaudeStream(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string,
  images?: string[],
  temperature = 0.3,
  maxTokens = 4096,
): Promise<{ stream: ReadableStream; model: string }> {
  const content: Record<string, unknown>[] = [];
  if (images?.length) {
    for (const img of images) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: img },
      });
    }
  }
  content.push({ type: "text", text: prompt });

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    temperature,
    stream: true,
    messages: [{ role: "user", content }],
  };
  if (systemPrompt) {
    body.system = systemPrompt;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude stream ${model} error ${res.status}: ${errText}`);
  }

  return { stream: res.body!, model };
}

async function callOpenAI(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string,
  images?: string[],
  temperature = 0.3,
  maxTokens = 4096,
): Promise<LLMResponse> {
  const start = performance.now();

  const contentParts: Record<string, unknown>[] = [];
  if (images?.length) {
    for (const img of images) {
      contentParts.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${img}` },
      });
    }
  }
  contentParts.push({ type: "text", text: prompt });

  const messages: Record<string, unknown>[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: contentParts });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI ${model} error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  return {
    text: json.choices?.[0]?.message?.content ?? "",
    model,
    inputTokens: json.usage?.prompt_tokens ?? 0,
    outputTokens: json.usage?.completion_tokens ?? 0,
    latencyMs: Math.round(performance.now() - start),
  };
}

async function callPerplexity(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string,
  _images?: string[],
  temperature = 0.3,
  maxTokens = 4096,
): Promise<LLMResponse> {
  const start = performance.now();

  const messages: Record<string, unknown>[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Perplexity ${model} error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  return {
    text: json.choices?.[0]?.message?.content ?? "",
    model,
    inputTokens: json.usage?.prompt_tokens ?? 0,
    outputTokens: json.usage?.completion_tokens ?? 0,
    latencyMs: Math.round(performance.now() - start),
  };
}

// ── OpenRouter transport ────────────────────────────────────────

/**
 * Native model id → OpenRouter model id.
 * MedGemma models are intentionally absent (self-hosted, no OpenRouter path): an unmapped model
 * throws, which hands control to callLLM's existing fallback chain.
 */
const OPENROUTER_MODEL_MAP: Record<string, string> = {
  // OpenRouter no longer serves the Gemini 1.5/2.0 families (verified against
  // its live /models catalog 2026-06-11) — these map to the stable successors:
  // 2.5-flash for the workhorse tier, 2.5-flash-lite for the cheap fallback
  // tier, 2.5-pro for the (never-GA'd) "2.0-pro" fallback id.
  "gemini-2.0-flash": "google/gemini-2.5-flash",
  "gemini-1.5-flash": "google/gemini-2.5-flash-lite",
  "gemini-2.0-pro": "google/gemini-2.5-pro",
  "claude-opus-4-8": "anthropic/claude-opus-4.8",
  "claude-sonnet-4-20250514": "anthropic/claude-sonnet-4",
  "claude-3-haiku-20240307": "anthropic/claude-3-haiku",
  "sonar-pro": "perplexity/sonar-pro",
};

function openRouterModel(model: string): string {
  const mapped = OPENROUTER_MODEL_MAP[model];
  if (!mapped) {
    throw new Error(`No OpenRouter mapping for model "${model}"`);
  }
  return mapped;
}

function openRouterHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    // OpenRouter attribution headers (optional but recommended)
    "HTTP-Referer": "https://glyph-olive.vercel.app",
    "X-Title": "Glyph",
  };
}

function buildOpenRouterBody(
  model: string,
  prompt: string,
  systemPrompt?: string,
  images?: string[],
  temperature = 0.3,
  maxTokens = 4096,
  stream = false,
): Record<string, unknown> {
  const contentParts: Record<string, unknown>[] = [];
  if (images?.length) {
    for (const img of images) {
      contentParts.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${img}` },
      });
    }
  }
  contentParts.push({ type: "text", text: prompt });

  const messages: Record<string, unknown>[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: contentParts });

  const body: Record<string, unknown> = {
    model: openRouterModel(model),
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (stream) body.stream = true;
  return body;
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string,
  images?: string[],
  temperature = 0.3,
  maxTokens = 4096,
): Promise<LLMResponse> {
  const start = performance.now();

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: openRouterHeaders(apiKey),
    body: JSON.stringify(
      buildOpenRouterBody(model, prompt, systemPrompt, images, temperature, maxTokens),
    ),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${model} error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  return {
    // Keep the NATIVE model id in the response so cost logging and the
    // pricing table stay keyed consistently regardless of transport.
    text: json.choices?.[0]?.message?.content ?? "",
    model,
    inputTokens: json.usage?.prompt_tokens ?? 0,
    outputTokens: json.usage?.completion_tokens ?? 0,
    latencyMs: Math.round(performance.now() - start),
  };
}

/**
 * Streaming via OpenRouter, NORMALIZED to Gemini-shaped SSE.
 *
 * Every existing stream consumer (intake-turn's transcript capture, the
 * client hooks) parses `data: {candidates:[{content:{parts:[{text}]}}]}`.
 * OpenRouter emits OpenAI-shaped chunks (`choices[0].delta.content`), so we
 * transcode here — the contract downstream of the router stays unchanged.
 */
async function callOpenRouterStream(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string,
  images?: string[],
  temperature = 0.3,
  maxTokens = 4096,
): Promise<{ stream: ReadableStream; model: string }> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: openRouterHeaders(apiKey),
    body: JSON.stringify(
      buildOpenRouterBody(model, prompt, systemPrompt, images, temperature, maxTokens, true),
    ),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter stream ${model} error ${res.status}: ${errText}`);
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const toGeminiSSE = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // keep the trailing partial line

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue; // skip comments/keepalives
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            const geminiEvent = {
              candidates: [{ content: { parts: [{ text: delta }] } }],
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(geminiEvent)}\n\n`),
            );
          }
        } catch {
          // Partial or non-JSON payload — ignore
        }
      }
    },
  });

  return { stream: res.body!.pipeThrough(toGeminiSSE), model };
}

// ── Dispatcher ──────────────────────────────────────────────────

type ProviderFn = (
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string,
  images?: string[],
  temperature?: number,
  maxTokens?: number,
) => Promise<LLMResponse>;

type ProviderStreamFn = (
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string,
  images?: string[],
  temperature?: number,
  maxTokens?: number,
) => Promise<{ stream: ReadableStream; model: string }>;

const PROVIDERS: Record<ModelConfig["provider"], ProviderFn> = {
  gemini: callGemini,
  medgemma: callSelfHostedMedGemma,
  claude: callClaude,
  openai: callOpenAI,
  perplexity: callPerplexity,
};

const STREAM_PROVIDERS: Partial<Record<ModelConfig["provider"], ProviderStreamFn>> = {
  gemini: callGeminiStream,
  claude: callClaudeStream,
};

/**
 * Pick the transport for a provider: native API when its key is set,
 * otherwise OpenRouter (if eligible and OPENROUTER_API_KEY is set).
 * `processor` is the egress-evidence label for who actually receives data.
 */
function resolveProvider(
  provider: ModelConfig["provider"],
  model: string,
): { fn: ProviderFn; apiKey: string; processor: string } {
  if (hasNativeKey(provider)) {
    return {
      fn: PROVIDERS[provider],
      apiKey: getApiKey(provider),
      processor: `${provider}:${model}`,
    };
  }
  if (openRouterEligible(provider) && hasOpenRouterKey()) {
    return {
      fn: callOpenRouter,
      apiKey: Deno.env.get(OPENROUTER_KEY_ENV)!,
      processor: `openrouter:${OPENROUTER_MODEL_MAP[model] ?? model}`,
    };
  }
  throw new Error(
    `Missing env var ${ENV_KEYS[provider]} for provider "${provider}" (and no ${OPENROUTER_KEY_ENV} fallback set)`,
  );
}

function resolveStreamProvider(
  provider: ModelConfig["provider"],
  model: string,
): { fn: ProviderStreamFn; apiKey: string; processor: string } | undefined {
  if (hasNativeKey(provider)) {
    const fn = STREAM_PROVIDERS[provider];
    return fn
      ? { fn, apiKey: getApiKey(provider), processor: `${provider}:${model}` }
      : undefined;
  }
  if (openRouterEligible(provider) && hasOpenRouterKey()) {
    return {
      fn: callOpenRouterStream,
      apiKey: Deno.env.get(OPENROUTER_KEY_ENV)!,
      processor: `openrouter:${OPENROUTER_MODEL_MAP[model] ?? model}`,
    };
  }
  return undefined;
}

// ── Public API ──────────────────────────────────────────────────

/** Per-call egress declaration — REQUIRED. Un-tiered calls are rejected. */
export interface CallEgress {
  tier: EgressTier;
  /** Exact PII literals from structured fields, scrubbed before egress */
  knownIdentifiers?: Array<string | null | undefined>;
  /** Tier B: consent_records.id covering this processing */
  consentId?: string;
  /** Tier B: payload includes images/voice that scrubbing cannot cover */
  containsUnredactable?: boolean;
}

export interface CallLLMOptions {
  primary: ModelConfig;
  fallback?: ModelConfig;
  prompt: string;
  systemPrompt?: string;
  images?: string[];
  stream?: boolean;
  /** For cost logging — set by callers */
  visitId?: string;
  edgeFunction?: string;
  /** THE egress gate declaration (M4 hard constraint) */
  egress: CallEgress;
}

/**
 * Call an LLM with automatic fallback.
 * Returns LLMResponse for non-streaming, ReadableStream for streaming.
 */
export async function callLLM(
  options: CallLLMOptions & { stream: true },
): Promise<ReadableStream>;
export async function callLLM(
  options: CallLLMOptions & { stream?: false },
): Promise<LLMResponse>;
export async function callLLM(
  options: CallLLMOptions,
): Promise<LLMResponse | ReadableStream>;
export async function callLLM(
  options: CallLLMOptions,
): Promise<LLMResponse | ReadableStream> {
  const { primary, fallback, prompt, systemPrompt, images, stream } = options;

  // ── THE EGRESS GATE (fail closed): un-tiered calls never leave ──
  if (!options.egress?.tier) {
    throw new EgressDeniedError(
      "un-tiered callLLM — declare options.egress.tier (A/B/C)",
    );
  }
  const baseDecl = (processor: string): EgressDeclaration => ({
    tier: options.egress.tier,
    edgeFunction: options.edgeFunction ?? "unknown",
    processor,
    visitId: options.visitId,
    knownIdentifiers: options.egress.knownIdentifiers,
    consentId: options.egress.consentId,
    containsUnredactable: options.egress.containsUnredactable,
  });

  // ── Streaming path ────────────────────────────────────────
  if (stream) {
    const resolved = resolveStreamProvider(primary.provider, primary.model);
    if (resolved) {
      // Gate OUTSIDE the try: a denial must deny, never fall back to a
      // different foreign processor.
      const gate = await openEgress(baseDecl(resolved.processor), [
        prompt,
        systemPrompt ?? "",
      ]);
      const [gPrompt, gSystem] = gate.fields;
      try {
        const result = await resolved.fn(
          resolved.apiKey,
          primary.model,
          gPrompt,
          gSystem || undefined,
          images,
          primary.temperature,
          primary.maxTokens,
        );
        return result.stream.pipeThrough(reidentifyStream(gate.mappings));
      } catch (err) {
        console.error(`[llm-router] Stream primary (${primary.model}) failed:`, err);
        if (fallback) {
          const fbResolved = resolveStreamProvider(fallback.provider, fallback.model);
          if (fbResolved) {
            // Same scrubbed payload; new evidence row for the new processor.
            await recordEgressEvidence(baseDecl(fbResolved.processor), {
              deidentified: gate.mappings.size > 0,
              identifiersScrubbed: gate.mappings.size,
            });
            const fbResult = await fbResolved.fn(
              fbResolved.apiKey,
              fallback.model,
              gPrompt,
              gSystem || undefined,
              images,
              fallback.temperature,
              fallback.maxTokens,
            );
            return fbResult.stream.pipeThrough(reidentifyStream(gate.mappings));
          }
        }
        throw err;
      }
    }
    // Provider doesn't support streaming — fall through to non-streaming
    // and wrap result in a ReadableStream
    const response = await callLLM({ ...options, stream: false });
    const llmResp = response as LLMResponse;
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(llmResp.text));
        controller.close();
      },
    });
  }

  // ── Non-streaming path ────────────────────────────────────
  if (!PROVIDERS[primary.provider]) {
    throw new Error(`Unknown provider: ${primary.provider}`);
  }

  let gate: Awaited<ReturnType<typeof openEgress>> | null = null;

  try {
    const { fn, apiKey, processor } = resolveProvider(primary.provider, primary.model);
    gate = await openEgress(baseDecl(processor), [prompt, systemPrompt ?? ""]);
    const result = await fn(
      apiKey,
      primary.model,
      gate.fields[0],
      gate.fields[1] || undefined,
      images,
      primary.temperature,
      primary.maxTokens,
    );
    result.text = reidentify(result.text, gate.mappings);

    // Fire-and-forget usage logging (visit-less calls log with null)
    if (options.edgeFunction) {
      logUsage({
        visitId: options.visitId ?? null,
        edgeFunction: options.edgeFunction,
        model: primary.model,
        wasFallback: false,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: result.latencyMs,
      }).catch(() => {});
    }

    return result;
  } catch (primaryErr) {
    // A gate denial is final — never retried against another processor.
    if (primaryErr instanceof EgressDeniedError) throw primaryErr;
    console.error(`[llm-router] Primary (${primary.model}) failed:`, primaryErr);

    if (!fallback) throw primaryErr;
    if (!PROVIDERS[fallback.provider]) throw primaryErr;

    try {
      const { fn: fbFn, apiKey: fbKey, processor: fbProcessor } = resolveProvider(
        fallback.provider,
        fallback.model,
      );
      // If the primary failed before gating (e.g. missing key), gate now;
      // otherwise reuse the scrubbed payload and add an evidence row for
      // the new processor.
      if (gate) {
        await recordEgressEvidence(baseDecl(fbProcessor), {
          deidentified: gate.mappings.size > 0,
          identifiersScrubbed: gate.mappings.size,
        });
      } else {
        gate = await openEgress(baseDecl(fbProcessor), [prompt, systemPrompt ?? ""]);
      }
      const fbResult = await fbFn(
        fbKey,
        fallback.model,
        gate.fields[0],
        gate.fields[1] || undefined,
        images,
        fallback.temperature,
        fallback.maxTokens,
      );
      fbResult.text = reidentify(fbResult.text, gate.mappings);

      // Log fallback usage
      if (options.edgeFunction) {
        logUsage({
          visitId: options.visitId ?? null,
          edgeFunction: options.edgeFunction,
          model: fallback.model,
          wasFallback: true,
          inputTokens: fbResult.inputTokens,
          outputTokens: fbResult.outputTokens,
          latencyMs: fbResult.latencyMs,
          error: `Primary ${primary.model} failed: ${primaryErr instanceof Error ? primaryErr.message : String(primaryErr)}`,
        }).catch(() => {});
      }

      return fbResult;
    } catch (fbErr) {
      console.error(`[llm-router] Fallback (${fallback.model}) also failed:`, fbErr);
      throw fbErr;
    }
  }
}
