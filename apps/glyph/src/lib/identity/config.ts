/**
 * @fileoverview Identity-layer configuration — THE single place the DID
 * domain comes from. Every did:web identifier permanently embeds this host
 * (production: khamhealth.com), so it is read from env and never hardcoded
 * anywhere else in the app.
 *
 * @module lib/identity/config
 */

/** Entity kinds that hold DIDs (maps 1:1 to principal tables) */
export type EntityKind = 'patient' | 'doctor' | 'clinic' | 'organization';

/** Principal table per entity kind */
export const ENTITY_TABLE = {
  patient: 'patients',
  doctor: 'doctors',
  clinic: 'clinics',
  organization: 'organizations',
} as const satisfies Record<EntityKind, string>;

/**
 * The did:web host. Required for any identity operation — fails closed
 * rather than minting DIDs on a wrong domain.
 *
 * @returns Bare host (no scheme/trailing slash), e.g. "khamhealth.com"
 * @throws {Error} When DID_WEB_HOST is unset
 */
export function didWebHost(): string {
  const host = process.env.DID_WEB_HOST;
  if (!host) {
    throw new Error(
      'DID_WEB_HOST is not set (production: khamhealth.com; local dev: localhost:3000). ' +
        'Refusing to mint DIDs on an unknown domain.'
    );
  }
  return host.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

/**
 * The .well-known slug for an entity, e.g. "doctor-<uuid>".
 * Stable forever — it becomes part of the DID.
 */
export function entitySlug(kind: EntityKind, id: string): string {
  return `${kind}-${id}`;
}
