import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { shapeStaffSession, requireOrgType, canEnterResults } from '@/lib/services/staff-logic';
import type { Database, Json } from '@/lib/supabase/types';

type ClearanceUpdate = Database['public']['Tables']['clearance_records']['Update'];

async function resolveStaffClearance(authHeader: string, clearanceId: string) {
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
  if (!staff) return { error: 'Not a recruiter member', status: 403 as const };
  if (!requireOrgType(staff, 'recruiter')) {
    return { error: 'Access restricted to recruiter members', status: 403 as const };
  }
  const admin = createAdminClient();
  const { data: clearance } = await admin
    .from('clearance_records')
    .select('*')
    .eq('id', clearanceId)
    .eq('owner_org_id', staff.orgId)
    .maybeSingle();
  if (!clearance) return { error: 'Clearance not found in this recruiter org', status: 404 as const };
  return { user, staff, admin, clearance };
}

/** POST /api/continuity/clearances/[id] — save clearance fields onto a draft record. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ success: false, error: 'Missing authorization header' }, { status: 401 });

  const ctx = await resolveStaffClearance(authHeader, params.id);
  if ('error' in ctx) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });
  const { admin, clearance } = ctx;

  // Role gate: only technologist/signatory/owner/admin may write clearance data
  if (!canEnterResults(ctx.staff.role)) {
    return NextResponse.json({ success: false, error: 'Role cannot enter clearance data' }, { status: 403 });
  }
  // Freeze gate: signed records are immutable (credential_id set)
  if (clearance.credential_id) {
    return NextResponse.json({ success: false, error: 'Clearance is signed and frozen' }, { status: 409 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  // Shape-guard: array fields must be arrays if provided
  const rawRestrictions = body.restrictions;
  if (rawRestrictions !== undefined && rawRestrictions !== null && !Array.isArray(rawRestrictions)) {
    return NextResponse.json({ success: false, error: 'restrictions must be an array' }, { status: 400 });
  }
  const rawFindings = body.findings;
  if (rawFindings !== undefined && rawFindings !== null && !Array.isArray(rawFindings)) {
    return NextResponse.json({ success: false, error: 'findings must be an array' }, { status: 400 });
  }

  // Build typed patch — no as-never cast; clearance_records Update type is fully generated
  const patch: ClearanceUpdate = {};
  if (body.purpose !== undefined)              patch.purpose             = body.purpose as string | null;
  if (body.fitness_status !== undefined)       patch.fitness_status      = body.fitness_status as string | null;
  if (rawRestrictions !== undefined)           patch.restrictions        = rawRestrictions as Json;
  if (rawFindings !== undefined)               patch.findings            = rawFindings as Json;
  if (body.destination_country !== undefined)  patch.destination_country = body.destination_country as string | null;
  if (body.valid_until !== undefined)          patch.valid_until         = body.valid_until as string | null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
  }

  const { data: updated, error } = await admin
    .from('clearance_records')
    .update(patch)
    .eq('id', clearance.id)
    .select()
    .single();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data: updated });
}
