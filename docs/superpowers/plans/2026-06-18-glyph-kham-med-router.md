# KhaM-Med Router Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dead, broken-by-design Vertex MedGemma adapter in `_shared/llm-router.ts` with a config-driven, OpenAI-compatible `callSelfHostedMedGemma` (text + vision, cold-start tolerant) that is **dormant** until `MEDGEMMA_BASE_URL` is set — making KhaM-Med callable with zero runtime change today and zero recurring cost.

**Architecture:** Within the existing router dispatch (`ENV_KEYS` → `hasNativeKey` → `resolveProvider` → `PROVIDERS[provider]`), repoint the `medgemma` provider: its env key becomes `MEDGEMMA_BASE_URL` (so availability is gated on the endpoint's presence), and its provider fn becomes a new OpenAI-compatible adapter that POSTs to `{MEDGEMMA_BASE_URL}/chat/completions`. The Vertex specifics are retired. No route is re-promoted to MedGemma (separate measured task). MedGemma keeps no OpenRouter path.

**Tech Stack:** Supabase Edge Function (Deno) `_shared/llm-router.ts`; OpenAI Chat Completions HTTP shape; Node smoke script.

## Global Constraints

- **Dormant + zero runtime change today:** with `MEDGEMMA_BASE_URL` unset (its state today and on prod after this ships) the `medgemma` provider is unavailable; since **no route uses `provider:'medgemma'`** (verified), nothing calls it. The swap must not change any Gemini/Claude/Perplexity/OpenAI behavior.
- **OpenAI-compatible only** (`POST {base}/chat/completions`); `MEDGEMMA_BASE_URL` (+ optional `MEDGEMMA_API_KEY` bearer, optional `MEDGEMMA_MODEL`). No OpenRouter path for medgemma (`openRouterEligible` stays false).
- **Cold-start tolerant:** generous fetch timeout (~120s) — a 27B scale-to-zero cold start is 20–60s.
- **`LLMResponse` shape unchanged:** `{ text, model, inputTokens, outputTokens, latencyMs }` (so `callLLM`, cost logging, egress gate are untouched).
- **No route re-promoted to MedGemma**, no GPU host provisioned, no 27B/vision wiring — out of scope (separate measured tasks; see the spec's runbook).
- **Verification reality:** `supabase/functions` has no Deno test harness and is outside the npm workspaces, so there is no local unit/type gate for edge-fn code. The gate is code review + the ship-time prod regression smokes (`smoke-path` 19/19, `smoke-documents` 16/16) proving no collateral damage with `MEDGEMMA_BASE_URL` unset. Live adapter correctness is verified at #2 light-up via `scripts/smoke-medgemma.mjs` against a real endpoint.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/functions/_shared/llm-router.ts` | **Modify:** `ENV_KEYS.medgemma` → `MEDGEMMA_BASE_URL`; replace `callVertexMedGemma` with `callSelfHostedMedGemma` + pure helpers `buildMedGemmaChatBody`/`parseOpenAIChatText` + `MEDGEMMA_TIMEOUT_MS`; `PROVIDERS.medgemma` → the new fn; update the line-33 comment; retire the Vertex/GCP specifics. |
| `.env.example` | **Modify:** add `MEDGEMMA_BASE_URL`/`MEDGEMMA_API_KEY`/`MEDGEMMA_MODEL`; mark `VERTEX_AI_API_KEY`/`GCP_PROJECT_ID`/`GCP_LOCATION` retired. |
| `scripts/smoke-medgemma.mjs` | **Create:** light-up smoke (deferred run) — a direct OpenAI-compatible round-trip against `MEDGEMMA_BASE_URL` (text + vision), to validate the endpoint before any route is re-promoted. |
| `CLAUDE.md` | **Modify:** §4 routing (MedGemma = self-hosted OpenAI-compatible, dormant), §7 env (MEDGEMMA_*; retire VERTEX/GCP), §3 scripts list (smoke-medgemma.mjs). |

---

### Task 1: Replace the Vertex adapter with `callSelfHostedMedGemma` (the router swap)

**Files:**
- Modify: `supabase/functions/_shared/llm-router.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `callSelfHostedMedGemma(baseUrl, model, prompt, systemPrompt?, images?, temperature?, maxTokens?): Promise<LLMResponse>` (matches the existing `ProviderFn` signature — `baseUrl` arrives as the first arg via `resolveProvider`/`getApiKey` because `ENV_KEYS.medgemma` is now `MEDGEMMA_BASE_URL`); pure helpers `buildMedGemmaChatBody(...)`, `parseOpenAIChatText(json)`.

- [ ] **Step 1: Repoint `ENV_KEYS.medgemma`**

In `supabase/functions/_shared/llm-router.ts`, change the `medgemma` line in `ENV_KEYS` (currently line 22):

```ts
const ENV_KEYS: Record<ModelConfig["provider"], string> = {
  gemini: "GEMINI_API_KEY",
  medgemma: "MEDGEMMA_BASE_URL",
  claude: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
};
```

This makes `hasNativeKey('medgemma')` true iff `MEDGEMMA_BASE_URL` is set, `getApiKey('medgemma')` return the base URL, and the "missing env var" error name `MEDGEMMA_BASE_URL`. (`openRouterEligible` already returns false for medgemma — keep it.)

- [ ] **Step 2: Update the comment block (lines ~28-34)**

Replace the comment sentence "MedGemma is Vertex-only and deliberately has no OpenRouter path." with:

```ts
 * MedGemma (KhaM-Med) is a SELF-HOSTED OpenAI-compatible endpoint (MEDGEMMA_BASE_URL)
 * and deliberately has no OpenRouter path. Dormant until the endpoint is configured.
```

- [ ] **Step 3: Replace `callVertexMedGemma` with the self-hosted adapter + pure helpers**

Replace the ENTIRE `callVertexMedGemma` function (currently lines ~163-220) with this block (drop the `GCP_PROJECT_ID`/`GCP_LOCATION`/Vertex URL logic entirely):

```ts
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
```

- [ ] **Step 4: Repoint the dispatch map**

In `PROVIDERS` (currently line ~627), change the `medgemma` entry:

```ts
const PROVIDERS: Record<ModelConfig["provider"], ProviderFn> = {
  gemini: callGemini,
  medgemma: callSelfHostedMedGemma,
  claude: callClaude,
  openai: callOpenAI,
  perplexity: callPerplexity,
};
```

- [ ] **Step 5: Confirm the Vertex specifics are fully retired**

Run:
```bash
grep -nE "callVertexMedGemma|VERTEX_AI_API_KEY|GCP_PROJECT_ID|GCP_LOCATION|aiplatform.googleapis" supabase/functions/_shared/llm-router.ts
```
Expected: **no matches** (all Vertex references removed). If any remain, remove them.

- [ ] **Step 6: Update `.env.example`**

In `.env.example`, find the MedGemma/Vertex lines. Replace the `VERTEX_AI_API_KEY` / `GOOGLE_CLOUD_PROJECT_ID` / `GCP_PROJECT_ID` / `GCP_LOCATION` MedGemma entries with:

```
# KhaM-Med (self-hosted MedGemma), OpenAI-compatible endpoint. DORMANT until set:
# when unset, the medgemma provider is unavailable and routes use their fallback.
# Light-up (see docs/superpowers/specs/2026-06-18-glyph-kham-med-router-design.md):
# deploy MedGemma to a scale-to-zero GPU (RunPod/Modal, OpenAI-compatible via vLLM/TGI),
# then `supabase secrets set` these. 27B is the chosen target (medgemma-27b-text-it).
MEDGEMMA_BASE_URL=          # e.g. https://<endpoint>/v1  (no trailing slash)
MEDGEMMA_API_KEY=           # optional bearer for the endpoint
MEDGEMMA_MODEL=             # optional; defaults to the model id the route passes
# RETIRED (no longer read by code — MedGemma is self-hosted, not Vertex):
# VERTEX_AI_API_KEY, GCP_PROJECT_ID, GCP_LOCATION, GOOGLE_CLOUD_PROJECT_ID
```

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/_shared/llm-router.ts .env.example
git commit -m "feat(kham-med): self-hosted OpenAI-compatible MedGemma adapter (dormant; retires Vertex)"
```

(No local type/unit gate exists for edge-fn code — see Global Constraints. The reviewer reads the diff; the ship-time `smoke-path`/`smoke-documents` confirm no regression.)

---

### Task 2: light-up smoke + cost-logger check + docs

**Files:**
- Create: `scripts/smoke-medgemma.mjs`
- Modify: `CLAUDE.md`
- (Read-only check) `supabase/functions/_shared/cost-logger.ts`

**Interfaces:**
- Consumes: a running OpenAI-compatible MedGemma endpoint (only at light-up; the script is written now, run later).

- [ ] **Step 1: Write the light-up smoke**

Create `scripts/smoke-medgemma.mjs`:

```js
/**
 * Light-up smoke for KhaM-Med (self-hosted MedGemma). DEFERRED: run this only
 * after a real OpenAI-compatible MedGemma endpoint exists (see the spec runbook).
 * It validates the ENDPOINT directly (the same OpenAI chat-completions shape the
 * router's callSelfHostedMedGemma uses), so a green run means re-promoting a route
 * to provider:'medgemma' is safe.
 *
 *   node scripts/smoke-medgemma.mjs <MEDGEMMA_BASE_URL> [MEDGEMMA_MODEL] [MEDGEMMA_API_KEY]
 */

const [baseUrl, model = 'medgemma-27b-text-it', apiKey] = process.argv.slice(2);
if (!baseUrl) {
  console.error('usage: node scripts/smoke-medgemma.mjs <MEDGEMMA_BASE_URL> [MODEL] [API_KEY]');
  process.exit(2);
}

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

const headers = { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) };
const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

// 1. Text round-trip (cold start may take 20-60s — allow time).
const t0 = Date.now();
const res = await fetch(url, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    model,
    messages: [
      { role: 'system', content: 'You are a clinical assistant. Answer in one short sentence.' },
      { role: 'user', content: 'Name the test that measures average blood glucose over ~3 months.' },
    ],
    temperature: 0.2,
    max_tokens: 64,
  }),
  signal: AbortSignal.timeout(120_000),
});
check('endpoint responds 200', res.ok, `HTTP ${res.status} after ${Date.now() - t0}ms`);
let json = {};
try { json = await res.json(); } catch { /* surfaced by the next check */ }
const text = json?.choices?.[0]?.message?.content;
check('OpenAI-compatible text response', typeof text === 'string' && text.length > 0, JSON.stringify(json).slice(0, 200));
check('usage tokens reported', typeof json?.usage?.completion_tokens === 'number', JSON.stringify(json?.usage));

console.log(failures === 0 ? '\nALL CHECKS PASSED — endpoint is OpenAI-compatible; safe to re-promote a route' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 2: Syntax-check the smoke**

Run: `node --check scripts/smoke-medgemma.mjs`
Expected: clean exit (no output).

- [ ] **Step 3: Verify cost-logger tolerates a self-hosted model id (no per-token price)**

Read `supabase/functions/_shared/cost-logger.ts` and inspect `estimateCost(model, inputTokens, outputTokens)`. A self-hosted MedGemma model id won't be in `MODEL_PRICING` — its real cost is the GPU, not per-token, so a **$0 estimate is correct**. Confirm `estimateCost` returns `0` for an unknown model rather than throwing (typically `MODEL_PRICING[model] ?? <zero/no-op>`). 
- If it returns 0 for unknown models → no change needed; note it in the report.
- If it would throw on an unknown model → add a guard so an unknown model yields `0` (do NOT invent a per-token price for a self-hosted model). Show the exact guard in the report.

- [ ] **Step 4: Update CLAUDE.md**

1. §4 AI Routing table — update the MedGemma rows' notes: MedGemma is now a **self-hosted OpenAI-compatible endpoint** (`MEDGEMMA_BASE_URL`), **dormant** until configured, no route currently uses it (still demoted); retire the "MedGemma demoted until Vertex OAuth" framing → "until a self-hosted endpoint is configured + a route is re-promoted (measured)."
2. §7 env table — add `MEDGEMMA_BASE_URL`/`MEDGEMMA_API_KEY`/`MEDGEMMA_MODEL`; mark `VERTEX_AI_API_KEY`/`GCP_PROJECT_ID`/`GCP_LOCATION` as retired (no longer read).
3. §3 scripts list — add `smoke-medgemma.mjs` (light-up endpoint check, deferred run).
4. Note the `callSelfHostedMedGemma` adapter in the §4 transport paragraph (MedGemma = self-hosted OpenAI-compatible, no OpenRouter path).

- [ ] **Step 5: Commit**

```bash
git add scripts/smoke-medgemma.mjs CLAUDE.md
[ -n "$(git status --porcelain supabase/functions/_shared/cost-logger.ts)" ] && git add supabase/functions/_shared/cost-logger.ts
git commit -m "feat(kham-med): light-up smoke + cost-logger self-hosted tolerance + docs"
```

---

## Self-Review

**Spec coverage:**
- ✅ OpenAI-compatible adapter, config-gated on `MEDGEMMA_BASE_URL` — Task 1.
- ✅ Text + vision (OpenAI `image_url`) — `buildMedGemmaChatBody`, Task 1.
- ✅ Cold-start tolerance (120s timeout) — Task 1.
- ✅ Vertex retired; no route re-promoted — Task 1 (grep gate Step 5).
- ✅ Env vars + retirement — Task 1 Step 6.
- ✅ `LLMResponse` shape unchanged — the adapter returns `{ text, model, inputTokens, outputTokens, latencyMs }` (matches the existing adapters verbatim).
- ✅ Self-hosted cost = $0 per-token (correct) — Task 2 Step 3.
- ✅ Deferred light-up smoke — Task 2 Step 1.
- ✅ Docs — Task 2 Step 4.
- ✅ Dormant / no-regression gate — Global Constraints (ship-time smoke-path/documents).

**Placeholder scan:** every code/step is complete. The `.env.example` empty values are config templates, not placeholders. Task 2 Step 3 has a conditional (returns-0 vs add-guard) — both branches are fully specified.

**Type consistency:** `callSelfHostedMedGemma` matches the `ProviderFn` signature `(apiKey/baseUrl, model, prompt, systemPrompt?, images?, temperature?, maxTokens?) => Promise<LLMResponse>`; the return matches `{ text, model, inputTokens, outputTokens, latencyMs }`. `ENV_KEYS.medgemma='MEDGEMMA_BASE_URL'` is consumed by `hasNativeKey`/`getApiKey`/`resolveProvider` (unchanged). `buildMedGemmaChatBody`/`parseOpenAIChatText` defined and consumed within Task 1.
