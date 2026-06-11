"use client";

import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/stores/auth-store";
import { createClient } from "@/lib/supabase/client";
import { getPatientsByPhone } from "@/lib/services/patients";
import { normalizeBdPhone } from "@/lib/services/registration-logic";
import type { CredentialRow, Patient } from "@/lib/supabase/types";

/**
 * Glyph Pharmacy — the M5 two-node verify loop, in product form.
 *
 * The AMR thesis (vision §18) in miniature: the pharmacist looks up the
 * patient, sees ONLY cryptographically signed prescription credentials, and
 * each one is verified against the prescriber's published key via the local
 * fast-path before anything is dispensed. A prescription that was tampered
 * with, revoked, or superseded shows as not dispensable.
 *
 * Pilot scope: runs under a network-participant session (the pharmacy is
 * inside the trust network); a dedicated pharmacy role/portal is the
 * post-M5 expansion.
 */
export default function PharmacyPage() {
  return (
    <AuthGuard>
      <PharmacyView />
    </AuthGuard>
  );
}

interface VerifiedRx {
  credential: CredentialRow;
  verdict: {
    acceptable: boolean;
    status: string;
    trustLevel: string;
    storeStatus: string | null;
    issuerDid: string;
  } | null;
}

function PharmacyView() {
  const doctor = useAuthStore((s) => s.doctor);
  const [phone, setPhone] = useState("");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [candidates, setCandidates] = useState<Patient[]>([]);
  const [prescriptions, setPrescriptions] = useState<VerifiedRx[]>([]);
  const [searching, setSearching] = useState(false);

  /** Verify one credential through the local fast-path endpoint */
  const verify = useCallback(async (vcId: string) => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ vcId }),
    });
    const json = await res.json();
    return json.success ? json.data : null;
  }, []);

  /** Load + verify all prescription credentials for a patient's DID */
  const loadPrescriptions = useCallback(
    async (p: Patient) => {
      setPatient(p);
      setCandidates([]);
      setPrescriptions([]);

      if (!p.did) {
        toast.info("এই রোগীর এখনো কোনো ডিজিটাল প্রেসক্রিপশন নেই (no DID yet)");
        return;
      }

      const supabase = createClient();
      const { data: creds, error } = await supabase
        .from("credentials")
        .select("*")
        .eq("subject_did", p.did)
        .contains("types", ["PrescriptionCredential"])
        .order("issued_at", { ascending: false });

      if (error) {
        toast.error(`Lookup failed: ${error.message}`);
        return;
      }

      const rows: VerifiedRx[] = (creds ?? []).map((c) => ({ credential: c, verdict: null }));
      setPrescriptions(rows);

      // Verify each credential (signature + temporal + store status)
      for (const row of rows) {
        const verdict = await verify(row.credential.vc_id);
        setPrescriptions((prev) =>
          prev.map((r) => (r.credential.id === row.credential.id ? { ...r, verdict } : r))
        );
      }
    },
    [verify]
  );

  const handleSearch = useCallback(async () => {
    if (!doctor?.clinic_id || searching) return;
    const normalized = normalizeBdPhone(phone);
    if (!normalized) {
      toast.error("সঠিক মোবাইল নম্বর দিন (e.g. 01711223344)");
      return;
    }
    setSearching(true);
    setPatient(null);
    setPrescriptions([]);
    try {
      const found = await getPatientsByPhone(doctor.clinic_id, normalized);
      if (found.length === 0) {
        toast.error("এই নম্বরে কোনো রোগী পাওয়া যায়নি");
      } else if (found.length === 1) {
        await loadPrescriptions(found[0]);
      } else {
        setCandidates(found); // family-shared phone — pharmacist picks the person
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }, [doctor, phone, searching, loadPrescriptions]);

  return (
    <div className="min-h-screen bg-clinical-bg">
      <header className="border-b border-clinical-border bg-white px-4 py-3">
        <h1 className="text-lg font-bold text-glyph-800">
          Glyph <span className="font-normal text-clinical-muted">Pharmacy</span>
        </h1>
        <p className="text-xs text-clinical-muted">
          Verified prescriptions only — signed by the prescriber, checked against their published key
        </p>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* Patient lookup */}
        <div className="flex gap-2">
          <Input
            inputMode="tel"
            placeholder="রোগীর মোবাইল নম্বর / patient phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching}>
            {searching ? "খুঁজছি…" : "খুঁজুন"}
          </Button>
        </div>

        {/* Family member disambiguation (shared phone) */}
        {candidates.length > 1 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-clinical-muted">
              এই নম্বরে {candidates.length} জন রোগী আছেন — কার প্রেসক্রিপশন?
            </p>
            {candidates.map((c) => (
              <button
                key={c.id}
                className="block w-full rounded-lg border border-clinical-border bg-white px-4 py-3 text-left text-sm hover:border-glyph-300"
                onClick={() => loadPrescriptions(c)}
              >
                <span className="font-bangla font-medium">{c.name_bn ?? c.name}</span>
                <span className="ml-2 text-xs text-clinical-muted">
                  {c.age ?? "?"}y · {c.gender ?? "—"}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Patient + prescriptions */}
        {patient && (
          <div className="mt-6">
            <h2 className="font-bangla text-lg font-bold text-clinical-text">
              {patient.name_bn ?? patient.name}
            </h2>
            <p className="mb-4 text-xs text-clinical-muted">
              {patient.age ?? "?"}y · {patient.gender ?? "—"} ·{" "}
              {patient.did ? `${patient.did.slice(0, 44)}…` : "no DID"}
            </p>

            {prescriptions.length === 0 && patient.did && (
              <p className="rounded-lg border border-dashed border-clinical-border bg-white px-4 py-8 text-center text-sm text-clinical-muted">
                কোনো স্বাক্ষরিত প্রেসক্রিপশন নেই
              </p>
            )}

            <div className="space-y-3">
              {prescriptions.map(({ credential, verdict }) => (
                <PrescriptionCard key={credential.id} credential={credential} verdict={verdict} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function PrescriptionCard({
  credential,
  verdict,
}: {
  credential: CredentialRow;
  verdict: VerifiedRx["verdict"];
}) {
  const vc = credential.credential_json as unknown as {
    credentialSubject?: {
      data?: {
        medications?: Array<{ name?: string; dose?: string; frequency?: string; duration?: string }>;
        diagnosis?: Array<{ text?: string }>;
        prescriber?: { name?: string };
        encounterDate?: string;
      };
    };
  };
  const data = vc.credentialSubject?.data ?? {};
  const meds = data.medications ?? [];
  const dispensable = verdict?.acceptable === true;

  return (
    <div
      className={
        "rounded-xl border bg-white p-4 " +
        (verdict === null
          ? "border-clinical-border"
          : dispensable
            ? "border-glyph-300"
            : "border-red-300")
      }
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-clinical-muted">
          {data.encounterDate ?? credential.issued_at.slice(0, 10)}
          {data.prescriber?.name ? ` · ${data.prescriber.name}` : ""}
          {data.diagnosis?.[0]?.text ? ` · ${data.diagnosis[0].text}` : ""}
        </p>
        {verdict === null ? (
          <Badge variant="secondary">verifying…</Badge>
        ) : dispensable ? (
          <Badge variant="success">✓ verified — dispensable</Badge>
        ) : (
          <Badge variant="destructive">
            ✗ {verdict.storeStatus === "superseded" || verdict.storeStatus === "revoked"
              ? verdict.storeStatus
              : verdict.status}
          </Badge>
        )}
      </div>

      <ul className="space-y-1">
        {meds.map((m, i) => (
          <li key={i} className="text-sm text-clinical-text">
            <span className="font-medium">{m.name}</span>
            {m.dose ? ` ${m.dose}` : ""}
            {m.frequency ? ` — ${m.frequency}` : ""}
            {m.duration ? ` — ${m.duration}` : ""}
          </li>
        ))}
      </ul>

      {verdict && (
        <p className="mt-2 text-[11px] text-clinical-muted">
          signature: {verdict.status} · trust: {verdict.trustLevel} · issuer:{" "}
          {verdict.issuerDid.split(":").pop()}
        </p>
      )}
    </div>
  );
}
