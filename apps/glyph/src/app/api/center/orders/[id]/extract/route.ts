import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { shapeStaffSession, canEnterResults } from '@/lib/services/staff-logic';
import { parseImageUpload, normalizeRawItem } from '@/lib/services/lens-logic';
import type { Database } from '@/lib/supabase/types';

export const runtime = 'nodejs';

/**
 * POST /api/center/orders/[id]/extract
 * Upload a lab-report photo (with explicit patient consent) → extract values via
 * extract-document (extractOnly, Tier B) → return normalized rows to pre-fill the
 * UI. Does NOT persist results; the technologist reviews then Saves via /results.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ success: false, error: 'Missing authorization header' }, { status: 401 });

  const userClient = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

  const { data: memRows } = await userClient
    .from('memberships').select('user_id, role, organizations(id, name, org_type)');
  const staff = shapeStaffSession(memRows as never);
  if (!staff || !canEnterResults(staff.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from('lab_orders').select('id, patient_id, credential_id').eq('id', params.id).eq('owner_org_id', staff.orgId).maybeSingle();
  if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  if (order.credential_id) return NextResponse.json({ success: false, error: 'Order is signed and frozen' }, { status: 409 });

  const body = await req.json().catch(() => null);
  if (!body || body.consent !== true) {
    return NextResponse.json({ success: false, error: 'Patient consent is required to process the report image' }, { status: 400 });
  }

  let parsed;
  try {
    parsed = parseImageUpload({ imageBase64: String(body.imageBase64 ?? ''), contentType: String(body.contentType ?? '') });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Invalid image' }, { status: 400 });
  }

  // 1) Record (find-or-create) the image_capture consent for this patient.
  const { data: existingConsent } = await admin
    .from('consent_records')
    .select('id')
    .eq('patient_id', order.patient_id)
    .eq('consent_type', 'image_capture')
    .eq('device_info', 'lens_image_extract')
    .eq('granted', true)
    .is('withdrawn_at', null)
    .maybeSingle();
  let consentId = existingConsent?.id ?? null;
  if (!consentId) {
    const { data: ins, error: consentErr } = await admin
      .from('consent_records')
      .insert({ patient_id: order.patient_id, consent_type: 'image_capture', granted: true, granted_by: 'patient', device_info: 'lens_image_extract' })
      .select('id')
      .single();
    if (consentErr || !ins) return NextResponse.json({ success: false, error: consentErr?.message ?? 'consent insert failed' }, { status: 500 });
    consentId = ins.id;
  }

  // 2) Upload the image to the documents bucket (service-role; centre patients have no clinic).
  const bytes = Buffer.from(parsed.base64, 'base64');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const imageUrl = `lens/${staff.orgId}/${order.patient_id}/${ts}.${parsed.ext}`;
  const { error: upErr } = await admin.storage
    .from('documents')
    .upload(imageUrl, bytes, { contentType: body.contentType, upsert: false });
  if (upErr) return NextResponse.json({ success: false, error: `upload failed: ${upErr.message}` }, { status: 500 });

  // 3) Extract (extractOnly — no DB row written) via extract-document, staff JWT.
  const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/extract-document`;
  const exRes = await fetch(fnUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify({ imageUrl, type: 'lab_report', patientId: order.patient_id, consentId, extractOnly: true }),
  });
  const exJson = await exRes.json().catch(() => ({}));
  if (!exRes.ok || !exJson?.success) {
    return NextResponse.json({ success: false, error: exJson?.error ?? 'extraction failed' }, { status: 502 });
  }

  const extracted = exJson.data ?? {};
  const rawItems: Array<Record<string, unknown>> = Array.isArray(extracted.results) ? extracted.results : [];
  const rawResults = rawItems
    .map((r) => { try { return normalizeRawItem(r); } catch { return null; } })
    .filter(Boolean);

  return NextResponse.json({
    success: true,
    data: {
      rawResults,
      labName: extracted.lab_name ?? null,
      reportDate: extracted.report_date ?? null,
      testCategory: extracted.test_category ?? null,
      confidence: extracted.confidence ?? null,
      note: rawResults.length === 0 ? 'No results could be read from the image' : undefined,
    },
  });
}
