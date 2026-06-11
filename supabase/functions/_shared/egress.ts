/**
 * THE data-egress chokepoint (M4 hard constraint — Phase 2 brief).
 *
 * No patient data leaves Glyph's boundary except through `openEgress()`.
 * Every call declares a tier; the tier's rule is enforced IN CODE and the
 * decision — allowed or rejected — is written to the append-only
 * `egress_log` BEFORE any bytes leave. Fail closed, twice over:
 *
 *   - an un-tiered call is rejected, not sent (llm-router refuses);
 *   - if the evidence row cannot be written, the egress does not happen.
 *
 * Tiers (the routing decision, not a redaction fix):
 *   A — PII lives in structured fields we can reliably scrub: exact
 *       known-identifier literals + precise patterns (phone/NID/email).
 *       Scrub, send, re-identify the response.
 *   B — free-text transcripts / document images, where scrubbing cannot be
 *       guaranteed. Requires a live consent record; best-effort scrubbing
 *       still runs; `contains_unredactable` is recorded honestly.
 *   C — protected-population flows. NEVER leaves the country. Always
 *       rejected until an in-country/on-device path (KhaMed) exists.
 *
 * The regex floor is NOT the control — the tier gate is. The ML-PII /
 * on-device upgrade for sensitive flows remains a precondition for the
 * protected-population modes (vision §20), which stay Tier C (off).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deidentifyPrecise, reidentify, type PiiMappings } from "./deidentify.ts";

export type EgressTier = "A" | "B" | "C";

export interface EgressDeclaration {
  tier: EgressTier;
  edgeFunction: string;
  /** External processor, e.g. "openrouter:google/gemini-2.5-flash" */
  processor: string;
  visitId?: string;
  /**
   * Exact PII values from structured fields (names incl. Bangla, phones,
   * addresses…). Scrubbed as literals — strictly more reliable than regex.
   */
  knownIdentifiers?: Array<string | null | undefined>;
  /** Tier B: consent_records.id covering this processing */
  consentId?: string;
  /** Tier B: payload includes content scrubbing cannot cover (images/voice) */
  containsUnredactable?: boolean;
}

export interface EgressGate {
  /** Scrubbed text fields, same order as the input */
  fields: string[];
  /** Placeholder → original; feed to reidentify()/reidentifyStream() */
  mappings: PiiMappings;
  /** egress_log row id (the evidence) */
  logId: string;
}

/** Raised when the gate refuses an egress. Functions surface this as 4xx. */
export class EgressDeniedError extends Error {
  code = "EGRESS_DENIED";
  constructor(reason: string) {
    super(`Egress denied: ${reason}`);
  }
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Literal scrub of known identifiers (longest first so substrings can't shadow) */
function scrubKnownIdentifiers(
  text: string,
  identifiers: string[],
  mappings: PiiMappings,
  counterStart: number,
): { cleaned: string; next: number } {
  let cleaned = text;
  let counter = counterStart;
  const sorted = [...identifiers].sort((a, b) => b.length - a.length);
  for (const value of sorted) {
    if (!cleaned.includes(value)) continue;
    // Reuse an existing placeholder for the same value, else mint one
    let ph = [...mappings.entries()].find(([, v]) => v === value)?.[0];
    if (!ph) {
      counter++;
      ph = `[PII_${counter}]`;
      mappings.set(ph, value);
    }
    cleaned = cleaned.split(value).join(ph);
  }
  return { cleaned, next: counter };
}

async function writeEvidence(
  decl: EgressDeclaration,
  allowed: boolean,
  rejectReason: string | null,
  deidentified: boolean,
  identifiersScrubbed: number,
): Promise<string | null> {
  const { data, error } = await adminClient()
    .from("egress_log")
    .insert({
      edge_function: decl.edgeFunction,
      tier: decl.tier,
      processor: decl.processor,
      allowed,
      reject_reason: rejectReason,
      deidentified,
      identifiers_scrubbed: identifiersScrubbed,
      contains_unredactable: decl.containsUnredactable ?? false,
      consent_id: decl.consentId ?? null,
      visit_id: decl.visitId ?? null,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[egress] evidence write failed:", error.message);
    return null;
  }
  return data.id;
}

async function deny(decl: EgressDeclaration, reason: string): Promise<never> {
  await writeEvidence(decl, false, reason, false, 0);
  throw new EgressDeniedError(reason);
}

/**
 * Authorize one external call. Returns the scrubbed payload fields + the
 * mapping table for response re-identification.
 *
 * @param decl - The egress declaration (tier, processor, consent, …)
 * @param fields - Outbound text fields (prompt, systemPrompt, message body…)
 * @throws {EgressDeniedError} Tier C, missing/invalid consent (B), or
 *         evidence-write failure (fail closed)
 */
export async function openEgress(
  decl: EgressDeclaration,
  fields: string[],
): Promise<EgressGate> {
  // ── Tier rules ────────────────────────────────────────────────
  if (decl.tier === "C") {
    await deny(decl, "Tier C flows never leave the country (no in-country inference path yet)");
  }

  if (decl.tier === "B") {
    if (!decl.consentId) {
      await deny(decl, "Tier B requires a consent record naming this processing");
    }
    const { data: consent } = await adminClient()
      .from("consent_records")
      .select("id, granted, withdrawn_at")
      .eq("id", decl.consentId!)
      .maybeSingle();
    if (!consent || !consent.granted || consent.withdrawn_at) {
      await deny(decl, "Tier B consent record missing, not granted, or withdrawn");
    }
  }

  // ── Scrub (A: the contract; B: best-effort over-redaction) ────
  const mappings: PiiMappings = new Map();
  const identifiers = (decl.knownIdentifiers ?? [])
    .filter((v): v is string => typeof v === "string" && v.trim().length >= 2)
    .map((v) => v.trim());

  let counter = 0;
  const scrubbed = fields.map((field) => {
    const known = scrubKnownIdentifiers(field, identifiers, mappings, counter);
    counter = known.next;
    return deidentifyPrecise(known.cleaned, mappings);
  });

  // ── Evidence BEFORE egress; no evidence row → no egress ───────
  const logId = await writeEvidence(decl, true, null, mappings.size > 0, mappings.size);
  if (!logId) {
    throw new EgressDeniedError("egress evidence log unavailable (failing closed)");
  }

  return { fields: scrubbed, mappings, logId };
}

/**
 * Evidence row for a follow-up attempt on an already-gated payload (the
 * fallback provider receives the SAME scrubbed fields, so no re-scrub —
 * but every external processor contacted gets its own evidence row).
 * Fail closed, same as openEgress.
 */
export async function recordEgressEvidence(
  decl: EgressDeclaration,
  scrub: { deidentified: boolean; identifiersScrubbed: number },
): Promise<string> {
  const logId = await writeEvidence(
    decl,
    true,
    null,
    scrub.deidentified,
    scrub.identifiersScrubbed,
  );
  if (!logId) {
    throw new EgressDeniedError("egress evidence log unavailable (failing closed)");
  }
  return logId;
}

/**
 * Re-identify a Gemini-shaped SSE stream: placeholders inside event text are
 * restored before the stream reaches the tee (so both the client branch and
 * the transcript-capture branch see real values). Line-buffered so split
 * chunks can't tear an event; non-event lines pass through untouched.
 */
export function reidentifyStream(mappings: PiiMappings): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  function restoreLine(line: string): string {
    if (!line.startsWith("data: ") || mappings.size === 0) return line;
    try {
      const json = JSON.parse(line.slice(6));
      const part = json?.candidates?.[0]?.content?.parts?.[0];
      if (part && typeof part.text === "string") {
        part.text = reidentify(part.text, mappings);
        return `data: ${JSON.stringify(json)}`;
      }
    } catch {
      // Not a parseable event — pass through unmodified
    }
    return line;
  }

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        controller.enqueue(encoder.encode(`${restoreLine(line)}\n`));
      }
    },
    flush(controller) {
      if (buffer) controller.enqueue(encoder.encode(restoreLine(buffer)));
    },
  });
}
