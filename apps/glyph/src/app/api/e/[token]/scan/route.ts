/**
 * @fileoverview The stranger scan. POST /api/e/<token>/scan
 *
 * Body: { lat?: number, lon?: number }. Fires the three independent legs via
 * runEmergencyScan (audit, geo broadcast to nearby hospitals, family ping) and
 * returns the StrangerView — routing + counts, NEVER any PHI. Side-effects live
 * here, not in GET, so crawlers/prefetch never fire the broadcast.
 *
 * @module app/api/e/[token]/scan/route
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runEmergencyScan } from "@/lib/services/emergency";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { token: string } }) {
  let coords: { lat: number; lon: number } | null = null;
  try {
    const body = (await req.json()) as { lat?: number; lon?: number };
    if (typeof body?.lat === "number" && typeof body?.lon === "number") {
      coords = { lat: body.lat, lon: body.lon };
    }
  } catch {
    // No/invalid body → scan with no coords (routing + family still fire).
  }

  const admin = createAdminClient();
  const view = await runEmergencyScan(admin, params.token, coords);
  if (view.state === "inactive") {
    return NextResponse.json(view, { status: 404 });
  }
  return NextResponse.json(view);
}
