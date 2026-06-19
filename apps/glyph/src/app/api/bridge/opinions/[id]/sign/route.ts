/**
 * @fileoverview Sign a specialist opinion record — issue the SpecialistOpinion credential
 * (issuer = specialist_panel org DID). Mirrors the Maa sign route exactly; deltas:
 *   - org-type gate: requireOrgType(staff,'specialist_panel')
 *   - payload: buildSpecialistOpinionData (not buildAntenatalRecordData)
 *   - type: 'specialist_opinion' (not 'antenatal_record')
 *   - required clinical fields: record.specialty AND record.opinion (400 if absent)
 *   - NO rebuildProjections — no projection table; surfacing deferred
 *
 * POST /api/bridge/opinions/[id]/sign
 *
 * Auth → ensureEntityIdentity → issueCredential → status update.
 * Issuer = specialist_panel organisation DID. Subject = patient DID.
 * One-shot: 409 when record.credential_id is already set.
 *
 * @module app/api/bridge/opinions/[id]/sign/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureEntityIdentity } from '@/lib/identity/ensure-identity';
import { issueCredential } from '@/lib/identity/issue';
import { shapeStaffSession, requireOrgType, canSign } from '@/lib/services/staff-logic';
import { buildSpecialistOpinionData } from '@/lib/services/bridge-logic';
import type { Database } from '@/lib/supabase/types';

export const runtime = 'nodejs';

/** POST /api/bridge/opinions/[id]/sign — issue the SpecialistOpinion credential (issuer=panel org). */
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

    // ── Specialist panel staff session ────────────────────────────────────
    const { data: memRows } = await userClient
      .from('memberships')
      .select('user_id, role, organizations(id, name, org_type)');
    const staff = shapeStaffSession(memRows as never);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Not a specialist panel member' }, { status: 403 });
    }
    if (!requireOrgType(staff, 'specialist_panel')) {
      return NextResponse.json({ success: false, error: 'Access restricted to specialist panel members' }, { status: 403 });
    }
    if (!canSign(staff.role)) {
      return NextResponse.json({ success: false, error: 'Role cannot sign' }, { status: 403 });
    }

    const admin = createAdminClient();

    // ── Load specialist opinion record (scoped to this panel's org) ──
    const { data: record } = await admin
      .from('specialist_opinions')
      .select('*')
      .eq('id', params.id)
      .eq('owner_org_id', staff.orgId)
      .maybeSingle();

    if (!record) {
      return NextResponse.json({ success: false, error: 'Specialist opinion not found' }, { status: 404 });
    }

    // One-shot guard: amendments must issue a replacement credential, not re-sign.
    if (record.credential_id) {
      return NextResponse.json(
        { success: false, error: 'Opinion already signed; amend via a replacement credential' },
        { status: 409 }
      );
    }

    // Require clinical content before signing.
    if (!record.specialty || !record.opinion) {
      return NextResponse.json(
        { success: false, error: 'specialty and opinion must be set before signing' },
        { status: 400 }
      );
    }

    // ── Ensure DIDs (issuer = org, subject = patient) ───────────
    const orgIdentity = await ensureEntityIdentity(admin, 'organization', staff.orgId);
    const patientIdentity = await ensureEntityIdentity(admin, 'patient', record.patient_id);

    // ── Build the SpecialistOpinionData payload ───────────────────
    const data = buildSpecialistOpinionData({
      orgDid: orgIdentity.did,
      orgName: staff.orgName,
      encounterDate: new Date().toISOString().slice(0, 10),
      specialty: record.specialty,
      opinion: record.opinion,
      referralReason: record.referral_reason ?? undefined,
      presentedRecordRefs: Array.isArray(record.presented_record_refs)
        ? (record.presented_record_refs as string[])
        : undefined,
      recommendations: Array.isArray(record.recommendations)
        ? (record.recommendations as string[])
        : undefined,
      differentialDiagnosis: Array.isArray(record.differential_diagnosis)
        ? (record.differential_diagnosis as Array<{ text: string; icd10?: string }>)
        : undefined,
    });

    // ── Issue the SpecialistOpinionCredential (INSERT-only) ───────
    const credential = await issueCredential(admin, {
      issuer: { kind: 'organization', id: staff.orgId, name: staff.orgName },
      subjectDid: patientIdentity.did,
      type: 'specialist_opinion',
      data,
    });

    // No rebuildProjections — no projection table; wallet surfacing deferred.

    // ── Update opinion record to signed (typed update, no as never) ──
    const { error: updErr } = await admin
      .from('specialist_opinions')
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
        specialistOpinionVcId: credential.vcId,
        patientDid: patientIdentity.did,
        orgDid: orgIdentity.did,
      },
    });
  } catch (err) {
    console.error('[bridge/opinions/sign] Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
