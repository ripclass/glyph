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
