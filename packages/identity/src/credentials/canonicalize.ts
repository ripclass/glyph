/**
 * Deterministic JSON canonicalization for VC signing.
 *
 * Uses RFC 8785 JCS semantics: sort object keys lexicographically, emit compact
 * JSON, preserve array order. This gives a stable byte representation a verifier
 * can re-derive from any normalized VC.
 *
 * NOTE (carried from the source repo, and surfaced in the Glyph audit): this is
 * a pragmatic JCS implementation sufficient for Ed25519 signatures issued and
 * verified *inside this network*. It is NOT JSON-LD URDNA2015 canonicalization,
 * so credentials are not yet verifiable by a generic external W3C verifier.
 * Full cross-issuer interoperability (URDNA2015 / Data Integrity) is a follow-up.
 */

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalize(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const inner = keys
    .map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`)
    .join(",");
  return `{${inner}}`;
}
