"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  ShieldCheck,
  ArrowLeft,
  Stethoscope,
  Building2,
  Pill,
  TriangleAlert,
  Send,
} from "lucide-react";

/**
 * Pocket triage — the patient asks about a symptom before walking to a drug
 * seller. A short guided exchange that routes and explains; it never diagnoses
 * and never names a drug. The clinical safety lives server-side (the
 * deterministic red-flag screen + the egress-gated model + the validateOutcome
 * clamp); this screen is the calm-presence shell around it.
 */

type Route = "pharmacy" | "doctor" | "urgent";
interface Outcome {
  mode: "question" | "answer";
  text: string;
  route?: Route;
  watchFor?: string[];
  specialty?: string;
  redFlag?: string;
}
interface Turn {
  role: "patient" | "glyph";
  content: string;
}

export default function TriagePage() {
  const token = useParams<{ token: string }>().token;
  const pin = useSearchParams().get("pin");

  const [phase, setPhase] = useState<"consent" | "chat">("consent");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [final, setFinal] = useState<Outcome | null>(null);
  const [linkError, setLinkError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy, final]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: Turn[] = [...turns, { role: "patient", content: text }];
    setTurns(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch(`/api/wallet/${token}/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, pin: pin ?? undefined, consentAccepted: true }),
      });
      const json = await res.json().catch(() => ({ state: "error" }));
      if (json.state !== "ok" || !json.outcome) {
        if (json.state === "invalid" || json.state === "pin_required" || json.state === "invalid_pin") {
          setLinkError(true);
          return;
        }
        // Soft fail: surface a calm see-a-doctor message rather than an error.
        setTurns([...next, { role: "glyph", content: SOFT_FALLBACK }]);
        setFinal({ mode: "answer", text: SOFT_FALLBACK, route: "doctor" });
        return;
      }
      const outcome = json.outcome as Outcome;
      setTurns([...next, { role: "glyph", content: outcome.text }]);
      if (outcome.mode === "answer") setFinal(outcome);
    } catch {
      setTurns([...next, { role: "glyph", content: SOFT_FALLBACK }]);
      setFinal({ mode: "answer", text: SOFT_FALLBACK, route: "doctor" });
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setTurns([]);
    setFinal(null);
    setInput("");
  }

  // ── Broken / expired link ─────────────────────────────────────
  if (linkError) {
    return (
      <Shell token={token} pin={pin}>
        <div className="mx-auto max-w-sm px-6 py-24 text-center">
          <h1 className="font-bangla text-2xl font-semibold text-ink">লিঙ্কটি কাজ করছে না</h1>
          <p className="mt-2 text-sm text-ink-soft">
            This link is no longer valid. Please open your record again from the QR your doctor gave you.
          </p>
        </div>
      </Shell>
    );
  }

  // ── One-time consent notice ───────────────────────────────────
  if (phase === "consent") {
    return (
      <Shell token={token} pin={pin}>
        <div className="mx-auto max-w-md px-6 py-14">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
            <span className="h-1.5 w-1.5 rounded-full bg-glyph-400" />
            একটা সমস্যা জিজ্ঞেস করুন
          </p>
          <h1 className="mt-3 font-bangla text-3xl font-bold leading-snug text-ink">
            ওষুধের দোকানে যাওয়ার আগে
          </h1>
          <p className="mt-3 font-bangla text-[15px] leading-relaxed text-ink-soft">
            আপনার লক্ষণ লিখুন। কয়েকটা ছোট প্রশ্নের পর Glyph বলবে — এটা সাধারণ কিছু কিনা,
            ফার্মেসিতে গেলেই চলবে নাকি ডাক্তার দেখানো দরকার। এটি রোগ নির্ণয় করে না, ওষুধের নাম বলে না।
          </p>

          <div className="mt-7 space-y-3 rounded-2xl border border-bone-line bg-clinical-surface p-5">
            <Notice icon={<ShieldCheck className="h-4 w-4 text-lime-deep" strokeWidth={2} />}>
              আপনার লেখা একটি AI-তে পাঠানো হয়। পাঠানোর আগে নাম-ফোন-পরিচয় মুছে ফেলা হয়।
              <span className="mt-0.5 block text-ink-faint">
                Your words go to an AI with your identity scrubbed first.
              </span>
            </Notice>
            <Notice icon={<Stethoscope className="h-4 w-4 text-ink-soft" strokeWidth={2} />}>
              এটি ডাক্তারের বিকল্প নয় — শুধু পরামর্শ।
              <span className="mt-0.5 block text-ink-faint">This is guidance, not a doctor.</span>
            </Notice>
          </div>

          <button
            onClick={() => setPhase("chat")}
            className="mt-7 w-full rounded-full bg-ink px-6 py-4 text-base font-semibold text-bone-raise transition hover:bg-ink-soft"
          >
            বুঝেছি, শুরু করি
          </button>
        </div>
      </Shell>
    );
  }

  // ── Guided exchange ───────────────────────────────────────────
  return (
    <Shell token={token} pin={pin}>
      <div className="flex h-[calc(100vh-9rem)] flex-col sm:h-[calc(100vh-11rem)]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-xl space-y-4">
            {turns.length === 0 && (
              <p className="font-bangla text-[15px] leading-relaxed text-ink-soft">
                আপনার সমস্যাটা কী? যেমন: “তিন দিন ধরে জ্বর আর গলা ব্যথা।”
              </p>
            )}
            {turns.map((t, i) => (
              <Bubble key={i} role={t.role}>
                {t.content}
              </Bubble>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-ink-faint">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                <span className="text-sm">ভাবছি…</span>
              </div>
            )}
            {final && <OutcomeCard outcome={final} />}
          </div>
        </div>

        {/* Composer / next action */}
        <div className="border-t border-bone-line bg-bone px-6 py-4">
          <div className="mx-auto max-w-xl">
            {final ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={reset}
                  className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-bone-raise transition hover:bg-ink-soft"
                >
                  নতুন প্রশ্ন
                </button>
                <Link
                  href={`/wallet/${token}${pin ? `?pin=${encodeURIComponent(pin)}` : ""}`}
                  className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
                >
                  রেকর্ডে ফিরে যান
                </Link>
              </div>
            ) : (
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  rows={1}
                  autoFocus
                  placeholder="এখানে লিখুন…"
                  className="max-h-32 min-h-[3rem] flex-1 resize-none rounded-2xl border border-bone-line bg-white px-4 py-3 font-bangla text-[15px] text-ink outline-none focus:border-ink/40 focus:ring-2 focus:ring-glyph-400/50"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-bone-raise transition hover:bg-ink-soft disabled:opacity-40"
                  aria-label="পাঠান"
                >
                  <Send className="h-5 w-5" strokeWidth={1.8} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

const SOFT_FALLBACK =
  "এই মুহূর্তে নিশ্চিত হতে পারছি না। নিরাপদ থাকতে একজন ডাক্তার দেখানো ভালো। আমি ডাক্তার নই — এটি শুধু পরামর্শ। প্রয়োজনে ডাক্তার দেখান।";

function Notice({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 font-bangla text-sm leading-relaxed text-ink">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function Bubble({ role, children }: { role: "patient" | "glyph"; children: React.ReactNode }) {
  const isPatient = role === "patient";
  return (
    <div className={isPatient ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isPatient
            ? "max-w-[80%] rounded-2xl rounded-br-md bg-ink px-4 py-3 font-bangla text-[15px] leading-relaxed text-bone-raise"
            : "max-w-[85%] rounded-2xl rounded-bl-md border border-bone-line bg-clinical-surface px-4 py-3 font-bangla text-[15px] leading-relaxed text-ink"
        }
      >
        {children}
      </div>
    </div>
  );
}

/** The final routed answer. Urgent is the only place clinical red appears. */
function OutcomeCard({ outcome }: { outcome: Outcome }) {
  const route = outcome.route ?? "doctor";

  if (route === "urgent") {
    return (
      <div className="rounded-2xl border-2 border-red_flag bg-red_flag/5 p-5">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-red_flag">
          <TriangleAlert className="h-5 w-5" strokeWidth={2.2} /> এখনই হাসপাতালে যান
        </p>
        <p className="mt-3 font-bangla text-[16px] font-medium leading-relaxed text-ink">
          {outcome.redFlag ?? outcome.text}
        </p>
      </div>
    );
  }

  const tone =
    route === "pharmacy"
      ? {
          icon: <Pill className="h-5 w-5 text-lime-deep" strokeWidth={2} />,
          label: "ফার্মেসিতে গেলেই চলবে",
          border: "border-glyph-300",
          bg: "bg-glyph-50",
        }
      : {
          icon: <Stethoscope className="h-5 w-5 text-ink" strokeWidth={2} />,
          label: "একজন ডাক্তার দেখান",
          border: "border-bone-line",
          bg: "bg-clinical-surface",
        };

  return (
    <div className={`rounded-2xl border ${tone.border} ${tone.bg} p-5`}>
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        {tone.icon} {tone.label}
        {route === "doctor" && outcome.specialty && (
          <span className="font-normal text-ink-soft"> · {outcome.specialty}</span>
        )}
      </p>

      <p className="mt-3 font-bangla text-[15px] leading-relaxed text-ink">{outcome.text}</p>

      {outcome.watchFor && outcome.watchFor.length > 0 && (
        <div className="mt-4 border-t border-bone-line pt-4">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
            <Building2 className="h-3.5 w-3.5" strokeWidth={2} /> এগুলো দেখা দিলে দেরি না করে ডাক্তার দেখান
          </p>
          <ul className="mt-2 space-y-1.5">
            {outcome.watchFor.map((w, i) => (
              <li key={i} className="flex items-start gap-2 font-bangla text-sm text-ink">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-red_flag" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Shell({
  children,
  token,
  pin,
}: {
  children: React.ReactNode;
  token: string;
  pin: string | null;
}) {
  return (
    <div className="scene min-h-screen px-2 py-2 sm:px-4 sm:py-4">
      <main className="grain-soft relative mx-auto flex min-h-[calc(100vh-1rem)] max-w-[760px] flex-col overflow-hidden rounded-[1.75rem] bg-bone text-ink shadow-[0_40px_120px_-40px_rgba(23,26,25,0.45)] sm:min-h-[calc(100vh-2rem)]">
        <header className="flex h-16 items-center justify-between border-b border-bone-line px-6">
          <span className="font-display text-lg font-semibold tracking-tight">
            KhaM<span className="text-lime-deep">°</span>{" "}
            <span className="font-normal text-ink-faint">Pocket</span>
          </span>
          <Link
            href={`/wallet/${token}${pin ? `?pin=${encodeURIComponent(pin)}` : ""}`}
            className="flex items-center gap-1.5 text-sm text-ink-soft transition hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} /> রেকর্ড
          </Link>
        </header>
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
