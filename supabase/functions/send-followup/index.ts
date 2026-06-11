/**
 * send-followup — WhatsApp follow-up message trigger.
 *
 * POST { visitId, phone, messageType: 'summary' | 'followup' }
 *
 * If messageType is 'summary', generates a patient summary first.
 * Sends the message via WhatsApp Business Cloud API.
 * Updates the visit record with followup_sent_at.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { EgressDeniedError, openEgress } from "../_shared/egress.ts";
import { logUsage } from "../_shared/cost-logger.ts";
import type { EdgeFunctionResponse } from "../_shared/types.ts";

serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    // ── Auth ────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ success: false, error: "Missing authorization header", code: "UNAUTHORIZED" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return jsonResponse({ success: false, error: "Invalid token", code: "UNAUTHORIZED" }, 401);
    }

    // ── Parse body ──────────────────────────────────────────
    const { visitId, phone, messageType = "summary" } = await req.json();

    if (!visitId || !phone) {
      return jsonResponse(
        { success: false, error: "visitId and phone are required", code: "BAD_REQUEST" },
        400,
      );
    }

    if (messageType !== "summary" && messageType !== "followup") {
      return jsonResponse(
        { success: false, error: "messageType must be 'summary' or 'followup'", code: "BAD_REQUEST" },
        400,
      );
    }

    // ── Verify visit exists ─────────────────────────────────
    const { data: visit, error: visitErr } = await supabase
      .from("visits")
      .select("id, patient_id, doctor_id, approved_note, generated_note, followup_scheduled_at")
      .eq("id", visitId)
      .single();

    if (visitErr || !visit) {
      return jsonResponse({ success: false, error: "Visit not found", code: "NOT_FOUND" }, 404);
    }

    // ── Check WhatsApp consent ──────────────────────────────
    const { data: consent } = await supabase
      .from("consent_records")
      .select("id, granted")
      .eq("patient_id", visit.patient_id)
      .eq("visit_id", visitId)
      .eq("consent_type", "whatsapp_followup")
      .is("withdrawn_at", null)
      .single();

    if (!consent?.granted) {
      return jsonResponse(
        { success: false, error: "Patient has not consented to WhatsApp messages", code: "CONSENT_REQUIRED" },
        403,
      );
    }

    // ── Generate message content ────────────────────────────
    let messageBody: string;
    const start = performance.now();

    if (messageType === "summary") {
      // Call generate-patient-summary edge function
      const summaryRes = await fetch(`${supabaseUrl}/functions/v1/generate-patient-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ visitId }),
      });

      if (!summaryRes.ok) {
        const errBody = await summaryRes.json().catch(() => ({}));
        return jsonResponse(
          { success: false, error: `Failed to generate summary: ${(errBody as Record<string, string>).error ?? summaryRes.statusText}`, code: "SUMMARY_ERROR" },
          500,
        );
      }

      const summaryJson = await summaryRes.json();
      if (!summaryJson.success) {
        return jsonResponse(
          { success: false, error: `Summary generation failed: ${summaryJson.error}`, code: "SUMMARY_ERROR" },
          500,
        );
      }

      messageBody = summaryJson.data.summary;
    } else {
      // Follow-up message
      const { data: patient } = await supabase
        .from("patients")
        .select("name_bn, name")
        .eq("id", visit.patient_id)
        .single();

      const { data: doctor } = await supabase
        .from("doctors")
        .select("name_bn, name")
        .eq("id", visit.doctor_id)
        .single();

      const patientName = patient?.name_bn ?? patient?.name ?? "রোগী";
      const doctorName = doctor?.name_bn ?? doctor?.name ?? "ডাক্তার";
      const followUpDate = visit.followup_scheduled_at
        ? new Date(visit.followup_scheduled_at).toLocaleDateString("bn-BD", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : null;

      messageBody = `প্রিয় ${patientName},

${doctorName}-এর পক্ষ থেকে ফলো-আপ বার্তা।

আপনার শারীরিক অবস্থা কেমন আছে? ওষুধ নিয়মিত খাচ্ছেন তো?

${followUpDate ? `আপনার পরবর্তী অ্যাপয়েন্টমেন্ট: ${followUpDate}` : "দয়া করে ডাক্তারের পরামর্শ অনুযায়ী ফলো-আপে আসুন।"}

কোনো সমস্যা হলে এই নম্বরে জানাবেন।

ধন্যবাদ,
KhaM Health`;
    }

    // ── Send via WhatsApp Business Cloud API ────────────────
    const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    let whatsappSuccess = false;
    let whatsappMessageId: string | null = null;

    if (whatsappToken && whatsappPhoneId) {
      // Tier B egress to Meta: the full Bangla clinical narrative crosses —
      // deliberately UNscrubbed because the recipient IS the data subject;
      // the whatsapp_followup consent is the control, the evidence row
      // records contains_unredactable honestly. Denial throws before send.
      await openEgress(
        {
          tier: "B",
          edgeFunction: "send-followup",
          processor: "whatsapp:meta",
          visitId,
          consentId: consent.id,
          containsUnredactable: true,
        },
        [],
      );
      try {
        // Normalize phone number: ensure it starts with country code
        const normalizedPhone = normalizePhoneForWhatsApp(phone);

        const waRes = await fetch(
          `https://graph.facebook.com/v19.0/${whatsappPhoneId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${whatsappToken}`,
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: normalizedPhone,
              type: "text",
              text: { body: messageBody },
            }),
          },
        );

        if (waRes.ok) {
          const waJson = await waRes.json();
          whatsappMessageId = waJson.messages?.[0]?.id ?? null;
          whatsappSuccess = true;
        } else {
          const errText = await waRes.text();
          console.error("[send-followup] WhatsApp API error:", waRes.status, errText);
        }
      } catch (waErr) {
        console.error("[send-followup] WhatsApp send error:", waErr);
      }
    } else {
      console.warn("[send-followup] WhatsApp credentials not configured. Message not sent.");
      // In development, we'll consider this a success but flag it
      whatsappSuccess = false;
    }

    // ── Update visit record ─────────────────────────────────
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (whatsappSuccess) {
      await serviceClient
        .from("visits")
        .update({
          followup_sent_at: new Date().toISOString(),
          status: "followup_sent",
        })
        .eq("id", visitId);
    }

    // ── Log usage ───────────────────────────────────────────
    const latencyMs = Math.round(performance.now() - start);
    await logUsage({
      visitId,
      edgeFunction: "send-followup",
      model: "whatsapp-api",
      wasFallback: false,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      error: whatsappSuccess ? undefined : "WhatsApp send failed or not configured",
    });

    return jsonResponse<EdgeFunctionResponse>({
      success: true,
      data: {
        messageSent: whatsappSuccess,
        messageType,
        whatsappMessageId,
        messagePreview: messageBody.slice(0, 200) + (messageBody.length > 200 ? "..." : ""),
        phone: maskPhone(phone),
      },
    });
  } catch (err) {
    if (err instanceof EgressDeniedError) {
      return jsonResponse({ success: false, error: err.message, code: "EGRESS_DENIED" }, 403);
    }
    console.error("[send-followup] Error:", err);
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : "Internal error", code: "INTERNAL_ERROR" },
      500,
    );
  }
});

/**
 * Normalize Bangladeshi phone numbers for WhatsApp API.
 * WhatsApp requires numbers without + prefix and with country code.
 */
function normalizePhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, "");

  // Remove + prefix
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  // If starts with 0 (local format), prepend 880
  if (cleaned.startsWith("01")) {
    cleaned = "880" + cleaned.slice(1);
  }

  return cleaned;
}

/**
 * Mask phone number for API response (privacy).
 */
function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 6) return "***";
  return cleaned.slice(0, 3) + "****" + cleaned.slice(-3);
}

function jsonResponse<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
