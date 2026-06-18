import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { createOwnedPatient } from '@/lib/services/organizations';
import { buildLabOrderRow } from '@/lib/services/lens-logic';
import { shapeStaffSession } from '@/lib/services/staff-logic';
import type { Database } from '@/lib/supabase/types';

/** POST /api/center/orders — create an order for a known or walk-in patient. */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ success: false, error: 'Missing authorization header' }, { status: 401 });

  const userClient = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

  // Resolve the staff session via RLS-scoped memberships (proves centre membership).
  const { data: memRows } = await userClient
    .from('memberships')
    .select('user_id, role, organizations(id, name, org_type)');
  const staff = shapeStaffSession(memRows as never);
  if (!staff) return NextResponse.json({ success: false, error: 'Not a diagnostic centre member' }, { status: 403 });

  const body = await req.json();
  const { patientName, phone, age, gender, testCategory, existingPatientId } = body ?? {};
  if (!testCategory) return NextResponse.json({ success: false, error: 'testCategory is required' }, { status: 400 });

  const admin = createAdminClient();

  // Patient resolution: an explicit known patient (must belong to this centre),
  // a phone match within the centre, or a new provisional patient owned by the centre.
  let patientId: string | null = null;
  if (existingPatientId) {
    const { data: owned } = await admin
      .from('patients').select('id').eq('id', existingPatientId).eq('owner_org_id', staff.orgId).maybeSingle();
    if (!owned) return NextResponse.json({ success: false, error: 'Patient not in this centre' }, { status: 403 });
    patientId = owned.id;
  } else if (phone) {
    const { data: match } = await admin
      .from('patients').select('id').eq('owner_org_id', staff.orgId).eq('phone', phone).maybeSingle();
    patientId = match?.id ?? null;
  }
  if (!patientId) {
    if (!patientName) return NextResponse.json({ success: false, error: 'patientName is required for a new patient' }, { status: 400 });
    const created = await createOwnedPatient(admin, {
      ownerOrgId: staff.orgId, name: patientName, phone: phone ?? null,
      age: age ?? null, gender: gender ?? null,
    });
    patientId = created.id;
  }

  const row = buildLabOrderRow({ ownerOrgId: staff.orgId, patientId, testCategory, orderedBy: user.id });
  const { data: order, error } = await admin.from('lab_orders').insert(row).select('id').single();
  if (error || !order) return NextResponse.json({ success: false, error: error?.message ?? 'insert failed' }, { status: 500 });

  return NextResponse.json({ success: true, data: { orderId: order.id, patientId } });
}
