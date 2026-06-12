import type { Metadata } from "next";
import Image from "next/image";
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
import { SiteNav, SiteFooter } from "@/components/landing/SiteChrome";

/**
 * THE company landing — khamhealth.com is the umbrella; every product
 * has its own editorial page at /<slug> (see lib/landing/products.ts).
 * This page is the buyer-facing front door and deliberately carries NO
 * product status labels — status lives in prose on the product pages.
 *
 * Design language ("quiet clinical", color-matched to the founder's
 * reference): bone sheet on a steel-teal scene, sentence-case
 * Instrument Sans, one chartreuse accent, photographic gallery with
 * overlay chips. Calm over loud.
 */

export const metadata: Metadata = {
  title: "KhaM Health — Healthcare that remembers you",
  description:
    "KhaM Health is building Bangladesh's missing clinical infrastructure: one patient identity, every prescription, lab result, and visit — signed, verifiable, owned by the patient. Join the pilot in Dhaka.",
  openGraph: {
    title: "KhaM Health — Healthcare that remembers you",
    description:
      "One patient identity. Every prescription, lab, and visit — signed and verifiable. Built for Bangladesh first.",
    siteName: "KhaM Health",
    locale: "en_US",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <div className="scene min-h-screen px-2 py-2 sm:px-4 sm:py-4">
      <main className="grain-soft relative mx-auto max-w-[1480px] overflow-hidden rounded-[1.75rem] bg-bone text-ink shadow-[0_40px_120px_-40px_rgba(23,26,25,0.45)]">
        <SiteNav />
        <Hero />
        <Gallery />
        <Marquee />
        <Products />
        <WhySection />
        <TrustSection />
        <WaitlistSection />
        <SiteFooter />
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
            <a
              href="#waitlist"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-bone-raise transition hover:bg-ink-soft active:scale-[0.98]"
            >
              Join the pilot
            </a>
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

/* ── Gallery: photography with overlay chips ─────────────────── */

function Chip({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/40 px-3.5 py-2 text-[12px] font-medium text-ink shadow-sm backdrop-blur-md ${className}`}
    >
      {children}
    </span>
  );
}

/** The Apple-style frost: a glass band over the (clean, sharp) photo */
function GlassBand({ children }: { children: React.ReactNode }) {
  return (
    <figcaption className="absolute inset-x-3 bottom-3 rounded-xl border border-white/45 bg-white/30 px-4 py-3 text-[12.5px] font-medium leading-snug text-ink shadow-sm backdrop-blur-lg">
      {children}
    </figcaption>
  );
}

function Gallery() {
  return (
    <section
      className="landing-fade-up mx-auto max-w-7xl px-6 pb-16 md:px-10"
      style={{ animationDelay: "0.55s" }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1 — Voice intake */}
        <figure className="frost-1 relative h-72 overflow-hidden rounded-2xl md:h-80">
          <Image
            src="/landing/glyph.webp"
            alt="A doctor listening to a patient"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
          <Chip className="absolute left-4 top-4">
            <span className="relative flex h-2 w-2">
              <span className="absolute h-full w-full animate-ping rounded-full bg-red_flag/70" />
              <span className="relative h-2 w-2 rounded-full bg-red_flag" />
            </span>
            Listening · বাংলা
          </Chip>
          <GlassBand>Voice intake — knows who&apos;s speaking</GlassBand>
        </figure>

        {/* 2 — Early warning */}
        <figure className="frost-2 relative h-72 overflow-hidden rounded-2xl md:h-80">
          <Image
            src="/landing/mother.webp"
            alt="A health worker checking blood pressure at home"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
          <Chip className="absolute left-4 top-4">
            <span className="h-2 w-2 rounded-full bg-red_flag" />
            Red flag · BP 150/95 at week 28
          </Chip>
          <GlassBand>Caught on schedule, not in the ER</GlassBand>
        </figure>

        {/* 3 — Signed prescription */}
        <figure className="frost-3 relative h-72 overflow-hidden rounded-2xl md:h-80">
          <Image
            src="/landing/prescription.webp"
            alt="A pharmacist at the counter"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
          <span className="absolute left-4 top-4 grid h-12 w-12 place-items-center rounded-xl border border-white/50 bg-white/40 shadow-sm backdrop-blur-md">
            <QrCode className="h-6 w-6 text-ink" strokeWidth={1.5} />
          </span>
          <GlassBand>
            <span className="inline-flex items-center gap-2">
              Signed Rx — verified at the pharmacy
              <CheckCheck className="h-3.5 w-3.5 text-lime-deep" strokeWidth={2.5} />
            </span>
          </GlassBand>
        </figure>

        {/* 4 — Across borders */}
        <figure className="frost-4 relative h-72 overflow-hidden rounded-2xl md:h-80">
          <Image
            src="/landing/migrant.webp"
            alt="A migrant worker holding a phone"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
          <span className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-lime shadow-sm">
            <Mic className="h-5 w-5 text-ink" strokeWidth={1.8} />
          </span>
          <GlassBand>His doctor is 5,000 km away. It works.</GlassBand>
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
    <div
      className="relative overflow-hidden border-y border-bone-line bg-bone-raise/60 py-3.5"
      aria-hidden="true"
    >
      <div className="marquee-track">
        <div className="flex">{row}</div>
        <div className="flex">{row}</div>
      </div>
    </div>
  );
}

/* ── 01 — Products ───────────────────────────────────────────── */

function Products() {
  const products: {
    icon: typeof FlaskConical;
    name: string;
    slug: string;
    desc: string;
    audience: string;
  }[] = [
    {
      icon: FileSignature,
      name: "Prescription",
      slug: "prescription",
      desc: "Digitally signed prescriptions a pharmacy counter can verify in seconds — and that revoke instantly when they should.",
      audience: "Pharmacies · Doctors",
    },
    {
      icon: FlaskConical,
      name: "Lab",
      slug: "lab",
      desc: "Structured orders in, signed results out. AI co-interpretation for diagnostic centres of every size.",
      audience: "Diagnostic centres",
    },
    {
      icon: HeartPulse,
      name: "Mother",
      slug: "mother",
      desc: "Schedule-driven antenatal and postpartum care with home BP monitoring — for the 3.5 million pregnancies a year.",
      audience: "Mothers · OB-GYNs · CHWs",
    },
    {
      icon: Factory,
      name: "Factory",
      slug: "factory",
      desc: "Real workplace healthcare for garment workers — and audit-ready compliance documentation for buyers.",
      audience: "Workers · Compliance",
    },
    {
      icon: Plane,
      name: "Migrant",
      slug: "migrant",
      desc: "Asynchronous assessment and triage across borders for 13 million workers abroad — voice symptoms in Bangla, matched BD physicians.",
      audience: "Migrant workers · Families",
    },
    {
      icon: Globe2,
      name: "Connect",
      slug: "connect",
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
          <Link
            href="/glyph"
            className="group relative block overflow-hidden rounded-3xl bg-ink p-8 text-bone transition md:p-12"
          >
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
              <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-semibold text-ink transition group-hover:bg-lime-deep">
                Read the Glyph story
                <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
              </span>
            </div>
          </Link>
        </Reveal>

        {/* The family */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <Reveal key={p.slug} delay={(i % 3) * 90}>
              <Link
                href={`/${p.slug}`}
                className="group flex h-full flex-col rounded-3xl border border-bone-line bg-bone-raise p-7 transition hover:border-ink/25"
              >
                <div className="flex items-center justify-between">
                  <p.icon className="h-6 w-6 text-ink" strokeWidth={1.5} />
                  <ArrowUpRight
                    className="h-4 w-4 text-ink-faint transition group-hover:text-ink"
                    strokeWidth={2}
                  />
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
              </Link>
            </Reveal>
          ))}
        </div>

        {/* The spine itself */}
        <Reveal className="mt-5">
          <Link
            href="/network"
            className="group flex flex-col gap-6 rounded-3xl border border-bone-line bg-bone-raise p-7 transition hover:border-ink/25 md:flex-row md:items-center md:justify-between md:p-9"
          >
            <div className="flex items-start gap-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lime">
                <Fingerprint className="h-5 w-5 text-ink" strokeWidth={1.8} />
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight">
                  The Clinical Identity Network
                </h3>
                <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-ink-soft">
                  The spine every product writes to: a permanent identity for
                  every patient and provider, and a cryptographic signature on
                  every clinical event. Read how the whole thing works.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 font-mono text-[13px] text-ink-faint transition group-hover:text-ink">
              Read the story
              <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
            </span>
          </Link>
        </Reveal>
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
    <section
      id="why"
      className="relative scroll-mt-10 border-y border-bone-line bg-bone-raise/60"
    >
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
    <section
      id="waitlist"
      className="relative scroll-mt-10 border-t border-bone-line bg-bone-raise/60"
    >
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
