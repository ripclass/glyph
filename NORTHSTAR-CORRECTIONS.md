# NORTHSTAR-CORRECTIONS — edits `glyph-vision-v3.1.md` needs to stop overstating

**Produced per the Phase 2 brief's closeout task (after the M5 report, 2026-06-13).**
**The founder applies these; this file only lists them.**

---

## 1. De-identification status (§20, §14) — REQUIRED BY THE BRIEF

v3.1 §20 implies de-identification was wired and the gap was *quality* (regex vs ML).
Ground truth: at audit time it was **absent from 8 of 9 external paths**.

**Correct to:** the control is now **tiered egress routing** (M4, live in production):
every external call declares Tier A/B/C at a single fail-closed chokepoint
(`_shared/egress.ts`), with an append-only `egress_log` as the PDPO evidence trail.
Tier A scrubs exact known identifiers + precise patterns (phone/NID/email) and
re-identifies responses; Tier B (verbatim transcripts, document images) is
consent-gated per encounter — withdrawal blocks the next call; Tier C is rejected
unconditionally. Regex remains the *floor*, not the control. The §20 "soft
underbelly" paragraph should also note the Bangla-name regex is unusable on prose
(it matches any 2–5 word Bangla sequence) — the ML-PII / on-device upgrade remains
the precondition for protected-population modes, which stay Tier C (off).

## 2. W3C interoperability caveat (§5, §16) — REQUIRED BY THE BRIEF

v3.1 says credentials are "verifiable by anyone holding an issuer's public key."
True **only for verifiers using this library**: the proof is JCS + base64
`Ed25519Signature2020`-labelled, not W3C Data Integrity / URDNA2015 / multibase.

**Correct to:** "verifiable by any participant on the network; full W3C
interoperability (URDNA2015 / Data Integrity proofs) is a planned follow-up."

## 3. Scribe-vs-identity status inversion (§14, §25) — REQUIRED BY THE BRIEF

v3.1 treated the scribe as near-demo ("40–60 hours") and identity as speculative.
Ground truth at audit: the identity envelope was the only *proven* component; the
scribe had never executed (universal casing 400s, missing `speech-stream`,
Vertex 401). **Correct to the current state:** both are now real — the scribe runs
end-to-end in production (browser-verified), and the identity layer issues,
resolves, and verifies credentials with revocation propagation (M5).

## 4. The domain (§5, §16, throughout) — NEW

v3.1 assumes `glyph.health`. That domain was never owned by KhaMlabs (registered
by a third party, parked). The network's actual domain is **`khamhealth.com`**
(owned, live, serving the app and `/.well-known/did/`). All DIDs are
`did:web:khamhealth.com:.well-known:did:<entity>`. Update every `glyph.health`
reference; the §5 single-operator/succession discussion applies to khamhealth.com.

## 5. Budget and funding figures (§21) — PER FOUNDER DIRECTIVE

All dollar figures are hypothetical and should be labelled as scenarios, not
plans. The build is solo and self-funded. Actual infrastructure cost as deployed:
**≈ $26/month** (Supabase Pro) + $11/yr domain + pay-per-use OpenRouter.

## 6. Model and stack drift (§14, §17) — NEW

- The Gemini 1.5/2.0 model family named in the routing design is no longer served
  by the current transport (OpenRouter); calls map to 2.5-generation models.
- MedGemma is **demoted from all primaries** until a Vertex OAuth flow exists
  (the static-key path never worked). KhaMed (§17) remains the strategic
  destination; today's reality is Claude/Gemini via OpenRouter — which also means
  **OpenRouter Inc. must be added to the named-processor list** wherever §20
  enumerates external processors.
- STT (§14 infrastructure): v1 is the browser Web Speech API (bn-BD) with typed
  fallback — zero-cost, but it transits Google outside the egress gate (covered
  by the ai_processing consent; noted honestly). The server-relayed Cloud STT
  path is the upgrade when dialect accuracy demands it.

## 7. §25 "next 90 days" is superseded — NEW

The wiring critical-path items (#1–#10) are done, except **document-capture
upload → extract-document** (the plastic-bag feature's last leg: photos are
captured but not yet uploaded to Storage) — now the top follow-up, alongside
the per-corridor items already marked [RESERVED].
