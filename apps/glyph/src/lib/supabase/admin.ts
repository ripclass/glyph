/**
 * @fileoverview Service-role Supabase client for trusted server-side writes
 * (the issuance seam, DID provisioning). Bypasses RLS — NEVER import from
 * client components; the runtime guard below makes that loud, and the
 * SUPABASE_SERVICE_ROLE_KEY env var is server-only anyway (no NEXT_PUBLIC_).
 *
 * @module lib/supabase/admin
 */

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

/** Admin (service-role) client type used across the identity seam */
export type AdminClient = SupabaseClient<Database>;

/**
 * Creates a service-role Supabase client.
 *
 * @returns Typed admin client (bypasses RLS)
 * @throws {Error} In the browser, or when server env vars are missing
 */
export function createAdminClient(): AdminClient {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient() must never run in the browser');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (server-side env)'
    );
  }

  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}
