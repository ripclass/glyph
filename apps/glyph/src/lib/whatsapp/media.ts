import { getProvider } from "./provider";

export interface MediaDownload {
  bytes: Uint8Array;
  mimeType: string;
}

/**
 * Download an inbound WhatsApp media object by id. Two hops: GET the metadata
 * (a short-lived signed url) then GET the file. Both need the provider's
 * download headers (360dialog: D360-API-KEY; Meta: Bearer).
 */
export async function downloadMedia(mediaId: string): Promise<MediaDownload> {
  const provider = getProvider();
  const headers = provider.mediaDownloadHeaders();
  const meta = await fetch(provider.mediaMetadataUrl(mediaId), { headers });
  if (!meta.ok) throw new Error(`WA media metadata failed for ${mediaId}: ${meta.status} ${meta.statusText}`);
  const metaJson = (await meta.json()) as { url?: string; mime_type?: string };
  if (!metaJson.url) throw new Error(`WA media metadata missing url for ${mediaId}`);

  const fileRes = await fetch(metaJson.url, { headers });
  if (!fileRes.ok) throw new Error(`WA media download failed: ${fileRes.status} ${fileRes.statusText}`);
  const bytes = new Uint8Array(await fileRes.arrayBuffer());
  return { bytes, mimeType: metaJson.mime_type ?? fileRes.headers.get("content-type") ?? "application/octet-stream" };
}
