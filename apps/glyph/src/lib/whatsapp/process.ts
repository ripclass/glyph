import { createAdminClient } from "@/lib/supabase/admin";
import type { NormalizedInbound } from "./types";
import { decideRoute } from "./router";
import { resolveLinkByWaId, redeemBindCode } from "./binding";
import { sendText } from "./send";
import { isWindowOpen, nextWindowExpiry } from "./window";

type Admin = ReturnType<typeof createAdminClient>;

const ONBOARD_MSG =
  "আসসালামু আলাইকুম। এটি Glyph। আপনার রেকর্ড দেখতে ক্লিনিক থেকে পাওয়া কোডটি এখানে পাঠান। " +
  "কোড না থাকলে আপনার ডাক্তারের কাছে চান।";
const BIND_OK_MSG =
  "ধন্যবাদ — আপনার নম্বর যুক্ত হয়েছে। এখন থেকে এখানেই আপনার তথ্য পাবেন।";
const BIND_FAIL_MSG =
  "কোডটি কাজ করছে না বা মেয়াদ শেষ। ক্লিনিক থেকে নতুন কোড নিন।";

/**
 * Process one inbound message end to end. Idempotency is the caller's job (the
 * webhook dedupes by provider_message_id before calling this).
 */
export async function processInbound(admin: Admin, inbound: NormalizedInbound, now: Date): Promise<void> {
  const link = await resolveLinkByWaId(admin, inbound.fromWaId);
  const action = decideRoute(inbound, { bound: !!link });

  let replyText: string | null = null;
  let patientId: string | null = link?.patientId ?? null;

  if (action.kind === "ignore") {
    // no reply
  } else if (action.kind === "onboard") {
    replyText = ONBOARD_MSG;
  } else if (action.kind === "bind") {
    let redeemed: { patientId: string } | null = null;
    try {
      redeemed = await redeemBindCode(admin, inbound.fromWaId, action.code, now.toISOString());
    } catch (err) {
      console.error("[wa/process] redeemBindCode error:", err instanceof Error ? err.message : err);
    }
    if (redeemed) {
      patientId = redeemed.patientId;
      replyText = BIND_OK_MSG;
    } else {
      replyText = BIND_FAIL_MSG;
    }
  } else if (action.kind === "reply") {
    replyText = `Glyph (Leg A echo): ${action.text}`;
  }

  if (action.kind !== "ignore") {
    // Inbound refreshes the 24h window.
    await upsertConversation(admin, inbound.fromWaId, patientId, nextWindowExpiry(now));
    if (replyText) {
      await sendReply(admin, inbound.fromWaId, patientId, replyText, now);
    }
  }

  // Always mark the inbound row done (the webhook inserted it as 'received'),
  // so the sweeper does not retry it. Surface a failure rather than swallow it.
  const { error: doneErr } = await admin
    .from("wa_messages")
    .update({ status: "done", patient_id: patientId })
    .eq("provider_message_id", inbound.providerMessageId);
  if (doneErr) {
    console.error("[wa/process] failed to mark inbound done:", inbound.providerMessageId, doneErr.message);
  }
}

async function upsertConversation(admin: Admin, waId: string, patientId: string | null, windowExpiry: Date) {
  await admin
    .from("wa_conversations")
    .upsert(
      { wa_id: waId, patient_id: patientId, window_expires_at: windowExpiry.toISOString(), updated_at: new Date().toISOString() },
      { onConflict: "wa_id" },
    );
}

/**
 * The single send chokepoint. Leg A only sends inside an open window (every
 * reply here is a direct response to an inbound, so the window is always open).
 * Leg D adds the template path for closed-window proactive sends.
 */
async function sendReply(admin: Admin, waId: string, patientId: string | null, text: string, now: Date) {
  const { data: convo } = await admin
    .from("wa_conversations")
    .select("window_expires_at")
    .eq("wa_id", waId)
    .maybeSingle();
  if (!isWindowOpen(convo?.window_expires_at ?? null, now)) {
    // Should never happen in Leg A (we just refreshed it); guard anyway.
    await logOutbound(admin, waId, patientId, "text", "failed", null, "window closed (no template path in Leg A)");
    return;
  }
  try {
    const sent = await sendText({ to: waId, body: text });
    await logOutbound(admin, waId, patientId, "text", "sent", sent.messageId, null);
  } catch (err) {
    await logOutbound(admin, waId, patientId, "text", "failed", null, err instanceof Error ? err.message : String(err));
  }
}

async function logOutbound(
  admin: Admin,
  waId: string,
  patientId: string | null,
  kind: string,
  status: string,
  providerMessageId: string | null,
  error: string | null,
) {
  await admin.from("wa_messages").insert({
    provider_message_id: providerMessageId,
    direction: "outbound",
    wa_id: waId,
    patient_id: patientId,
    kind,
    status,
    error,
  });
}
