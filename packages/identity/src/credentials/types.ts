import type { TrustLevel } from "../types";

/**
 * W3C Verifiable Credentials Data Model 2.0
 * https://www.w3.org/TR/vc-data-model-2.0/
 *
 * `credentialType` is a free string at the envelope level — the clinical domain
 * narrows it via `@kham/schemas-clinical`.
 */

export interface VCProof {
  type: "Ed25519Signature2020";
  created: string;
  verificationMethod: string;
  proofPurpose: "assertionMethod";
  proofValue: string; // base64 signature over canonicalized VC (minus proof)
}

export interface VerifiableCredential<TData = Record<string, unknown>> {
  "@context": (string | Record<string, unknown>)[];
  id: string;
  type: string[];
  issuer: string | { id: string; name?: string };
  validFrom: string;
  validUntil?: string;
  credentialSubject: {
    id: string;
    credentialType: string;
    credentialName: string;
    data: TData;
  };
  credentialStatus?: {
    id: string;
    type: "StatusList2021Entry" | "EnsoRevocation";
    statusPurpose: "revocation";
  };
  proof?: VCProof;
}

export interface VerifiablePresentation {
  "@context": (string | Record<string, unknown>)[];
  type: ["VerifiablePresentation", ...string[]];
  holder: string;
  verifiableCredential: VerifiableCredential[];
  proof?: VCProof;
}

export interface VerificationResult {
  valid: boolean;
  status:
    | "valid"
    | "expired"
    | "revoked"
    | "signature_invalid"
    | "issuer_unknown"
    | "error";
  trustLevel: TrustLevel;
  issuerDid: string;
  subjectDid: string;
  validFrom: string;
  validUntil?: string;
  signedBy: string;
  error?: string;
}
