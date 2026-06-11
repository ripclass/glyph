import type { VerifiableCredential, VerifiablePresentation } from "./types";

/**
 * Assemble an unsigned Verifiable Presentation from a holder's selected VCs.
 * Signing a VP requires the holder's private key — that is the caller's job.
 */
export function buildPresentation(
  holderDid: string,
  credentials: VerifiableCredential[],
  extraContexts: string[] = [],
): VerifiablePresentation {
  return {
    "@context": ["https://www.w3.org/ns/credentials/v2", ...extraContexts],
    type: ["VerifiablePresentation"],
    holder: holderDid,
    verifiableCredential: credentials,
  };
}
