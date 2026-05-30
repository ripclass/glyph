# @kham/identity

The shared W3C identity envelope for KhaM Health / Glyph and the Enso Identity
Network. **One identity engine, extracted — not forked.**

Persistence-agnostic crypto + document core:

- **Ed25519** keypairs (`@noble/ed25519`), private keys encrypted at rest with
  **AES-256-GCM** (`CREDENTIAL_ENCRYPTION_KEY`).
- **did:web** identifiers, DID Documents, and HTTPS resolution (with a local
  fast-path override for internal verification).
- **Verifiable Credentials** (VC 2.0): build, JCS-canonicalize, Ed25519-sign,
  verify (signature / temporal / trust-level), present.

It has **no database and no framework**. Validation of credential *content* and
all persistence (the `credentials` store, revocation rows, projection tables)
live in the consuming app, not here.

## Server-only surface

Anything touching a private key must run server-side only (Next.js route
handlers / server actions): `generateKeyPair`, `generateStoredKeyPair`,
`generateEntityIdentity`, `loadPrivateKey`, `signCredential`,
`buildAndSignCredential`, and the `encrypt*`/`decrypt*` helpers. The upstream
`server-only` import was dropped so the package stays framework-agnostic — the
guard is the caller's responsibility.

Safe anywhere: `verifyCredential`, `resolveDidWeb`, `buildDIDDocument`,
`canonicalize`, and the public-key helpers.

## Trust-root gate

`npm test` runs the trust-root suite (`test/trust-root.test.ts`): sign→verify,
tamper-rejection, expiry, did:web resolution round-trip, canonicalization
stability, AES-at-rest, and the issuance helper. **The package does not ship if
any check fails** — a verify that wrongly returns `true` is worse than none.

## Known limitation (carried from source, surfaced in the Glyph audit)

`canonicalize` is pragmatic RFC-8785 JCS, and proofs are base64 `proofValue`
under an `Ed25519Signature2020` label. This is internally consistent and
verifiable by any participant **on this network**, but it is **not** JSON-LD
URDNA2015 / W3C Data Integrity, so credentials are not yet verifiable by a
generic external W3C verifier. Full interoperability is a planned follow-up.

## EIN

EIN currently holds its own copy of this code under `lib/`. The intended end
state is for EIN to re-export from `@kham/identity` so there is a single core.
That change belongs to EIN and is intentionally **not** made here — this lift
does not touch or break EIN.
