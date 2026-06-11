import type { DIDDocument } from "../types";

/**
 * Resolve any did:web DID to its DID Document by fetching the canonical URL.
 *
 * did:web:example.com            → https://example.com/.well-known/did.json
 * did:web:example.com:user:alice → https://example.com/user/alice/did.json
 *
 * Colons in the DID path are converted to URL slashes.
 */
export async function resolveDidWeb(did: string): Promise<DIDDocument> {
  if (!did.startsWith("did:web:")) {
    throw new Error(`Unsupported DID method: ${did}`);
  }

  const parts = did.slice("did:web:".length).split(":").map(decodeURIComponent);
  const host = parts[0];
  const path = parts.slice(1);

  const url =
    path.length === 0
      ? `https://${host}/.well-known/did.json`
      : `https://${host}/${path.join("/")}/did.json`;

  const res = await fetch(url, {
    headers: { Accept: "application/did+json, application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to resolve ${did}: HTTP ${res.status} from ${url}`);
  }

  const doc = (await res.json()) as DIDDocument;

  if (doc.id !== did) {
    throw new Error(`DID Document id mismatch: expected ${did}, got ${doc.id}`);
  }
  return doc;
}
