import { ed } from "../crypto/ed";

import { canonicalize } from "./canonicalize";
import type { VerifiableCredential, VCProof } from "./types";

/**
 * Sign a Verifiable Credential with an Ed25519 private key.
 *
 * The signature is computed over the UTF-8 bytes of the JCS-canonicalized VC
 * document with `proof` removed. The result is a base64-encoded proofValue
 * attached as an `Ed25519Signature2020` proof block.
 */
export async function signCredential(
  vc: VerifiableCredential,
  privateKey: Uint8Array,
  verificationMethod: string,
  now: Date = new Date(),
): Promise<VerifiableCredential> {
  const { proof: _discardExisting, ...payload } = vc;
  void _discardExisting;
  const canonical = canonicalize(payload);
  const signature = await ed.signAsync(
    new TextEncoder().encode(canonical),
    privateKey,
  );
  const proof: VCProof = {
    type: "Ed25519Signature2020",
    created: now.toISOString(),
    verificationMethod,
    proofPurpose: "assertionMethod",
    proofValue: Buffer.from(signature).toString("base64"),
  };
  return { ...payload, proof };
}
