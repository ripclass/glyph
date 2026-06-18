/**
 * @fileoverview Pure session-shaping + role capabilities for diagnostic-centre
 * staff (Lens). No Supabase/network — orchestration lives in staff-store.ts.
 * R2: a centre is an owner (org_type='diagnostic_centre'); staff are memberships,
 * never doctors. The live doctor auth path is untouched.
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

/** Picks the diagnostic_centre membership (if any) and shapes a centre session. */
export function shapeStaffSession(rows: MembershipRow[] | null | undefined): StaffSession | null {
  if (!Array.isArray(rows)) return null;
  const centre = rows.find((r) => r.organizations?.org_type === 'diagnostic_centre');
  if (!centre || !centre.organizations) return null;
  return {
    userId: centre.user_id,
    orgId: centre.organizations.id,
    orgName: centre.organizations.name,
    orgType: centre.organizations.org_type,
    role: centre.role as StaffRole,
  };
}

const SIGN_ROLES: StaffRole[] = ['signatory', 'owner', 'admin'];
const RESULT_ROLES: StaffRole[] = ['technologist', 'signatory', 'owner', 'admin'];

/** Only a qualified signatory (or owner/admin) may sign → LabResult credential. */
export function canSign(role: string): boolean {
  return SIGN_ROLES.includes(role as StaffRole);
}

/** Technologists and signers may enter/extract results. */
export function canEnterResults(role: string): boolean {
  return RESULT_ROLES.includes(role as StaffRole);
}
