/**
 * @fileoverview Sign a medical clearance record — issue the MedicalClearance credential
 * (issuer = recruiter org DID). Mirrors the Karigor sign route exactly; deltas:
 *   - org-type gate: requireOrgType(staff,'recruiter')
 *   - payload: buildMedicalClearanceData (not buildOccupationalHealthData)
 *   - type: 'medical_clearance' (not 'occupational_health')
 *   - require purpose AND fitness_status before signing
 *   - NO rebuildProjections — no projection table; wallet surfacing deferred
 *
 * POST /api/continuity/clearances/[id]/sign
 *
 * Auth → ensureEntityIdentity → issueCredential → status update.
 * Issuer = recruiter organisation DID. Subject = patient DID.
 * One-shot: 409 when record.credential_id is already set.
 *
 * @module app/api/continuity/clearances/[id]/sign/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureEntityIdentity } from '@/lib/identity/ensure-identity';
import { issueCredential } from '@/lib/identity/issue';
import { shapeStaffSession, requireOrgType, canSign } from '@/lib/services/staff-logic';
import { buildMedicalClearanceData } from '@/lib/services/continuity-logic';
import type { Database } from '@/lib/supabase/types';

export const runtime = 'nodejs';

/** POST /api/continuity/clearances/[id]/sign — issue the MedicalClearance credential (issuer=org). */
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

    // ── Recruiter staff session ─────────────────────────────────
    const { data: memRows } = await userClient
      .from('memberships')
      .select('user_id, role, organizations(id, name, org_type)');
    const staff = shapeStaffSession(memRows as never);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Not a recruiter member' }, { status: 403 });
    }
    if (!requireOrgType(staff, 'recruiter')) {
      return NextResponse.json({ success: false, error: 'Access restricted to recruiter members' }, { status: 403 });
    }
    if (!canSign(staff.role)) {
      return NextResponse.json({ success: false, error: 'Role cannot sign' }, { status: 403 });
    }

    const admin = createAdminClient();

    // ── Load clearance record (scoped to this recruiter's org) ──
    const { data: record } = await admin
      .from('clearance_records')
      .select('*')
      .eq('id', params.id)
      .eq('owner_org_id', staff.orgId)
      .maybeSingle();

    if (!record) {
      return NextResponse.json({ success: false, error: 'Clearance not found' }, { status: 404 });
    }

    // One-shot guard: amendments must issue a replacement credential, not re-sign.
    if (record.credential_id) {
      return NextResponse.json(
        { success: false, error: 'Clearance already signed; amend via a replacement credential' },
        { status: 409 }
      );
    }

    // Require purpose AND fitness_status before signing.
    if (!record.purpose || !record.fitness_status) {
      return NextResponse.json(
        { success: false, error: 'purpose and fitness_status are required before signing' },
        { status: 400 }
      );
    }

    // ── Ensure DIDs (issuer = org, subject = patient) ───────────
    const orgIdentity = await ensureEntityIdentity(admin, 'organization', staff.orgId);
    const patientIdentity = await ensureEntityIdentity(admin, 'patient', record.patient_id);

    // ── Build the MedicalClearanceData payload ──────────────────
    const data = buildMedicalClearanceData({
      orgDid: orgIdentity.did,
      orgName: staff.orgName,
      encounterDate: new Date().toISOString().slice(0, 10),
      purpose: record.purpose as Parameters<typeof buildMedicalClearanceData>[0]['purpose'],
      fitnessStatus: record.fitness_status as Parameters<typeof buildMedicalClearanceData>[0]['fitnessStatus'],
      restrictions: Array.isArray(record.restrictions) ? (record.restrictions as string[]) : undefined,
      findings: Array.isArray(record.findings) ? (record.findings as Array<Record<string, unknown>>) : undefined,
      destinationCountry: record.destination_country ?? undefined,
      validUntil: record.valid_until ?? undefined,
    });

    // ── Issue the MedicalClearanceCredential (INSERT-only) ──────
    const credential = await issueCredential(admin, {
      issuer: { kind: 'organization', id: staff.orgId, name: staff.orgName },
      subjectDid: patientIdentity.did,
      type: 'medical_clearance',
      data,
    });

    // No rebuildProjections — no projection table; wallet surfacing deferred.

    // ── Update clearance record to signed (typed update, no as never) ──
    const { error: updErr } = await admin
      .from('clearance_records')
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
        medicalClearanceVcId: credential.vcId,
        patientDid: patientIdentity.did,
        orgDid: orgIdentity.did,
      },
    });
  } catch (err) {
    console.error('[continuity/sign] Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
