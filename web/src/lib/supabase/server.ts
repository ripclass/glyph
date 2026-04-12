/**
 * @fileoverview Server-side Supabase client for Next.js Server Components,
 * Server Actions, and API Route Handlers.
 *
 * Uses `@supabase/ssr` with the `next/headers` cookie store to maintain
 * user sessions across SSR boundaries.
 *
 * This client must only be called within server-side contexts (Server Components,
 * `route.ts` handlers, or Server Actions). For client-side usage, use
 * `@/lib/supabase/client`.
 *
 * @module lib/supabase/server
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

/**
 * Creates a Supabase client configured for server-side usage.
 * Wires up cookie read/write operations through Next.js headers
 * so that auth tokens persist correctly.
 *
 * @returns A typed Supabase server client instance
 * @throws {Error} If required environment variables are missing
 *
 * @example
 * ```ts
 * // In a Server Component
 * const supabase = await createClient();
 * const { data: { user } } = await supabase.auth.getUser();
 * ```
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
        'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // `setAll` can fail when called from a Server Component
          // (read-only cookie store). This is expected — the middleware
          // or a Route Handler will handle the cookie refresh instead.
        }
      },
    },
  });
}
