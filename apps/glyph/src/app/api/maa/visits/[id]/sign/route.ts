/**
 * @fileoverview Sign an antenatal visit record — issue the AntenatalRecord credential
 * (issuer = program org DID). Mirrors the Continuity sign route exactly; deltas:
 *   - org-type gate: requireOrgType(staff,'program')
 *   - payload: buildAntenatalRecordData (not buildMedicalClearanceData)
 *   - type: 'antenatal_record' (not 'medical_clearance')
 *   - NO required clinical field beyond provider (org always supplies it)
 *   - NO rebuildProjections — no projection table; wallet surfacing deferred
 *
 * POST /api/maa/visits/[id]/sign
 *
 * Auth → ensureEntityIdentity → issueCredential → status update.
 * Issuer = program organisation DID. Subject = patient DID.
 * One-shot: 409 when record.credential_id is already set.
 *
 * @module app/api/maa/visits/[id]/sign/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureEntityIdentity } from '@/lib/identity/ensure-identity';
import { issueCredential } from '@/lib/identity/issue';
import { shapeStaffSession, requireOrgType, canSign } from '@/lib/services/staff-logic';
import { buildAntenatalRecordData } from '@/lib/services/maa-logic';
import type { Database } from '@/lib/supabase/types';

export const runtime = 'nodejs';

/** POST /api/maa/visits/[id]/sign — issue the AntenatalRecord credential (issuer=program org). */
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

    // ── Program staff session ────────────────────────────────────
    const { data: memRows } = await userClient
      .from('memberships')
      .select('user_id, role, organizations(id, name, org_type)');
    const staff = shapeStaffSession(memRows as never);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Not a program member' }, { status: 403 });
    }
    if (!requireOrgType(staff, 'program')) {
      return NextResponse.json({ success: false, error: 'Access restricted to program members' }, { status: 403 });
    }
    if (!canSign(staff.role)) {
      return NextResponse.json({ success: false, error: 'Role cannot sign' }, { status: 403 });
    }

    const admin = createAdminClient();

    // ── Load antenatal visit record (scoped to this program's org) ──
    const { data: record } = await admin
      .from('antenatal_visits')
      .select('*')
      .eq('id', params.id)
      .eq('owner_org_id', staff.orgId)
      .maybeSingle();

    if (!record) {
      return NextResponse.json({ success: false, error: 'Antenatal visit not found' }, { status: 404 });
    }

    // One-shot guard: amendments must issue a replacement credential, not re-sign.
    if (record.credential_id) {
      return NextResponse.json(
        { success: false, error: 'Visit already signed; amend via a replacement credential' },
        { status: 409 }
      );
    }

    // ── Ensure DIDs (issuer = org, subject = patient) ───────────
    const orgIdentity = await ensureEntityIdentity(admin, 'organization', staff.orgId);
    const patientIdentity = await ensureEntityIdentity(admin, 'patient', record.patient_id);

    // ── Build the AntenatalRecordData payload ───────────────────
    const data = buildAntenatalRecordData({
      orgDid: orgIdentity.did,
      orgName: staff.orgName,
      encounterDate: new Date().toISOString().slice(0, 10),
      visitNumber: record.visit_number ?? undefined,
      gestationalAgeWeeks: record.gestational_age_weeks ?? undefined,
      lmp: record.lmp ?? undefined,
      edd: record.edd ?? undefined,
      bloodPressure: record.blood_pressure ?? undefined,
      weightKg: record.weight_kg ?? undefined,
      fundalHeightCm: record.fundal_height_cm ?? undefined,
      fetalHeartRateBpm: record.fetal_heart_rate_bpm ?? undefined,
      riskFlags: Array.isArray(record.risk_flags) ? (record.risk_flags as string[]) : undefined,
      nextVisitDate: record.next_visit_date ?? undefined,
    });

    // ── Issue the AntenatalRecordCredential (INSERT-only) ───────
    const credential = await issueCredential(admin, {
      issuer: { kind: 'organization', id: staff.orgId, name: staff.orgName },
      subjectDid: patientIdentity.did,
      type: 'antenatal_record',
      data,
    });

    // No rebuildProjections — no projection table; wallet surfacing deferred.

    // ── Update visit record to signed (typed update, no as never) ──
    const { error: updErr } = await admin
      .from('antenatal_visits')
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
        antenatalRecordVcId: credential.vcId,
        patientDid: patientIdentity.did,
        orgDid: orgIdentity.did,
      },
    });
  } catch (err) {
    console.error('[maa/sign] Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
