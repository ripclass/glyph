import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { shapeStaffSession, requireOrgType, canEnterResults } from '@/lib/services/staff-logic';
import type { Database, Json } from '@/lib/supabase/types';

type SpecialistOpinionUpdate = Database['public']['Tables']['specialist_opinions']['Update'];

async function resolveStaffOpinion(authHeader: string, opinionId: string) {
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
  if (!staff) return { error: 'Not a specialist panel member', status: 403 as const };
  if (!requireOrgType(staff, 'specialist_panel')) {
    return { error: 'Access restricted to specialist panel members', status: 403 as const };
  }
  const admin = createAdminClient();
  const { data: opinion } = await admin
    .from('specialist_opinions')
    .select('*')
    .eq('id', opinionId)
    .eq('owner_org_id', staff.orgId)
    .maybeSingle();
  if (!opinion) return { error: 'Specialist opinion not found in this panel org', status: 404 as const };
  return { user, staff, admin, opinion };
}

/** POST /api/bridge/opinions/[id] — save clinical fields onto a draft specialist opinion. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ success: false, error: 'Missing authorization header' }, { status: 401 });

  const ctx = await resolveStaffOpinion(authHeader, params.id);
  if ('error' in ctx) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });
  const { admin, opinion } = ctx;

  // Role gate: only technologist/signatory/owner/admin may write clinical data
  if (!canEnterResults(ctx.staff.role)) {
    return NextResponse.json({ success: false, error: 'Role cannot enter opinion data' }, { status: 403 });
  }
  // Freeze gate: signed records are immutable (credential_id set)
  if (opinion.credential_id) {
    return NextResponse.json({ success: false, error: 'Opinion is signed and frozen' }, { status: 409 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  // Shape-guards: array fields must be arrays if provided
  const rawPresentedRecordRefs = body.presented_record_refs;
  if (rawPresentedRecordRefs !== undefined && rawPresentedRecordRefs !== null && !Array.isArray(rawPresentedRecordRefs)) {
    return NextResponse.json({ success: false, error: 'presented_record_refs must be an array' }, { status: 400 });
  }
  const rawRecommendations = body.recommendations;
  if (rawRecommendations !== undefined && rawRecommendations !== null && !Array.isArray(rawRecommendations)) {
    return NextResponse.json({ success: false, error: 'recommendations must be an array' }, { status: 400 });
  }
  const rawDifferentialDiagnosis = body.differential_diagnosis;
  if (rawDifferentialDiagnosis !== undefined && rawDifferentialDiagnosis !== null && !Array.isArray(rawDifferentialDiagnosis)) {
    return NextResponse.json({ success: false, error: 'differential_diagnosis must be an array' }, { status: 400 });
  }

  // Build typed patch — no as-never cast; specialist_opinions Update type is fully generated
  const patch: SpecialistOpinionUpdate = {};
  if (body.specialty !== undefined)            patch.specialty            = (body.specialty as string | null) || null;
  if (body.referral_reason !== undefined)      patch.referral_reason      = (body.referral_reason as string | null) || null;
  if (body.opinion !== undefined)              patch.opinion              = (body.opinion as string | null) || null;
  if (rawPresentedRecordRefs !== undefined)    patch.presented_record_refs = rawPresentedRecordRefs as Json;
  if (rawRecommendations !== undefined)        patch.recommendations      = rawRecommendations as Json;
  if (rawDifferentialDiagnosis !== undefined)  patch.differential_diagnosis = rawDifferentialDiagnosis as Json;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
  }

  const { data: updated, error } = await admin
    .from('specialist_opinions')
    .update(patch)
    .eq('id', opinion.id)
    .select()
    .single();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data: updated });
}
