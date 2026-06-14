/**
 * Issue a one-time WhatsApp bind code for a patient (doctor session). The
 * tablet renders the returned wa.me link as a QR; the patient scans it, which
 * pre-fills the code, and on send their number binds to this patient.
 */
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { createBindCode } from "@/lib/whatsapp/binding";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ success: false, error: "Missing authorization header" }, { status: 401 });

  const userClient = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const patientId = typeof body.patientId === "string" ? body.patientId : null;
  if (!patientId) return NextResponse.json({ success: false, error: "patientId is required" }, { status: 400 });

  // Scope check through RLS: the patient must be in the doctor's clinic.
  const { data: patient } = await userClient.from("patients").select("id").eq("id", patientId).maybeSingle();
  if (!patient) return NextResponse.json({ success: false, error: "Patient not found in your clinic" }, { status: 404 });

  const glyphNumber = process.env.GLYPH_WA_NUMBER;
  if (!glyphNumber) return NextResponse.json({ success: false, error: "GLYPH_WA_NUMBER not configured" }, { status: 500 });

  const admin = createAdminClient();
  const { code } = await createBindCode(admin, patientId, user.id, Date.now());
  const prefill = encodeURIComponent(`Glyph কোড: ${code}`);
  const waLink = `https://wa.me/${glyphNumber}?text=${prefill}`;
  return NextResponse.json({ success: true, code, waLink });
}
