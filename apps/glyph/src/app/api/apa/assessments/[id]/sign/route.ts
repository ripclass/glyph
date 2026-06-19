/**
 * @fileoverview Sign an occupational assessment — issue the OccupationalHealth credential
 * (issuer = employer org DID). Mirrors the Hospital sign route exactly; deltas:
 *   - org-type gate: requireOrgType(staff,'employer')
 *   - payload: buildOccupationalHealthData (not buildDischargeSummaryData)
 *   - type: 'occupational_health' (not 'discharge_summary')
 *   - NO rebuildProjections — no projection table; wallet surfacing deferred
 *
 * POST /api/apa/assessments/[id]/sign
 *
 * Auth → ensureEntityIdentity → issueCredential → status update.
 * Issuer = employer organisation DID. Subject = patient DID.
 * One-shot: 409 when record.credential_id is already set.
 *
 * @module app/api/apa/assessments/[id]/sign/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureEntityIdentity } from '@/lib/identity/ensure-identity';
import { issueCredential } from '@/lib/identity/issue';
import { shapeStaffSession, requireOrgType, canSign } from '@/lib/services/staff-logic';
import { buildOccupationalHealthData } from '@/lib/services/apa-logic';
import type { Database } from '@/lib/supabase/types';

export const runtime = 'nodejs';

/** POST /api/apa/assessments/[id]/sign — issue the OccupationalHealth credential (issuer=org). */
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

    // ── Employer staff session ──────────────────────────────────
    const { data: memRows } = await userClient
      .from('memberships')
      .select('user_id, role, organizations(id, name, org_type)');
    const staff = shapeStaffSession(memRows as never);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Not an employer member' }, { status: 403 });
    }
    if (!requireOrgType(staff, 'employer')) {
      return NextResponse.json({ success: false, error: 'Access restricted to employer members' }, { status: 403 });
    }
    if (!canSign(staff.role)) {
      return NextResponse.json({ success: false, error: 'Role cannot sign' }, { status: 403 });
    }

    const admin = createAdminClient();

    // ── Load assessment record (scoped to this employer's org) ──
    const { data: record } = await admin
      .from('occupational_assessments')
      .select('*')
      .eq('id', params.id)
      .eq('owner_org_id', staff.orgId)
      .maybeSingle();

    if (!record) {
      return NextResponse.json({ success: false, error: 'Assessment not found' }, { status: 404 });
    }

    // One-shot guard: amendments must issue a replacement credential, not re-sign.
    if ((record as { credential_id?: string | null }).credential_id) {
      return NextResponse.json(
        { success: false, error: 'Assessment already signed; amend via a replacement credential' },
        { status: 409 }
      );
    }

    // Require assessment_type before signing (schema requires assessmentType).
    const assessmentType = (record as { assessment_type?: string | null }).assessment_type;
    if (!assessmentType) {
      return NextResponse.json(
        { success: false, error: 'assessment_type is required before signing' },
        { status: 400 }
      );
    }

    // ── Ensure DIDs (issuer = org, subject = patient) ───────────
    const orgIdentity = await ensureEntityIdentity(admin, 'organization', staff.orgId);
    const patientIdentity = await ensureEntityIdentity(admin, 'patient', (record as { patient_id: string }).patient_id);

    // ── Build the OccupationalHealthData payload ────────────────
    const data = buildOccupationalHealthData({
      orgDid: orgIdentity.did,
      orgName: staff.orgName,
      encounterDate: new Date().toISOString().slice(0, 10),
      assessmentType: assessmentType as Parameters<typeof buildOccupationalHealthData>[0]['assessmentType'],
      exposures: (record as { exposures?: string[] | null }).exposures ?? undefined,
      findings: (record as { findings?: Array<Record<string, unknown>> | null }).findings ?? undefined,
      fitnessForRole: ((record as { fitness_for_role?: string | null }).fitness_for_role ?? undefined) as Parameters<typeof buildOccupationalHealthData>[0]['fitnessForRole'],
      restrictions: (record as { restrictions?: string[] | null }).restrictions ?? undefined,
      recommendations: (record as { recommendations?: string[] | null }).recommendations ?? undefined,
    });

    // ── Issue the OccupationalHealthCredential (INSERT-only) ────
    const credential = await issueCredential(admin, {
      issuer: { kind: 'organization', id: staff.orgId, name: staff.orgName },
      subjectDid: patientIdentity.did,
      type: 'occupational_health',
      data,
    });

    // No rebuildProjections — no projection table; wallet surfacing deferred.

    // ── Update assessment record to signed ──────────────────────
    const { error: updErr } = await admin
      .from('occupational_assessments')
      .update({
        status: 'signed',
        signatory_user_id: user.id,
        signed_at: new Date().toISOString(),
        credential_id: credential.rowId,
      } as never)
      .eq('id', (record as { id: string }).id);

    if (updErr) {
      return NextResponse.json(
        { success: false, error: updErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        occupationalHealthVcId: credential.vcId,
        patientDid: patientIdentity.did,
        orgDid: orgIdentity.did,
      },
    });
  } catch (err) {
    console.error('[apa/sign] Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
