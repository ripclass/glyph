import { getProvider } from "./provider";

export interface SendResult {
  messageId: string;
  raw: unknown;
}

export interface SendTextOptions {
  /** E.164 without '+', matches WA wa_id, e.g. '8801XXXXXXXXX'. */
  to: string;
  body: string;
  replyToMessageId?: string;
  previewUrl?: boolean;
}

async function postMessage(payload: Record<string, unknown>): Promise<SendResult> {
  const provider = getProvider();
  const res = await fetch(`${provider.messageBaseUrl()}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...provider.authHeaders() },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable>");
    throw new Error(`WA send failed: ${res.status} ${res.statusText} — ${body}`);
  }
  const json = (await res.json()) as { messages?: { id: string }[] };
  const messageId = json.messages?.[0]?.id;
  if (!messageId) throw new Error(`WA send returned no message ID: ${JSON.stringify(json)}`);
  return { messageId, raw: json };
}

export async function sendText(opts: SendTextOptions): Promise<SendResult> {
  return postMessage({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: opts.to,
    type: "text",
    text: { body: opts.body, ...(opts.previewUrl !== undefined ? { preview_url: opts.previewUrl } : {}) },
    ...(opts.replyToMessageId ? { context: { message_id: opts.replyToMessageId } } : {}),
  });
}

export interface SendTemplateOptions {
  to: string;
  name: string;
  languageCode: string;
  /** Ordered body params for {{1}},{{2}},... */
  bodyParams?: string[];
}

export async function sendTemplate(opts: SendTemplateOptions): Promise<SendResult> {
  const components = opts.bodyParams && opts.bodyParams.length
    ? [{ type: "body", parameters: opts.bodyParams.map((t) => ({ type: "text", text: t })) }]
    : [];
  return postMessage({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: opts.to,
    type: "template",
    template: { name: opts.name, language: { code: opts.languageCode }, ...(components.length ? { components } : {}) },
  });
}
