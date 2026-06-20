import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { WRITING_PIECES, getWritingPiece } from "@/lib/landing/writing";
import { SiteNav, SiteFooter } from "@/components/landing/SiteChrome";
import { Reveal } from "@/components/landing/Reveal";

/**
 * khamhealth.com/writing/<slug> — an individual essay or white paper.
 * Editorial long-form, same body renderer as the product pages. Only
 * published pieces are built; everything else 404s (dynamicParams=false),
 * so unwritten placeholders never render. Content in lib/landing/writing.ts.
 */

export function generateStaticParams() {
  return WRITING_PIECES.filter((p) => p.published).map((p) => ({
    slug: p.slug,
  }));
}

/** Unwritten/unknown slugs 404 rather than rendering an empty shell. */
export const dynamicParams = false;

/**
 * Social-card image for a piece. Module-series essays carry their own
 * product's photo; the rest take an image that fits their cluster.
 */
function ogImageForPiece(piece: { slug: string; number?: string }): string {
  const modules = [
    "pocket",
    "pharmacy",
    "lens",
    "hospital",
    "continuity",
    "karigor",
    "maa",
    "bridge",
  ];
  const mod = modules.find((m) => piece.slug.startsWith(`${m}-`));
  if (mod) return `/landing/${mod}.webp`;

  // Stories carry their own image (and have their own numbering, so they must
  // be matched by slug before the essay number-range logic below).
  if (piece.slug === "the-blood-pressure-nobody-measured") return "/landing/maa.webp";
  if (piece.slug === "the-cough-he-could-not-afford") return "/landing/continuity.webp";
  if (piece.slug === "the-body-this-work-uses-up") return "/landing/karigor.webp";

  const n = piece.number ? parseInt(piece.number, 10) : 0;
  if (piece.slug === "anatomy-of-a-plastic-bag" || (n >= 1 && n <= 9))
    return "/landing/identity.webp";
  if (piece.slug === "sovereign-by-necessity" || (n >= 10 && n <= 18))
    return "/landing/kham-med.webp";
  return "/landing/chamber.webp";
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const piece = getWritingPiece(params.slug);
  if (!piece || !piece.published) return {};
  // Description carries the searchable, plain-language topic (the
  // standfirst), so the evocative title stays the brand hook while the
  // keywords search engines match on live in the description and body.
  const description = piece.standfirst ?? piece.tagline;
  const url = `/writing/${piece.slug}`;
  const image = ogImageForPiece(piece);
  return {
    title: `${piece.title} · KhaM Health`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: piece.title,
      description,
      url,
      siteName: "KhaM Health",
      locale: "en_US",
      type: "article",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: piece.title,
      description,
      images: [image],
    },
  };
}

export default function WritingPiecePage({
  params,
}: {
  params: { slug: string };
}) {
  const piece = getWritingPiece(params.slug);
  if (!piece || !piece.published) notFound();

  const kindLabel = piece.kind === "paper" ? "White paper" : piece.kind === "story" ? "Story" : "Essay";
  const metaParts = [
    piece.number ? `No. ${piece.number}` : null,
    piece.date,
    piece.readMinutes ? `${piece.readMinutes} min read` : null,
  ].filter(Boolean);

  // Structured data so search engines read this as an article with an
  // author, publisher, and headline (eligible for richer results).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": piece.kind === "paper" ? "ScholarlyArticle" : "Article",
    headline: piece.title,
    description: piece.standfirst ?? piece.tagline,
    datePublished: "2026-06-01",
    inLanguage: "en",
    author: {
      "@type": "Organization",
      name: "KhaM Labs",
      url: "https://khamhealth.com",
    },
    publisher: {
      "@type": "Organization",
      name: "KhaM Health",
      logo: {
        "@type": "ImageObject",
        url: "https://khamhealth.com/icons/icon-512.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://khamhealth.com/writing/${piece.slug}`,
    },
  };

  return (
    <div className="scene min-h-screen px-2 py-2 sm:px-4 sm:py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="grain-soft relative mx-auto max-w-[1480px] overflow-hidden rounded-[1.75rem] bg-bone text-ink shadow-[0_40px_120px_-40px_rgba(23,26,25,0.45)]">
        <SiteNav />

        <article className="mx-auto max-w-7xl px-6 md:px-10">
          <header className="pb-12 pt-8 md:pt-14">
            <p
              className="landing-fade-up flex items-center gap-2 font-mono text-[13px] text-ink-faint"
              style={{ animationDelay: "0.05s" }}
            >
              <Link
                href="/writing"
                className="inline-flex items-center gap-1.5 transition hover:text-ink"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                Writing
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-lime-deep">{kindLabel}</span>
            </p>

            <h1
              className="landing-fade-up mt-7 max-w-4xl font-display text-[clamp(2.1rem,4.2vw,3.6rem)] font-medium leading-[1.07] tracking-[-0.02em]"
              style={{ animationDelay: "0.2s" }}
            >
              {piece.title}
            </h1>

            <p
              className="landing-fade-up mt-7 max-w-2xl text-lg leading-relaxed text-ink-soft md:text-xl"
              style={{ animationDelay: "0.35s" }}
            >
              {piece.standfirst ?? piece.tagline}
            </p>

            {metaParts.length > 0 && (
              <p
                className="landing-fade-up mt-8 font-mono text-[13px] text-ink-faint"
                style={{ animationDelay: "0.45s" }}
              >
                {metaParts.join(" · ")}
              </p>
            )}
          </header>

          <div className="mx-auto max-w-3xl py-12 md:py-16">
            {(piece.sections ?? []).map((section, i) => (
              <Reveal key={i} className="mb-12 last:mb-0 md:mb-16">
                <section>
                  {section.heading && (
                    <>
                      {section.index && (
                        <p className="font-mono text-[13px] tracking-wide text-ink-faint">
                          <span className="text-ink">{section.index}</span>
                        </p>
                      )}
                      <h2 className="mt-3 font-display text-2xl font-medium tracking-[-0.01em] md:text-3xl">
                        {section.heading}
                      </h2>
                    </>
                  )}
                  <div className={section.heading ? "mt-5 space-y-5" : "space-y-5"}>
                    {section.body.map((para, j) => (
                      <p
                        key={j}
                        className="text-[16.5px] leading-[1.75] text-ink-soft"
                      >
                        {para}
                      </p>
                    ))}
                  </div>
                  {section.code && (
                    <pre className="mt-6 overflow-x-auto rounded-2xl border border-bone-line bg-bone-raise p-5 font-mono text-[12.5px] leading-relaxed text-ink-soft">
                      <code>{section.code}</code>
                    </pre>
                  )}
                  {section.pullQuote && (
                    <blockquote className="my-10 border-l-2 border-lime pl-6 font-display text-2xl font-medium leading-snug tracking-[-0.01em] text-ink md:text-3xl">
                      {section.pullQuote}
                    </blockquote>
                  )}
                </section>
              </Reveal>
            ))}

            <Reveal>
              <Link
                href="/writing"
                className="mt-4 inline-flex items-center gap-2 font-mono text-[13px] text-ink-faint transition hover:text-ink"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                All writing
              </Link>
            </Reveal>
          </div>
        </article>

        <section className="border-t border-bone-line bg-bone-raise/60">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 py-16 md:flex-row md:items-center md:px-10">
            <h2 className="font-display text-3xl font-medium tracking-[-0.02em] md:text-4xl">
              The worldview, made real
            </h2>
            <a
              href="/#products"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-base font-semibold text-bone-raise transition hover:bg-ink-soft"
            >
              See the products
              <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
            </a>
          </div>
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}
