/**
 * WhatsApp Cloud API provider config. 360dialog (BSP) and Meta share the same
 * payload + webhook signature scheme; only base URL + auth header differ.
 * Leg A needs the messages base URL, auth headers, and the webhook secret.
 */
export interface ProviderConfig {
  messageBaseUrl(): string;
  authHeaders(): Record<string, string>;
  webhookSecret(): string | undefined;
  /** Metadata URL for a media id (returns a JSON envelope with a signed url). */
  mediaMetadataUrl(mediaId: string): string;
  /** Headers to download the signed media url (Meta: Bearer; 360dialog: D360 key). */
  mediaDownloadHeaders(): Record<string, string>;
}

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export function getProvider(): ProviderConfig {
  if (process.env.WHATSAPP_PROVIDER === "meta") {
    const apiBase = `${process.env.META_API_BASE ?? "https://graph.facebook.com"}/${process.env.META_GRAPH_VERSION ?? "v19.0"}`;
    return {
      messageBaseUrl: () => `${apiBase}/${req("META_PHONE_NUMBER_ID")}`,
      authHeaders: () => ({ Authorization: `Bearer ${req("META_ACCESS_TOKEN")}` }),
      webhookSecret: () => process.env.META_APP_SECRET,
      mediaMetadataUrl: (mediaId) => `${apiBase}/${mediaId}`,
      mediaDownloadHeaders: () => ({ Authorization: `Bearer ${req("META_ACCESS_TOKEN")}` }),
    };
  }
  // default: 360dialog
  return {
    messageBaseUrl: () => process.env.DIALOG360_API_BASE ?? "https://waba-v2.360dialog.io",
    authHeaders: () => ({ "D360-API-KEY": req("DIALOG360_API_KEY") }),
    webhookSecret: () => process.env.DIALOG360_WEBHOOK_SECRET,
    mediaMetadataUrl: (mediaId) => `${process.env.DIALOG360_API_BASE ?? "https://waba-v2.360dialog.io"}/${mediaId}`,
    mediaDownloadHeaders: () => ({ "D360-API-KEY": req("DIALOG360_API_KEY") }),
  };
}
