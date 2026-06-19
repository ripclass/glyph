import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { shapeStaffSession, requireOrgType, canEnterResults } from '@/lib/services/staff-logic';
import type { Database, Json } from '@/lib/supabase/types';

type AntenatalVisitUpdate = Database['public']['Tables']['antenatal_visits']['Update'];

async function resolveStaffVisit(authHeader: string, visitId: string) {
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
  if (!staff) return { error: 'Not a program member', status: 403 as const };
  if (!requireOrgType(staff, 'program')) {
    return { error: 'Access restricted to program members', status: 403 as const };
  }
  const admin = createAdminClient();
  const { data: visit } = await admin
    .from('antenatal_visits')
    .select('*')
    .eq('id', visitId)
    .eq('owner_org_id', staff.orgId)
    .maybeSingle();
  if (!visit) return { error: 'Antenatal visit not found in this program org', status: 404 as const };
  return { user, staff, admin, visit };
}

/** POST /api/maa/visits/[id] — save clinical fields onto a draft antenatal visit. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ success: false, error: 'Missing authorization header' }, { status: 401 });

  const ctx = await resolveStaffVisit(authHeader, params.id);
  if ('error' in ctx) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });
  const { admin, visit } = ctx;

  // Role gate: only technologist/signatory/owner/admin may write clinical data
  if (!canEnterResults(ctx.staff.role)) {
    return NextResponse.json({ success: false, error: 'Role cannot enter visit data' }, { status: 403 });
  }
  // Freeze gate: signed records are immutable (credential_id set)
  if (visit.credential_id) {
    return NextResponse.json({ success: false, error: 'Visit is signed and frozen' }, { status: 409 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  // Shape-guard: risk_flags must be an array if provided
  const rawRiskFlags = body.risk_flags;
  if (rawRiskFlags !== undefined && rawRiskFlags !== null && !Array.isArray(rawRiskFlags)) {
    return NextResponse.json({ success: false, error: 'risk_flags must be an array' }, { status: 400 });
  }

  // Numeric coercion helpers — coerce to Number or null; reject NaN
  function toNum(v: unknown): number | null {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }
  function toInt(v: unknown): number | null {
    const n = toNum(v);
    return n === null ? null : Math.round(n);
  }

  // Build typed patch — no as-never cast; antenatal_visits Update type is fully generated
  const patch: AntenatalVisitUpdate = {};
  if (body.visit_number !== undefined)          patch.visit_number          = toInt(body.visit_number);
  if (body.gestational_age_weeks !== undefined) patch.gestational_age_weeks = toNum(body.gestational_age_weeks);
  if (body.lmp !== undefined)                   patch.lmp                   = (body.lmp as string | null) || null;
  if (body.edd !== undefined)                   patch.edd                   = (body.edd as string | null) || null;
  if (body.blood_pressure !== undefined)        patch.blood_pressure        = (body.blood_pressure as string | null) || null;
  if (body.weight_kg !== undefined)             patch.weight_kg             = toNum(body.weight_kg);
  if (body.fundal_height_cm !== undefined)      patch.fundal_height_cm      = toNum(body.fundal_height_cm);
  if (body.fetal_heart_rate_bpm !== undefined)  patch.fetal_heart_rate_bpm  = toInt(body.fetal_heart_rate_bpm);
  if (rawRiskFlags !== undefined)               patch.risk_flags            = rawRiskFlags as Json;
  if (body.next_visit_date !== undefined)       patch.next_visit_date       = (body.next_visit_date as string | null) || null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
  }

  const { data: updated, error } = await admin
    .from('antenatal_visits')
    .update(patch)
    .eq('id', visit.id)
    .select()
    .single();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data: updated });
}
