/**
 * AES-256-GCM encryption for private-key-at-rest.
 *
 * The master key comes from `CREDENTIAL_ENCRYPTION_KEY` as base64-encoded
 * 32 bytes. Each encryption uses a fresh 96-bit random IV.
 *
 * Server-only by nature (needs the master key); the `server-only` import from
 * the source repo is dropped so this package stays framework-agnostic — guard
 * usage at the application boundary instead.
 *
 * Ciphertext format: base64(ciphertext || 16-byte auth tag)
 * Nonce format: base64(iv)
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getMasterKey(): Uint8Array {
  const b64 = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!b64) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY is not set. Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error(
      `CREDENTIAL_ENCRYPTION_KEY must decode to 32 bytes; got ${key.length}`,
    );
  }
  return new Uint8Array(key);
}

async function importKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    raw as unknown as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface EncryptedPayload {
  ciphertext: string;
  nonce: string;
}

export async function encryptBytes(
  plaintext: Uint8Array,
): Promise<EncryptedPayload> {
  const key = await importKey(getMasterKey());
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      key,
      plaintext as unknown as BufferSource,
    ),
  );
  return {
    ciphertext: Buffer.from(ciphertext).toString("base64"),
    nonce: Buffer.from(iv).toString("base64"),
  };
}

export async function decryptBytes(
  payload: EncryptedPayload,
): Promise<Uint8Array> {
  const key = await importKey(getMasterKey());
  const iv = Buffer.from(payload.nonce, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");
  const plaintext = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      key,
      ciphertext as unknown as BufferSource,
    ),
  );
  return plaintext;
}

export async function encryptString(plaintext: string): Promise<EncryptedPayload> {
  return encryptBytes(encoder.encode(plaintext));
}

export async function decryptString(payload: EncryptedPayload): Promise<string> {
  return decoder.decode(await decryptBytes(payload));
}
