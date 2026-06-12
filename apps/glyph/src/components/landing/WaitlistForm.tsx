"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Pilot waitlist signup form — THE conversion element of the landing page.
 * Phone-first (BD reality), posts to /api/waitlist, never navigates away.
 *
 * Marketing copy is deliberately bilingual-inline (both languages render
 * together, magazine-style) — the t() dictionary convention is for app
 * chrome, not for this page.
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
        setError(data.error ?? "সাময়িক সমস্যা হয়েছে — আবার চেষ্টা করুন");
      }
    } catch {
      setStatus("idle");
      setError("নেটওয়ার্ক সমস্যা — আবার চেষ্টা করুন");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-glyph-600/30 bg-glyph-600/5 p-10 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-glyph-600" strokeWidth={1.5} />
        <p className="mt-4 font-display-bn text-2xl text-ink">আপনি তালিকায় আছেন।</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          পাইলট খুললে আমরা প্রথমে আপনাকে জানাবো।
          <span className="mt-1 block font-display italic text-ink-faint">
            You&apos;re on the list — we&apos;ll reach out when your spot opens.
          </span>
        </p>
      </div>
    );
  }

  const fieldClass =
    "w-full rounded-xl border border-paper-line bg-white/70 px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint/70 outline-none transition focus:border-glyph-600 focus:bg-white focus:ring-2 focus:ring-glyph-600/15";

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
          <span className="mb-1.5 block text-[13px] font-medium text-ink-faint">
            নাম <span className="text-red_flag">*</span>
          </span>
          <input name="name" required placeholder="ডাঃ রহিমা খাতুন" className={fieldClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-faint">
            মোবাইল <span className="text-red_flag">*</span>
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
          <span className="mb-1.5 block text-[13px] font-medium text-ink-faint">
            আপনি
          </span>
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={cn(fieldClass, "appearance-none")}
          >
            <option value="doctor">ডাক্তার</option>
            <option value="clinic">ক্লিনিক / চেম্বার</option>
            <option value="pharmacy">ফার্মেসি</option>
            <option value="other">অন্যান্য</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-faint">
            জেলা
          </span>
          <input name="district" placeholder="ঢাকা" className={fieldClass} />
        </label>
      </div>

      {role === "doctor" && (
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-faint">
            BMDC রেজিস্ট্রেশন নম্বর (ঐচ্ছিক)
          </span>
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
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 py-4 text-base font-semibold text-paper transition hover:bg-glyph-700 active:scale-[0.99] disabled:opacity-60"
      >
        {status === "sending" ? (
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
        ) : (
          <>
            ওয়েটলিস্টে যোগ দিন
            <span className="hidden font-display italic font-normal text-paper/70 transition group-hover:text-paper sm:inline">
              — join the waitlist
            </span>
          </>
        )}
      </button>

      <p className="text-center text-xs leading-relaxed text-ink-faint">
        শুধু পাইলটের খবর জানাতেই আপনার নম্বর ব্যবহার হবে — আর কিছুতে নয়।
      </p>
    </form>
  );
}
