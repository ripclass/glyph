import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { shapeStaffSession, canEnterResults } from '@/lib/services/staff-logic';
import { normalizeRawItem } from '@/lib/services/lens-logic';
import type { Database } from '@/lib/supabase/types';

async function resolveStaffOrder(authHeader: string, orderId: string) {
  const userClient = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: 'Invalid token', status: 401 as const };
  const { data: memRows } = await userClient
    .from('memberships').select('user_id, role, organizations(id, name, org_type)');
  const staff = shapeStaffSession(memRows as never);
  if (!staff) return { error: 'Not a centre member', status: 403 as const };
  const admin = createAdminClient();
  const { data: order } = await admin
    .from('lab_orders').select('*').eq('id', orderId).eq('owner_org_id', staff.orgId).maybeSingle();
  if (!order) return { error: 'Order not found in this centre', status: 404 as const };
  return { user, staff, admin, order };
}

/** POST /api/center/orders/[id]/results — save a draft of entered/extracted results. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ success: false, error: 'Missing authorization header' }, { status: 401 });
  const ctx = await resolveStaffOrder(authHeader, params.id);
  if ('error' in ctx) return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });
  const { staff, admin, order } = ctx;

  if (!canEnterResults(staff.role)) return NextResponse.json({ success: false, error: 'Role cannot enter results' }, { status: 403 });
  if (order.credential_id) return NextResponse.json({ success: false, error: 'Order is signed and frozen' }, { status: 409 });

  const body = await req.json();
  const rawItems: Array<Record<string, unknown>> = Array.isArray(body?.rawResults) ? body.rawResults : [];
  let normalized;
  try {
    normalized = rawItems.map(normalizeRawItem);
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'bad result item' }, { status: 400 });
  }

  const { error } = await admin
    .from('lab_orders')
    .update({
      raw_results: normalized as never,
      result_image_path: body?.resultImagePath ?? order.result_image_path ?? null,
      resulted_by: ctx.user.id,
      resulted_at: new Date().toISOString(),
      status: 'resulted',
    })
    .eq('id', order.id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data: { rawResults: normalized } });
}
