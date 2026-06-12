import type { Metadata } from "next";
import Link from "next/link";
import {
  Stethoscope,
  FlaskConical,
  HeartPulse,
  FileSignature,
  Factory,
  Plane,
  Globe2,
  Fingerprint,
  ShieldCheck,
  PenLine,
  Mic,
  CheckCheck,
  ArrowRight,
  ArrowDown,
  ArrowUpRight,
  QrCode,
} from "lucide-react";
import { WaitlistForm } from "@/components/landing/WaitlistForm";
import { Reveal } from "@/components/landing/Reveal";

/**
 * THE company landing — khamhealth.com is the umbrella; products live
 * under it (khamhealth.com/glyph etc., pages to follow).
 *
 * Design language ("quiet clinical", after the nion reference): a bone
 * sheet floating on a soft sage-steel gradient scene, sentence-case
 * Instrument Sans, near-black ink, ONE chartreuse accent, dark pill
 * buttons, frosted gallery cards with overlay UI chips. Calm over loud.
 */

export const metadata: Metadata = {
  title: "KhaM Health — Healthcare that remembers you",
  description:
    "KhaM Health is building Bangladesh's missing clinical infrastructure: one patient identity, every prescription, lab result, and visit — signed, verifiable, owned by the patient. Glyph, our clinical AI copilot for doctors, is live in Dhaka. Join the pilot.",
  openGraph: {
    title: "KhaM Health — Healthcare that remembers you",
    description:
      "One patient identity. Every prescription, lab, and visit — signed and verifiable. Glyph, the clinical AI copilot for Bangladeshi doctors, is live in Dhaka.",
    siteName: "KhaM Health",
    locale: "en_US",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <div className="scene min-h-screen px-2 py-2 sm:px-4 sm:py-4">
      <main className="grain-soft relative mx-auto max-w-[1480px] overflow-hidden rounded-[1.75rem] bg-bone text-ink shadow-[0_40px_120px_-40px_rgba(22,29,26,0.45)]">
        <Nav />
        <Hero />
        <Gallery />
        <Marquee />
        <Products />
        <WhySection />
        <TrustSection />
        <WaitlistSection />
        <Footer />
      </main>
    </div>
  );
}

/* ── Shared bits ─────────────────────────────────────────────── */

function SectionIndex({ index, label }: { index: string; label: string }) {
  return (
    <p className="font-mono text-[13px] tracking-wide text-ink-faint">
      <span className="text-ink">{index}</span> — {label}
    </p>
  );
}

function PillDark({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-bone-raise transition hover:bg-ink-soft active:scale-[0.98]"
    >
      {children}
    </a>
  );
}

/* ── Nav ─────────────────────────────────────────────────────── */

function Nav() {
  return (
    <header className="relative z-40">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 md:px-10">
        <Link href="/" className="font-display text-[22px] font-semibold lowercase tracking-tight">
          kham<span className="text-lime-deep">°</span>
        </Link>

        <div className="hidden items-center gap-7 text-sm text-ink-soft md:flex">
          <a href="#products" className="transition hover:text-ink">
            Glyph
            <sup className="ml-0.5 font-mono text-[10px] text-lime-deep">live</sup>
          </a>
          <a href="#products" className="transition hover:text-ink">
            Products
            <sup className="ml-0.5 font-mono text-[10px] text-ink-faint">6</sup>
          </a>
          <a href="#why" className="transition hover:text-ink">
            Why
          </a>
          <a href="#trust" className="transition hover:text-ink">
            Trust
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2.5 text-sm text-ink-soft transition hover:text-ink sm:inline"
          >
            Doctor login
          </Link>
          <a
            href="#waitlist"
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bone-raise transition hover:bg-ink-soft"
          >
            Join the pilot
          </a>
        </div>
      </nav>
    </header>
  );
}

/* ── Hero ────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 pb-12 pt-10 md:px-10 md:pt-16">
      <p
        className="landing-fade-up flex items-center gap-2 text-sm text-ink-soft"
        style={{ animationDelay: "0.1s" }}
      >
        <ArrowRight className="h-4 w-4 text-lime-deep" strokeWidth={2} />
        AI-infused care, made in Dhaka
      </p>

      <div className="mt-6 grid gap-10 md:grid-cols-[1.5fr_1fr] md:items-end">
        <h1
          className="landing-fade-up font-display text-[clamp(2.5rem,5.2vw,4.6rem)] font-medium leading-[1.04] tracking-[-0.02em]"
          style={{ animationDelay: "0.25s" }}
        >
          Healthcare that
          <br />
          remembers you
        </h1>

        <div className="landing-fade-up md:pb-2" style={{ animationDelay: "0.4s" }}>
          <p className="max-w-sm text-[15px] leading-relaxed text-ink-soft">
            One patient identity. Every prescription, lab result, and visit —
            signed, verifiable, owned by the patient for life. Built for
            Bangladesh first.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#why"
              className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-5 py-3 text-sm font-medium text-ink transition hover:border-ink/50"
            >
              Why we exist
            </a>
            <PillDark href="#waitlist">Join the pilot</PillDark>
            <a
              href="#products"
              aria-label="See the products"
              className="grid h-11 w-11 place-items-center rounded-full bg-lime text-ink transition hover:bg-lime-deep"
            >
              <ArrowDown className="h-4 w-4" strokeWidth={2.2} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Gallery: frosted cards with overlay chips ───────────────── */

function Chip({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-white/85 px-3.5 py-2 text-[12px] font-medium text-ink shadow-sm backdrop-blur ${className}`}
    >
      {children}
    </span>
  );
}

function Gallery() {
  return (
    <section className="landing-fade-up mx-auto max-w-7xl px-6 pb-16 md:px-10" style={{ animationDelay: "0.55s" }}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1 — Voice intake */}
        <figure className="frost-1 relative h-72 overflow-hidden rounded-2xl md:h-80">
          <Chip className="absolute left-4 top-4">
            <span className="relative flex h-2 w-2">
              <span className="absolute h-full w-full animate-ping rounded-full bg-red_flag/70" />
              <span className="relative h-2 w-2 rounded-full bg-red_flag" />
            </span>
            Listening · বাংলা
          </Chip>
          <figcaption className="absolute inset-x-4 bottom-4">
            <Chip>Voice intake — knows who&apos;s speaking</Chip>
          </figcaption>
        </figure>

        {/* 2 — Briefing */}
        <figure className="frost-2 relative h-72 overflow-hidden rounded-2xl md:h-80">
          <Chip className="absolute left-4 top-4">
            <span className="h-2 w-2 rounded-full bg-red_flag" />
            Red flag · chest pain + sweating
          </Chip>
          <figcaption className="absolute inset-x-4 bottom-4">
            <Chip>Briefed before the patient walks in</Chip>
          </figcaption>
        </figure>

        {/* 3 — Signed prescription */}
        <figure className="frost-3 relative h-72 overflow-hidden rounded-2xl md:h-80">
          <span className="absolute left-4 top-4 grid h-12 w-12 place-items-center rounded-xl bg-white/90 shadow-sm backdrop-blur">
            <QrCode className="h-6 w-6 text-ink" strokeWidth={1.5} />
          </span>
          <figcaption className="absolute inset-x-4 bottom-4">
            <Chip>
              Signed Rx — verified at the pharmacy
              <CheckCheck className="h-3.5 w-3.5 text-lime-deep" strokeWidth={2.5} />
            </Chip>
          </figcaption>
        </figure>

        {/* 4 — Follow-up */}
        <figure className="frost-4 relative h-72 overflow-hidden rounded-2xl md:h-80">
          <span className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-lime shadow-sm">
            <Mic className="h-5 w-5 text-ink" strokeWidth={1.8} />
          </span>
          <figcaption className="absolute inset-x-4 bottom-4">
            <Chip>WhatsApp follow-up · 2 days later</Chip>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

/* ── Marquee divider ─────────────────────────────────────────── */

function Marquee() {
  const items = [
    "voice-first",
    "bangla-native",
    "consent-first",
    "offline-tolerant",
    "patient-owned",
    "pdpo 2025 ready",
    "doctor-led",
  ];
  const row = items.map((t) => (
    <span key={t} className="flex items-center gap-8 pr-8">
      <span className="text-sm font-medium lowercase tracking-wide text-ink-faint">{t}</span>
      <span aria-hidden="true" className="text-lime-deep">
        ✳
      </span>
    </span>
  ));

  return (
    <div className="relative overflow-hidden border-y border-bone-line bg-bone-raise/60 py-3.5" aria-hidden="true">
      <div className="marquee-track">
        <div className="flex">{row}</div>
        <div className="flex">{row}</div>
      </div>
    </div>
  );
}

/* ── 01 — Products ───────────────────────────────────────────── */

type Status = "live" | "design";

function StatusChip({ status }: { status: Status }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-lime px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink">
        <span className="h-1.5 w-1.5 rounded-full bg-ink" />
        Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-bone-line px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
      In design
    </span>
  );
}

function Products() {
  const products: {
    icon: typeof FlaskConical;
    name: string;
    status: Status;
    desc: string;
    audience: string;
  }[] = [
    {
      icon: FileSignature,
      name: "Prescription",
      status: "live",
      desc: "Digitally signed prescriptions a pharmacy counter can verify in seconds — and that revoke instantly when they should.",
      audience: "Pharmacies · Doctors",
    },
    {
      icon: FlaskConical,
      name: "Lab",
      status: "design",
      desc: "Structured orders in, signed results out. AI co-interpretation for diagnostic centres of every size.",
      audience: "Diagnostic centres",
    },
    {
      icon: HeartPulse,
      name: "Mother",
      status: "design",
      desc: "Schedule-driven antenatal and postpartum care with home BP monitoring — for the 3.5 million pregnancies a year.",
      audience: "Mothers · OB-GYNs · CHWs",
    },
    {
      icon: Factory,
      name: "Factory",
      status: "design",
      desc: "Real workplace healthcare for garment workers — and audit-ready compliance documentation for buyers.",
      audience: "Workers · Compliance",
    },
    {
      icon: Plane,
      name: "Migrant",
      status: "design",
      desc: "Asynchronous assessment and triage across borders for 13 million workers abroad — voice symptoms in Bangla, matched BD physicians.",
      audience: "Migrant workers · Families",
    },
    {
      icon: Globe2,
      name: "Connect",
      status: "design",
      desc: "A patient's verified credential bundle, sent to cross-border specialists — opinions return as signed records, not PDFs.",
      audience: "Specialists · Hospitals",
    },
  ];

  return (
    <section id="products" className="relative scroll-mt-10">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <Reveal>
          <SectionIndex index="01" label="Products" />
          <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <h2 className="max-w-2xl font-display text-4xl font-medium leading-[1.06] tracking-[-0.02em] md:text-5xl">
              One spine,
              <br />
              many products
            </h2>
            <p className="max-w-sm text-[15px] leading-relaxed text-ink-soft md:pb-1">
              Every product writes to the same patient-owned clinical record.
              Start anywhere — the history follows.
            </p>
          </div>
        </Reveal>

        {/* Featured: Glyph */}
        <Reveal className="mt-12">
          <div className="group relative overflow-hidden rounded-3xl bg-ink p-8 text-bone md:p-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-lime/20 blur-3xl transition group-hover:bg-lime/30"
            />
            <div className="relative flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              <div className="max-w-xl">
                <div className="flex items-center gap-3">
                  <Stethoscope className="h-6 w-6 text-lime" strokeWidth={1.5} />
                  <h3 className="font-display text-3xl font-semibold tracking-tight text-bone-raise">
                    Glyph
                  </h3>
                  <StatusChip status="live" />
                </div>
                <p className="mt-4 text-[17px] leading-relaxed text-bone/70">
                  The clinical AI copilot for Bangladeshi doctors. It takes the
                  patient&apos;s history in Bangla before they walk in, briefs
                  the doctor with red flags, researches with citations during
                  the consult, writes the note in the chamber&apos;s own format
                  — and follows up on WhatsApp.
                </p>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {[
                    "Bangla voice intake",
                    "Reads the plastic bag",
                    "Red-flag briefings",
                    "Cited evidence, live",
                    "BD-format notes",
                    "WhatsApp follow-up",
                  ].map((c) => (
                    <li
                      key={c}
                      className="rounded-full border border-bone/20 px-3.5 py-1.5 text-[13px] text-bone/70"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <a
                href="#waitlist"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-semibold text-ink transition hover:bg-lime-deep"
              >
                Get Glyph for your chamber
                <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
              </a>
            </div>
          </div>
        </Reveal>

        {/* The family */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <Reveal key={p.name} delay={(i % 3) * 90}>
              <div className="flex h-full flex-col rounded-3xl border border-bone-line bg-bone-raise p-7 transition hover:border-ink/25">
                <div className="flex items-center justify-between">
                  <p.icon className="h-6 w-6 text-ink" strokeWidth={1.5} />
                  <StatusChip status={p.status} />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold tracking-tight">
                  {p.name}
                </h3>
                <p className="mt-2.5 flex-1 text-[14.5px] leading-relaxed text-ink-soft">
                  {p.desc}
                </p>
                <p className="mt-5 border-t border-bone-line pt-4 font-mono text-xs text-ink-faint">
                  {p.audience}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 02 — Why ────────────────────────────────────────────────── */

function WhySection() {
  const stats = [
    { value: "1 : 1,400", label: "doctor-to-population ratio" },
    { value: "7 min", label: "the average consultation" },
    { value: "13M", label: "migrant workers with no clinical continuity" },
    { value: "156", label: "maternal deaths per 100k live births" },
  ];

  return (
    <section id="why" className="relative scroll-mt-10 border-y border-bone-line bg-bone-raise/60">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <Reveal>
          <SectionIndex index="02" label="Why" />
          <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <h2 className="max-w-2xl font-display text-4xl font-medium leading-[1.06] tracking-[-0.02em] md:text-5xl">
              The plastic bag is
              <br />
              the medical record
            </h2>
            <p className="max-w-sm text-[15px] leading-relaxed text-ink-soft md:pb-1">
              A patient&apos;s history lives in a bag of paper prescriptions
              and the memory of whichever relative came along. Every visit
              starts from zero. That isn&apos;t a record-keeping problem —
              it&apos;s missing infrastructure.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 90}>
              <div className="flex h-full flex-col justify-between gap-8 rounded-3xl border border-bone-line bg-bone p-7">
                <span className="font-display text-4xl font-medium tracking-[-0.02em] md:text-5xl">
                  {s.value}
                </span>
                <span className="text-sm leading-relaxed text-ink-soft">{s.label}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 03 — Trust ──────────────────────────────────────────────── */

function TrustSection() {
  const items = [
    {
      icon: Fingerprint,
      title: "One identity for life",
      desc: "Every patient, doctor, lab, and pharmacy holds a permanent did:web identifier. Records attach to the person — not to whichever clinic happened to see them.",
    },
    {
      icon: FileSignature,
      title: "Signed, not stored-and-trusted",
      desc: "Every clinical event is a verifiable credential signed by whoever is authoritative for it — the doctor, the lab, the pharmacy. Tamper with it and verification fails.",
    },
    {
      icon: ShieldCheck,
      title: "Consent before computation",
      desc: "Nothing is processed without recorded consent, and nothing identifiable leaves the clinic — a fail-closed gate strips identifiers and logs every egress. PDPO 2025 compliant.",
    },
    {
      icon: PenLine,
      title: "The doctor decides",
      desc: "Our AI never diagnoses and never prescribes. It prepares, briefs, researches, and drafts — the clinical decision belongs to the clinician, always.",
    },
  ];

  return (
    <section id="trust" className="relative scroll-mt-10">
      <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">
        <Reveal>
          <SectionIndex index="03" label="Trust" />
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-medium leading-[1.06] tracking-[-0.02em] md:text-5xl">
            Trust is the architecture
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {items.map((item, i) => (
            <Reveal key={item.title} delay={(i % 2) * 90}>
              <div className="flex h-full gap-5 rounded-3xl border border-bone-line bg-bone-raise p-7">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lime">
                  <item.icon className="h-5 w-5 text-ink" strokeWidth={1.8} />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">
                    {item.desc}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 04 — Waitlist ───────────────────────────────────────────── */

function WaitlistSection() {
  return (
    <section id="waitlist" className="relative scroll-mt-10 border-t border-bone-line bg-bone-raise/60">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:gap-20 md:px-10 md:py-28">
        <Reveal>
          <SectionIndex index="04" label="Join" />
          <h2 className="mt-4 font-display text-4xl font-medium leading-[1.06] tracking-[-0.02em] md:text-5xl">
            Starting in Dhaka,
            <br />a few chambers at a time
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-soft">
            We onboard slowly so each chamber gets it right. Your spot in
            line is your spot in the pilot.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="rounded-3xl border border-bone-line bg-bone p-6 md:p-8">
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
    <footer className="border-t border-bone-line">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-10 text-sm text-ink-faint md:flex-row md:px-10">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-base font-semibold lowercase tracking-tight text-ink">
            kham<span className="text-lime-deep">°</span>
          </span>
          <span>Dhaka, Bangladesh</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link href="/login" className="transition hover:text-ink">
            Doctor login
          </Link>
          <Link href="/start" className="transition hover:text-ink">
            Clinic tablet
          </Link>
          <Link href="/pharmacy" className="transition hover:text-ink">
            Pharmacy verify
          </Link>
        </div>
        <p>© {new Date().getFullYear()} KhaM Health</p>
      </div>
    </footer>
  );
}
