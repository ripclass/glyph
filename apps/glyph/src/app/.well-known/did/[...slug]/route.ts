/**
 * @fileoverview Public did:web resolution endpoint.
 *
 * Serves DID Documents at the path did:web resolution mandates:
 *   did:web:<host>:.well-known:did:<slug>
 *     → https://<host>/.well-known/did/<slug>/did.json
 *
 * Latest version wins (key rotation appends versions; documents are
 * append-only). Public by design — DID documents are published artifacts
 * containing only public keys.
 *
 * @module app/.well-known/did/[...slug]/route
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildDid } from '@kham/identity';
import { didWebHost } from '@/lib/identity/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { slug: string[] } }
) {
  const slug = params.slug;

  // Only <entity-slug>/did.json is resolvable
  if (!Array.isArray(slug) || slug.length !== 2 || slug[1] !== 'did.json') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const did = buildDid(didWebHost(), slug[0]);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('did_documents')
    .select('document, version')
    .eq('did', did)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'DID not found' }, { status: 404 });
  }

  return NextResponse.json(data.document, {
    headers: {
      'Content-Type': 'application/did+json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
