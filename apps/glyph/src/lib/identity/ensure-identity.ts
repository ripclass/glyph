/**
 * @fileoverview DID provisioning for principals (patients/doctors/clinics).
 * Idempotent and race-safe: an entity gets exactly one DID, generated on
 * first need, persisted on its row, with the DID Document published as
 * version 1 in `did_documents` (append-only).
 *
 * Server-only: touches encrypted private keys and the service-role client.
 *
 * @module lib/identity/ensure-identity
 */

import { generateEntityIdentity, type PublicKeyJwk } from '@kham/identity';
import type { AdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/types';
import { ENTITY_TABLE, didWebHost, entitySlug, type EntityKind } from './config';

/** Stored identity material for a principal */
export interface EntityIdentity {
  did: string;
  publicKeyJwk: PublicKeyJwk;
  encryptedPrivateKey: string;
  keyNonce: string;
}

/**
 * Returns the entity's identity, generating and persisting one if absent.
 *
 * Race safety: the UPDATE is guarded with `.is('did', null)`; if a
 * concurrent call won, we re-read and return the winner's identity (the
 * loser's freshly generated key is discarded, never stored).
 *
 * @param admin - Service-role client
 * @param kind - patient | doctor | clinic
 * @param id - Row id in the principal table
 * @returns The entity's DID + key material
 * @throws {Error} If the entity row does not exist
 */
export async function ensureEntityIdentity(
  admin: AdminClient,
  kind: EntityKind,
  id: string
): Promise<EntityIdentity> {
  const table = ENTITY_TABLE[kind];

  const { data: row, error } = await admin
    .from(table)
    .select('did, public_key_jwk, encrypted_private_key, key_nonce')
    .eq('id', id)
    .single();

  if (error || !row) {
    throw new Error(`${kind} ${id} not found: ${error?.message ?? 'no row'}`);
  }

  if (row.did && row.encrypted_private_key && row.key_nonce && row.public_key_jwk) {
    return {
      did: row.did,
      publicKeyJwk: row.public_key_jwk as unknown as PublicKeyJwk,
      encryptedPrivateKey: row.encrypted_private_key,
      keyNonce: row.key_nonce,
    };
  }

  const identity = await generateEntityIdentity(didWebHost(), entitySlug(kind, id));

  const { data: claimed } = await admin
    .from(table)
    .update({
      did: identity.did,
      public_key_jwk: identity.publicKeyJwk as unknown as Json,
      encrypted_private_key: identity.encryptedPrivateKey,
      key_nonce: identity.keyNonce,
    })
    .eq('id', id)
    .is('did', null)
    .select('did')
    .maybeSingle();

  if (!claimed) {
    // Lost the race — return whatever the winner stored.
    return ensureEntityIdentity(admin, kind, id);
  }

  // Publish DID Document v1 (append-only; ignoreDuplicates keeps a racing
  // double-insert from erroring without ever firing an UPDATE).
  await admin
    .from('did_documents')
    .upsert(
      {
        did: identity.did,
        version: 1,
        document: identity.didDocument as unknown as Json,
      },
      { onConflict: 'did,version', ignoreDuplicates: true }
    );

  return {
    did: identity.did,
    publicKeyJwk: identity.publicKeyJwk,
    encryptedPrivateKey: identity.encryptedPrivateKey,
    keyNonce: identity.keyNonce,
  };
}
