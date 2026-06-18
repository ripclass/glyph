import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { shapeStaffSession, canEnterResults } from '@/lib/services/staff-logic';
import type { Database } from '@/lib/supabase/types';

/** POST /api/center/orders/[id]/normalize — run AI normalize+sanity, persist. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ success: false, error: 'Missing authorization header' }, { status: 401 });

  const userClient = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  const { data: memRows } = await userClient
    .from('memberships').select('user_id, role, organizations(id, name, org_type)');
  const staff = shapeStaffSession(memRows as never);
  if (!staff || !canEnterResults(staff.role)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  const { data: order } = await admin
    .from('lab_orders').select('*, patients(age, gender)').eq('id', params.id).eq('owner_org_id', staff.orgId).maybeSingle();
  if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  if (order.credential_id) return NextResponse.json({ success: false, error: 'Order is signed' }, { status: 409 });
  if (!Array.isArray(order.raw_results) || order.raw_results.length === 0) {
    return NextResponse.json({ success: false, error: 'Enter results before normalizing' }, { status: 400 });
  }

  // Tier A: send ONLY de-identified structured context (age/gender), never name/phone.
  const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/lens-normalize`;
  const llmRes = await fetch(fnUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LENS_SHARED_SECRET}` },
    body: JSON.stringify({
      orderId: order.id,
      testCategory: order.test_category,
      rawResults: order.raw_results,
      patientContext: { age: (order as any).patients?.age ?? null, gender: (order as any).patients?.gender ?? null },
    }),
  });
  const llmJson = await llmRes.json();
  if (!llmJson.success) return NextResponse.json({ success: false, error: llmJson.error ?? 'normalize failed' }, { status: 502 });

  const { error } = await admin
    .from('lab_orders')
    .update({
      normalized_results: llmJson.data.normalized ?? [],
      sanity_flags: llmJson.data.sanityFlags ?? [],
      normalized_at: new Date().toISOString(),
    })
    .eq('id', order.id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data: { normalized: llmJson.data.normalized, sanityFlags: llmJson.data.sanityFlags } });
}
