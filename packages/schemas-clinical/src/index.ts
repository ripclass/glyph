/**
 * @kham/schemas-clinical — Zod schemas for Glyph clinical Verifiable Credential
 * payloads (the `credentialSubject.data` of each credential type).
 *
 * Domain content only. The VC envelope, Ed25519 signing, did:web, and
 * canonicalization live in `@kham/identity`. The Glyph issuance seam (M3)
 * composes the two: validate here, then build+sign there.
 */

export * from "./common";
export * from "./physician-registration";
export * from "./visit-note";
export * from "./prescription";
export * from "./lab-result";
export * from "./dispensing-event";
export * from "./discharge-summary";
export * from "./medical-clearance";
export * from "./occupational-health";
export * from "./antenatal-record";
export * from "./specialist-opinion";
export * from "./registry";
