/**
 * @fileoverview THE issuance seam (M3, non-negotiable #1).
 *
 * One server path for every clinical credential:
 *   validate payload (registry zod schema) → sign with the issuer's
 *   self-issued Glyph key (@kham/identity) → write the canonical VC to
 *   `credentials` (INSERT-only) → callers project rows from it.
 *
 * The credential is canonical; Postgres rows are projections. Amendments
 * issue a NEW credential with `replaces` — the old one is superseded via a
 * status transition + append-only log, never edited.
 *
 * Self-issued today; when BMDC anchors the issuer key later, the SAME
 * stored credentials verify at a higher trust level with zero migration.
 *
 * @module lib/identity/issue
 */

import {
  buildAndSignCredential,
  loadPrivateKey,
  type VerifiableCredential,
} from '@kham/identity';
import {
  CLINICAL_CREDENTIALS,
  validateClinicalCredential,
  type ClinicalCredentialType,
} from '@kham/schemas-clinical';
import type { AdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/types';
import { ensureEntityIdentity } from './ensure-identity';
import type { EntityKind } from './config';

/** Human-readable credential names (credentialSubject.credentialName) */
const CREDENTIAL_NAMES: Record<ClinicalCredentialType, string> = {
  physician_registration: 'Physician Registration',
  visit_note: 'Visit Note',
  prescription: 'Prescription',
  lab_result: 'Lab Result',
  dispensing_event: 'Dispensing Event',
  discharge_summary: 'Discharge Summary',
  medical_clearance: 'Medical Clearance',
  occupational_health: 'Occupational Health Record',
  antenatal_record: 'Antenatal Record',
  specialist_opinion: 'Specialist Opinion',
};

export interface IssueCredentialInput {
  /** Who signs — resolved to a DID + key via ensureEntityIdentity */
  issuer: { kind: EntityKind; id: string; name?: string };
  /** The subject's DID (must already exist — ensure it before calling) */
  subjectDid: string;
  type: ClinicalCredentialType;
  /** Payload for credentialSubject.data — zod-validated against the registry */
  data: unknown;
  /** ISO datetime after which the credential expires (e.g. Rx validity window) */
  validUntil?: string;
  /** Amendment: the credentials.id this one supersedes */
  replacesCredentialId?: string;
}

export interface IssuedCredential {
  /** credentials.id (the canonical row) */
  rowId: string;
  /** The VC's id URI (credentials.vc_id) */
  vcId: string;
  vc: VerifiableCredential;
}

/**
 * Issues a clinical credential. See module docs for the invariants.
 *
 * @throws {ZodError} If `data` fails the registry schema for `type`
 * @throws {Error} On signing or persistence failure
 */
export async function issueCredential(
  admin: AdminClient,
  input: IssueCredentialInput
): Promise<IssuedCredential> {
  const validated = validateClinicalCredential(input.type, input.data);
  const def = CLINICAL_CREDENTIALS[input.type];

  const issuer = await ensureEntityIdentity(admin, input.issuer.kind, input.issuer.id);
  const privateKey = await loadPrivateKey({
    ciphertext: issuer.encryptedPrivateKey,
    nonce: issuer.keyNonce,
  });

  const { credentialId, vc } = await buildAndSignCredential({
    issuerDid: issuer.did,
    issuerName: input.issuer.name,
    verificationMethod: `${issuer.did}#keys-1`,
    privateKey,
    subjectDid: input.subjectDid,
    credentialType: def.credentialType,
    credentialName: CREDENTIAL_NAMES[input.type],
    data: validated as Record<string, unknown>,
    extraTypes: [def.vcType],
    extraContexts: [def.context],
    validUntil: input.validUntil,
  });

  const { data: row, error } = await admin
    .from('credentials')
    .insert({
      vc_id: credentialId,
      types: vc.type,
      issuer_did: issuer.did,
      subject_did: input.subjectDid,
      issued_at: vc.validFrom,
      expires_at: input.validUntil ?? null,
      credential_json: vc as unknown as Json,
      proof_value: vc.proof!.proofValue,
      replaces_credential_id: input.replacesCredentialId ?? null,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to persist credential: ${error.message}`);
  }

  if (input.replacesCredentialId) {
    await supersedeCredential(admin, input.replacesCredentialId, issuer.did, credentialId);
  }

  return { rowId: row.id, vcId: credentialId, vc };
}

/**
 * Marks an amended credential superseded (one-way status transition — the
 * immutability trigger permits nothing else) and records it in the
 * append-only status log.
 */
async function supersedeCredential(
  admin: AdminClient,
  credentialRowId: string,
  actorDid: string,
  replacedByVcId: string
): Promise<void> {
  const { data: old } = await admin
    .from('credentials')
    .select('status')
    .eq('id', credentialRowId)
    .single();

  if (!old || old.status !== 'active') return; // already terminal

  const { error: updErr } = await admin
    .from('credentials')
    .update({ status: 'superseded' })
    .eq('id', credentialRowId);
  if (updErr) {
    throw new Error(`Failed to supersede credential ${credentialRowId}: ${updErr.message}`);
  }

  await admin.from('credential_status_log').insert({
    credential_id: credentialRowId,
    previous_status: 'active',
    new_status: 'superseded',
    actor_did: actorDid,
    reason: `Amended; replaced by ${replacedByVcId}`,
  });
}
