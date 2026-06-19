import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Stethoscope,
  Wallet,
  Pill,
  Microscope,
  Plane,
  Shirt,
  Baby,
  Building2,
  Globe2,
  Fingerprint,
  BrainCircuit,
  FileSignature,
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
 * THE company landing. khamhealth.com is the umbrella; every product
 * has its own editorial page at /<slug> (content in
 * lib/landing/products.ts, condensed from the eleven product docs).
 *
 * Brand architecture: KhaM Labs is the house, KhaM Health operates the
 * infrastructure, Glyph is what a doctor or patient touches, KhaM-Med
 * is the model underneath.
 *
 * Voice rule: no em dashes, no AI cadence (founder, 2026-06-12).
 * Design: "quiet clinical", color-sampled from the founder's reference.
 */

export const metadata: Metadata = {
  title: "KhaM Health · Healthcare that remembers you",
  description:
    "KhaM Health is building Bangladesh's missing clinical infrastructure: one identity for every patient, every prescription and lab result signed and verifiable, owned by the patient for life. Glyph Chamber is live in Dhaka. Join the pilot.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "KhaM Health · Healthcare that remembers you",
    description:
      "One identity for every patient. Every clinical record signed, verifiable, and owned by the patient. Built for Bangladesh first.",
    url: "/",
    siteName: "KhaM Health",
    locale: "en_US",
    type: "website",
    images: ["/landing/chamber.webp"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/landing/chamber.webp"],
  },
};

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://khamhealth.com/#organization",
      name: "KhaM Health",
      url: "https://khamhealth.com",
      logo: "https://khamhealth.com/icons/icon-512.png",
      email: "hello@khamhealth.com",
      description:
        "Clinical infrastructure for Bangladesh: one verifiable identity per patient, every prescription and lab result signed and owned by the patient for life.",
      foundingLocation: { "@type": "Place", name: "Dhaka, Bangladesh" },
    },
    {
      "@type": "WebSite",
      "@id": "https://khamhealth.com/#website",
      url: "https://khamhealth.com",
      name: "KhaM Health",
      inLanguage: "en",
      publisher: { "@id": "https://khamhealth.com/#organization" },
    },
  ],
};

export default function LandingPage() {
  return (
    <div className="scene min-h-screen px-2 py-2 sm:px-4 sm:py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
      />
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
        Clinical infrastructure, made in Dhaka
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
            One identity for every patient. Every prescription, lab result,
            and visit signed, verifiable, and owned by the patient for life.
            Built for Bangladesh first.
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

/* ── Gallery: photography with glass-panel chips ─────────────── */

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

/** The Apple-style frost: a glass band over the clean, sharp photo */
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
        {/* 1 — Chamber */}
        <figure className="frost-1 relative h-72 overflow-hidden rounded-2xl md:h-80">
          <Image
            src="/landing/chamber.webp"
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
          <GlassBand>The history, taken before the doctor walks in</GlassBand>
        </figure>

        {/* 2 — Maa */}
        <figure className="frost-2 relative h-72 overflow-hidden rounded-2xl md:h-80">
          <Image
            src="/landing/maa.webp"
            alt="A health worker checking blood pressure at home"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
          <Chip className="absolute left-4 top-4">
            <span className="h-2 w-2 rounded-full bg-red_flag" />
            Rising BP · week 28
          </Chip>
          <GlassBand>Caught on schedule, not in the emergency room</GlassBand>
        </figure>

        {/* 3 — Pharmacy */}
        <figure className="frost-3 relative h-72 overflow-hidden rounded-2xl md:h-80">
          <Image
            src="/landing/pharmacy.webp"
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
              Signed prescription, verified at the counter
              <CheckCheck className="h-3.5 w-3.5 text-lime-deep" strokeWidth={2.5} />
            </span>
          </GlassBand>
        </figure>

        {/* 4 — Continuity */}
        <figure className="frost-4 relative h-72 overflow-hidden rounded-2xl md:h-80">
          <Image
            src="/landing/continuity.webp"
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
    icon: typeof Wallet;
    name: string;
    slug: string;
    desc: string;
    audience: string;
  }[] = [
    {
      icon: Wallet,
      name: "Pocket",
      slug: "pocket",
      desc: "The patient's wallet, voice, and memory. Free, in Bangla, built for shared phones. The plastic bag of paper records, made permanent.",
      audience: "Patients · Families",
    },
    {
      icon: Pill,
      name: "Pharmacy",
      slug: "pharmacy",
      desc: "Signed prescriptions verified at the counter in seconds. The enforcement loop that antibiotic stewardship has never had here.",
      audience: "Pharmacies · Regulators",
    },
    {
      icon: Microscope,
      name: "Lens",
      slug: "lens",
      desc: "Orders in, signed results out, AI co-interpretation in the middle. Built for the 700 radiologists serving 170 million people.",
      audience: "Diagnostic centres",
    },
    {
      icon: Plane,
      name: "Continuity",
      slug: "continuity",
      desc: "Asynchronous care for 15 million Bangladeshis abroad. Voice notes in dialect, a matched doctor at home, invisible to the employer.",
      audience: "Migrant workers · Families",
    },
    {
      icon: Shirt,
      name: "Karigor",
      slug: "karigor",
      desc: "A working medical room on the factory floor. The worker owns her record; the factory gets verifiable compliance. The line never moves.",
      audience: "Garment workers · Brands",
    },
    {
      icon: Baby,
      name: "Maa",
      slug: "maa",
      desc: "Blood-pressure surveillance through every pregnancy, and routing that ends the ricochet between facilities that meet a dying mother as a stranger.",
      audience: "Mothers · CHWs · Funders",
    },
    {
      icon: Building2,
      name: "Hospital",
      slug: "hospital",
      desc: "Admission with the wallet, discharge that travels, referral that arrives before the ambulance. The continuity layer, not another HIMS.",
      audience: "Hospitals · Duty doctors",
    },
    {
      icon: Globe2,
      name: "Bridge",
      slug: "bridge",
      desc: "A verifiable dossier a Chennai or Bangkok specialist will stake an opinion on. Often the opinion makes the ticket unnecessary.",
      audience: "Families · Diaspora",
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
              many doors
            </h2>
            <p className="max-w-sm text-[15px] leading-relaxed text-ink-soft md:pb-1">
              Glyph is what a doctor or patient touches. Nine interfaces,
              one patient-owned record underneath. Start anywhere; the
              history follows.
            </p>
          </div>
        </Reveal>

        {/* Featured: Glyph Chamber */}
        <Reveal className="mt-12">
          <Link
            href="/chamber"
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
                    Glyph Chamber
                  </h3>
                </div>
                <p className="mt-4 text-[17px] leading-relaxed text-bone/70">
                  The doctor&apos;s interface, built for the 48-second
                  consultation. It takes the history in Bangla before the
                  patient walks in, reads the plastic bag of old papers,
                  briefs the doctor with red flags first, and writes the note
                  in the format Bangladeshi medicine actually uses. The
                  doctor reviews and signs. The prescription becomes
                  verifiable everywhere.
                </p>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {[
                    "Bangla voice intake",
                    "Attendant-aware",
                    "Reads the plastic bag",
                    "Red-flag briefings",
                    "CC/O-E/Ix/Rx/Advice notes",
                    "Signed prescriptions",
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
                Read the Chamber story
                <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
              </span>
            </div>
          </Link>
        </Reveal>

        {/* The family */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p, i) => (
            <Reveal key={p.slug} delay={(i % 4) * 80}>
              <Link
                href={`/${p.slug}`}
                className="group flex h-full flex-col rounded-3xl border border-bone-line bg-bone-raise p-6 transition hover:border-ink/25"
              >
                <div className="flex items-center justify-between">
                  <p.icon className="h-6 w-6 text-ink" strokeWidth={1.5} />
                  <ArrowUpRight
                    className="h-4 w-4 text-ink-faint transition group-hover:text-ink"
                    strokeWidth={2}
                  />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">
                  {p.name}
                </h3>
                <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-ink-soft">
                  {p.desc}
                </p>
                <p className="mt-4 border-t border-bone-line pt-3.5 font-mono text-[11px] text-ink-faint">
                  {p.audience}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>

        {/* The foundation */}
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Reveal>
            <Link
              href="/identity"
              className="group flex h-full gap-5 rounded-3xl border border-bone-line bg-bone-raise p-7 transition hover:border-ink/25"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lime">
                <Fingerprint className="h-5 w-5 text-ink" strokeWidth={1.8} />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  Identity &amp; Matching
                  <span className="ml-2 font-mono text-[11px] font-normal text-ink-faint">
                    what everything stands on
                  </span>
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                  A permanent identity for every patient and provider, eight
                  enrollment paths so no one is excluded, and a matching
                  engine that creates the family-physician relationship
                  Bangladesh never had.
                </p>
              </div>
            </Link>
          </Reveal>
          <Reveal delay={90}>
            <Link
              href="/kham-med"
              className="group flex h-full gap-5 rounded-3xl border border-bone-line bg-bone-raise p-7 transition hover:border-ink/25"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lime">
                <BrainCircuit className="h-5 w-5 text-ink" strokeWidth={1.8} />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  KhaM-Med
                  <span className="ml-2 font-mono text-[11px] font-normal text-ink-faint">
                    the sovereign clinical model
                  </span>
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                  Bangladesh&apos;s own clinical AI: open weights, trained on
                  consented local encounters, fluent in the languages patients
                  actually speak. Everything it learns stays in the country.
                </p>
              </div>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── 02 — Why ────────────────────────────────────────────────── */

function WhySection() {
  const stats = [
    { value: "48 sec", label: "the average primary care consultation, the shortest measured anywhere" },
    { value: "73%", label: "of health spending paid out of pocket, the highest in South Asia" },
    { value: "15.4M", label: "Bangladeshis abroad with no clinical connection to home" },
    { value: "4,000+", label: "mothers lost each year to a decline that has stalled" },
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
              starts from zero. These are not record-keeping failures. They
              are identity failures, and identity is what we build.
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
      title: "The patient holds the keys",
      desc: "Records are encrypted to keys the patient holds, not stored in one more central trove. The 2023 leak of 50 million citizens' data is the documented reason. Breach is assumed; breach is made unrewarding.",
    },
    {
      icon: FileSignature,
      title: "Signed, not stored-and-trusted",
      desc: "Every clinical event is a credential signed by whoever is authoritative for it: the doctor, the lab, the pharmacy. A forged report fails verification at any connected counter, chamber, or ward.",
    },
    {
      icon: ShieldCheck,
      title: "Consent before computation",
      desc: "Nothing is processed without recorded consent, and consent is per provider, per category, revocable. PDPO 2025 made the citizen the owner of her data by law. This architecture makes her the owner by cryptography.",
    },
    {
      icon: PenLine,
      title: "The licensed human decides",
      desc: "KhaM-Med drafts, briefs, and flags. It never diagnoses and never prescribes. The BMDC-registered doctor signs every note, and the system is designed so that line cannot blur.",
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
          <p className="mt-4 text-[15px] text-ink-soft">
            Institutions, regulators, and funders: write to{" "}
            <a
              href="mailto:hello@khamhealth.com"
              className="font-medium text-ink underline decoration-lime decoration-2 underline-offset-4 transition hover:decoration-lime-deep"
            >
              hello@khamhealth.com
            </a>
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
