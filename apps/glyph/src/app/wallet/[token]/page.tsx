"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Loader2, Lock, Pill, MessageCircleQuestion, ChevronRight } from "lucide-react";

/**
 * Pocket — the patient's wallet. Public, reached by a bearer token (no login).
 * Calm-presence, Bangla-first: this is the patient's keepsake of their own
 * care, not the dense doctor briefing. Read-only.
 */

interface Med {
  name?: string;
  dose?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
}
interface Visit {
  id: string;
  visit_date: string | null;
  visit_number: number | null;
  approved_note: { cc?: string; rx?: string; advice?: string } | null;
  intake_summary: unknown;
  note_credential_id: string | null;
  doctors: { name?: string; name_bn?: string } | null;
}
interface Bundle {
  state: "ok" | "pin_required" | "invalid_pin" | "invalid";
  patient?: { name?: string; name_bn?: string; age?: number; gender?: string };
  visits?: Visit[];
  prescriptions?: Array<{ id: string; visit_id: string | null; medications: Med[] | null }>;
  labs?: Array<{ id: string; test_category?: string; results: unknown; created_at: string }>;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export default function WalletPage() {
  const token = useParams<{ token: string }>().token;
  const [data, setData] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  const load = useCallback(
    async (withPin?: string) => {
      setLoading(true);
      setPinError(false);
      try {
        const url = `/api/wallet/${token}${withPin ? `?pin=${encodeURIComponent(withPin)}` : ""}`;
        const res = await fetch(url);
        const json = (await res.json().catch(() => ({ state: "invalid" }))) as Bundle;
        if (json.state === "invalid_pin") setPinError(true);
        setData(json);
      } catch {
        setData({ state: "invalid" });
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-24 text-ink-faint">
          <Loader2 className="h-7 w-7 animate-spin" strokeWidth={1.6} />
        </div>
      </Shell>
    );
  }

  // ── PIN gate ──────────────────────────────────────────────────
  if (data?.state === "pin_required" || data?.state === "invalid_pin") {
    return (
      <Shell>
        <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-20 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-glyph-100">
            <Lock className="h-6 w-6 text-ink" strokeWidth={1.6} />
          </span>
          <h1 className="mt-6 font-bangla text-2xl font-semibold text-ink">আপনার পিন দিন</h1>
          <p className="mt-2 text-sm text-ink-soft">Enter your 4-digit PIN to open your record.</p>
          <form
            className="mt-7 w-full"
            onSubmit={(e) => {
              e.preventDefault();
              if (/^\d{4}$/.test(pin)) void load(pin);
            }}
          >
            <input
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              autoFocus
              className="w-full rounded-2xl border border-bone-line bg-white px-4 py-4 text-center font-mono text-2xl tracking-[0.5em] text-ink outline-none focus:border-ink/40 focus:ring-2 focus:ring-glyph-400/50"
              placeholder="••••"
            />
            {pinError && <p className="mt-3 text-sm text-red_flag">ভুল পিন — আবার চেষ্টা করুন</p>}
            <button
              type="submit"
              disabled={!/^\d{4}$/.test(pin)}
              className="mt-5 w-full rounded-full bg-ink px-6 py-4 text-base font-semibold text-bone-raise transition hover:bg-ink-soft disabled:opacity-50"
            >
              খুলুন
            </button>
          </form>
        </div>
      </Shell>
    );
  }

  if (!data || data.state !== "ok" || !data.patient) {
    return (
      <Shell>
        <div className="mx-auto max-w-sm px-6 py-24 text-center">
          <h1 className="font-bangla text-2xl font-semibold text-ink">লিঙ্কটি কাজ করছে না</h1>
          <p className="mt-2 text-sm text-ink-soft">
            This link is no longer valid. Please ask your doctor for a new one.
          </p>
        </div>
      </Shell>
    );
  }

  const { patient, visits = [], prescriptions = [], labs = [] } = data;
  const medsForVisit = (visitId: string) =>
    prescriptions.filter((p) => p.visit_id === visitId).flatMap((p) => p.medications ?? []);

  return (
    <Shell>
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
          <span className="h-1.5 w-1.5 rounded-full bg-glyph-400" />
          আপনার স্বাস্থ্য রেকর্ড
        </p>
        <h1 className="mt-3 font-bangla text-3xl font-bold leading-snug text-ink">
          {patient.name_bn ?? patient.name}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {[patient.age && `${patient.age} বছর`, patient.gender].filter(Boolean).join(" · ")}
        </p>

        {/* Ask about a symptom — the triage entry */}
        <Link
          href={`/wallet/${token}/ask${pin ? `?pin=${encodeURIComponent(pin)}` : ""}`}
          className="group mt-7 flex items-center gap-4 rounded-2xl border border-glyph-300 bg-glyph-50 px-5 py-4 transition hover:border-glyph-400"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-glyph-100">
            <MessageCircleQuestion className="h-5 w-5 text-lime-deep" strokeWidth={1.8} />
          </span>
          <span className="min-w-0">
            <span className="block font-bangla text-[15px] font-semibold text-ink">
              একটা সমস্যা জিজ্ঞেস করুন
            </span>
            <span className="block text-[13px] text-ink-soft">
              ওষুধের দোকানে যাওয়ার আগে — Ask about a symptom
            </span>
          </span>
          <ChevronRight
            className="ml-auto h-5 w-5 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink"
            strokeWidth={1.8}
          />
        </Link>

        {/* Visits */}
        <div className="mt-8 space-y-4">
          {visits.length === 0 && (
            <p className="rounded-2xl border border-bone-line bg-bone-raise px-5 py-8 text-center text-sm text-ink-soft">
              এখনো কোনো ভিজিট রেকর্ড নেই।
            </p>
          )}
          {visits.map((v) => {
            const meds = medsForVisit(v.id);
            return (
              <article key={v.id} className="rounded-2xl border border-bone-line bg-clinical-surface p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink">
                    {formatDate(v.visit_date)}
                    {v.doctors?.name_bn || v.doctors?.name ? (
                      <span className="text-ink-soft"> · {v.doctors.name_bn ?? v.doctors.name}</span>
                    ) : null}
                  </p>
                  {v.note_credential_id && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-glyph-100 px-2.5 py-0.5 text-[11px] font-medium text-glyph-800">
                      <ShieldCheck className="h-3 w-3" strokeWidth={2.2} /> যাচাইযোগ্য
                    </span>
                  )}
                </div>

                {v.approved_note?.cc && (
                  <p className="mt-3 font-bangla text-[15px] leading-relaxed text-ink">{v.approved_note.cc}</p>
                )}

                {meds.length > 0 && (
                  <ul className="mt-4 space-y-1.5">
                    {meds.map((m, i) => (
                      <li key={i} className="flex items-start gap-2.5 rounded-lg bg-clinical-bg px-3 py-2 text-sm">
                        <Pill className="mt-0.5 h-4 w-4 shrink-0 text-lime-deep" strokeWidth={1.8} />
                        <span className="font-medium text-ink">{m.name}</span>
                        <span className="ml-auto font-mono text-xs text-ink-soft">
                          {[m.dosage ?? m.dose, m.frequency, m.duration].filter(Boolean).join(" · ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {v.approved_note?.advice && (
                  <p className="mt-4 border-l-2 border-glyph-300 pl-3.5 font-bangla text-sm leading-relaxed text-ink-soft">
                    {v.approved_note.advice}
                  </p>
                )}
              </article>
            );
          })}
        </div>

        {/* Labs */}
        {labs.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
              ল্যাব রিপোর্ট
            </p>
            <ul className="space-y-2">
              {labs.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between rounded-xl border border-bone-line bg-clinical-surface px-4 py-3 text-sm"
                >
                  <span className="font-medium text-ink">{l.test_category ?? "Lab report"}</span>
                  <span className="font-mono text-xs text-ink-faint">{formatDate(l.created_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-10 border-t border-bone-line pt-6 text-center text-[13px] leading-relaxed text-ink-faint">
          এই রেকর্ড আপনার, চিরকালের জন্য।
          <span className="mt-0.5 block font-display italic">This record belongs to you.</span>
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="scene min-h-screen px-2 py-2 sm:px-4 sm:py-4">
      <main className="grain-soft relative mx-auto max-w-[760px] overflow-hidden rounded-[1.75rem] bg-bone text-ink shadow-[0_40px_120px_-40px_rgba(23,26,25,0.45)]">
        <header className="flex h-16 items-center justify-between border-b border-bone-line px-6">
          <span className="font-display text-lg font-semibold tracking-tight">
            KhaM<span className="text-lime-deep">°</span> <span className="font-normal text-ink-faint">Pocket</span>
          </span>
        </header>
        {children}
      </main>
    </div>
  );
}
