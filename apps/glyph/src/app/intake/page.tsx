"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useIntakeStore } from "@/lib/stores/intake-store";
import { registerAndStartVisit } from "@/lib/services/registration";

type Role = "patient" | "attendant";

/**
 * Intake Step 1 — role choice, then patient registration.
 *
 * THE front door of the clinical flow: registration find-or-creates the
 * patient (family-shared phones never merge records), opens the visit, and
 * seeds the intake store with visitId + patientId before the conversation.
 */
export default function IntakeStartPage() {
  const router = useRouter();
  const doctor = useAuthStore((s) => s.doctor);
  const startIntakeSession = useIntakeStore((s) => s.startIntake);
  const setAttendant = useIntakeStore((s) => s.setAttendant);

  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [attendantName, setAttendantName] = useState("");
  const [attendantRelation, setAttendantRelation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = useCallback(async () => {
    if (!doctor?.clinic_id) {
      toast.error("ডাক্তারের ক্লিনিক তথ্য পাওয়া যায়নি — আবার লগইন করুন");
      return;
    }
    if (!name.trim() || submitting) return;

    setSubmitting(true);
    try {
      const { patient, visit, isReturningPatient } = await registerAndStartVisit({
        clinicId: doctor.clinic_id,
        doctorId: doctor.id,
        name,
        phone: phone || undefined,
        age: age ? Number(age) : undefined,
        gender: gender || undefined,
        attendant:
          role === "attendant"
            ? {
                present: true,
                name: attendantName || null,
                relation: attendantRelation || null,
              }
            : { present: false },
      });

      startIntakeSession(visit.id, patient.id);
      setAttendant(role === "attendant", attendantRelation || undefined);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("intake_role", role ?? "patient");
      }

      toast.success(
        isReturningPatient
          ? `${patient.name_bn ?? patient.name} — পুরনো রোগী, রেকর্ড পাওয়া গেছে`
          : `${patient.name_bn ?? patient.name} — নতুন রোগী নিবন্ধিত হয়েছে`
      );
      router.push("/intake/history");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "নিবন্ধন ব্যর্থ হয়েছে");
    } finally {
      setSubmitting(false);
    }
  }, [
    doctor,
    name,
    phone,
    age,
    gender,
    role,
    attendantName,
    attendantRelation,
    submitting,
    router,
    startIntakeSession,
    setAttendant,
  ]);

  // ── Step 1: warm welcome + role choice ──────────────────────────
  if (!role) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="mb-12 max-w-lg text-center">
          <p className="mb-3 flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-clinical-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-glyph-400" />
            স্বাগতম
          </p>
          <h1 className="font-bangla text-3xl font-bold leading-[1.5] text-clinical-text md:text-4xl">
            একটু সময় নিয়ে আপনার কথা শুনব।
          </h1>
          <p className="mt-4 font-bangla text-lg leading-relaxed text-clinical-muted">
            ডাক্তার দেখার আগে কয়েকটা কথা জেনে নিই। শুরু করার আগে বলুন —
            আপনি কে?
          </p>
        </div>

        <div className="flex w-full max-w-md flex-col gap-5">
          <RoleButton
            primary="আমি রোগী"
            secondary="I am the patient"
            tone="glyph"
            onClick={() => setRole("patient")}
          />
          <RoleButton
            primary="আমি সাথে এসেছি"
            secondary="I am with the patient"
            tone="amber"
            onClick={() => setRole("attendant")}
          />
        </div>
      </div>
    );
  }

  // ── Step 2: registration ────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col items-center overflow-y-auto px-6 py-8">
      <div className="w-full max-w-md pt-8">
        <h1 className="font-bangla text-2xl font-bold leading-snug text-clinical-text">
          কয়েকটা তথ্য দিন
        </h1>
        <p className="mb-7 mt-1.5 font-bangla text-sm text-clinical-muted">
          A few details, so we can keep your record.
        </p>

        <div className="space-y-4">
          <Field label="রোগীর নাম *" hint="Patient name">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="font-bangla" />
          </Field>

          <Field label="মোবাইল নম্বর" hint="Phone (family number is fine)">
            <Input
              inputMode="tel"
              placeholder="01XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="বয়স" hint="Age">
              <Input
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value.replace(/[^\d]/g, ""))}
              />
            </Field>
            <Field label="লিঙ্গ" hint="Gender">
              <select
                className="h-10 w-full rounded-md border border-clinical-border bg-white px-3 text-sm"
                value={gender}
                onChange={(e) => setGender(e.target.value as typeof gender)}
              >
                <option value="">—</option>
                <option value="male">পুরুষ / Male</option>
                <option value="female">মহিলা / Female</option>
                <option value="other">অন্যান্য / Other</option>
              </select>
            </Field>
          </div>

          {role === "attendant" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="mb-3 font-bangla text-sm font-medium text-amber-800">
                আপনার (সঙ্গীর) তথ্য
              </p>
              <div className="space-y-3">
                <Field label="আপনার নাম" hint="Attendant name">
                  <Input
                    value={attendantName}
                    onChange={(e) => setAttendantName(e.target.value)}
                    className="font-bangla bg-white"
                  />
                </Field>
                <Field label="রোগীর সাথে সম্পর্ক" hint="Relation (e.g. ছেলে, মেয়ে, স্বামী)">
                  <Input
                    value={attendantRelation}
                    onChange={(e) => setAttendantRelation(e.target.value)}
                    className="font-bangla bg-white"
                  />
                </Field>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setRole(null)}>
              পেছনে
            </Button>
            <Button
              className="flex-[2]"
              disabled={!name.trim() || submitting}
              onClick={handleRegister}
            >
              {submitting ? "নিবন্ধন হচ্ছে…" : "শুরু করুন"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-bangla text-sm font-medium text-clinical-text">{label}</span>
      <span className="ml-2 text-xs text-clinical-muted">{hint}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function RoleButton({
  primary,
  secondary,
  tone,
  onClick,
}: {
  primary: string;
  secondary: string;
  tone: "glyph" | "amber";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-center gap-5 rounded-2xl border-2 bg-white px-6 py-7 shadow-sm transition active:scale-[0.98]",
        tone === "glyph"
          ? "border-glyph-200 hover:border-glyph-400 hover:shadow-md"
          : "border-amber-200 hover:border-amber-400 hover:shadow-md"
      )}
    >
      <div
        className={cn(
          "flex h-16 w-16 shrink-0 items-center justify-center rounded-full",
          tone === "glyph" ? "bg-glyph-100 text-glyph-700" : "bg-amber-100 text-amber-700"
        )}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <div className="text-left">
        <span className="block font-bangla text-2xl font-semibold text-clinical-text">
          {primary}
        </span>
        <span className="mt-1 block text-sm text-clinical-muted">{secondary}</span>
      </div>
    </button>
  );
}
