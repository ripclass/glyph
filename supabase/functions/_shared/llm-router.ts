/**
 * Unified LLM routing with fallback support.
 * Dispatches to Gemini, MedGemma (Vertex AI), Claude, OpenAI, or Perplexity.
 */

import type { LLMResponse, ModelConfig } from "./types.ts";
import { logUsage, type UsageParams } from "./cost-logger.ts";

// ── Env-key mapping ─────────────────────────────────────────────

const ENV_KEYS: Record<ModelConfig["provider"], string> = {
  gemini: "GEMINI_API_KEY",
  medgemma: "VERTEX_AI_API_KEY",
  claude: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
};

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

async function callVertexMedGemma(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string,
  images?: string[],
  temperature = 0.2,
  maxTokens = 4096,
): Promise<LLMResponse> {
  const start = performance.now();
  const projectId = Deno.env.get("GCP_PROJECT_ID") ?? "kham-health";
  const location = Deno.env.get("GCP_LOCATION") ?? "us-central1";

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

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MedGemma ${model} error ${res.status}: ${errText}`);
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
  medgemma: callVertexMedGemma,
  claude: callClaude,
  openai: callOpenAI,
  perplexity: callPerplexity,
};

const STREAM_PROVIDERS: Partial<Record<ModelConfig["provider"], ProviderStreamFn>> = {
  gemini: callGeminiStream,
  claude: callClaudeStream,
};

// ── Public API ──────────────────────────────────────────────────

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

  // ── Streaming path ────────────────────────────────────────
  if (stream) {
    const streamFn = STREAM_PROVIDERS[primary.provider];
    if (streamFn) {
      try {
        const apiKey = getApiKey(primary.provider);
        const result = await streamFn(
          apiKey,
          primary.model,
          prompt,
          systemPrompt,
          images,
          primary.temperature,
          primary.maxTokens,
        );
        return result.stream;
      } catch (err) {
        console.error(`[llm-router] Stream primary (${primary.model}) failed:`, err);
        if (fallback) {
          const fbStreamFn = STREAM_PROVIDERS[fallback.provider];
          if (fbStreamFn) {
            const fbKey = getApiKey(fallback.provider);
            const fbResult = await fbStreamFn(
              fbKey,
              fallback.model,
              prompt,
              systemPrompt,
              images,
              fallback.temperature,
              fallback.maxTokens,
            );
            return fbResult.stream;
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
  const providerFn = PROVIDERS[primary.provider];
  if (!providerFn) {
    throw new Error(`Unknown provider: ${primary.provider}`);
  }

  try {
    const apiKey = getApiKey(primary.provider);
    const result = await providerFn(
      apiKey,
      primary.model,
      prompt,
      systemPrompt,
      images,
      primary.temperature,
      primary.maxTokens,
    );

    // Fire-and-forget usage logging
    if (options.visitId && options.edgeFunction) {
      logUsage({
        visitId: options.visitId,
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
    console.error(`[llm-router] Primary (${primary.model}) failed:`, primaryErr);

    if (!fallback) throw primaryErr;

    const fbFn = PROVIDERS[fallback.provider];
    if (!fbFn) throw primaryErr;

    try {
      const fbKey = getApiKey(fallback.provider);
      const fbResult = await fbFn(
        fbKey,
        fallback.model,
        prompt,
        systemPrompt,
        images,
        fallback.temperature,
        fallback.maxTokens,
      );

      // Log fallback usage
      if (options.visitId && options.edgeFunction) {
        logUsage({
          visitId: options.visitId,
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
