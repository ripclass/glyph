import type { NormalizedInbound, WAChangeValue, WAInboundMessage, WAWebhookPayload } from "./types";

/** Walk a webhook payload, yielding one NormalizedInbound per inbound message. */
export function* extractInbound(payload: WAWebhookPayload): Generator<NormalizedInbound> {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value.messages ?? []) {
        yield normalise(message, change.value);
      }
    }
  }
}

function normalise(message: WAInboundMessage, value: WAChangeValue): NormalizedInbound {
  const contact = (value.contacts ?? []).find((c) => c.wa_id === message.from);
  const base = {
    channel: "whatsapp" as const,
    providerMessageId: message.id,
    fromWaId: message.from,
    fromName: contact?.profile.name,
    receivedAt: new Date(Number(message.timestamp) * 1000),
    replyToMessageId: message.context?.id,
    raw: message,
  };
  if (message.type === "text" && message.text) {
    return { ...base, kind: "text", text: message.text.body };
  }
  if (message.type === "audio" && message.audio) {
    return { ...base, kind: "audio", text: "", mediaId: message.audio.id, mediaMimeType: message.audio.mime_type };
  }
  if (message.type === "image" && message.image) {
    return { ...base, kind: "image", text: message.image.caption ?? "", mediaId: message.image.id, mediaMimeType: message.image.mime_type };
  }
  if (message.type === "document" && message.document) {
    return { ...base, kind: "document", text: message.document.caption ?? "", mediaId: message.document.id, mediaMimeType: message.document.mime_type };
  }
  return { ...base, kind: "unhandled", text: "" };
}
