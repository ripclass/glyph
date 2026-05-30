import { ed } from "../crypto/ed";

import { canonicalize } from "./canonicalize";
import { jwkToPublicKey } from "../crypto/keys";
import { resolveDidWeb } from "../did/resolve";
import type { VerifiableCredential, VerificationResult } from "./types";
import type { DIDDocument, PublicKeyJwk, TrustLevel } from "../types";

function base64Decode(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, "base64"));
}

function extractIssuerDid(issuer: VerifiableCredential["issuer"]): string {
  return typeof issuer === "string" ? issuer : issuer.id;
}

function findVerificationMethod(
  doc: DIDDocument,
  vmId: string,
): PublicKeyJwk | null {
  const entry = doc.verificationMethod.find((vm) => vm.id === vmId);
  return entry?.publicKeyJwk ?? null;
}

export interface VerifyOptions {
  /**
   * Optional override: resolve the issuer DID document yourself (e.g. from the
   * local database) instead of fetching it over HTTPS. This is the local
   * fast-path that keeps internal verification fast and free.
   */
  resolveIssuer?: (did: string) => Promise<DIDDocument | null>;
  now?: Date;
}

export async function verifyCredential(
  vc: VerifiableCredential,
  options: VerifyOptions = {},
): Promise<VerificationResult> {
  const issuerDid = extractIssuerDid(vc.issuer);
  const subjectDid = vc.credentialSubject.id;
  const now = options.now ?? new Date();

  const baseResult = {
    issuerDid,
    subjectDid,
    validFrom: vc.validFrom,
    validUntil: vc.validUntil,
    signedBy: vc.proof?.verificationMethod ?? "",
  };

  if (!vc.proof) {
    return {
      ...baseResult,
      valid: false,
      status: "signature_invalid",
      trustLevel: "self_declared",
      error: "Missing proof block",
    };
  }

  // 1. Resolve issuer DID Document.
  let didDoc: DIDDocument | null = null;
  try {
    if (options.resolveIssuer) {
      didDoc = await options.resolveIssuer(issuerDid);
    }
    if (!didDoc) {
      didDoc = await resolveDidWeb(issuerDid);
    }
  } catch (err) {
    return {
      ...baseResult,
      valid: false,
      status: "issuer_unknown",
      trustLevel: "self_declared",
      error: err instanceof Error ? err.message : "DID resolution failed",
    };
  }

  // 2. Locate the verification method referenced in the proof.
  const publicKeyJwk = findVerificationMethod(didDoc, vc.proof.verificationMethod);
  if (!publicKeyJwk) {
    return {
      ...baseResult,
      valid: false,
      status: "issuer_unknown",
      trustLevel: "self_declared",
      error: `Verification method ${vc.proof.verificationMethod} not present in issuer DID Document`,
    };
  }
  const publicKey = jwkToPublicKey(publicKeyJwk);

  // 3. Rebuild canonical payload and verify the signature.
  const { proof, ...payload } = vc;
  const canonical = canonicalize(payload);
  const signature = base64Decode(proof.proofValue);
  let sigValid = false;
  try {
    sigValid = await ed.verifyAsync(
      signature,
      new TextEncoder().encode(canonical),
      publicKey,
    );
  } catch (err) {
    return {
      ...baseResult,
      valid: false,
      status: "signature_invalid",
      trustLevel: "self_declared",
      error: err instanceof Error ? err.message : "Signature verification failed",
    };
  }
  if (!sigValid) {
    return {
      ...baseResult,
      valid: false,
      status: "signature_invalid",
      trustLevel: "self_declared",
    };
  }

  // 4. Check temporal validity.
  const validFromDate = new Date(vc.validFrom);
  if (validFromDate > now) {
    return {
      ...baseResult,
      valid: false,
      status: "error",
      trustLevel: "self_declared",
      error: "validFrom is in the future",
    };
  }
  if (vc.validUntil) {
    const validUntilDate = new Date(vc.validUntil);
    if (validUntilDate < now) {
      return {
        ...baseResult,
        valid: false,
        status: "expired",
        trustLevel: "expired",
      };
    }
  }

  const trustLevel: TrustLevel = "issuer_verified";
  return {
    ...baseResult,
    valid: true,
    status: "valid",
    trustLevel,
  };
}
