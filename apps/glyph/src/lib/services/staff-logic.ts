/**
 * @fileoverview Pure session-shaping + role capabilities for non-clinic owner
 * staff (Lens = diagnostic_centre, Hospital = hospital, etc.). No Supabase/network —
 * orchestration lives in staff-store.ts. R2: an org with org_type ≠ 'clinic' is an
 * owner; staff are memberships, never doctors. Each surface enforces its own type via
 * requireOrgType(). The live doctor auth path is untouched.
 *
 * @module lib/services/staff-logic
 */

export type StaffRole = 'owner' | 'admin' | 'doctor' | 'technologist' | 'signatory' | 'staff';

export interface StaffSession {
  userId: string;
  orgId: string;
  orgName: string;
  orgType: string;
  role: StaffRole;
}

interface MembershipRow {
  user_id: string;
  role: string;
  organizations: { id: string; name: string; org_type: string } | null;
}

const OWNER_ORG_TYPES = ['diagnostic_centre', 'hospital', 'employer', 'recruiter', 'kham_holding', 'program', 'specialist_panel'] as const;

/** Picks the first non-clinic owner membership and shapes its session. */
export function shapeStaffSession(rows: MembershipRow[] | null | undefined): StaffSession | null {
  if (!Array.isArray(rows)) return null;
  const owner = rows.find(
    (r) => r.organizations && r.organizations.org_type !== 'clinic'
      && (OWNER_ORG_TYPES as readonly string[]).includes(r.organizations.org_type),
  );
  if (!owner || !owner.organizations) return null;
  return {
    userId: owner.user_id,
    orgId: owner.organizations.id,
    orgName: owner.organizations.name,
    orgType: owner.organizations.org_type,
    role: owner.role as StaffRole,
  };
}

/** True iff the session belongs to an org of the given type (per-surface gate). */
export function requireOrgType(staff: StaffSession | null, orgType: string): boolean {
  return Boolean(staff && staff.orgType === orgType);
}

const SIGN_ROLES: StaffRole[] = ['signatory', 'owner', 'admin'];
/** technologist (Lens), doctor (Hospital), and signers may enter/extract results. */
const RESULT_ROLES: StaffRole[] = ['technologist', 'doctor', 'signatory', 'owner', 'admin'];

/** Only a qualified signatory (or owner/admin) may sign → LabResult/DischargeSummary credential. */
export function canSign(role: string): boolean {
  return SIGN_ROLES.includes(role as StaffRole);
}

/** Technologists (Lens), doctors (Hospital), and signers may enter/extract results.
 *  A doctor enters clinical content but cannot sign credentials (see SIGN_ROLES). */
export function canEnterResults(role: string): boolean {
  return RESULT_ROLES.includes(role as StaffRole);
}
