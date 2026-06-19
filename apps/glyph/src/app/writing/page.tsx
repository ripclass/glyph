import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import {
  WRITING_THESIS,
  WRITING_PAPERS,
  WRITING_ESSAY_CLUSTERS,
  essaysInCluster,
  type WritingPiece,
} from "@/lib/landing/writing";
import { SiteNav, SiteFooter } from "@/components/landing/SiteChrome";
import { Reveal } from "@/components/landing/Reveal";

/**
 * khamhealth.com/writing — the company's thought-leadership hub.
 * Not a blog: a worldview argued in public. One thesis up front, then
 * two tiers (white papers, numbered essays), each a title and a
 * declarative tagline. Same "quiet clinical" design system as /.
 *
 * Modeled on the founder's sister product, rulhub.com/writing.
 * Content lives in lib/landing/writing.ts (placeholder until the
 * founder's pieces land). Voice rule: no em dashes, no AI cadence.
 */

export const metadata: Metadata = {
  title: "Writing · KhaM Health",
  description:
    "Essays and white papers on patient-owned, verifiable health records, sovereign clinical AI, and where a model belongs in care. From the team building Bangladesh's missing health infrastructure.",
  alternates: { canonical: "/writing" },
  openGraph: {
    title: "Writing · KhaM Health",
    description:
      "Essays on what health software owes the people it serves. The record belongs to the patient; the model sharpens the clinician and never replaces them.",
    url: "/writing",
    siteName: "KhaM Health",
    locale: "en_US",
    type: "website",
    images: ["/landing/identity.webp"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/landing/identity.webp"],
  },
};

/** Right-aligned mono metadata: publication state per piece. */
function PieceMeta({ piece }: { piece: WritingPiece }) {
  if (!piece.published) {
    return (
      <span className="shrink-0 font-mono text-[12px] text-ink-faint">
        In preparation
      </span>
    );
  }
  const parts: string[] = [];
  if (piece.date) parts.push(piece.date);
  if (piece.readMinutes) parts.push(`${piece.readMinutes} min read`);
  return (
    <span className="shrink-0 font-mono text-[12px] text-ink-faint">
      {parts.join(" · ")}
    </span>
  );
}

/** A white-paper card. Links only once the piece is published. */
function PaperCard({ piece }: { piece: WritingPiece }) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-4">
        <p className="font-mono text-[12px] uppercase tracking-wide text-lime-deep">
          White paper
        </p>
        {piece.published ? (
          <ArrowUpRight
            className="h-4 w-4 shrink-0 text-ink-faint transition group-hover:text-ink"
            strokeWidth={2}
          />
        ) : (
          <PieceMeta piece={piece} />
        )}
      </div>
      <h3 className="mt-4 font-display text-2xl font-medium leading-snug tracking-[-0.01em] md:text-[1.7rem]">
        {piece.title}
      </h3>
      <p className="mt-3 flex-1 text-[15px] leading-relaxed text-ink-soft">
        {piece.tagline}
      </p>
      {piece.published && (
        <div className="mt-5 border-t border-bone-line pt-3.5">
          <PieceMeta piece={piece} />
        </div>
      )}
    </>
  );

  const cls =
    "group flex h-full flex-col rounded-3xl border border-bone-line bg-bone-raise p-7 transition";

  return piece.published ? (
    <Link href={`/writing/${piece.slug}`} className={`${cls} hover:border-ink/25`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/** A numbered essay row. Links only once the piece is published. */
function EssayRow({ piece }: { piece: WritingPiece }) {
  const inner = (
    <div className="flex flex-col gap-3 py-7 md:flex-row md:items-baseline md:gap-8">
      <p className="shrink-0 font-mono text-[13px] text-ink-faint md:w-12">
        <span className="text-ink">{piece.number}</span>
      </p>
      <div className="flex-1">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-display text-xl font-medium tracking-[-0.01em] md:text-2xl">
            {piece.title}
            {piece.published && (
              <ArrowUpRight
                className="ml-1.5 inline h-4 w-4 text-ink-faint align-baseline transition group-hover:text-ink"
                strokeWidth={2}
              />
            )}
          </h3>
          <div className="hidden md:block">
            <PieceMeta piece={piece} />
          </div>
        </div>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
          {piece.tagline}
        </p>
        <div className="mt-2 md:hidden">
          <PieceMeta piece={piece} />
        </div>
      </div>
    </div>
  );

  return piece.published ? (
    <Link
      href={`/writing/${piece.slug}`}
      className="group block border-b border-bone-line transition first:border-t hover:bg-bone-raise/50"
    >
      {inner}
    </Link>
  ) : (
    <div className="block border-b border-bone-line first:border-t">{inner}</div>
  );
}

export default function WritingPage() {
  return (
    <div className="scene min-h-screen px-2 py-2 sm:px-4 sm:py-4">
      <main className="grain-soft relative mx-auto max-w-[1480px] overflow-hidden rounded-[1.75rem] bg-bone text-ink shadow-[0_40px_120px_-40px_rgba(23,26,25,0.45)]">
        <SiteNav />

        <div className="mx-auto max-w-7xl px-6 md:px-10">
          {/* ── Header ──────────────────────────────────────────── */}
          <header className="pb-14 pt-8 md:pt-14">
            <p
              className="landing-fade-up flex items-center gap-2 font-mono text-[13px] text-ink-faint"
              style={{ animationDelay: "0.05s" }}
            >
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 transition hover:text-ink"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                KhaM Health
              </Link>
              <span aria-hidden="true">/</span>
              Writing
            </p>

            <h1
              className="landing-fade-up mt-7 max-w-4xl font-display text-[clamp(2.3rem,4.6vw,4rem)] font-medium leading-[1.06] tracking-[-0.02em]"
              style={{ animationDelay: "0.2s" }}
            >
              Writing
            </h1>

            <p
              className="landing-fade-up mt-7 max-w-3xl text-lg leading-relaxed text-ink-soft md:text-xl"
              style={{ animationDelay: "0.35s" }}
            >
              {WRITING_THESIS}
            </p>

            <p
              className="landing-fade-up mt-8 font-mono text-[13px] text-ink-faint"
              style={{ animationDelay: "0.45s" }}
            >
              The clinical identity layer, the sovereign model beneath it, and
              the essays that follow from each.
            </p>
          </header>

          {/* ── White papers ────────────────────────────────────── */}
          <section className="border-t border-bone-line py-16 md:py-20">
            <Reveal>
              <p className="font-mono text-[13px] tracking-wide text-ink-faint">
                <span className="text-ink">01</span> — White papers
              </p>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
                The load-bearing arguments. Longer, and meant to be read once
                and returned to.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {WRITING_PAPERS.map((piece, i) => (
                <Reveal key={piece.slug} delay={(i % 2) * 90}>
                  <PaperCard piece={piece} />
                </Reveal>
              ))}
            </div>
          </section>

          {/* ── Essays ──────────────────────────────────────────── */}
          <section className="border-t border-bone-line py-16 md:py-20">
            <Reveal>
              <p className="font-mono text-[13px] tracking-wide text-ink-faint">
                <span className="text-ink">02</span> — Essays
              </p>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
                One idea each, short enough to read between patients, grouped
                under the paper each follows from.
              </p>
            </Reveal>

            <div className="mt-10 space-y-14 md:space-y-16">
              {WRITING_ESSAY_CLUSTERS.map((cluster) => {
                const essays = essaysInCluster(cluster);
                if (essays.length === 0) return null;
                return (
                  <Reveal key={cluster.title}>
                    <div className="flex flex-col gap-1.5 border-b border-bone-line pb-3 md:flex-row md:items-baseline md:justify-between md:gap-4">
                      <h3 className="font-display text-xl font-medium tracking-[-0.01em] md:text-2xl">
                        {cluster.title}
                      </h3>
                      {cluster.paperSlug && (
                        <Link
                          href={`/writing/${cluster.paperSlug}`}
                          className="group inline-flex items-center gap-1.5 font-mono text-[12px] text-ink-faint transition hover:text-ink"
                        >
                          Read the paper
                          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                        </Link>
                      )}
                    </div>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                      {cluster.blurb}
                    </p>
                    <div className="mt-3">
                      {essays.map((piece) => (
                        <EssayRow key={piece.slug} piece={piece} />
                      ))}
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── CTA band ──────────────────────────────────────────── */}
        <section className="border-t border-bone-line bg-bone-raise/60">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 py-16 md:flex-row md:items-center md:px-10">
            <div>
              <h2 className="font-display text-3xl font-medium tracking-[-0.02em] md:text-4xl">
                Building the same thing, in public
              </h2>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
                These essays argue the worldview. The products are that
                worldview, made real. See what is live, or write to us.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <a
                href="/#products"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-base font-semibold text-bone-raise transition hover:bg-ink-soft"
              >
                See the products
                <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
              </a>
              <a
                href="mailto:hello@khamhealth.com"
                className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-6 py-3.5 text-base font-medium text-ink transition hover:border-ink/50"
              >
                hello@khamhealth.com
              </a>
            </div>
          </div>
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}
