import type { Metadata } from "next";
import Image from "next/image";
import {
  Database,
  Users,
  Pill,
  Stethoscope,
  Coins,
  Scale,
  MessageSquareWarning,
  LineChart,
  Landmark,
  ArrowUpRight,
} from "lucide-react";
import { SiteNav, SiteFooter } from "@/components/landing/SiteChrome";
import { Reveal } from "@/components/landing/Reveal";

/**
 * THE donor-facing page: khamhealth.com/partners. Written for
 * governments, multilaterals, and funders in their own evaluation
 * language: the WHO health system building blocks, accountability to
 * affected populations (GRS), measurement and publication, and
 * governance/succession. Sources: research-12-nutrition-grs-hss.md
 * and the eleven product documents.
 *
 * Voice rule applies: no em dashes, no AI cadence.
 */

export const metadata: Metadata = {
  title: "For governments and funders | KhaM Health",
  description:
    "Glyph mapped to the WHO health system building blocks: health information systems, workforce, essential medicines, service delivery, financing, and governance. Grievance redress built into the architecture. Pilots specified, measured, and published.",
  openGraph: {
    title: "KhaM Health for governments and funders",
    description:
      "Health system strengthening, rendered in cryptography: one patient identity, verifiable records, accountability built in.",
    siteName: "KhaM Health",
    locale: "en_US",
    type: "website",
  },
};

const BLOCKS = [
  {
    icon: Database,
    block: "Health information systems",
    contribution:
      "The identity layer and the patient-held record: the missing national HIS, built bottom-up, owned by citizens, PDPO-compliant by construction rather than by retrofit.",
  },
  {
    icon: Users,
    block: "Health workforce",
    contribution:
      "Verifiable professional identity against the registry gaps BMDC itself has stated publicly. A matching engine that creates durable doctor-patient relationships. Clinical upskilling for CHWs, factory health assistants, and dispensers.",
  },
  {
    icon: Pill,
    block: "Access to essential medicines",
    contribution:
      "A prescription verification loop at the pharmacy counter, built against documented baselines of 50 to 92% non-prescription antibiotic dispensing. Dispensing records that make stewardship enforceable instead of aspirational.",
  },
  {
    icon: Stethoscope,
    block: "Service delivery",
    contribution:
      "Preparation before the consultation, verified diagnostics, asynchronous care across borders, scheduled maternal surveillance, and referral routing that delivers an expected patient instead of a stranger.",
  },
  {
    icon: Coins,
    block: "Financing",
    contribution:
      "A direct attack on the waste inside 73% out-of-pocket spending: duplicate diagnostics, wrong first stops, and medication errors. ADB modelling already prices the duplicate-diagnostics problem in the hundreds of millions of dollars annually.",
  },
  {
    icon: Scale,
    block: "Leadership and governance",
    contribution:
      "Verifiable compliance instruments for BMDC, DGDA, DGHS, and DIFE. Pilot data measured against published baselines and offered openly to regulators. A grievance system whose resolutions are attested, not self-reported.",
  },
];

const PILOTS = [
  {
    name: "Maa",
    scope:
      "One upazila. Every identified pregnancy enrolled, CHW-run blood pressure and nutrition surveillance, escalation routed to facilities verified ready, measured against the district's BMMS-pattern baseline.",
    funding: "USD 3 to 8M across the maternal-health funder set",
    href: "/maa",
  },
  {
    name: "Continuity",
    scope:
      "One corridor, Dhaka to the UAE. Wallets provisioned at BMET pre-departure orientation, asynchronous review by a paid Bangladeshi physician panel, structured handover measured under real labor-camp conditions.",
    funding: "USD 2 to 5M via migrant-welfare institutions, ILO and IOM workstreams",
    href: "/continuity",
  },
  {
    name: "Pharmacy",
    scope:
      "One administrative unit saturated with signed prescriptions, then free pharmacy verification rolled out across it. Non-prescription antibiotic dispensing tracked for six months against the documented 50 to 92% baselines, results published.",
    funding: "AMR and stewardship funding; evidence designed for DGDA engagement",
    href: "/pharmacy",
  },
];

export default function PartnersPage() {
  return (
    <div className="scene min-h-screen px-2 py-2 sm:px-4 sm:py-4">
      <main className="grain-soft relative mx-auto max-w-[1480px] overflow-hidden rounded-[1.75rem] bg-bone text-ink shadow-[0_40px_120px_-40px_rgba(23,26,25,0.45)]">
        <SiteNav />

        <article className="mx-auto max-w-7xl px-6 md:px-10">
          {/* ── Header ─────────────────────────────────────────── */}
          <header className="pb-12 pt-8 md:pt-14">
            <p
              className="landing-fade-up flex items-center gap-2 font-mono text-[13px] text-ink-faint"
              style={{ animationDelay: "0.05s" }}
            >
              <Landmark className="h-3.5 w-3.5" strokeWidth={2} />
              For governments, multilaterals, and funders
            </p>

            <h1
              className="landing-fade-up mt-7 max-w-4xl font-display text-[clamp(2.3rem,4.6vw,4rem)] font-medium leading-[1.06] tracking-[-0.02em]"
              style={{ animationDelay: "0.2s" }}
            >
              Health system strengthening,
              <br />
              rendered in cryptography
            </h1>

            <p
              className="landing-fade-up mt-7 max-w-2xl text-lg leading-relaxed text-ink-soft md:text-xl"
              style={{ animationDelay: "0.35s" }}
            >
              Bangladesh&apos;s healthcare failures are identity failures: the
              unverifiable prescriber, the ghost-signed report, the mother who
              arrives at her third facility as a stranger. We build the layer
              that fixes them. Below is that work mapped to the framework you
              evaluate in: the WHO health system building blocks, accountability
              to affected populations, and governance that survives us.
            </p>
          </header>

          {/* ── Hero image ─────────────────────────────────────── */}
          <div
            className="landing-fade-up relative aspect-[16/8] overflow-hidden rounded-2xl md:aspect-[16/6]"
            style={{ animationDelay: "0.5s" }}
          >
            <Image
              src="/landing/partners.webp"
              alt="An empty village path through rice fields in morning mist"
              fill
              priority
              sizes="(max-width: 1480px) 100vw, 1400px"
              className="object-cover"
            />
            <div className="absolute bottom-4 left-4 rounded-xl border border-white/45 bg-white/30 px-4 py-2.5 shadow-sm backdrop-blur-lg">
              <p className="font-mono text-[12px] text-ink">
                The last mile<span className="text-ink-soft"> · where the system has to arrive</span>
              </p>
            </div>
          </div>

          {/* ── 01 Building blocks ─────────────────────────────── */}
          <section className="py-16 md:py-24">
            <Reveal>
              <p className="font-mono text-[13px] tracking-wide text-ink-faint">
                <span className="text-ink">01</span> — The six building blocks
              </p>
              <h2 className="mt-3 max-w-2xl font-display text-3xl font-medium tracking-[-0.01em] md:text-4xl">
                Where Glyph sits in the WHO framework
              </h2>
            </Reveal>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {BLOCKS.map((b, i) => (
                <Reveal key={b.block} delay={(i % 3) * 90}>
                  <div className="flex h-full flex-col rounded-3xl border border-bone-line bg-bone-raise p-7">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-lime">
                      <b.icon className="h-5 w-5 text-ink" strokeWidth={1.8} />
                    </span>
                    <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">
                      {b.block}
                    </h3>
                    <p className="mt-2.5 flex-1 text-[14.5px] leading-relaxed text-ink-soft">
                      {b.contribution}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* ── 02 Accountability / GRS ────────────────────────── */}
          <section className="border-t border-bone-line py-16 md:py-24">
            <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:gap-16">
              <Reveal>
                <p className="font-mono text-[13px] tracking-wide text-ink-faint">
                  <span className="text-ink">02</span> — Accountability
                </p>
                <h2 className="mt-3 font-display text-3xl font-medium tracking-[-0.01em] md:text-4xl">
                  Grievance redress, with resolutions that prove themselves
                </h2>
              </Reveal>
              <Reveal delay={100}>
                <div className="space-y-5 text-[16px] leading-[1.75] text-ink-soft">
                  <p>
                    Bangladesh&apos;s health ministry already operates a national
                    Grievance Redress System. A 2025 analysis in PLOS Digital
                    Health examined 11,604 messages submitted to it over eight
                    months: 67% were forwarded to another department, 30% were
                    closed, and 2.55% were resolved. The channel exists. The
                    accountability does not.
                  </p>
                  <p>
                    In the Glyph network, a grievance is a credential: filed by
                    an identified patient or through anonymous mode for the
                    complaints people are afraid to sign, bound to the encounter
                    it concerns, and tracked to a resolution that is attested
                    rather than self-reported. Aggregate resolution rates are
                    visible to funders and regulators through selective
                    disclosure, with no individual exposed.
                  </p>
                  <p className="flex items-start gap-3 rounded-2xl border border-bone-line bg-bone-raise p-5 text-[15px]">
                    <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0 text-lime-deep" strokeWidth={1.8} />
                    For donor-funded programs this is a standing requirement, not
                    a feature: World Bank safeguards and UN accountability policy
                    both demand functioning grievance mechanisms. Ours is built
                    into the record architecture itself.
                  </p>
                </div>
              </Reveal>
            </div>
          </section>

          {/* ── 03 Measurement ─────────────────────────────────── */}
          <section className="border-t border-bone-line py-16 md:py-24">
            <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:gap-16">
              <Reveal>
                <p className="font-mono text-[13px] tracking-wide text-ink-faint">
                  <span className="text-ink">03</span> — Measurement
                </p>
                <h2 className="mt-3 font-display text-3xl font-medium tracking-[-0.01em] md:text-4xl">
                  Measured against published baselines, published either way
                </h2>
              </Reveal>
              <Reveal delay={100}>
                <div className="space-y-5 text-[16px] leading-[1.75] text-ink-soft">
                  <p>
                    Every pilot in this program is specified against a documented
                    baseline: the 48-second consultation, the 50 to 92%
                    non-prescription antibiotic rates, the preeclampsia mortality
                    plateau the national surveys describe, the 2.55% grievance
                    resolution rate. Because every encounter in the network is a
                    signed record, program outcomes are verifiable data rather
                    than self-reported aggregates. Funders see what their money
                    produced: visits that demonstrably happened, blood pressures
                    that were demonstrably taken, prescriptions that were
                    demonstrably verified.
                  </p>
                  <p className="flex items-start gap-3 rounded-2xl border border-bone-line bg-bone-raise p-5 text-[15px]">
                    <LineChart className="mt-0.5 h-5 w-5 shrink-0 text-lime-deep" strokeWidth={1.8} />
                    Nutrition surveillance is joining the same spine: growth
                    monitoring at every immunization contact and anaemia
                    screening through pregnancy, in a country where 28% of
                    children under five are stunted and anaemia in women shows
                    no recorded progress. Real-time, consented, longitudinal
                    nutrition data as a side effect of care.
                  </p>
                </div>
              </Reveal>
            </div>
          </section>

          {/* ── 04 Fundable pilots ─────────────────────────────── */}
          <section className="border-t border-bone-line py-16 md:py-24">
            <Reveal>
              <p className="font-mono text-[13px] tracking-wide text-ink-faint">
                <span className="text-ink">04</span> — Where to engage
              </p>
              <h2 className="mt-3 max-w-2xl font-display text-3xl font-medium tracking-[-0.01em] md:text-4xl">
                Three pilots, specified and costed
              </h2>
            </Reveal>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {PILOTS.map((p, i) => (
                <Reveal key={p.name} delay={(i % 3) * 90}>
                  <a
                    href={p.href}
                    className="group flex h-full flex-col rounded-3xl border border-bone-line bg-bone-raise p-7 transition hover:border-ink/25"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-xl font-semibold tracking-tight">
                        {p.name}
                      </h3>
                      <ArrowUpRight
                        className="h-4 w-4 text-ink-faint transition group-hover:text-ink"
                        strokeWidth={2}
                      />
                    </div>
                    <p className="mt-3 flex-1 text-[14.5px] leading-relaxed text-ink-soft">
                      {p.scope}
                    </p>
                    <p className="mt-5 border-t border-bone-line pt-4 font-mono text-[12px] leading-relaxed text-ink-faint">
                      {p.funding}
                    </p>
                  </a>
                </Reveal>
              ))}
            </div>
          </section>

          {/* ── 05 Governance ──────────────────────────────────── */}
          <section className="border-t border-bone-line py-16 md:py-24">
            <div className="mx-auto max-w-3xl">
              <Reveal>
                <p className="font-mono text-[13px] tracking-wide text-ink-faint">
                  <span className="text-ink">05</span> — Governance
                </p>
                <h2 className="mt-3 font-display text-3xl font-medium tracking-[-0.01em] md:text-4xl">
                  Built to outlive its operator
                </h2>
                <div className="mt-6 space-y-5 text-[16px] leading-[1.75] text-ink-soft">
                  <p>
                    Glyph is a single-operator system built on portable open
                    standards, and it says so plainly. Every wallet exports in
                    W3C-standard form; credentials verify against published keys
                    with or without our cooperation. KhaM Labs&apos; governing
                    documents carry a named succession obligation: if the
                    operator fails, keys, namespace, and resolution
                    infrastructure transfer to a designated successor, in
                    preference order a Bangladeshi public authority, a consortium
                    of participating institutions, or an international
                    digital-public-goods custodian.
                  </p>
                  <p>
                    The Personal Data Protection Ordinance 2025 made the citizen
                    the owner of her data by law. This architecture makes her the
                    owner by cryptography, ahead of the ordinance&apos;s
                    enforcement date. Raw patient data is never sold, and the
                    patient-held-key design makes that a structural fact rather
                    than a policy promise.
                  </p>
                </div>
              </Reveal>
            </div>
          </section>
        </article>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section className="border-t border-bone-line bg-bone-raise/60">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 py-16 md:flex-row md:items-center md:px-10">
            <div>
              <h2 className="font-display text-3xl font-medium tracking-[-0.02em] md:text-4xl">
                Talk to us
              </h2>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
                Full product documentation, pilot specifications, and source
                citations are available on request.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <a
                href="mailto:hello@khamhealth.com"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-base font-semibold text-bone-raise transition hover:bg-ink-soft"
              >
                hello@khamhealth.com
                <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
              </a>
              <a
                href="/identity"
                className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-6 py-3.5 text-base font-medium text-ink transition hover:border-ink/50"
              >
                Read the architecture
              </a>
            </div>
          </div>
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}
