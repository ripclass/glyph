/**
 * Base identity types — extracted out of EIN's `lib/supabase/types.ts` so the
 * envelope carries its own types and is not entangled with any app's database
 * schema. Domain-agnostic on purpose: `credentialType` is a free string here;
 * the clinical domain narrows it in `@kham/schemas-clinical`.
 */

export type TrustLevel =
  | "issuer_verified"
  | "platform_verified"
  | "self_declared"
  | "expired"
  | "revoked";

export interface PublicKeyJwk {
  kty: "OKP";
  crv: "Ed25519";
  x: string;
  kid?: string;
  use?: "sig";
  alg?: "EdDSA";
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyJwk: PublicKeyJwk;
}

export interface DIDDocument {
  "@context": (string | Record<string, unknown>)[];
  id: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  assertionMethod: string[];
  service?: Array<{ id: string; type: string; serviceEndpoint: string }>;
}
