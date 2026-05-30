import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";

/**
 * Single, centralized SHA-512 wiring for @noble/ed25519 v2+.
 *
 * In the source repo this wiring was duplicated in keys.ts and verify.ts and
 * *omitted* from sign.ts, which only worked because of import-order side
 * effects. Here every consumer imports `ed` from this one module, so the hash
 * is guaranteed wired before any sign/verify call — the fragility is gone.
 */
if (typeof (ed.hashes as { sha512?: unknown }).sha512 !== "function") {
  (ed.hashes as { sha512: (msg: Uint8Array) => Uint8Array }).sha512 = (msg) =>
    sha512(msg);
}

export { ed };
