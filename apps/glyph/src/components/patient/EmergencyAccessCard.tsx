"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Loader2, ShieldAlert, RefreshCw, Printer } from "lucide-react";

/**
 * The patient's Emergency Access control, inside their wallet. Opt-in toggle +
 * the basics that a hospital would need in an emergency, plus the scannable QR
 * (encodes the public /e/<emergencyToken> URL). Authorized by the wallet token
 * via /api/wallet/<token>/emergency, so PHI is allowed here (this IS the
 * patient). Bangla-first copy, no em dashes, no Devanagari.
 */

interface Profile {
  bloodGroup: string | null;
  allergies: string[];
  conditions: string[];
  medications: string | null;
  contactName: string | null;
  contactPhone: string | null;
}

const EMPTY: Profile = {
  bloodGroup: "",
  allergies: [],
  conditions: [],
  medications: "",
  contactName: "",
  contactPhone: "",
};

export function EmergencyAccessCard({ token, pin }: { token: string; pin?: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [emergencyToken, setEmergencyToken] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  const pinQs = pin ? `?pin=${encodeURIComponent(pin)}` : "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/wallet/${token}/emergency${pinQs}`);
      const json = await res.json();
      if (json.state === "ok") {
        setEnabled(!!json.enabled);
        setProfile({ ...EMPTY, ...json.profile });
        setEmergencyToken(json.emergencyToken ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [token, pinQs]);

  useEffect(() => {
    void load();
  }, [load]);

  // Render the QR whenever we have an active emergency token.
  useEffect(() => {
    if (!enabled || !emergencyToken || typeof window === "undefined") {
      setQr(null);
      return;
    }
    const url = `${window.location.origin}/e/${emergencyToken}`;
    void QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: "#171a19", light: "#ffffff" } }).then(setQr);
  }, [enabled, emergencyToken]);

  async function save(next: { enabled: boolean; profile: Profile }) {
    setSaving(true);
    try {
      const res = await fetch(`/api/wallet/${token}/emergency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", enabled: next.enabled, profile: next.profile, pin }),
      });
      const json = await res.json();
      if (json.state === "ok") setEmergencyToken(json.emergencyToken ?? null);
    } finally {
      setSaving(false);
    }
  }

  async function rotate() {
    setSaving(true);
    try {
      const res = await fetch(`/api/wallet/${token}/emergency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rotate", pin }),
      });
      const json = await res.json();
      if (json.state === "ok") setEmergencyToken(json.emergencyToken ?? null);
    } finally {
      setSaving(false);
    }
  }

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    void save({ enabled: next, profile });
  }

  function updateField<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  if (loading) {
    return (
      <div className="mt-7 flex items-center justify-center rounded-2xl border border-bone-line bg-clinical-surface px-5 py-8">
        <Loader2 className="h-5 w-5 animate-spin text-ink-faint" strokeWidth={1.6} />
      </div>
    );
  }

  return (
    <section className="mt-7 rounded-2xl border border-bone-line bg-clinical-surface p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red_flag/10">
          <ShieldAlert className="h-5 w-5 text-red_flag" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <h2 className="font-bangla text-[15px] font-semibold text-ink">জরুরি অ্যাক্সেস</h2>
          <p className="text-[13px] text-ink-soft">Emergency access — for when you cannot speak for yourself</p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          aria-pressed={enabled}
          className={`ml-auto relative h-7 w-12 shrink-0 rounded-full transition ${enabled ? "bg-glyph-600" : "bg-bone-line"}`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${enabled ? "left-6" : "left-1"}`}
          />
        </button>
      </div>

      {enabled && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="রক্তের গ্রুপ / Blood group" value={profile.bloodGroup ?? ""} onChange={(v) => updateField("bloodGroup", v)} placeholder="O+" />
            <Field label="যোগাযোগ / Contact phone" value={profile.contactPhone ?? ""} onChange={(v) => updateField("contactPhone", v)} placeholder="01XXXXXXXXX" />
          </div>
          <Field label="অ্যালার্জি / Allergies (কমা দিয়ে)" value={profile.allergies.join(", ")} onChange={(v) => updateField("allergies", splitList(v))} placeholder="penicillin, ..." />
          <Field label="দীর্ঘমেয়াদি রোগ / Conditions (কমা দিয়ে)" value={profile.conditions.join(", ")} onChange={(v) => updateField("conditions", splitList(v))} placeholder="HTN, diabetes" />
          <Field label="নিয়মিত ওষুধ / Medications" value={profile.medications ?? ""} onChange={(v) => updateField("medications", v)} placeholder="amlodipine 5mg ..." />
          <Field label="জরুরি যোগাযোগের নাম / Contact name" value={profile.contactName ?? ""} onChange={(v) => updateField("contactName", v)} placeholder="..." />

          <button
            type="button"
            onClick={() => void save({ enabled, profile })}
            disabled={saving}
            className="w-full rounded-full bg-ink px-6 py-3 text-sm font-semibold text-bone-raise transition hover:bg-ink-soft disabled:opacity-50"
          >
            {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
          </button>

          {qr && (
            <div className="flex flex-col items-center gap-3 border-t border-bone-line pt-5">
              <p className="text-center text-[13px] text-ink-soft">
                এই QR প্রিন্ট করে সাথে রাখুন — A passerby can scan this in an emergency.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="Emergency QR" className="h-44 w-44 rounded-lg border border-bone-line bg-white p-2" />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-bone-line px-4 py-2 text-xs font-medium text-ink"
                >
                  <Printer className="h-3.5 w-3.5" strokeWidth={1.8} /> প্রিন্ট
                </button>
                <button
                  type="button"
                  onClick={() => void rotate()}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-full border border-bone-line px-4 py-2 text-xs font-medium text-ink disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} /> নতুন কোড
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function splitList(v: string): string[] {
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-bangla text-[12px] font-medium text-ink-soft">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-bone-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-ink/40 focus:ring-2 focus:ring-glyph-400/40"
      />
    </label>
  );
}
