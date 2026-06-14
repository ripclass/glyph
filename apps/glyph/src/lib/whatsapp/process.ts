import { createAdminClient } from "@/lib/supabase/admin";
import type { NormalizedInbound } from "./types";
import { decideRoute } from "./router";
import { resolveLinkByWaId, redeemBindCode } from "./binding";
import { sendText } from "./send";
import { isWindowOpen, nextWindowExpiry } from "./window";
import { readFlow, writeFlow } from "./flow";
import { formatOutcome } from "./reply";
import { findOrCreateWalletToken } from "./wallet-link";
import { runTriageTurn, type TriageMsg } from "@/lib/services/triage-runner";
import { captureDocument, resolveDocConsent, createDocConsent } from "./documents";

type Admin = ReturnType<typeof createAdminClient>;

const ONBOARD_MSG =
  "আসসালামু আলাইকুম। এটি Glyph। আপনার রেকর্ড দেখতে ক্লিনিক থেকে পাওয়া কোডটি এখানে পাঠান। কোড না থাকলে আপনার ডাক্তারের কাছে চান।";
const BIND_OK_MSG = "ধন্যবাদ — আপনার নম্বর যুক্ত হয়েছে। সমস্যা থাকলে এখানে লিখুন, বা 'রেকর্ড' লিখে আপনার তথ্য দেখুন।";
const BIND_FAIL_MSG = "কোডটি কাজ করছে না বা মেয়াদ শেষ। ক্লিনিক থেকে নতুন কোড নিন।";
const HELP_MSG = "এখন শুধু লেখা পড়তে পারি। আপনার সমস্যাটা লিখুন, অথবা 'রেকর্ড' লিখুন।";
const CONSENT_NOTICE =
  "আপনার লেখা একটি AI-তে পাঠানো হবে — পাঠানোর আগে নাম-পরিচয় মুছে ফেলা হয়। এটি ডাক্তারের বিকল্প নয়, শুধু পরামর্শ। রাজি থাকলে 'হ্যাঁ' লিখুন।";
const CONSENT_DECLINED_MSG = "ঠিক আছে, কোনো সমস্যা নেই। প্রয়োজনে ডাক্তার দেখান।";
const REVOKED_MSG = "আপনার নম্বর সরিয়ে নেওয়া হয়েছে। আর কোনো বার্তা পাবেন না। আবার যুক্ত হতে ক্লিনিকের কোড পাঠান।";
const TRIAGE_TAG = "whatsapp_triage";
const DOC_CONSENT_NOTICE =
  "ছবিতে নাম-পরিচয় থাকতে পারে; এটি একটি AI পড়বে, পরিচয় গোপন রাখা হয়। ডাক্তার দেখার আগে আপনার তথ্য প্রস্তুত হবে। রাজি থাকলে 'হ্যাঁ' লিখুন।";
const DOC_TYPE_QUESTION = "এটা কি প্রেসক্রিপশন না ল্যাব রিপোর্ট? প্রেসক্রিপশন হলে '১', রিপোর্ট হলে '২' লিখুন।";
const DOC_OK_MSG = "পেয়েছি ✓ ডাক্তার দেখার আগে এটি প্রস্তুত থাকবে।";
const DOC_FAIL_MSG = "দুঃখিত, ছবিটি পড়া গেল না। আবার একটি পরিষ্কার ছবি পাঠান, অথবা ক্লিনিকে দেখান।";

export async function processInbound(admin: Admin, inbound: NormalizedInbound, now: Date): Promise<void> {
  const waId = inbound.fromWaId;
  const link = await resolveLinkByWaId(admin, waId);
  const { activeFlow, state } = await readFlow(admin, waId);
  const action = decideRoute(inbound, { bound: !!link, activeFlow });

  let replyText: string | null = null;
  let patientId: string | null = link?.patientId ?? null;
  const touch = action.kind !== "ignore";

  if (action.kind === "onboard") {
    replyText = ONBOARD_MSG;
  } else if (action.kind === "bind") {
    let redeemed: { patientId: string } | null = null;
    try {
      redeemed = await redeemBindCode(admin, waId, action.code, now.toISOString());
    } catch (err) {
      console.error("[wa/process] redeemBindCode error:", err instanceof Error ? err.message : err);
    }
    if (redeemed) {
      patientId = redeemed.patientId;
      replyText = BIND_OK_MSG;
      // The patient opted into the channel by binding — record it for PDPO so
      // proactive follow-ups (Leg D) have an auditable opt-in. Find-or-create:
      // consent_records has no unique constraint, so a re-bind must not pile up rows.
      const { data: existingFollowupConsent } = await admin
        .from("consent_records")
        .select("id")
        .eq("patient_id", patientId)
        .eq("consent_type", "whatsapp_followup")
        .eq("granted", true)
        .is("withdrawn_at", null)
        .limit(1)
        .maybeSingle();
      if (!existingFollowupConsent) {
        const { error: consentErr } = await admin.from("consent_records").insert({
          patient_id: patientId, consent_type: "whatsapp_followup", granted: true, granted_by: "patient", device_info: "whatsapp_bind",
        });
        if (consentErr) console.error("[wa/process] followup consent insert:", consentErr.message);
      }
    } else {
      replyText = BIND_FAIL_MSG;
    }
  } else if (action.kind === "help") {
    replyText = HELP_MSG;
  } else if (action.kind === "revoke") {
    await admin.from("whatsapp_links").update({ revoked: true }).eq("wa_id", waId).eq("revoked", false);
    await writeFlow(admin, waId, "idle", {});
    replyText = REVOKED_MSG;
  } else if (action.kind === "wallet") {
    if (patientId) {
      try {
        const token = await findOrCreateWalletToken(admin, patientId);
        const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
        replyText = `আপনার স্বাস্থ্য রেকর্ড:\n${base}/wallet/${token}`;
      } catch (err) {
        console.error("[wa/process] wallet token error:", err);
        replyText = "দুঃখিত, এই মুহূর্তে রেকর্ড লিঙ্ক তৈরি করা গেল না। পরে চেষ্টা করুন।";
      }
    }
  } else if (action.kind === "triage_start") {
    replyText = await handleTriage(admin, waId, patientId, [{ role: "patient", content: action.symptom }], false, action.symptom);
  } else if (action.kind === "triage_continue") {
    const msgs: TriageMsg[] = [...(state.triageMessages ?? []), { role: "patient", content: action.answer }];
    replyText = await handleTriage(admin, waId, patientId, msgs, false, null);
  } else if (action.kind === "triage_consent_reply") {
    if (action.agreed) {
      const msgs: TriageMsg[] = state.triageMessages ?? (state.pendingSymptom ? [{ role: "patient", content: state.pendingSymptom }] : []);
      replyText = await handleTriage(admin, waId, patientId, msgs, true, null);
    } else {
      await writeFlow(admin, waId, "idle", {});
      replyText = CONSENT_DECLINED_MSG;
    }
  } else if (action.kind === "document_received") {
    if (patientId && action.mediaId) {
      const consentId = await resolveDocConsent(admin, patientId);
      if (consentId) {
        await writeFlow(admin, waId, "awaiting_document_type", { pendingMediaId: action.mediaId, pendingMimeType: action.mimeType });
        replyText = DOC_TYPE_QUESTION;
      } else {
        await writeFlow(admin, waId, "awaiting_document_consent", { pendingMediaId: action.mediaId, pendingMimeType: action.mimeType });
        replyText = DOC_CONSENT_NOTICE;
      }
    } else if (patientId) {
      replyText = DOC_FAIL_MSG; // malformed media (no id) — fail fast
    }
  } else if (action.kind === "document_consent_reply") {
    if (action.agreed && patientId) {
      const cid = await createDocConsent(admin, patientId);
      if (cid) {
        await writeFlow(admin, waId, "awaiting_document_type", state); // keep the stashed media
        replyText = DOC_TYPE_QUESTION;
      } else {
        await writeFlow(admin, waId, "idle", {});
        replyText = DOC_FAIL_MSG;
      }
    } else {
      await writeFlow(admin, waId, "idle", {});
      replyText = CONSENT_DECLINED_MSG;
    }
  } else if (action.kind === "document_type_reply") {
    if (!action.docType) {
      replyText = DOC_TYPE_QUESTION; // unrecognised → re-ask, stay in the state
    } else if (patientId && state.pendingMediaId) {
      const consentId = await resolveDocConsent(admin, patientId);
      const result = consentId
        ? await captureDocument(admin, {
            patientId,
            mediaId: state.pendingMediaId,
            mimeType: state.pendingMimeType ?? "image/jpeg",
            type: action.docType,
            consentId,
          })
        : { ok: false, error: "no consent" };
      await writeFlow(admin, waId, "idle", {});
      replyText = result.ok ? DOC_OK_MSG : DOC_FAIL_MSG;
      if (!result.ok) console.error("[wa/process] document capture failed:", result.error);
    } else {
      await writeFlow(admin, waId, "idle", {});
      replyText = DOC_FAIL_MSG;
    }
  }

  if (touch) {
    await upsertConversation(admin, waId, patientId, nextWindowExpiry(now));
    if (replyText) await sendReply(admin, waId, patientId, replyText, now);
  }

  const { error: doneErr } = await admin
    .from("wa_messages")
    .update({ status: "done", patient_id: patientId })
    .eq("provider_message_id", inbound.providerMessageId);
  if (doneErr) console.error("[wa/process] failed to mark inbound done:", inbound.providerMessageId, doneErr.message);
}

/**
 * Run one triage turn and update the conversation flow. Returns the reply text.
 * - consent_required → ask for consent, stash the symptom, set awaiting state.
 * - ok + question → store the exchange, stay in 'triage'.
 * - ok + answer/urgent → clear back to 'idle' (the runner already persisted).
 */
async function handleTriage(
  admin: Admin,
  waId: string,
  patientId: string | null,
  messages: TriageMsg[],
  consentAccepted: boolean,
  symptomForStash: string | null,
): Promise<string> {
  if (!patientId || messages.length === 0) {
    return "আপনার সমস্যাটা একটু লিখুন।";
  }
  const result = await runTriageTurn(admin, { patientId, walletTokenId: null, messages, consentAccepted, deviceTag: TRIAGE_TAG });

  if (result.state === "consent_required") {
    await writeFlow(admin, waId, "awaiting_triage_consent", { triageMessages: messages, pendingSymptom: symptomForStash ?? messages[0]?.content });
    return CONSENT_NOTICE;
  }
  if (result.state === "error") {
    await writeFlow(admin, waId, "idle", {});
    return "এই মুহূর্তে উত্তর দিতে পারছি না। নিরাপদ থাকতে একজন ডাক্তার দেখান।";
  }

  const outcome = result.outcome;
  if (outcome.mode === "question") {
    await writeFlow(admin, waId, "triage", { triageMessages: [...messages, { role: "glyph", content: outcome.text }] });
  } else {
    await writeFlow(admin, waId, "idle", {});
  }
  return formatOutcome(outcome);
}

async function upsertConversation(admin: Admin, waId: string, patientId: string | null, windowExpiry: Date) {
  await admin
    .from("wa_conversations")
    .upsert({ wa_id: waId, patient_id: patientId, window_expires_at: windowExpiry.toISOString(), updated_at: new Date().toISOString() }, { onConflict: "wa_id" });
}

async function sendReply(admin: Admin, waId: string, patientId: string | null, text: string, now: Date) {
  const { data: convo } = await admin.from("wa_conversations").select("window_expires_at").eq("wa_id", waId).maybeSingle();
  if (!isWindowOpen(convo?.window_expires_at ?? null, now)) {
    await logOutbound(admin, waId, patientId, "failed", null, "window closed (no template path in Leg B)");
    return;
  }
  try {
    const sent = await sendText({ to: waId, body: text });
    await logOutbound(admin, waId, patientId, "sent", sent.messageId, null);
  } catch (err) {
    await logOutbound(admin, waId, patientId, "failed", null, err instanceof Error ? err.message : String(err));
  }
}

async function logOutbound(admin: Admin, waId: string, patientId: string | null, status: string, providerMessageId: string | null, error: string | null) {
  await admin.from("wa_messages").insert({
    provider_message_id: providerMessageId,
    direction: "outbound",
    wa_id: waId,
    patient_id: patientId,
    kind: "text",
    status,
    error,
  });
}
