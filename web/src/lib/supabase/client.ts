/**
 * @fileoverview Browser-side Supabase client for the Glyph PWA.
 * Uses `@supabase/ssr` for cookie-based auth that works seamlessly
 * with Next.js server-side rendering.
 *
 * This client should only be used in Client Components (`'use client'`).
 * For Server Components and API routes, use `@/lib/supabase/server`.
 *
 * @module lib/supabase/client
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

/**
 * Creates a Supabase client configured for browser usage.
 * Reads project URL and anonymous key from public environment variables.
 *
 * @returns A typed Supabase browser client instance
 * @throws {Error} If required environment variables are missing
 *
 * @example
 * ```ts
 * const supabase = createClient();
 * const { data } = await supabase.from('patients').select('*');
 * ```
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
        'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
