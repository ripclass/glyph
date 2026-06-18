/**
 * @fileoverview Sign a lab order — issue the LabResult credential (issuer = org DID)
 * and project the frozen lab_reports row the wallet reads.
 *
 * POST /api/center/orders/[id]/sign
 *
 * Mirrors the approve-note route's mint pattern:
 *   auth → ensureEntityIdentity → issueCredential → rebuildProjections → status update.
 * Issuer = the centre organisation's DID (founder decision; organisations are
 * DID-bearing since migration 011). Subject = the patient DID (R1).
 * One-shot: 409 when order.credential_id is already set.
 *
 * @module app/api/center/orders/[id]/sign/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureEntityIdentity } from '@/lib/identity/ensure-identity';
import { issueCredential } from '@/lib/identity/issue';
import { rebuildProjections } from '@/lib/identity/projections';
import { shapeStaffSession, canSign } from '@/lib/services/staff-logic';
import { buildLabResultData } from '@/lib/services/lens-logic';
import type { Database } from '@/lib/supabase/types';

export const runtime = 'nodejs';

/** POST /api/center/orders/[id]/sign — issue the LabResult credential (issuer=org). */
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

    // ── Centre session (membership + org) ──────────────────────
    const { data: memRows } = await userClient
      .from('memberships')
      .select('user_id, role, organizations(id, name, org_type)');
    const staff = shapeStaffSession(memRows as never);
    if (!staff) {
      return NextResponse.json({ success: false, error: 'Not a centre member' }, { status: 403 });
    }
    if (!canSign(staff.role)) {
      return NextResponse.json({ success: false, error: 'Role cannot sign' }, { status: 403 });
    }

    const admin = createAdminClient();

    // ── Load order (scoped to this centre's org) ────────────────
    const { data: order } = await admin
      .from('lab_orders')
      .select('*')
      .eq('id', params.id)
      .eq('owner_org_id', staff.orgId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // One-shot guard: amendments must issue a replacement credential, not re-sign.
    if (order.credential_id) {
      return NextResponse.json(
        { success: false, error: 'Order already signed; amend via a replacement credential' },
        { status: 409 }
      );
    }

    const normalized = (order.normalized_results as unknown[]) ?? [];
    if (!normalized.length) {
      return NextResponse.json(
        { success: false, error: 'Normalize results before signing' },
        { status: 400 }
      );
    }

    // ── Ensure DIDs (issuer = org, subject = patient) ───────────
    const orgIdentity = await ensureEntityIdentity(admin, 'organization', staff.orgId);
    const patientIdentity = await ensureEntityIdentity(admin, 'patient', order.patient_id);

    // ── Build the LabResultData payload ─────────────────────────
    // orgIdentity is already resolved above; pass the real did:web:... DID so
    // the immutable credential payload's lab.did matches the actual issuer DID.
    const data = buildLabResultData({
      orgDid: orgIdentity.did,
      orgName: staff.orgName,
      testCategory: order.test_category,
      reportDate: (
        (order.resulted_at as string | null) ??
        (order.created_at as string | null) ??
        new Date().toISOString()
      ).slice(0, 10),
      normalized: normalized as Parameters<typeof buildLabResultData>[0]['normalized'],
    });

    // ── Issue the LabResultCredential (INSERT-only) ─────────────
    const credential = await issueCredential(admin, {
      issuer: { kind: 'organization', id: staff.orgId, name: staff.orgName },
      subjectDid: patientIdentity.did,
      type: 'lab_result',
      data,
    });

    // ── Project: rebuild the frozen lab_reports row ─────────────
    const projection = await rebuildProjections(admin, patientIdentity.did);

    // Resolve the lab_reports row id for the order back-link.
    const { data: labRow } = await admin
      .from('lab_reports')
      .select('id')
      .eq('credential_id', credential.rowId)
      .maybeSingle();

    // ── Update order to signed ───────────────────────────────────
    const { error: updErr } = await admin
      .from('lab_orders')
      .update({
        status: 'signed',
        signatory_user_id: user.id,
        signed_at: new Date().toISOString(),
        credential_id: credential.rowId,
        lab_report_id: labRow?.id ?? null,
      })
      .eq('id', order.id);

    if (updErr) {
      return NextResponse.json(
        { success: false, error: updErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        labResultVcId: credential.vcId,
        patientDid: patientIdentity.did,
        orgDid: orgIdentity.did,
        projection,
      },
    });
  } catch (err) {
    console.error('[sign] Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
