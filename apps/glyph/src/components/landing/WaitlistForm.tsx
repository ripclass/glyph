"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Pilot waitlist signup form — THE conversion element of the landing page.
 * Phone-first (BD reality), posts to /api/waitlist, never navigates away.
 */
export function WaitlistForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState("doctor");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    setError(null);
    setStatus("sending");

    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      phone: form.get("phone"),
      role: form.get("role"),
      district: form.get("district"),
      bmdcRegNo: form.get("bmdcRegNo"),
      website: form.get("website"),
    };

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({ success: false }));

      if (data.success) {
        setStatus("done");
      } else {
        setStatus("idle");
        setError(data.error ?? "Something went wrong — please try again");
      }
    } catch {
      setStatus("idle");
      setError("Network problem — please try again");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-lime-deep/40 bg-lime/15 p-10 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-ink" strokeWidth={1.5} />
        <p className="mt-4 font-display text-2xl font-semibold text-ink">
          You&apos;re on the list.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          We onboard a small number of chambers at a time — you&apos;ll hear
          from us first when your spot opens.
        </p>
      </div>
    );
  }

  const fieldClass =
    "w-full rounded-xl border border-bone-line bg-white px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint/70 outline-none transition focus:border-ink/40 focus:ring-2 focus:ring-lime/60";
  const labelClass = "mb-1.5 block text-[13px] font-medium text-ink-soft";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Honeypot — invisible to humans, irresistible to bots */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>
            Name <span className="text-red_flag">*</span>
          </span>
          <input name="name" required placeholder="Dr. Rahima Khatun" className={fieldClass} />
        </label>
        <label className="block">
          <span className={labelClass}>
            Mobile <span className="text-red_flag">*</span>
          </span>
          <input
            name="phone"
            required
            type="tel"
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            className={fieldClass}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>You are</span>
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={cn(fieldClass, "appearance-none")}
          >
            <option value="doctor">A doctor</option>
            <option value="clinic">A clinic / chamber</option>
            <option value="pharmacy">A pharmacy</option>
            <option value="other">Something else</option>
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>District</span>
          <input name="district" placeholder="Dhaka" className={fieldClass} />
        </label>
      </div>

      {role === "doctor" && (
        <label className="block">
          <span className={labelClass}>BMDC registration no. (optional)</span>
          <input name="bmdcRegNo" placeholder="A-XXXXX" className={fieldClass} />
        </label>
      )}

      {error && (
        <p role="alert" className="text-sm text-red_flag">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-4 text-base font-semibold text-bone-raise transition hover:bg-ink-soft active:scale-[0.99] disabled:opacity-60"
      >
        {status === "sending" ? (
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
        ) : (
          "Join the pilot waitlist"
        )}
      </button>

      <p className="text-center text-xs leading-relaxed text-ink-faint">
        Your number is used for pilot updates only — nothing else.
      </p>
    </form>
  );
}
