import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { createOwnedPatient } from '@/lib/services/organizations';
import { buildDischargeRecordRow } from '@/lib/services/hospital-logic';
import { shapeStaffSession, requireOrgType } from '@/lib/services/staff-logic';
import type { Database } from '@/lib/supabase/types';

/** POST /api/hospital/discharges — create a draft discharge record for a known or walk-in patient. */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ success: false, error: 'Missing authorization header' }, { status: 401 });

  const userClient = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

  // Resolve the staff session via RLS-scoped memberships (proves hospital membership).
  const { data: memRows } = await userClient
    .from('memberships')
    .select('user_id, role, organizations(id, name, org_type)');
  const staff = shapeStaffSession(memRows as never);
  if (!staff) return NextResponse.json({ success: false, error: 'Not a hospital member' }, { status: 403 });
  if (!requireOrgType(staff, 'hospital')) {
    return NextResponse.json({ success: false, error: 'Access restricted to hospital members' }, { status: 403 });
  }

  const body = await req.json();
  const { patientName, phone, age, gender, admissionDate, dischargeDate, existingPatientId } = body ?? {};

  const admin = createAdminClient();

  // Patient resolution: an explicit known patient (must belong to this hospital),
  // a phone match within the hospital, or a new provisional patient owned by the hospital.
  let patientId: string | null = null;
  if (existingPatientId) {
    const { data: owned } = await admin
      .from('patients').select('id').eq('id', existingPatientId).eq('owner_org_id', staff.orgId).maybeSingle();
    if (!owned) return NextResponse.json({ success: false, error: 'Patient not in this hospital' }, { status: 403 });
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

  const row = buildDischargeRecordRow({
    ownerOrgId: staff.orgId,
    patientId,
    createdBy: user.id,
    admissionDate: admissionDate ?? null,
    dischargeDate: dischargeDate ?? null,
  });
  const { data: discharge, error } = await admin.from('discharge_records').insert(row).select('id').single();
  if (error || !discharge) return NextResponse.json({ success: false, error: error?.message ?? 'insert failed' }, { status: 500 });

  return NextResponse.json({ success: true, data: { dischargeId: discharge.id, patientId } });
}
