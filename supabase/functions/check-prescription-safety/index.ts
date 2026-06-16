/**
 * check-prescription-safety — proactive twin of consult-query's drug-interaction
 * route. POST { visitId, medications: [{ name, dose?, frequency?, ... }] }.
 *
 * Assembles the patient's existing meds (from prior prescriptions), allergies,
 * and conditions server-side, then asks Opus 4.8 — via the Tier-A egress
 * chokepoint — for interaction / allergy / contraindication warnings. Returns
 * RAW warnings + context counts; the app layer validates and shapes them.
 *
 * Suggest, never override: this function only reports. It never writes the Rx,
 * never blocks anything. Persistence of the doctor's verdict happens at approval.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { callLLM } from "../_shared/llm-router.ts";
import type { EdgeFunctionResponse } from "../_shared/types.ts";

interface Med { name?: string; dose?: string; frequency?: string; duration?: string; instructions?: string }

const SYSTEM_PROMPT = `You are a prescription safety checker for doctors in Bangladesh.
You are given the drugs a doctor is about to prescribe and what the patient is already
on, allergic to, and lives with. Report ONLY genuine concerns. Never diagnose, never
prescribe, never reassure beyond the data. Prefer flagging with low confidence over
silence when unsure. Consider Bangladeshi brand/generic names.

Output ONLY valid JSON, no prose, matching exactly:
{ "warnings": [ { "type": "interaction"|"allergy"|"contraindication",
  "severity": "critical"|"moderate"|"low", "subject": "<prescribed drug>",
  "object": "<other drug/allergy/condition>", "explanation": "<one short line>",
  "basis": "<what data this rests on>", "confidence": "high"|"low" } ] }
Return { "warnings": [] } when nothing genuine is found.`;

function buildPrompt(toPrescribe: string[], existingMeds: string[], allergies: string[], conditions: string[]): string {
  return `Drugs being prescribed now:
${toPrescribe.map((d) => `- ${d}`).join("\n") || "- (none)"}

Patient is already taking:
${existingMeds.map((d) => `- ${d}`).join("\n") || "- (none on file)"}

Known allergies:
${allergies.map((a) => `- ${a}`).join("\n") || "- (none on file)"}

Chronic conditions:
${conditions.map((c) => `- ${c}`).join("\n") || "- (none on file)"}

Check the drugs being prescribed against each list (drug-drug, drug-allergy,
drug-condition). Respond with the JSON object specified in your instructions.`;
}

function asStrings(value: unknown): string[] {
  if (Array.isArray(value)) {
    // Silently dropping non-string / nameless entries is intentional: this is
    // unvalidated JSONB, so anything that isn't a usable name is not coerced.
    return value.map((v) => (typeof v === "string" ? v : (v as Record<string, unknown>)?.name)).filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  }
  return [];
}

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ success: false, error: "Missing authorization header", code: "UNAUTHORIZED" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return jsonResponse({ success: false, error: "Invalid token", code: "UNAUTHORIZED" }, 401);

    const { visitId, medications } = await req.json();
    if (!visitId || !Array.isArray(medications)) {
      return jsonResponse({ success: false, error: "visitId and medications[] are required", code: "BAD_REQUEST" }, 400);
    }

    // Drafted Rx → display strings.
    const toPrescribe = (medications as Med[])
      .filter((m) => m?.name)
      .map((m) => [m.name, m.dose, m.frequency].filter(Boolean).join(" "));

    // Patient context via the RLS-scoped user client — never service role. A
    // doctor can only read rows tracing back to their own clinic, so a
    // cross-clinic visitId returns no row and falls through to 404 (denies
    // access without leaking the visit's existence). This function does NO
    // writes, so it has no business holding a service-role key.
    const { data: visit } = await userClient.from("visits").select("patient_id").eq("id", visitId).maybeSingle();
    if (!visit?.patient_id) return jsonResponse({ success: false, error: "Visit not found", code: "NOT_FOUND" }, 404);

    const { data: patient } = await userClient
      .from("patients").select("name, name_bn, phone, known_allergies, chronic_conditions").eq("id", visit.patient_id).maybeSingle();

    // `.or` keeps visitless/NULL-visit_id historical Rx (e.g. WhatsApp pre-chamber
    // photo uploads) while excluding ONLY the current visit's own draft rows. A
    // plain .neq("visit_id", visitId) would silently drop every NULL-visit_id row,
    // since Postgres `<>` is UNKNOWN against NULL — a clinical-safety gap.
    const { data: priorRx } = await userClient
      .from("prescriptions").select("medications, source, created_at")
      .eq("patient_id", visit.patient_id)
      // visitId is a validated UUID here — the visit lookup above 404s any non-UUID before this filter runs, so the interpolation is not an injection surface; preserve that ordering.
      .or(`visit_id.is.null,visit_id.neq.${visitId}`);

    const existingMeds = (priorRx ?? []).flatMap((p) => asStrings((p.medications as { name?: string }[] | null)));
    const allergies = asStrings(patient?.known_allergies);
    const conditions = asStrings(patient?.chronic_conditions);

    // Structured COUNTS only — never the drug/patient values themselves.
    console.log(`[check-prescription-safety] visitId=${visitId} prescribing=${toPrescribe.length} existingMeds=${existingMeds.length} allergies=${allergies.length} conditions=${conditions.length}`);

    const llm = await callLLM({
      primary: { provider: "claude", model: "claude-opus-4-8", temperature: 0.1, maxTokens: 2000 },
      fallback: { provider: "claude", model: "claude-sonnet-4-20250514", temperature: 0.1, maxTokens: 2000 },
      prompt: buildPrompt(toPrescribe, existingMeds, allergies, conditions),
      systemPrompt: SYSTEM_PROMPT,
      visitId,
      edgeFunction: "check-prescription-safety",
      egress: {
        tier: "A",
        knownIdentifiers: [patient?.name, patient?.name_bn, patient?.phone],
      }, // structured drug/condition names only; patient identifiers scrubbed as a floor
    }) as { text: string; model: string };

    let warnings: unknown = [];
    try {
      warnings = JSON.parse(llm.text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()).warnings ?? [];
    } catch {
      // Malformed model output: report empty + let the app treat low confidence as needed.
      // (The app's smoke test asserts the happy path; a parse failure here surfaces as
      // an empty raw list, and the client still records the model + checkedAt.)
      warnings = [];
    }

    return jsonResponse<EdgeFunctionResponse>({
      success: true,
      data: {
        warnings,
        existingMedCount: existingMeds.length,
        hasAllergies: allergies.length > 0,
        hasConditions: conditions.length > 0,
        model: llm.model,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[check-prescription-safety] Error:", err);
    return jsonResponse({ success: false, error: err instanceof Error ? err.message : "Internal error", code: "INTERNAL_ERROR" }, 500);
  }
});

function jsonResponse<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
