import type { DIDDocument, PublicKeyJwk } from "../types";

/**
 * Build a W3C DID Document for a did:web identifier.
 *
 * For this network every entity is served at
 *   https://<host>/.well-known/did/<slug>/did.json
 * and therefore its DID is
 *   did:web:<host>:.well-known:did:<slug>
 *
 * See https://w3c-ccg.github.io/did-method-web/
 */
export interface BuildDIDDocumentInput {
  did: string;
  publicKeyJwk: PublicKeyJwk;
  serviceEndpoints?: Array<{ id: string; type: string; serviceEndpoint: string }>;
}

export function buildDIDDocument({
  did,
  publicKeyJwk,
  serviceEndpoints,
}: BuildDIDDocumentInput): DIDDocument {
  const vmId = `${did}#keys-1`;

  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
    ],
    id: did,
    verificationMethod: [
      {
        id: vmId,
        type: "JsonWebKey2020",
        controller: did,
        publicKeyJwk: { ...publicKeyJwk, kid: vmId },
      },
    ],
    authentication: [vmId],
    assertionMethod: [vmId],
    ...(serviceEndpoints && serviceEndpoints.length > 0
      ? { service: serviceEndpoints }
      : {}),
  };
}
