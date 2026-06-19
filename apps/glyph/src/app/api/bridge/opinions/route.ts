import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { createOwnedPatient } from '@/lib/services/organizations';
import { buildOpinionRow } from '@/lib/services/bridge-logic';
import { shapeStaffSession, requireOrgType } from '@/lib/services/staff-logic';
import type { Database } from '@/lib/supabase/types';

/** POST /api/bridge/opinions — create a draft specialist opinion record for a known or walk-in patient. */
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

  // Resolve the staff session via RLS-scoped memberships (proves specialist_panel membership).
  const { data: memRows } = await userClient
    .from('memberships')
    .select('user_id, role, organizations(id, name, org_type)');
  const staff = shapeStaffSession(memRows as never);
  if (!staff) return NextResponse.json({ success: false, error: 'Not a program member' }, { status: 403 });
  if (!requireOrgType(staff, 'specialist_panel')) {
    return NextResponse.json({ success: false, error: 'Access restricted to specialist panel members' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const { patientName, phone, age, existingPatientId } = (body ?? {}) as {
    patientName?: string; phone?: string; age?: number; existingPatientId?: string;
  };

  const admin = createAdminClient();

  // Patient resolution: an explicit known patient (must belong to this specialist panel),
  // a phone match within the panel, or a new provisional patient owned by the panel.
  let patientId: string | null = null;
  if (existingPatientId) {
    const { data: owned } = await admin
      .from('patients').select('id').eq('id', existingPatientId).eq('owner_org_id', staff.orgId).maybeSingle();
    if (!owned) return NextResponse.json({ success: false, error: 'Patient not in this specialist panel org' }, { status: 403 });
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
      age: age ?? null, gender: null,
    });
    patientId = created.id;
  }

  const row = buildOpinionRow({
    ownerOrgId: staff.orgId,
    patientId,
    createdBy: user.id,
  });
  const { data: opinion, error } = await admin.from('specialist_opinions').insert(row).select('id').single();
  if (error || !opinion) return NextResponse.json({ success: false, error: error?.message ?? 'insert failed' }, { status: 500 });

  return NextResponse.json({ success: true, data: { opinionId: opinion.id, patientId } });
}
