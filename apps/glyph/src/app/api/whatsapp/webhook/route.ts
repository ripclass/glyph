/**
 * WhatsApp inbound webhook.
 *   GET  — Meta/360dialog verification challenge.
 *   POST — verify signature → dedupe (unique provider_message_id) → persist
 *          inbound 'received' → process inline → 200.
 * Processing is inline (Next 14.2 has no stable `after`); it is fast and
 * idempotent, and the sweeper cron retries anything left in 'received' after a
 * crash. Redeliveries are deduped on provider_message_id.
 */
import { NextResponse } from "next/server";
import type { Json } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyChallenge, verifySignature } from "@/lib/whatsapp/verify";
import { extractInbound } from "@/lib/whatsapp/parse";
import { processInbound } from "@/lib/whatsapp/process";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const result = verifyChallenge(new URL(req.url));
  if (!result.ok) return new NextResponse(result.reason, { status: 403 });
  return new NextResponse(result.challenge, { status: 200 });
}

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = verifySignature(raw, req.headers.get("x-hub-signature-256"));
  if (sig.ok === false) {
    console.warn("[wa/webhook] signature rejected:", sig.reason);
    return new NextResponse("forbidden", { status: 401 });
  }
  if (sig.ok === "skipped") console.warn("[wa/webhook]", sig.reason);

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }

  const admin = createAdminClient();
  for (const msg of extractInbound(payload as Parameters<typeof extractInbound>[0])) {
    // Dedupe: unique provider_message_id. On conflict this is a redelivery — skip.
    const { error } = await admin.from("wa_messages").insert({
      provider_message_id: msg.providerMessageId,
      direction: "inbound",
      wa_id: msg.fromWaId,
      kind: msg.kind,
      status: "received",
      payload: msg.raw as unknown as Json,
    });
    if (error) {
      // 23505 = unique_violation = a redelivery of an already-seen message
      // (skip silently). Anything else is a real failure with no 'received'
      // row for the sweeper to retry — log it loudly.
      if (error.code !== "23505") {
        console.error("[wa/webhook] inbound insert failed (non-conflict):", msg.providerMessageId, error.message);
      }
      continue;
    }
    try {
      await processInbound(admin, msg, new Date());
    } catch (err) {
      console.error("[wa/webhook] process failed:", msg.providerMessageId, err);
      await admin.from("wa_messages").update({ status: "failed", error: String(err) }).eq("provider_message_id", msg.providerMessageId);
    }
  }

  return new NextResponse("ok", { status: 200 });
}
