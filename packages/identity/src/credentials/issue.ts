import { randomUUID } from "node:crypto";

import { signCredential } from "./sign";
import type { VerifiableCredential } from "./types";

/**
 * Build + Ed25519-sign a Verifiable Credential. Persistence-free and
 * domain-agnostic: callers (e.g. Glyph's `issueCredential` seam) supply the
 * already-validated `data` and the signing key. Schema validation lives in the
 * domain package (`@kham/schemas-clinical`), not here.
 */
export interface BuildCredentialInput<TData = Record<string, unknown>> {
  issuerDid: string;
  issuerName?: string;
  verificationMethod: string;
  privateKey: Uint8Array;
  subjectDid: string;
  credentialType: string;
  credentialName: string;
  data: TData;
  /** Extra `type` entries beyond `VerifiableCredential` (e.g. `PrescriptionCredential`). */
  extraTypes?: string[];
  /** Extra `@context` URIs beyond the VC 2.0 base context. */
  extraContexts?: string[];
  id?: string;
  validFrom?: string;
  validUntil?: string;
  now?: Date;
}

export interface BuildCredentialResult {
  credentialId: string;
  vc: VerifiableCredential;
}

export async function buildAndSignCredential<TData = Record<string, unknown>>(
  input: BuildCredentialInput<TData>,
): Promise<BuildCredentialResult> {
  const now = input.now ?? new Date();
  const credentialId = input.id ?? `urn:uuid:${randomUUID()}`;
  const validFrom = input.validFrom ?? now.toISOString();

  const vc: VerifiableCredential = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      ...(input.extraContexts ?? []),
    ],
    id: credentialId,
    type: ["VerifiableCredential", ...(input.extraTypes ?? [])],
    issuer: input.issuerName
      ? { id: input.issuerDid, name: input.issuerName }
      : input.issuerDid,
    validFrom,
    ...(input.validUntil ? { validUntil: input.validUntil } : {}),
    credentialSubject: {
      id: input.subjectDid,
      credentialType: input.credentialType,
      credentialName: input.credentialName,
      data: input.data as Record<string, unknown>,
    },
  };

  const signed = await signCredential(
    vc,
    input.privateKey,
    input.verificationMethod,
    now,
  );
  return { credentialId, vc: signed };
}
