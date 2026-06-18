# KhaM-Med (self-hosted MedGemma) Router Integration — dormant-but-ready (design)

**KhaM Health · Glyph · 2026-06-18**

> Task B, step #1 (the $0 build). Replace the dead, broken-by-design Vertex MedGemma adapter in `_shared/llm-router.ts` with a real **config-driven, OpenAI-compatible** adapter for a self-hosted MedGemma (KhaM-Med) endpoint — **wired and ready, but dormant** (no host deployed, no route re-pointed, no recurring cost). Lighting it up later is a one-env-var change. The hosting decision + costs are researched and captured in the runbook below (#2 scale-to-zero recommended when there's demand).

## Why this is safe (the load-bearing facts)

- **`callVertexMedGemma` is currently dead code.** MedGemma was demoted from every route's primary (verified: no `provider: "medgemma"` appears in any edge function), so nothing calls it today. Swapping it changes no live behavior.
- **No route is re-promoted to MedGemma in this task.** Re-pointing a route at KhaM-Med is a *separate, measured* decision (the founder's rule: vision/clinical use gated on "measured on real BD films"). This task only makes the engine **callable**.
- **The Vertex path was broken anyway** (`Authorization: Bearer ${VERTEX_AI_API_KEY}` — Vertex wants an OAuth access token, not a raw key). We retire it.

## Decision: OpenAI-compatible, config-gated

- **API shape: OpenAI Chat Completions** (`POST {MEDGEMMA_BASE_URL}/chat/completions`). This is what vLLM, TGI, Ollama, and every serverless-GPU provider in the cost research expose for an open-weights model — the most portable target. (The retired Vertex path used Google's `generateContent` shape; we move to OpenAI shape so any of RunPod/Modal/HF/Baseten works unchanged.)
- **Config:** `MEDGEMMA_BASE_URL` (endpoint base, no trailing slash) + optional `MEDGEMMA_API_KEY` (bearer for the endpoint). `MEDGEMMA_MODEL` optional (defaults to the model id the route passes).
- **Availability gated on `MEDGEMMA_BASE_URL`:** unset → MedGemma is **unavailable**, and any route that ever lists it as primary falls straight through to its fallback. Set → it calls the endpoint. So with the env unset (today, and on prod after this ships), behavior is identical to now.

## Architecture (changes to `supabase/functions/_shared/llm-router.ts`)

1. **`PROVIDER_ENV_KEYS`** (currently `medgemma: "VERTEX_AI_API_KEY"`): repurpose so MedGemma's availability is keyed off `MEDGEMMA_BASE_URL` (presence of the endpoint), not a Vertex key. (MedGemma still has no OpenRouter path — that stays true.)
2. **New `callSelfHostedMedGemma(config, model, prompt, systemPrompt?, images?, temperature?, maxTokens?)`** replacing `callVertexMedGemma`:
   - Reads `MEDGEMMA_BASE_URL` (+ `MEDGEMMA_API_KEY`); if base url unset → throw a clear `"MedGemma endpoint not configured"` error (the router treats the provider as unavailable and uses the fallback — same place today's broken Vertex call would have failed, but without a wasted network round-trip).
   - **Cold-start tolerance (drives a code detail):** the chosen host is **27B on a scale-to-zero A100** (founder decision), whose cold start is **20–60s**. The adapter must NOT impose a short fetch timeout — use a generous timeout (e.g. ~120s via `AbortSignal.timeout`) so a cold-start first request isn't aborted. A single retry on a cold-start timeout is acceptable but optional; do not retry on a real model error. This is the one place the 27B-scale-to-zero choice changes code; everything else about 27B vs 4B / scale-to-zero vs 24/7 is pure config (the endpoint URL + model id).
   - Builds an **OpenAI chat-completions** body: `messages` = optional `{role:'system', content: systemPrompt}` + `{role:'user', content: ...}`. For text-only, `content` is the prompt string. **For images** (vision), `content` is the OpenAI array form `[{type:'text', text:prompt}, {type:'image_url', image_url:{url:'data:image/jpeg;base64,<b64>'}}, ...]` — so Lens v1.5 vision co-interp can use it later. `temperature`, `max_tokens` passed through; `model` = `MEDGEMMA_MODEL` ?? the route's model id.
   - `POST {base}/chat/completions` with `Content-Type: application/json` + (if key set) `Authorization: Bearer {MEDGEMMA_API_KEY}`.
   - Parses `choices[0].message.content` → `text`; maps `usage` (`prompt_tokens`/`completion_tokens`) → the router's `LLMResponse` usage shape. Returns `LLMResponse` (same shape every other adapter returns), so `callLLM`, cost logging, and the egress gate are unchanged.
3. **Dispatch map** (`medgemma: callVertexMedGemma`) → `medgemma: callSelfHostedMedGemma`.
4. **Retire** the Vertex specifics: `callVertexMedGemma`, the `GCP_PROJECT_ID`/`GCP_LOCATION` defaults, and the `VERTEX_AI_API_KEY` reference. Keep the `medgemma` provider name (so a future route config `provider:'medgemma'` works) and the "no OpenRouter path for medgemma" rule.

To keep the request-build + response-parse **inspectable and isolated**, factor them as two small pure functions (`buildMedGemmaChatBody(...)`, `parseOpenAIChatText(json)`) within the module, so the network call is a thin wrapper around testable shaping logic.

## Env vars (`.env.example`)

```
# KhaM-Med (self-hosted MedGemma), OpenAI-compatible endpoint. DORMANT until set —
# when unset, the medgemma provider is unavailable and routes use their fallback.
# Light-up: deploy MedGemma 4B to a scale-to-zero GPU (RunPod/Modal, OpenAI-compatible
# via vLLM/TGI), then set these in `supabase secrets set` (+ Vercel if any Next route
# ever calls it directly). See the light-up runbook in the design spec.
MEDGEMMA_BASE_URL=          # e.g. https://<your-endpoint>/v1  (no trailing slash)
MEDGEMMA_API_KEY=           # optional bearer for the endpoint
MEDGEMMA_MODEL=             # optional; defaults to the model id the route passes
```

## Testing (honest, codebase-consistent)

- **No edge-function unit-test harness exists** in this repo (no Deno tests; `supabase/functions` is outside the npm workspaces). The `_shared` modules are verified through the smoke suites that exercise them via real edge-fn calls. This task follows that.
- **Regression gate (the real check):** `smoke-path` (19/19) and `smoke-documents` (16/16) stay green — proving the swap caused no collateral damage to the live Gemini/Claude/Perplexity routes, with `MEDGEMMA_BASE_URL` unset (MedGemma unavailable → unused). These run at ship-time against prod (the established pattern).
- **Code review** of the isolated adapter + the pure shaping helpers.
- **Live correctness of the adapter is verified at #2 light-up** via a new `scripts/smoke-medgemma.mjs` (documented in the runbook): point `MEDGEMMA_BASE_URL` at the deployed endpoint and assert a real OpenAI-compatible round-trip (text, and an image for vision). Deferred because there is no host now — by design.

## Light-up runbook (#2, when there's a real consumer — researched 2026-06; founder chose 27B)

1. Deploy **MedGemma 27B** (`medgemma-27b-text-it`) to a **scale-to-zero serverless GPU** exposing an **OpenAI-compatible** endpoint:
   - **RunPod Serverless** (`runpod/worker-vllm`, **A100 80GB** for BF16, or **L40S 48GB** for Q8) or **Modal** (vLLM class, A100) — per-second billing, ~**$5–15/mo at pilot volume**, ~$0 idle, **20–60s cold start** (the adapter's generous timeout handles this; fine for async lab-normalization, not for low-latency interactive use). Set `MEDGEMMA_MODEL=medgemma-27b-text-it`.
   - Per-minute-billed providers (HF Endpoints, Baseten) are 10–15× costlier at low volume — avoid until steady flow.
2. `supabase secrets set MEDGEMMA_BASE_URL=… MEDGEMMA_API_KEY=… MEDGEMMA_MODEL=medgemma-27b-text-it`; redeploy the functions that should use it.
3. Run `scripts/smoke-medgemma.mjs` against the endpoint → confirm a real round-trip. **Known edge case:** if the text-response check fails even though the endpoint returned HTTP 200, the OpenAI-compatible server may be returning `message.content` as an **array of parts** (e.g. `[{type:'text', text:'...'}]`) rather than a plain string — `parseOpenAIChatText` currently handles string content only. If the smoke's text check fails for this reason, extend `parseOpenAIChatText` to flatten array content before re-promoting a route.
4. **Separately + measured:** decide which route(s) to re-point at `provider:'medgemma'` (e.g. lab interpretation, or the Lens v1.5 vision co-interp) — its own small task, gated on evaluation against real BD data. Update the §4 routing table then.

### Spike → dedicated 24/7 (founder wants this ready)

The adapter is endpoint-agnostic, so moving from scale-to-zero to dedicated is a **host swap + one env change** (`MEDGEMMA_BASE_URL`), zero code change:
- **When:** sustained throughput (dozens of req/hour) where cold-start latency or per-request cost stops making sense.
- **Options (researched):** 27B 24/7 on **L40S 48GB Q8 ≈ $570/mo** (best ROI) or **A100 80GB BF16 ≈ $930–1,300/mo** (Lambda/RunPod). Keeps the model always warm (no cold start). Ops burden: you own the VM + vLLM/TGI + patching.
- **Capacity headroom:** vLLM serves concurrent requests on one GPU; scale out (a second pod / autoscaling) only when one A100 saturates.

## Reserved — training on consented data (the KhaM-Med flywheel; founder wants the option kept open)

The founder wants the path to **fine-tune KhaM-Med on Glyph's own consented data** preserved. It is a **separate future workstream**, NOT built here — but the **option is already preserved by the existing architecture**: every encounter carries `ai_processing`/`data_sharing` consent rows, the egress gate + `egress_log` record provenance, de-identification (`_shared/deidentify.ts`) exists, and doctor verdicts are captured (e.g. `visits.prescription_safety_check`, approved notes, lab signatures). The missing piece is a **de-identified, consent-filtered training-corpus export pipeline** (the module map's KhaM-Med row). Reserved as the next-but-one workstream after the model is serving; this router task neither blocks nor advances it, but the self-hosted endpoint is exactly what a fine-tuned KhaM-Med checkpoint would later be served through (same adapter, new weights, `MEDGEMMA_MODEL` points at the fine-tune). No build now.

## Out of scope (reserved, deferred)

- Re-promoting any route to MedGemma (separate measured task). The GPU host itself (the founder provisions when ready; #2 runbook). Lens v1.5 vision co-interpretation wiring. The training-corpus export pipeline (above). Streaming from MedGemma (the adapter is non-streaming v1; add if a streaming route ever uses it).

## Appendix — cost research (2026-06, sourced)

No turnkey per-token MedGemma API exists (not on OpenRouter/Together/Fireworks/HF-serverless; Vertex Model Garden = self-managed VM) → self-host/GPU-cloud only. **#2 scale-to-zero (RunPod/Modal, L4, 4B): ~$1–5/mo pilot, ~$0 idle, 10–30s cold start. #3 24/7: 4B ~$310–360/mo, 27B ~$930–1,300/mo.** Full sourced report retained in the session/cost-research notes. Recommendation: #2 scale-to-zero on RunPod/Modal with 4B when lighting up.
