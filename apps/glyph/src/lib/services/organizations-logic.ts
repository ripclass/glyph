/**
 * @fileoverview Pure row-shaping for organization-owned (non-clinic) patients.
 * No Supabase/network — keep it unit-testable. Orchestration lives in
 * organizations.ts.
 *
 * R2: a patient's owner is an abstraction (an organization), not necessarily a
 * clinic. An owner-scoped patient carries owner_org_id and a NULL clinic_id —
 * the inverse of a Chamber patient (clinic_id set, owner_org_id NULL). The DID
 * minted on the row stays the record anchor (R1). The single-scope invariant
 * (exactly one of clinic_id/owner_org_id set) is enforced in the DB by the
 * patients_one_scope CHECK; this builder always produces the owner-scoped shape.
 *
 * @module lib/services/organizations-logic
 */

/** Well-known name of the singleton provisional-holding org (seeded in migration 011). */
export const KHAM_HOLDING_ORG_NAME = 'KhaM Holding (Provisional Patients)';

/** What a caller provides to create an org-owned patient. */
export interface OwnedPatientInput {
  ownerOrgId: string;
  name: string;
  phone?: string | null;
  age?: number | null;
  gender?: 'male' | 'female' | 'other' | null;
}

/** The patients-row shape for an org-owned patient: owner set, clinic NULL. */
export interface OwnedPatientRow {
  owner_org_id: string;
  clinic_id: null;
  name: string;
  phone: string | null;
  age: number | null;
  gender: 'male' | 'female' | 'other' | null;
}

/**
 * Builds the patients-row payload for an org-owned patient. Mirrors
 * registration-logic's name normalization (trim + collapse whitespace).
 *
 * @throws {Error} when the name is empty after normalization
 */
export function buildOwnedPatientRow(input: OwnedPatientInput): OwnedPatientRow {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (!name) throw new Error('Patient name is required');
  return {
    owner_org_id: input.ownerOrgId,
    clinic_id: null,
    name,
    phone: input.phone ?? null,
    age: input.age ?? null,
    gender: input.gender ?? null,
  };
}
