import { ed } from "./ed";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

import type { PublicKeyJwk } from "../types";
import { encryptBytes, decryptBytes, type EncryptedPayload } from "./encrypt";

export interface KeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

export interface StoredKeyPair {
  publicKeyJwk: PublicKeyJwk;
  encryptedPrivateKey: string;
  keyNonce: string;
}

function base64urlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return new Uint8Array(Buffer.from(b64, "base64"));
}

export async function generateKeyPair(): Promise<KeyPair> {
  const privateKey = ed.utils.randomSecretKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKey };
}

export function publicKeyToJwk(publicKey: Uint8Array, kid?: string): PublicKeyJwk {
  return {
    kty: "OKP",
    crv: "Ed25519",
    x: base64urlEncode(publicKey),
    alg: "EdDSA",
    use: "sig",
    ...(kid ? { kid } : {}),
  };
}

export function jwkToPublicKey(jwk: PublicKeyJwk): Uint8Array {
  if (jwk.kty !== "OKP" || jwk.crv !== "Ed25519") {
    throw new Error(
      `Unsupported JWK: kty=${jwk.kty} crv=${jwk.crv}; expected OKP/Ed25519`,
    );
  }
  return base64urlDecode(jwk.x);
}

export function publicKeyToHex(publicKey: Uint8Array): string {
  return bytesToHex(publicKey);
}

export function hexToPublicKey(hex: string): Uint8Array {
  return hexToBytes(hex);
}

/**
 * Generate a fresh Ed25519 keypair, encrypt the private key with the master
 * AES-256-GCM key, and return storage-ready values.
 */
export async function generateStoredKeyPair(
  kid?: string,
): Promise<StoredKeyPair> {
  const { privateKey, publicKey } = await generateKeyPair();
  const { ciphertext, nonce } = await encryptBytes(privateKey);
  return {
    publicKeyJwk: publicKeyToJwk(publicKey, kid),
    encryptedPrivateKey: ciphertext,
    keyNonce: nonce,
  };
}

export async function loadPrivateKey(
  encrypted: EncryptedPayload,
): Promise<Uint8Array> {
  return decryptBytes(encrypted);
}
