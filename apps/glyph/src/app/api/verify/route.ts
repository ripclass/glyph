/**
 * @fileoverview Credential verification endpoint — the local fast-path that
 * M5's two-node loop (doctor issues → pharmacy verifies) builds on.
 *
 * POST { vcId: string }  — verify a credential from the canonical store
 * POST { vc: object }    — verify a presented VC (e.g. from a wallet export)
 *
 * Issuer DID documents resolve from our own did_documents table first
 * (fast, free, offline-tolerant); falls back to HTTPS did:web resolution
 * for external issuers. Also reports the store's status (revoked /
 * superseded) when the credential is known to us — signature validity alone
 * is not the whole truth.
 *
 * Auth required (network participants only, for now).
 *
 * @module app/api/verify/route
 */

import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  verifyCredential,
  type DIDDocument,
  type VerifiableCredential,
} from '@kham/identity';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // ── Auth (same pattern as the edge functions) ─────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json(
      { success: false, error: 'Missing authorization header' },
      { status: 401 }
    );
  }

  const userClient = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
  );
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  }

  // ── Load the VC ───────────────────────────────────────────────
  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();

  let vc: VerifiableCredential | null = null;
  let storeStatus: string | null = null;

  if (typeof body.vcId === 'string') {
    const { data } = await admin
      .from('credentials')
      .select('credential_json, status')
      .eq('vc_id', body.vcId)
      .maybeSingle();
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Credential not found' },
        { status: 404 }
      );
    }
    vc = data.credential_json as unknown as VerifiableCredential;
    storeStatus = data.status;
  } else if (body.vc && typeof body.vc === 'object') {
    vc = body.vc as VerifiableCredential;
    const { data } = await admin
      .from('credentials')
      .select('status')
      .eq('vc_id', vc.id)
      .maybeSingle();
    storeStatus = data?.status ?? null;
  } else {
    return NextResponse.json(
      { success: false, error: 'Provide vcId or vc' },
      { status: 400 }
    );
  }

  // ── Verify, resolving issuers from our own store first ────────
  const result = await verifyCredential(vc, {
    resolveIssuer: async (did) => {
      const { data } = await admin
        .from('did_documents')
        .select('document')
        .eq('did', did)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data?.document as unknown as DIDDocument) ?? null;
    },
  });

  const revoked = storeStatus === 'revoked' || storeStatus === 'superseded';

  return NextResponse.json({
    success: true,
    data: {
      ...result,
      /** Status in the canonical store, when this VC is known to it */
      storeStatus,
      /** The overall verdict a consumer should act on */
      acceptable: result.valid && !revoked,
    },
  });
}
