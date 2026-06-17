/**
 * @fileoverview Owner/scope orchestration: resolve the provisional-holding org
 * and mint org-owned (non-clinic) patients. Server-only (service-role client +
 * encrypted keys). Pure row-shaping is in organizations-logic.ts.
 *
 * The DID minted here is the portable record anchor (R1); the owner is only a
 * scope (R2). End-to-end coverage lands with the Lens centre-onboarding route;
 * the schema acceptance is proven by scripts/smoke-owner-scope.mjs and the row
 * shape by organizations-logic.test.ts.
 *
 * @module lib/services/organizations
 */

import type { AdminClient } from '@/lib/supabase/admin';
import { ensureEntityIdentity } from '@/lib/identity/ensure-identity';
import {
  buildOwnedPatientRow,
  KHAM_HOLDING_ORG_NAME,
  type OwnedPatientInput,
} from './organizations-logic';

/**
 * Returns the singleton provisional-holding org id (seeded in migration 011).
 * The insert is a defensive fallback only — the partial unique index guarantees
 * a single winner under concurrency.
 */
export async function ensureKhamHoldingOrg(admin: AdminClient): Promise<string> {
  const { data: existing } = await admin
    .from('organizations')
    .select('id')
    .eq('org_type', 'kham_holding')
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await admin
    .from('organizations')
    .insert({ name: KHAM_HOLDING_ORG_NAME, org_type: 'kham_holding' })
    .select('id')
    .single();
  if (data?.id) return data.id;

  // Lost the race against the partial-unique index — read the winner.
  const { data: winner } = await admin
    .from('organizations')
    .select('id')
    .eq('org_type', 'kham_holding')
    .single();
  if (winner?.id) return winner.id;
  throw new Error(`ensureKhamHoldingOrg failed: ${error?.message ?? 'no holding org'}`);
}

/**
 * Creates an organization-owned patient (clinic_id NULL) and mints its DID.
 * Used for diagnostic-centre walk-ins (ownerOrgId = the centre) and the Pocket
 * front-door (ownerOrgId = the holding org).
 *
 * @returns the new patient id and its minted DID (the record anchor — R1)
 */
export async function createOwnedPatient(
  admin: AdminClient,
  input: OwnedPatientInput
): Promise<{ id: string; did: string }> {
  const row = buildOwnedPatientRow(input);
  const { data, error } = await admin
    .from('patients')
    .insert(row)
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`createOwnedPatient failed: ${error?.message ?? 'no row'}`);
  }
  const identity = await ensureEntityIdentity(admin, 'patient', data.id);
  return { id: data.id, did: identity.did };
}
