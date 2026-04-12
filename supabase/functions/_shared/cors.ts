/**
 * CORS headers utility for Supabase Edge Functions.
 * Allows cross-origin requests from Glyph PWA frontends.
 */

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

/**
 * Returns a 204 response for CORS preflight (OPTIONS) requests.
 * Returns null for non-OPTIONS requests so the caller can proceed.
 */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204, headers: corsHeaders });
  }
  return null;
}
