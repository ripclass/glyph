/**
 * @fileoverview Public waitlist signup endpoint for the marketing landing
 * page. The ONE route in the app that is deliberately unauthenticated —
 * it accepts a name + phone from strangers, so it trusts nothing:
 *
 *   * validation/normalization in pure `waitlist-logic` (unit-tested)
 *   * honeypot submissions get a fake success (bots learn nothing)
 *   * duplicate phones get a real success (idempotent — "you're on the
 *     list" is true either way, and enumeration reveals nothing useful)
 *   * writes go through the service-role client; the table has RLS
 *     enabled with zero policies, so PostgREST/anon can never touch it
 *
 * @module app/api/waitlist/route
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateWaitlistInput } from '@/lib/services/waitlist-logic';

export const runtime = 'nodejs';

/** Postgres unique_violation — duplicate phone re-signup */
const UNIQUE_VIOLATION = '23505';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = validateWaitlistInput(body);

  if (!result.ok) {
    if (result.code === 'bot') {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { success: false, error: result.error, code: result.code },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from('waitlist_signups').insert(result.row);

  if (error && error.code !== UNIQUE_VIOLATION) {
    console.error('[waitlist] insert failed:', error.code, error.message);
    return NextResponse.json(
      { success: false, error: 'Temporary problem — please try again shortly', code: 'server_error' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
