import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { shapeStaffSession, requireOrgType, canEnterResults } from '@/lib/services/staff-logic';
import type { Database } from '@/lib/supabase/types';

async function resolveStaffAssessment(authHeader: string, assessmentId: string) {
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
  if (!staff) return { error: 'Not an employer member', status: 403 as const };
  if (!requireOrgType(staff, 'employer')) {
    return { error: 'Access restricted to employer members', status: 403 as const };
  }
  const admin = createAdminClient();
  const { data: assessment } = await admin
    .from('occupational_assessments')
    .select('*')
    .eq('id', assessmentId)
    .eq('owner_org_id', staff.orgId)
    .maybeSingle();
  if (!assessment) return { error: 'Assessment not found in this employer org', status: 404 as const };
  return { user, staff, admin, assessment };
}

/** POST /api/apa/assessments/[id] — save assessment fields onto a draft record. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ success: false, error: 'Missing authorization header' }, { status: 401 });

  const ctx = await resolveStaffAssessment(authHeader, params.id);
  if ('error' in ctx) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });
  const { admin, assessment } = ctx;

  // Role gate: only technologist/signatory/owner/admin may write assessment data
  if (!canEnterResults(ctx.staff.role)) {
    return NextResponse.json({ success: false, error: 'Role cannot enter assessment data' }, { status: 403 });
  }
  // Freeze gate: signed records are immutable (credential_id set)
  if ((assessment as { credential_id?: string | null }).credential_id) {
    return NextResponse.json({ success: false, error: 'Assessment is signed and frozen' }, { status: 409 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  // Shape-guard: array fields must be arrays if provided
  const rawExposures = body.exposures;
  if (rawExposures !== undefined && rawExposures !== null && !Array.isArray(rawExposures)) {
    return NextResponse.json({ success: false, error: 'exposures must be an array' }, { status: 400 });
  }
  const rawFindings = body.findings;
  if (rawFindings !== undefined && rawFindings !== null && !Array.isArray(rawFindings)) {
    return NextResponse.json({ success: false, error: 'findings must be an array' }, { status: 400 });
  }
  const rawRestrictions = body.restrictions;
  if (rawRestrictions !== undefined && rawRestrictions !== null && !Array.isArray(rawRestrictions)) {
    return NextResponse.json({ success: false, error: 'restrictions must be an array' }, { status: 400 });
  }
  const rawRecommendations = body.recommendations;
  if (rawRecommendations !== undefined && rawRecommendations !== null && !Array.isArray(rawRecommendations)) {
    return NextResponse.json({ success: false, error: 'recommendations must be an array' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.assessment_type !== undefined)  patch.assessment_type  = body.assessment_type;
  if (rawExposures !== undefined)          patch.exposures        = rawExposures;
  if (rawFindings !== undefined)           patch.findings         = rawFindings;
  if (body.fitness_for_role !== undefined) patch.fitness_for_role = body.fitness_for_role;
  if (rawRestrictions !== undefined)       patch.restrictions     = rawRestrictions;
  if (rawRecommendations !== undefined)    patch.recommendations  = rawRecommendations;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
  }

  const { data: updated, error } = await admin
    .from('occupational_assessments')
    .update(patch as never)
    .eq('id', (assessment as { id: string }).id)
    .select()
    .single();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data: updated });
}
