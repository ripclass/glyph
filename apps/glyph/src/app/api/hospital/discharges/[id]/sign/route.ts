/**
 * @fileoverview Sign a discharge record — issue the DischargeSummary credential
 * (issuer = hospital org DID). Mirrors the Lens sign route exactly; deltas:
 *   - org-type gate: requireOrgType(staff,'hospital')
 *   - payload: buildDischargeSummaryData (not buildLabResultData)
 *   - type: 'discharge_summary' (not 'lab_result')
 *   - NO rebuildProjections — no discharge projection table; wallet surfacing deferred
 *
 * POST /api/hospital/discharges/[id]/sign
 *
 * Auth → ensureEntityIdentity → issueCredential → status update.
 * Issuer = hospital organisation DID. Subject = patient DID.
 * One-shot: 409 when record.credential_id is already set.
 *
 * @module app/api/hospital/discharges/[id]/sign/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureEntityIdentity } from '@/lib/identity/ensure-identity';
import { issueCredential } from '@/lib/identity/issue';
import { shapeStaffSession, requireOrgType, canSign } from '@/lib/services/staff-logic';
import { buildDischargeSummaryData } from '@/lib/services/hospital-logic';
import type { Database } from '@/lib/supabase/types';

export const runtime = 'nodejs';

/** POST /api/hospital/discharges/[id]/sign — issue the DischargeSummary credential (issuer=org). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Missing authorization header' }, { status: 401 });
    }

    const userClient = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // ── Hospital staff session ──────────────────────────────────
    const { data: memRows } = await userClient
      .from('memberships')
      .select('user_id, role, organizations(id, name, org_type)');
    const staff = shapeStaffSession(memRows as never);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Not a hospital member' }, { status: 403 });
    }
    if (!requireOrgType(staff, 'hospital')) {
      return NextResponse.json({ success: false, error: 'Access restricted to hospital members' }, { status: 403 });
    }
    if (!canSign(staff.role)) {
      return NextResponse.json({ success: false, error: 'Role cannot sign' }, { status: 403 });
    }

    const admin = createAdminClient();

    // ── Load discharge record (scoped to this hospital's org) ───
    const { data: record } = await admin
      .from('discharge_records')
      .select('*')
      .eq('id', params.id)
      .eq('owner_org_id', staff.orgId)
      .maybeSingle();

    if (!record) {
      return NextResponse.json({ success: false, error: 'Discharge record not found' }, { status: 404 });
    }

    // One-shot guard: amendments must issue a replacement credential, not re-sign.
    if (record.credential_id) {
      return NextResponse.json(
        { success: false, error: 'Discharge record already signed; amend via a replacement credential' },
        { status: 409 }
      );
    }

    // Require at least one discharge diagnosis before signing.
    const diagnoses = (record.discharge_diagnosis as unknown[]) ?? [];
    if (!diagnoses.length) {
      return NextResponse.json(
        { success: false, error: 'At least one discharge diagnosis is required before signing' },
        { status: 400 }
      );
    }

    // ── Ensure DIDs (issuer = org, subject = patient) ───────────
    const orgIdentity = await ensureEntityIdentity(admin, 'organization', staff.orgId);
    const patientIdentity = await ensureEntityIdentity(admin, 'patient', record.patient_id);

    // ── Build the DischargeSummaryData payload ──────────────────
    const dischargeDate: string = (
      (record.discharge_date as string | null) ??
      new Date().toISOString().slice(0, 10)
    );

    const data = buildDischargeSummaryData({
      orgDid: orgIdentity.did,
      orgName: staff.orgName,
      admissionDate: (record.admission_date as string | null) ?? undefined,
      dischargeDate,
      dischargeDiagnosis: diagnoses as Parameters<typeof buildDischargeSummaryData>[0]['dischargeDiagnosis'],
      dischargeMedications: (record.discharge_medications as Record<string, unknown>[] | null) ?? undefined,
      procedures: (record.procedures as string[] | null) ?? undefined,
      hospitalCourse: (record.hospital_course as string | null) ?? undefined,
      followUpInstructions: (record.follow_up_instructions as string[] | null) ?? undefined,
      dischargeCondition: (record.discharge_condition as string | null) ?? undefined,
    });

    // ── Issue the DischargeSummaryCredential (INSERT-only) ──────
    const credential = await issueCredential(admin, {
      issuer: { kind: 'organization', id: staff.orgId, name: staff.orgName },
      subjectDid: patientIdentity.did,
      type: 'discharge_summary',
      data,
    });

    // No rebuildProjections — no discharge projection table; wallet surfacing deferred.

    // ── Update discharge record to signed ───────────────────────
    const { error: updErr } = await admin
      .from('discharge_records')
      .update({
        status: 'signed',
        signatory_user_id: user.id,
        signed_at: new Date().toISOString(),
        credential_id: credential.rowId,
      })
      .eq('id', record.id);

    if (updErr) {
      return NextResponse.json(
        { success: false, error: updErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        dischargeSummaryVcId: credential.vcId,
        patientDid: patientIdentity.did,
        orgDid: orgIdentity.did,
      },
    });
  } catch (err) {
    console.error('[hospital/sign] Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
