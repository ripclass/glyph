/** WhatsApp Cloud API inbound payload shapes (subset we consume) + normalized form. */

export type WaKind = "text" | "audio" | "image" | "document" | "location" | "unhandled";

export interface NormalizedInbound {
  channel: "whatsapp";
  providerMessageId: string;
  fromWaId: string;
  fromName?: string;
  receivedAt: Date;
  replyToMessageId?: string;
  kind: WaKind;
  /** Text body (or media caption); "" for media without caption. */
  text: string;
  mediaId?: string;
  mediaMimeType?: string;
  location?: { lat: number; lon: number };
  raw: unknown;
}

export interface WAInboundMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  context?: { id?: string };
  text?: { body: string };
  audio?: { id: string; mime_type: string };
  image?: { id: string; mime_type: string; caption?: string };
  document?: { id: string; mime_type: string; caption?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
}

export interface WAChangeValue {
  messaging_product?: string;
  contacts?: Array<{ wa_id: string; profile: { name: string } }>;
  messages?: WAInboundMessage[];
}

export interface WAWebhookPayload {
  entry?: Array<{ changes?: Array<{ value: WAChangeValue }> }>;
}
