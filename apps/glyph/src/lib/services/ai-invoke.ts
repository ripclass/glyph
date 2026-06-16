/**
 * @fileoverview Shared Edge Function invoker extracted from ai.ts so it can be
 * independently mocked in unit tests (e.g. safety.test.ts). Contains no
 * clinical logic — it is a pure HTTP/envelope utility.
 *
 * @module lib/services/ai-invoke
 */

import { createClient } from '@/lib/supabase/client';

// ---------------------------------------------------------------------------
// Types — aligned to supabase/functions/_shared/types.ts (the server contract)
// ---------------------------------------------------------------------------

interface EdgeEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// ---------------------------------------------------------------------------
// Helpers (also exported so ai.ts can import them for invokeStreamingFunction)
// ---------------------------------------------------------------------------

export async function buildHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token ?? anon}`,
    apikey: anon,
  };
}

export function functionUrl(functionName: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }
  return `${supabaseUrl}/functions/v1/${functionName}`;
}

/**
 * Calls a non-streaming Edge Function, unwraps the `{ success, data }`
 * envelope, and returns `data`.
 *
 * @throws {Error} On network / HTTP errors or when the function returns
 *   `success: false`.
 */
export async function invokeFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(functionUrl(functionName), {
    method: 'POST',
    headers: await buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Edge Function "${functionName}" failed (${response.status}): ${errorText}`,
    );
  }

  const json = (await response.json()) as EdgeEnvelope<T>;
  if (!json.success) {
    throw new Error(
      json.error ?? `Edge Function "${functionName}" returned success: false`,
    );
  }
  return json.data as T;
}
