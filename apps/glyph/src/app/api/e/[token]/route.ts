/**
 * @fileoverview Public emergency-token resolve. GET /api/e/<token>
 *
 * Side-effect-free on purpose: it only reports whether the emergency profile is
 * active. The scan (audit + broadcast + family ping) fires from POST /scan, so
 * link crawlers and prefetch never trigger an emergency. NEVER returns PHI.
 *
 * @module app/api/e/[token]/route
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveEmergencyToken } from "@/lib/services/emergency";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const resolved = await resolveEmergencyToken(admin, params.token);
  if (!resolved) {
    // Unknown, revoked, and disabled are indistinguishable on purpose.
    return NextResponse.json({ state: "inactive" }, { status: 404 });
  }
  return NextResponse.json({ state: "ok" });
}
