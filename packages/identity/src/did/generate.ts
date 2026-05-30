import { generateStoredKeyPair, type StoredKeyPair } from "../crypto/keys";
import { buildDIDDocument } from "./document";
import type { DIDDocument } from "../types";

export interface NewEntityIdentity extends StoredKeyPair {
  did: string;
  didDocument: DIDDocument;
}

/**
 * Build the canonical did:web identifier for a given app host + slug.
 *
 * The resolver endpoint for this DID is:
 *   https://<host>/.well-known/did/<slug>/did.json
 */
export function buildDid(host: string, slug: string): string {
  const hostPart = host.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `did:web:${hostPart}:.well-known:did:${slug}`;
}

/**
 * Generate a fresh entity identity: keypair (private key encrypted at rest via
 * CREDENTIAL_ENCRYPTION_KEY), did:web identifier, and published DID Document.
 * Server-only by nature — guard at the application boundary.
 */
export async function generateEntityIdentity(
  host: string,
  slug: string,
): Promise<NewEntityIdentity> {
  const did = buildDid(host, slug);
  const stored = await generateStoredKeyPair(`${did}#keys-1`);
  const didDocument = buildDIDDocument({
    did,
    publicKeyJwk: stored.publicKeyJwk,
  });
  return { did, didDocument, ...stored };
}
