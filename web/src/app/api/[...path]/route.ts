/**
 * @fileoverview Catch-all API route that proxies requests to Supabase Edge Functions.
 * Forwards authentication headers, supports streaming responses, and handles
 * all HTTP methods (GET, POST, PUT, DELETE).
 *
 * This route ensures that all AI and backend calls are proxied server-side,
 * preventing direct client-to-Edge-Function communication and enabling
 * request-level logging, rate limiting, and auth validation.
 *
 * Route: `/api/[...path]` maps to `{SUPABASE_URL}/functions/v1/{path}`
 *
 * @module app/api/[...path]/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Builds the target Supabase Edge Function URL from the catch-all path segments.
 *
 * @param path - Array of path segments from the catch-all route
 * @returns The fully qualified Edge Function URL
 */
function buildTargetUrl(path: string[]): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }
  const functionPath = path.join('/');
  return `${supabaseUrl}/functions/v1/${functionPath}`;
}

/**
 * Extracts and forwards relevant headers from the incoming request.
 * Adds Supabase auth headers (API key and user bearer token).
 *
 * @param request - The incoming Next.js request
 * @param accessToken - The user's Supabase access token, if available
 * @returns Headers object for the proxied request
 */
function buildProxyHeaders(
  request: NextRequest,
  accessToken: string | null
): HeadersInit {
  const headers: Record<string, string> = {
    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  };

  /** Forward content-type if present */
  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  /** Forward accept header for streaming negotiation */
  const accept = request.headers.get('accept');
  if (accept) {
    headers['Accept'] = accept;
  }

  /** Set auth header: prefer user token, fall back to anon key */
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    headers['Authorization'] = `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`;
  }

  return headers;
}

/**
 * Core proxy handler shared by all HTTP methods.
 * Forwards the request to the corresponding Supabase Edge Function
 * and streams the response back to the client.
 *
 * @param request - The incoming Next.js request
 * @param params - Route params containing the catch-all path segments
 * @returns The proxied response (streaming or JSON)
 */
async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse | Response> {
  try {
    const { path } = await params;
    const targetUrl = buildTargetUrl(path);

    /** Get the current user's access token for authenticated proxying */
    let accessToken: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();
      accessToken = session?.access_token ?? null;
    } catch {
      /** Session retrieval may fail in edge cases; proceed with anon key */
    }

    const headers = buildProxyHeaders(request, accessToken);

    /** Forward the request body for methods that support it */
    let body: BodyInit | null = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.arrayBuffer();
    }

    /** Forward query parameters */
    const url = new URL(targetUrl);
    const incomingUrl = new URL(request.url);
    incomingUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    const proxyResponse = await fetch(url.toString(), {
      method: request.method,
      headers,
      body,
    });

    /** Check if the response is streaming (SSE or chunked) */
    const responseContentType = proxyResponse.headers.get('content-type') ?? '';
    const isStreaming =
      responseContentType.includes('text/event-stream') ||
      responseContentType.includes('application/octet-stream') ||
      proxyResponse.headers.get('transfer-encoding') === 'chunked';

    if (isStreaming && proxyResponse.body) {
      /** Return a streaming Response (not NextResponse) to preserve the stream */
      return new Response(proxyResponse.body, {
        status: proxyResponse.status,
        headers: {
          'Content-Type': responseContentType,
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    /** Non-streaming: parse and return as JSON */
    const responseBody = await proxyResponse.text();
    return new NextResponse(responseBody, {
      status: proxyResponse.status,
      headers: {
        'Content-Type': responseContentType || 'application/json',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Proxy request failed';
    console.error('[API Proxy] Error:', message);

    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}

/**
 * GET handler — proxies read requests to Edge Functions.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse | Response> {
  return proxyRequest(request, context);
}

/**
 * POST handler — proxies create/action requests to Edge Functions.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse | Response> {
  return proxyRequest(request, context);
}

/**
 * PUT handler — proxies update requests to Edge Functions.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse | Response> {
  return proxyRequest(request, context);
}

/**
 * DELETE handler — proxies delete requests to Edge Functions.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse | Response> {
  return proxyRequest(request, context);
}
