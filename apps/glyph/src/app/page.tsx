import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  ScanLine,
  Quote,
  FileSignature,
  ArrowDown,
} from "lucide-react";
import { WaitlistForm } from "@/components/landing/WaitlistForm";
import { Reveal } from "@/components/landing/Reveal";

/**
 * THE marketing landing page — "Editorial Bangla".
 *
 * Design language: warm paper, deep clinical ink, glyph-green as the only
 * accent. Tiro Bangla (Bengali editorial serif) for display, Fraunces for
 * Latin editorial lines. The hero headline is written the way Bengali is
 * written — the matra draws across and the letters appear behind the pen.
 *
 * Copy is deliberately bilingual-inline (Bangla display + English deck,
 * magazine-style) — both languages render together, so the t() dictionary
 * convention for app chrome does not apply here.
 */

export const metadata: Metadata = {
  title: "Glyph — আপনি শুধু রোগী দেখুন। বাকিটা Glyph-এর কাজ।",
  description:
    "Glyph is a clinical AI copilot for Bangladeshi doctors: Bangla voice intake, red-flag briefings, cited research in the chamber, notes in CC/O-E/Ix/Rx/Advice format, and WhatsApp follow-ups. PDPO-compliant, consent-first. ঢাকায় পাইলট শুরু হচ্ছে — ওয়েটলিস্টে যোগ দিন।",
  openGraph: {
    title: "Glyph — clinical AI copilot for Bangladeshi doctors",
    description:
      "Bangla voice intake → red-flag briefing → cited research → BD-format notes → WhatsApp follow-up. Consent-first, PDPO-compliant. Pilot starting in Dhaka.",
    siteName: "Glyph by KhaM Health",
    locale: "bn_BD",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <main className="relative bg-paper text-ink">
      <Nav />
      <Hero />
      <RealityBand />
      <HowItWorks />
      <TrustSection />
      <WaitlistSection />
      <Footer />
    </main>
  );
}

/** Per-element delay for the matra draw + fade pair (see globals.css) */
function matraDelay(delay: string): React.CSSProperties {
  return { "--matra-delay": delay } as React.CSSProperties;
}

/**
 * Section eyebrow — a short green rule + label. Bangla must never be
 * letter-spaced or uppercased (it tears conjuncts apart), so hierarchy
 * comes from the rule, size, and color instead.
 */
function Eyebrow({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <p
      className={`flex items-center gap-3 text-sm font-medium ${
        dark ? "text-paper/55" : "text-ink-faint"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-px w-8 ${dark ? "bg-glyph-400" : "bg-glyph-600"}`}
      />
      {children}
    </p>
  );
}

/* ── Nav ─────────────────────────────────────────────────────── */

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-paper-line bg-paper/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-[22px] font-semibold tracking-tight">
            Glyph
          </span>
          <span className="hidden text-xs text-ink-faint sm:inline">
            by KhaM Health
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <a
            href="#how"
            className="hidden rounded-lg px-3 py-2 text-sm text-ink-soft transition hover:text-ink md:inline"
          >
            কীভাবে কাজ করে
          </a>
          <a
            href="#trust"
            className="hidden rounded-lg px-3 py-2 text-sm text-ink-soft transition hover:text-ink md:inline"
          >
            আস্থা
          </a>
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm text-ink-soft transition hover:text-ink"
          >
            ডাক্তার লগইন
          </Link>
          <a
            href="#waitlist"
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-glyph-700"
          >
            ওয়েটলিস্ট
          </a>
        </div>
      </nav>
    </header>
  );
}

/* ── Hero ────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="grain relative overflow-hidden">
      {/* Watermark glyph — a huge, whisper-faint গ্ */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-24 select-none font-display-bn text-[26rem] leading-none text-ink/[0.04] md:-right-4 md:text-[34rem]"
      >
        গ্ল
      </span>

      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-20 md:px-8 md:pb-32 md:pt-28">
        <div className="landing-fade-up" style={{ animationDelay: "0.1s" }}>
          <Eyebrow>ক্লিনিক্যাল AI কোপাইলট · বাংলাদেশের ডাক্তারদের জন্য</Eyebrow>
        </div>

        <h1 className="mt-8 font-display-bn text-[1.92rem] leading-[1.55] sm:text-6xl sm:leading-[1.4] md:text-7xl md:leading-[1.38]">
          <span className="relative inline-block">
            <span className="matra-line" style={matraDelay("0.35s")} />
            <span className="matra-text" style={matraDelay("0.35s")}>
              আপনি শুধু রোগী দেখুন।
            </span>
          </span>{" "}
          <br className="hidden sm:block" />
          <span className="relative inline-block">
            <span className="matra-line" style={matraDelay("1.35s")} />
            <span className="matra-text" style={matraDelay("1.35s")}>
              বাকিটা <span className="font-display italic">Glyph</span>-এর কাজ।
            </span>
          </span>
        </h1>

        <p
          className="landing-fade-up mt-9 max-w-2xl font-display text-lg leading-relaxed text-ink-soft md:text-xl"
          style={{ animationDelay: "2.3s" }}
        >
          A clinical AI copilot for Bangladeshi doctors. It takes the history{" "}
          <em>in Bangla</em> before the patient walks in, briefs you with the
          red flags, researches while you consult, writes the note in{" "}
          <em>your</em> format — and follows up on WhatsApp.
        </p>

        <div
          className="landing-fade-up mt-10 flex flex-wrap items-center gap-4"
          style={{ animationDelay: "2.55s" }}
        >
          <a
            href="#waitlist"
            className="rounded-full bg-ink px-7 py-3.5 text-base font-semibold text-paper shadow-lg shadow-ink/10 transition hover:bg-glyph-700 active:scale-[0.98]"
          >
            ওয়েটলিস্টে যোগ দিন
          </a>
          <a
            href="#how"
            className="group flex items-center gap-2 px-2 py-3 text-base text-ink-soft transition hover:text-ink"
          >
            কীভাবে কাজ করে
            <ArrowDown
              className="h-4 w-4 transition group-hover:translate-y-0.5"
              strokeWidth={2}
            />
          </a>
        </div>

        <p
          className="landing-fade-up mt-12 text-[13px] text-ink-faint"
          style={{ animationDelay: "2.8s" }}
        >
          PDPO ২০২৫ সম্মত &nbsp;·&nbsp; সম্মতি-প্রথম নকশা &nbsp;·&nbsp; শুধু
          BMDC-নিবন্ধিত ডাক্তার
        </p>
      </div>
    </section>
  );
}

/* ── Reality band ────────────────────────────────────────────── */

function RealityBand() {
  const stats = [
    { value: "৫০–১০০", label: "রোগী প্রতিদিন, একজন ডাক্তারের" },
    { value: "৩ মিনিট", label: "গড় সময়, প্রতি রোগী" },
    { value: "১ : ১,৪০০", label: "ডাক্তার–জনসংখ্যা অনুপাত" },
  ];

  return (
    <section className="border-y border-paper-line bg-paper-deep/60">
      <Reveal className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        <div className="grid gap-10 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.value} className="text-center sm:text-left">
              <div className="font-display-bn text-4xl text-ink md:text-5xl">
                {s.value}
              </div>
              <div className="mt-2 text-sm leading-relaxed text-ink-soft">
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-10 border-t border-paper-line pt-6 text-center font-display text-base italic text-ink-faint">
          Built for this reality — the chamber in Dhaka, not a clinic in
          California.
        </p>
      </Reveal>
    </section>
  );
}

/* ── How it works: three acts ────────────────────────────────── */

function HowItWorks() {
  return (
    <section id="how" className="relative scroll-mt-16 overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <Reveal>
          <Eyebrow>কীভাবে কাজ করে</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-display-bn text-4xl leading-[1.45] md:text-5xl md:leading-[1.4]">
            ভিজিটের আগে, চেম্বারে, আর পরে।
          </h2>
          <p className="mt-4 max-w-2xl font-display text-lg italic leading-relaxed text-ink-soft">
            The whole loop — before, during, and after the visit.
          </p>
        </Reveal>

        <div className="mt-20 space-y-24 md:space-y-32">
          <Act
            number="১"
            label="রোগী আসার আগে"
            english="Before the visit"
            features={[
              {
                title: "ভয়েস ইনটেক, বাংলায়",
                desc: "ক্লিনিকের ট্যাবলেটে রোগী নিজের ভাষায় ইতিহাস বলেন। সাথে স্বজন এলে Glyph মনে রাখে — কোন কথা কার।",
              },
              {
                title: "পুরনো কাগজের ব্যাগ",
                desc: "আগের প্রেসক্রিপশন আর ল্যাব রিপোর্টের ছবি তুললেই পড়ে নেয় — হাতের লেখা Rx হোক বা ১+০+১ ডোজ।",
              },
              {
                title: "এক নজরের ব্রিফিং",
                desc: "রোগী ঢোকার আগেই টেবিলে সারসংক্ষেপ — লাল পতাকা সবার উপরে।",
              },
            ]}
            visual={<BriefingMock />}
          />

          <Act
            number="২"
            label="চেম্বারে"
            english="In the chamber"
            reversed
            features={[
              {
                title: "আপনি কথা বলুন, Glyph শোনে",
                desc: "সম্মতি নিয়ে অ্যামবিয়েন্ট রেকর্ডিং — নোটের কাঁচামাল নিজে থেকেই জমা হয়, আপনার চোখ থাকে রোগীর দিকে।",
              },
              {
                title: "প্রশ্ন করুন, উৎসসহ উত্তর",
                desc: "গাইডলাইন, ড্রাগ ইন্টার‍্যাকশন, সাম্প্রতিক গবেষণা — UpToDate আর PubMed থেকে, সাইটেশনসহ, সেকেন্ডে।",
              },
            ]}
            visual={<ConsultMock />}
          />

          <Act
            number="৩"
            label="ভিজিটের পরে"
            english="After the visit"
            features={[
              {
                title: "নোট, আপনার ফরম্যাটে",
                desc: "CC / O-E / Ix / Rx / Advice — SOAP নয়। আপনি দেখে, বদলে, এক ক্লিকে অনুমোদন করেন।",
              },
              {
                title: "স্বাক্ষরিত ডিজিটাল প্রেসক্রিপশন",
                desc: "অনুমোদনের সাথে সাথে ক্রিপ্টোগ্রাফিক স্বাক্ষর — ফার্মেসির কাউন্টারে যাচাইযোগ্য।",
              },
              {
                title: "WhatsApp ফলো-আপ",
                desc: "২–৩ দিন পর রোগীর কাছে সহজ বাংলায় সারাংশ — কোন ওষুধ কখন, কী লক্ষণে ফিরে আসতে হবে।",
              },
            ]}
            visual={<NoteMock />}
          />
        </div>
      </div>
    </section>
  );
}

function Act({
  number,
  label,
  english,
  features,
  visual,
  reversed = false,
}: {
  number: string;
  label: string;
  english: string;
  features: { title: string; desc: string }[];
  visual: React.ReactNode;
  reversed?: boolean;
}) {
  return (
    <Reveal>
      <div
        className={`relative grid items-center gap-12 md:grid-cols-2 md:gap-16 ${
          reversed ? "md:[&>*:first-child]:order-2" : ""
        }`}
      >
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-6 -top-16 select-none font-display-bn text-[11rem] leading-none text-glyph-600/10 md:-left-10"
          >
            {number}
          </span>
          <div className="relative">
            <h3 className="font-display-bn text-3xl leading-snug md:text-4xl">
              {label}
            </h3>
            <p className="mt-1 font-display text-base italic text-ink-faint">
              {english}
            </p>
            <ul className="mt-8 space-y-6">
              {features.map((f) => (
                <li key={f.title} className="flex gap-4">
                  <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-glyph-600" />
                  <div>
                    <h4 className="text-[17px] font-semibold leading-snug">
                      {f.title}
                    </h4>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
                      {f.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div>{visual}</div>
      </div>
    </Reveal>
  );
}

/* ── Product mocks — show, don't tell ────────────────────────── */

function MockCard({
  header,
  children,
}: {
  header: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-paper-line bg-white p-6 shadow-[0_24px_60px_-32px_rgba(21,36,28,0.35)]">
      <div className="flex items-center justify-between border-b border-paper-line pb-3">
        <span className="text-xs font-medium text-ink-faint">{header}</span>
        <span className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-paper-line" />
          <span className="h-2 w-2 rounded-full bg-paper-line" />
          <span className="h-2 w-2 rounded-full bg-glyph-400" />
        </span>
      </div>
      <div className="pt-4">{children}</div>
    </div>
  );
}

function SourceTagChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-2 inline-block rounded-full bg-paper-deep px-2 py-0.5 align-middle text-[11px] leading-snug text-ink-faint">
      {children}
    </span>
  );
}

function BriefingMock() {
  return (
    <MockCard header="ব্রিফিং কার্ড · ভিজিট ৪">
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-red_flag/25 bg-red_flag/5 px-3 py-2.5">
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red_flag" />
        <span className="text-sm font-semibold text-red_flag">
          লাল পতাকা: বুকে চাপ ব্যথা + ঘাম — আগে দেখুন
        </span>
      </div>
      <ul className="space-y-3 text-[14px] leading-relaxed text-ink-soft">
        <li>
          ৩ দিন ধরে বুকে চাপ ধরা ব্যথা, সিঁড়িতে বাড়ে
          <SourceTagChip>রোগীর ভাষ্য</SourceTagChip>
        </li>
        <li>
          রাতে ঘাম, একবার বমি ভাব
          <SourceTagChip>অ্যাটেনডেন্টের ভাষ্য</SourceTagChip>
        </li>
        <li>
          Tab. Amlodipine 5mg — ০+০+১ চলছে
          <SourceTagChip>Rx ছবি থেকে</SourceTagChip>
        </li>
        <li>
          HbA1c 7.9% (৩ মাস আগে)
          <SourceTagChip>রিপোর্ট থেকে</SourceTagChip>
        </li>
      </ul>
    </MockCard>
  );
}

function ConsultMock() {
  return (
    <MockCard header="কনসাল্ট · লাইভ">
      <div className="space-y-4">
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-ink px-4 py-3 text-sm leading-relaxed text-paper">
          Metformin চলমান রোগীকে contrast CT দিতে চাই — কী সাবধানতা?
        </div>
        <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-paper-deep/70 px-4 py-3 text-sm leading-relaxed text-ink-soft">
          eGFR ≥ 30 হলে স্ক্যানের দিন বন্ধ রেখে ৪৮ ঘণ্টা পরে রিনাল ফাংশন
          দেখে আবার শুরু করুন…
          <span className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-glyph-600/30 bg-glyph-600/10 px-2.5 py-0.5 text-[11px] font-medium text-glyph-700">
              UpToDate
            </span>
            <span className="rounded-full border border-glyph-600/30 bg-glyph-600/10 px-2.5 py-0.5 text-[11px] font-medium text-glyph-700">
              PubMed
            </span>
          </span>
        </div>
      </div>
    </MockCard>
  );
}

function NoteMock() {
  return (
    <MockCard header="ভিজিট নোট · অনুমোদনের অপেক্ষায়">
      <dl className="space-y-2.5 text-[13.5px] leading-relaxed">
        {[
          ["CC", "বুকে চাপ ব্যথা ৩ দিন, পরিশ্রমে বাড়ে"],
          ["O/E", "BP 140/90 · Pulse 96 · বুকে শ্বাসের শব্দ স্বাভাবিক"],
          ["Ix", "ECG, Troponin-I, RBS, Lipid profile"],
          ["Rx", "Tab. Ecosprin 75mg — ০+১+০ · চলবে"],
          ["Advice", "ব্যথা বাড়লে দেরি না করে হাসপাতালে"],
        ].map(([k, v]) => (
          <div key={k} className="flex gap-3">
            <dt className="w-14 shrink-0 font-mono text-xs font-semibold uppercase tracking-wide text-glyph-700">
              {k}
            </dt>
            <dd className="text-ink-soft">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex items-start gap-2 rounded-xl bg-[#e7f7ee] px-4 py-3">
        <span className="mt-0.5 text-[15px] leading-none">✓</span>
        <p className="text-[13px] leading-relaxed text-ink-soft">
          <span className="font-semibold text-ink">WhatsApp ফলো-আপ:</span>{" "}
          “চাচা, ডাক্তারের পরামর্শমতো ওষুধগুলো চলছে তো? বুকের ব্যথা আবার হলে…”
        </p>
      </div>
    </MockCard>
  );
}

/* ── Trust ───────────────────────────────────────────────────── */

function TrustSection() {
  const items = [
    {
      icon: ShieldCheck,
      title: "সম্মতি প্রথমে",
      english: "Consent before anything",
      desc: "কোনো ডেটা প্রসেস হওয়ার আগে সম্মতি রেকর্ড হয়। প্রত্যাহার করলে পরের সেকেন্ড থেকেই কার্যকর — PDPO ২০২৫ মেনে।",
    },
    {
      icon: ScanLine,
      title: "পরিচয় ছাড়া এক বাইটও বাইরে নয়",
      english: "A fail-closed egress gate",
      desc: "নাম, নম্বর, ঠিকানা মুছে তবেই কিছু AI-এর কাছে যায়। প্রতিটি কল অপরিবর্তনযোগ্য অডিট লগে — গেট আটকালে ডেটা যায় না, ব্যস।",
    },
    {
      icon: Quote,
      title: "প্রতিটি দাবির উৎস",
      english: "Every claim, attributed",
      desc: "রোগীর কথা, স্বজনের কথা, কাগজের ছবি, না গবেষণাপত্র — ব্রিফিংয়ের প্রতিটি লাইন জানে সে কোথা থেকে এসেছে।",
    },
    {
      icon: FileSignature,
      title: "স্বাক্ষরিত প্রেসক্রিপশন",
      english: "Cryptographically signed Rx",
      desc: "অনুমোদিত প্রতিটি প্রেসক্রিপশন ডিজিটালি স্বাক্ষরিত — ফার্মেসিতে যাচাইযোগ্য, প্রয়োজনে প্রত্যাহারযোগ্য।",
    },
  ];

  return (
    <section
      id="trust"
      className="grain relative scroll-mt-16 overflow-hidden bg-ink text-paper"
    >
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <Reveal>
          <Eyebrow dark>আস্থা</Eyebrow>
          <h2 className="mt-4 max-w-3xl font-display-bn text-4xl leading-[1.45] md:text-5xl md:leading-[1.4]">
            আস্থা কোনো ফিচার নয় — কাঠামো।
          </h2>
          <p className="mt-4 max-w-2xl font-display text-lg italic leading-relaxed text-paper/60">
            Trust is not a feature here. It is the architecture.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-x-12 gap-y-12 md:grid-cols-2">
          {items.map((item, i) => (
            <Reveal key={item.title} delay={i * 90}>
              <div className="flex gap-5">
                <item.icon
                  className="mt-1 h-6 w-6 shrink-0 text-glyph-400"
                  strokeWidth={1.5}
                />
                <div>
                  <h3 className="font-display-bn text-2xl leading-snug">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 font-display text-sm italic text-paper/50">
                    {item.english}
                  </p>
                  <p className="mt-3 text-[15px] leading-relaxed text-paper/75">
                    {item.desc}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-20">
          <p className="border-t border-paper/15 pt-8 text-center font-display-bn text-xl leading-relaxed text-paper/80 md:text-2xl">
            Glyph কখনো ডায়াগনোসিস করে না, কখনো প্রেসক্রাইব করে না।
            <span className="mt-1 block text-glyph-400">
              সিদ্ধান্ত সবসময় ডাক্তারের।
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Waitlist ────────────────────────────────────────────────── */

function WaitlistSection() {
  return (
    <section id="waitlist" className="grain relative scroll-mt-16 overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-24 md:grid-cols-2 md:gap-20 md:px-8 md:py-32">
        <Reveal>
          <Eyebrow>পাইলট · ২০২৬</Eyebrow>
          <h2 className="mt-4 font-display-bn text-4xl leading-[1.45] md:text-5xl md:leading-[1.4]">
            শুরু হচ্ছে ঢাকায়।
            <br />
            অল্প কিছু চেম্বার দিয়ে।
          </h2>
          <p className="mt-5 max-w-md font-display text-lg italic leading-relaxed text-ink-soft">
            We are onboarding a small number of chambers first — so each one
            gets it right. Your spot in line is your spot in the pilot.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="rounded-3xl border border-paper-line bg-paper-deep/40 p-6 md:p-8">
            <WaitlistForm />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-paper-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 text-sm text-ink-faint md:flex-row md:px-8">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            Glyph
          </span>
          <span>by KhaM Health · ঢাকা</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link href="/login" className="transition hover:text-ink">
            ডাক্তার লগইন
          </Link>
          <Link href="/start" className="transition hover:text-ink">
            ক্লিনিক ট্যাবলেট
          </Link>
          <Link href="/pharmacy" className="transition hover:text-ink">
            ফার্মেসি ভেরিফাই
          </Link>
        </div>
        <p>© {new Date().getFullYear()} KhaM Health</p>
      </div>
    </footer>
  );
}
