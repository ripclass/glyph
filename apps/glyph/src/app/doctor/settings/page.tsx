"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  updateDoctorPreferences,
  getClinicName,
} from "@/lib/services/doctors";

/**
 * Doctor settings — the self-editable slice of the profile.
 *
 * Preferences are real, not cosmetic: `preferred_note_format` drives
 * which format the note screen generates (BD is the default; SOAP is the
 * explicit opt-in sanctioned by §12). Identity fields (name, BMDC,
 * clinic) are read-only here — they're operator-managed.
 *
 * Also home to Sign out: pilot tablets are shared devices.
 */
export default function DoctorSettingsPage() {
  const router = useRouter();
  const doctor = useAuthStore((s) => s.doctor);
  const setDoctor = useAuthStore((s) => s.setDoctor);
  const signOut = useAuthStore((s) => s.signOut);

  const [language, setLanguage] = useState("bn");
  const [noteFormat, setNoteFormat] = useState("bd");
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Hydrate form from the loaded profile
  useEffect(() => {
    if (!doctor) return;
    setLanguage(doctor.preferred_language ?? "bn");
    setNoteFormat(doctor.preferred_note_format ?? "bd");
    if (doctor.clinic_id) {
      getClinicName(doctor.clinic_id).then(setClinicName);
    }
  }, [doctor]);

  if (!doctor) return null;

  const isDirty =
    language !== (doctor.preferred_language ?? "bn") ||
    noteFormat !== (doctor.preferred_note_format ?? "bd");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await updateDoctorPreferences(doctor.id, {
        preferred_language: language,
        preferred_note_format: noteFormat,
      });
      setDoctor(updated);
      toast.success("Preferences saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Settings</h1>

      {/* ── Profile (read-only — operator-managed) ── */}
      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
          Profile
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <ProfileRow label="Name" value={doctor.name} bangla={false} />
          {doctor.name_bn && <ProfileRow label="নাম" value={doctor.name_bn} bangla />}
          <ProfileRow label="Speciality" value={doctor.speciality ?? "—"} bangla={false} />
          <ProfileRow label="BMDC Reg." value={doctor.bmdc_reg_no ?? "—"} bangla={false} />
          <ProfileRow label="Phone" value={doctor.phone} bangla={false} />
          <ProfileRow label="Email" value={doctor.email ?? "—"} bangla={false} />
          <ProfileRow label="Clinic" value={clinicName ?? "—"} bangla />
        </dl>
        <p className="mt-3 text-xs text-slate-400">
          Profile changes go through your Glyph administrator.
        </p>
      </section>

      {/* ── Preferences ── */}
      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
          Preferences
        </h2>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Preferred language
            </span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="bn">বাংলা (Bangla)</option>
              <option value="en">English</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Clinical note format
            </span>
            <select
              value={noteFormat}
              onChange={(e) => setNoteFormat(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="bd">
                Bangladesh format — CC / O-E / Ix / Rx / Advice (standard)
              </option>
              <option value="soap">SOAP — Subjective/Objective/Assessment/Plan</option>
            </select>
            <span className="mt-1 block text-xs text-slate-400">
              Applies to newly generated notes on the note screen.
            </span>
          </label>

          <Button onClick={handleSave} disabled={!isDirty || isSaving}>
            {isSaving ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </section>

      {/* ── Session ── */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
          Session
        </h2>
        <Button variant="outline" onClick={handleSignOut}>
          Sign out
        </Button>
        <p className="mt-2 text-xs text-slate-400">
          Sign out when handing the device to another doctor.
        </p>
      </section>
    </div>
  );
}

/* ── Internal ── */

function ProfileRow({
  label,
  value,
  bangla,
}: {
  label: string;
  value: string;
  bangla: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className={`text-sm text-slate-700 ${bangla ? "font-bangla" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
