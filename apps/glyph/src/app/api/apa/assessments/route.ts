import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { createOwnedPatient } from '@/lib/services/organizations';
import { buildAssessmentRow } from '@/lib/services/apa-logic';
import { shapeStaffSession, requireOrgType } from '@/lib/services/staff-logic';
import type { Database } from '@/lib/supabase/types';

/** POST /api/apa/assessments — create a draft occupational assessment for a known or walk-in worker. */
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

  // Resolve the staff session via RLS-scoped memberships (proves employer membership).
  const { data: memRows } = await userClient
    .from('memberships')
    .select('user_id, role, organizations(id, name, org_type)');
  const staff = shapeStaffSession(memRows as never);
  if (!staff) return NextResponse.json({ success: false, error: 'Not an employer member' }, { status: 403 });
  if (!requireOrgType(staff, 'employer')) {
    return NextResponse.json({ success: false, error: 'Access restricted to employer members' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const { patientName, phone, age, gender, assessmentType, existingPatientId } = (body ?? {}) as {
    patientName?: string; phone?: string; age?: number;
    gender?: 'male' | 'female' | 'other' | null;
    assessmentType?: string; existingPatientId?: string;
  };

  const admin = createAdminClient();

  // Worker resolution: an explicit known worker (must belong to this employer),
  // a phone match within the employer, or a new provisional worker owned by the employer.
  let patientId: string | null = null;
  if (existingPatientId) {
    const { data: owned } = await admin
      .from('patients').select('id').eq('id', existingPatientId).eq('owner_org_id', staff.orgId).maybeSingle();
    if (!owned) return NextResponse.json({ success: false, error: 'Worker not in this employer org' }, { status: 403 });
    patientId = owned.id;
  } else if (phone) {
    const { data: match } = await admin
      .from('patients').select('id').eq('owner_org_id', staff.orgId).eq('phone', phone).maybeSingle();
    patientId = match?.id ?? null;
  }
  if (!patientId) {
    if (!patientName) return NextResponse.json({ success: false, error: 'patientName is required for a new worker' }, { status: 400 });
    const created = await createOwnedPatient(admin, {
      ownerOrgId: staff.orgId, name: patientName, phone: phone ?? null,
      age: age ?? null, gender: gender ?? null,
    });
    patientId = created.id;
  }

  const row = buildAssessmentRow({
    ownerOrgId: staff.orgId,
    patientId,
    createdBy: user.id,
  });
  // Attach assessment_type at creation if provided
  const insertRow = assessmentType ? { ...row, assessment_type: assessmentType } : row;
  const { data: assessment, error } = await admin.from('occupational_assessments').insert(insertRow as never).select('id').single();
  if (error || !assessment) return NextResponse.json({ success: false, error: error?.message ?? 'insert failed' }, { status: 500 });

  return NextResponse.json({ success: true, data: { assessmentId: (assessment as { id: string }).id, patientId } });
}
