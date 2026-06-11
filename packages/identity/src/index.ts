/**
 * @kham/identity — shared W3C identity envelope.
 *
 * Persistence-agnostic crypto + document core: Ed25519 keys, AES-256-GCM
 * key-at-rest, did:web documents/resolution, JCS canonicalization, Verifiable
 * Credential sign/verify/issue/present. No database, no framework.
 *
 * SERVER-ONLY surface: anything touching private keys — `generateKeyPair`,
 * `generateStoredKeyPair`, `generateEntityIdentity`, `loadPrivateKey`,
 * `signCredential`, `buildAndSignCredential`, and the `encrypt`/`decrypt`
 * helpers — must only run server-side (Next.js route handlers / server actions).
 * `verifyCredential`, `resolveDidWeb`, `buildDIDDocument`, `canonicalize`, and
 * the public-key helpers are safe anywhere.
 */

export * from "./types";

// crypto
export { ed } from "./crypto/ed";
export { sha256, sha256Hex } from "./crypto/hash";
export {
  encryptBytes,
  decryptBytes,
  encryptString,
  decryptString,
  type EncryptedPayload,
} from "./crypto/encrypt";
export {
  generateKeyPair,
  generateStoredKeyPair,
  loadPrivateKey,
  publicKeyToJwk,
  jwkToPublicKey,
  publicKeyToHex,
  hexToPublicKey,
  type KeyPair,
  type StoredKeyPair,
} from "./crypto/keys";

// credentials
export * from "./credentials/types";
export { canonicalize } from "./credentials/canonicalize";
export { signCredential } from "./credentials/sign";
export { verifyCredential, type VerifyOptions } from "./credentials/verify";
export {
  buildAndSignCredential,
  type BuildCredentialInput,
  type BuildCredentialResult,
} from "./credentials/issue";
export { buildPresentation } from "./credentials/present";

// did
export { buildDIDDocument, type BuildDIDDocumentInput } from "./did/document";
export { resolveDidWeb } from "./did/resolve";
export {
  buildDid,
  generateEntityIdentity,
  type NewEntityIdentity,
} from "./did/generate";
