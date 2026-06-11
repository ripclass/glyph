/**
 * Trust-root CI gate for @kham/identity.
 *
 * These are the five checks the Glyph audit ran against EIN's code, ported to
 * the lifted package + an AES-at-rest check. The package MUST NOT ship if any
 * fail — a verify that wrongly returns `true` is worse than no verify.
 */
import { beforeAll, describe, expect, it } from "vitest";

import {
  generateKeyPair,
  publicKeyToJwk,
  buildDIDDocument,
  signCredential,
  verifyCredential,
  buildAndSignCredential,
  canonicalize,
  resolveDidWeb,
  encryptString,
  decryptString,
  type DIDDocument,
  type VerifiableCredential,
} from "../src/index";

// Deterministic 32-byte master key for the AES-at-rest check.
process.env.CREDENTIAL_ENCRYPTION_KEY =
  process.env.CREDENTIAL_ENCRYPTION_KEY ??
  Buffer.from("0123456789abcdef0123456789abcdef").toString("base64");

const ISSUER_DID = "did:web:glyph.health:.well-known:did:doctor-abc";
const SUBJECT_DID = "did:web:glyph.health:.well-known:did:patient-xyz";
const VM_ID = `${ISSUER_DID}#keys-1`;

let privateKey: Uint8Array;
let didDoc: DIDDocument;
const localResolver = async (d: string) => (d === ISSUER_DID ? didDoc : null);

function buildVC(
  overrides: Partial<VerifiableCredential> = {},
): VerifiableCredential {
  return {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    id: "urn:uuid:0000-test",
    type: ["VerifiableCredential", "PrescriptionCredential"],
    issuer: ISSUER_DID,
    validFrom: new Date(Date.now() - 60_000).toISOString(),
    credentialSubject: {
      id: SUBJECT_DID,
      credentialType: "prescription",
      credentialName: "Tab. Napa 500mg 1+0+1",
      data: { drug: "Paracetamol", dose: "500mg", schedule: "1+0+1" },
    },
    ...overrides,
  } as VerifiableCredential;
}

beforeAll(async () => {
  const kp = await generateKeyPair();
  privateKey = kp.privateKey;
  didDoc = buildDIDDocument({
    did: ISSUER_DID,
    publicKeyJwk: publicKeyToJwk(kp.publicKey, VM_ID),
  });
});

describe("trust root", () => {
  it("1. signs and verifies a credential round-trip", async () => {
    const signed = await signCredential(buildVC(), privateKey, VM_ID);
    const r = await verifyCredential(signed, { resolveIssuer: localResolver });
    expect(r.valid).toBe(true);
    expect(r.status).toBe("valid");
    expect(r.trustLevel).toBe("issuer_verified");
  });

  it("2. rejects a tampered payload (verify must NOT return true)", async () => {
    const signed = await signCredential(buildVC(), privateKey, VM_ID);
    (signed.credentialSubject.data as Record<string, unknown>).dose = "5000mg";
    const r = await verifyCredential(signed, { resolveIssuer: localResolver });
    expect(r.valid).toBe(false);
    expect(r.status).toBe("signature_invalid");
  });

  it("3. flags an expired credential", async () => {
    const expired = buildVC({
      validFrom: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      validUntil: new Date(Date.now() - 86_400_000).toISOString(),
    });
    const signed = await signCredential(expired, privateKey, VM_ID);
    const r = await verifyCredential(signed, { resolveIssuer: localResolver });
    expect(r.valid).toBe(false);
    expect(r.status).toBe("expired");
    expect(r.trustLevel).toBe("expired");
  });

  it("4. resolves did:web and verifies through the real resolver", async () => {
    const expectedUrl =
      "https://glyph.health/.well-known/did/doctor-abc/did.json";
    let requestedUrl = "";
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (url: unknown) => {
      requestedUrl = String(url);
      return new Response(JSON.stringify(didDoc), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;
    try {
      const resolved = await resolveDidWeb(ISSUER_DID);
      const signed = await signCredential(buildVC(), privateKey, VM_ID);
      const r = await verifyCredential(signed); // no override → real did:web path
      expect(requestedUrl).toBe(expectedUrl);
      expect(resolved.id).toBe(ISSUER_DID);
      expect(r.valid).toBe(true);
      expect(r.status).toBe("valid");
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("5. canonicalizes deterministically and independent of key order", () => {
    const a = { b: 1, a: 2, nested: { z: 1, y: [3, 2, 1] } };
    const b = { nested: { y: [3, 2, 1], z: 1 }, a: 2, b: 1 };
    const expected = '{"a":2,"b":1,"nested":{"y":[3,2,1],"z":1}}';
    expect(canonicalize(a)).toBe(canonicalize(b));
    expect(canonicalize(a)).toBe(expected);
    expect(canonicalize(a)).toBe(canonicalize(a));
  });

  it("6. round-trips AES-256-GCM private-key-at-rest", async () => {
    const secret = "ed25519-private-key-material-bytes";
    const enc = await encryptString(secret);
    expect(enc.ciphertext).not.toBe(secret);
    expect(enc.nonce.length).toBeGreaterThan(0);
    expect(await decryptString(enc)).toBe(secret);
  });

  it("7. builds + signs a credential via the issuance helper", async () => {
    const { credentialId, vc } = await buildAndSignCredential({
      issuerDid: ISSUER_DID,
      verificationMethod: VM_ID,
      privateKey,
      subjectDid: SUBJECT_DID,
      credentialType: "prescription",
      credentialName: "Tab. Napa 500mg 1+0+1",
      extraTypes: ["PrescriptionCredential"],
      data: { drug: "Paracetamol", dose: "500mg", schedule: "1+0+1" },
    });
    expect(credentialId).toMatch(/^urn:uuid:/);
    const r = await verifyCredential(vc, { resolveIssuer: localResolver });
    expect(r.valid).toBe(true);
  });
});
