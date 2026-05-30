import { sha256 as nobleSha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

const encoder = new TextEncoder();

export function sha256(input: string | Uint8Array): Uint8Array {
  return nobleSha256(typeof input === "string" ? encoder.encode(input) : input);
}

export function sha256Hex(input: string | Uint8Array): string {
  return bytesToHex(sha256(input));
}
