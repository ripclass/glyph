import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** base64url token, mirrors wallet-logic.generateToken (24 bytes). */
function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Find the patient's active wallet token or mint one (service-role). The
 * WhatsApp bridge has no doctor session, so created_by_doctor_id is null. PIN
 * is never set here — the WhatsApp thread is already an authenticated channel
 * (the number is bound to this patient).
 */
export async function findOrCreateWalletToken(admin: Admin, patientId: string): Promise<string> {
  const { data: existing } = await admin
    .from("wallet_access_tokens")
    .select("token")
    .eq("patient_id", patientId)
    .eq("revoked", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing.token as string;

  const token = generateToken();
  const { error } = await admin.from("wallet_access_tokens").insert({ token, patient_id: patientId });
  if (error) throw new Error(`findOrCreateWalletToken failed: ${error.message}`);
  return token;
}
