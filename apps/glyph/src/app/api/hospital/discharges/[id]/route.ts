import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { shapeStaffSession, requireOrgType, canEnterResults } from '@/lib/services/staff-logic';
import type { Database } from '@/lib/supabase/types';

async function resolveStaffDischarge(authHeader: string, dischargeId: string) {
  const userClient = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: 'Invalid token', status: 401 as const };
  const { data: memRows } = await userClient
    .from('memberships').select('user_id, role, organizations(id, name, org_type)');
  const staff = shapeStaffSession(memRows as never);
  if (!staff) return { error: 'Not a hospital member', status: 403 as const };
  if (!requireOrgType(staff, 'hospital')) {
    return { error: 'Access restricted to hospital members', status: 403 as const };
  }
  const admin = createAdminClient();
  const { data: discharge } = await admin
    .from('discharge_records')
    .select('*')
    .eq('id', dischargeId)
    .eq('owner_org_id', staff.orgId)
    .maybeSingle();
  if (!discharge) return { error: 'Discharge record not found in this hospital', status: 404 as const };
  return { user, staff, admin, discharge };
}

/** POST /api/hospital/discharges/[id] — save discharge summary fields onto a draft record. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ success: false, error: 'Missing authorization header' }, { status: 401 });

  const ctx = await resolveStaffDischarge(authHeader, params.id);
  if ('error' in ctx) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });
  const { admin, discharge } = ctx;

  // Role gate: only technologist/signatory/owner/admin may write summary data
  if (!canEnterResults(ctx.staff.role)) {
    return NextResponse.json({ success: false, error: 'Role cannot enter discharge summary' }, { status: 403 });
  }
  // Freeze gate: signed records are immutable (credential_id set)
  if (discharge.credential_id) {
    return NextResponse.json({ success: false, error: 'Discharge record is signed and frozen' }, { status: 409 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  // Shape-guard: discharge_diagnosis must be an array if provided
  const rawDiagnosis = body.discharge_diagnosis;
  if (rawDiagnosis !== undefined && rawDiagnosis !== null && !Array.isArray(rawDiagnosis)) {
    return NextResponse.json({ success: false, error: 'discharge_diagnosis must be an array' }, { status: 400 });
  }
  const rawMedications = body.discharge_medications;
  if (rawMedications !== undefined && rawMedications !== null && !Array.isArray(rawMedications)) {
    return NextResponse.json({ success: false, error: 'discharge_medications must be an array' }, { status: 400 });
  }
  const rawProcedures = body.procedures;
  if (rawProcedures !== undefined && rawProcedures !== null && !Array.isArray(rawProcedures)) {
    return NextResponse.json({ success: false, error: 'procedures must be an array' }, { status: 400 });
  }
  const rawFollowUp = body.follow_up_instructions;
  if (rawFollowUp !== undefined && rawFollowUp !== null && !Array.isArray(rawFollowUp)) {
    return NextResponse.json({ success: false, error: 'follow_up_instructions must be an array' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (rawDiagnosis !== undefined)       patch.discharge_diagnosis     = rawDiagnosis;
  if (rawMedications !== undefined)     patch.discharge_medications   = rawMedications;
  if (rawProcedures !== undefined)      patch.procedures              = rawProcedures;
  if (rawFollowUp !== undefined)        patch.follow_up_instructions  = rawFollowUp;
  if (body.hospital_course !== undefined)     patch.hospital_course         = body.hospital_course;
  if (body.discharge_condition !== undefined) patch.discharge_condition     = body.discharge_condition;
  if (body.admission_date !== undefined)      patch.admission_date          = body.admission_date;
  if (body.discharge_date !== undefined)      patch.discharge_date          = body.discharge_date;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
  }

  const { data: updated, error } = await admin
    .from('discharge_records')
    .update(patch as never)
    .eq('id', discharge.id)
    .select()
    .single();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data: updated });
}
