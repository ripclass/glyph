import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { PRODUCTS, getProduct } from "@/lib/landing/products";
import { SiteNav, SiteFooter } from "@/components/landing/SiteChrome";
import { Reveal } from "@/components/landing/Reveal";

/**
 * Editorial product landing — khamhealth.com/<slug>. Long-form,
 * magazine-style narration written for policy, government, and donor
 * readers (the company page stays buyer-facing). Same "quiet clinical"
 * design system as /.
 */

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ product: p.slug }));
}

/** Unknown slugs 404 instead of falling through to a dynamic render */
export const dynamicParams = false;

export function generateMetadata({
  params,
}: {
  params: { product: string };
}): Metadata {
  const product = getProduct(params.product);
  if (!product) return {};
  return {
    title: `${product.name} · ${product.headline} | KhaM Health`,
    description: product.standfirst,
    openGraph: {
      title: `${product.name} by KhaM Health`,
      description: product.standfirst,
      siteName: "KhaM Health",
      locale: "en_US",
      type: "article",
    },
  };
}

export default function ProductPage({
  params,
}: {
  params: { product: string };
}) {
  const product = getProduct(params.product);
  if (!product) notFound();

  return (
    <div className="scene min-h-screen px-2 py-2 sm:px-4 sm:py-4">
      <main className="grain-soft relative mx-auto max-w-[1480px] overflow-hidden rounded-[1.75rem] bg-bone text-ink shadow-[0_40px_120px_-40px_rgba(23,26,25,0.45)]">
        <SiteNav />

        {/* ── Editorial header ─────────────────────────────────── */}
        <article className="mx-auto max-w-7xl px-6 md:px-10">
          <header className="pb-12 pt-8 md:pt-14">
            <p
              className="landing-fade-up flex items-center gap-2 font-mono text-[13px] text-ink-faint"
              style={{ animationDelay: "0.05s" }}
            >
              <Link
                href="/#products"
                className="inline-flex items-center gap-1.5 transition hover:text-ink"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                Products
              </Link>
              <span aria-hidden="true">/</span>
              {product.name}
              <span className="text-lime-deep">·</span>
              <span>{product.codename}</span>
            </p>

            <h1
              className="landing-fade-up mt-7 max-w-4xl font-display text-[clamp(2.3rem,4.6vw,4rem)] font-medium leading-[1.06] tracking-[-0.02em]"
              style={{ animationDelay: "0.2s" }}
            >
              {product.headline}
            </h1>

            <p
              className="landing-fade-up mt-7 max-w-2xl text-lg leading-relaxed text-ink-soft md:text-xl"
              style={{ animationDelay: "0.35s" }}
            >
              {product.standfirst}
            </p>

            <p
              className="landing-fade-up mt-8 font-mono text-[13px] text-ink-faint"
              style={{ animationDelay: "0.45s" }}
            >
              {product.audience}
            </p>
          </header>

          {/* ── Hero image: clean photo, Apple-style glass plate over it ── */}
          <div
            className="landing-fade-up relative aspect-[16/8] overflow-hidden rounded-2xl md:aspect-[16/6]"
            style={{ animationDelay: "0.5s" }}
          >
            <Image
              src={product.image}
              alt={product.imageAlt}
              fill
              priority
              sizes="(max-width: 1480px) 100vw, 1400px"
              className="object-cover"
            />
            <div className="absolute bottom-4 left-4 rounded-xl border border-white/45 bg-white/30 px-4 py-2.5 shadow-sm backdrop-blur-lg">
              <p className="font-mono text-[12px] text-ink">
                {product.name}
                <span className="text-ink-soft"> · {product.codename}</span>
              </p>
            </div>
          </div>

          {/* ── Body ─────────────────────────────────────────────── */}
          <div className="mx-auto max-w-3xl py-16 md:py-24">
            {product.sections.map((section) => (
              <Reveal key={section.index} className="mb-14 last:mb-0 md:mb-20">
                <section>
                  <p className="font-mono text-[13px] tracking-wide text-ink-faint">
                    <span className="text-ink">{section.index}</span>
                  </p>
                  <h2 className="mt-3 font-display text-2xl font-medium tracking-[-0.01em] md:text-3xl">
                    {section.heading}
                  </h2>
                  <div className="mt-5 space-y-5">
                    {section.body.map((para, i) => (
                      <p
                        key={i}
                        className="text-[16.5px] leading-[1.75] text-ink-soft"
                      >
                        {para}
                      </p>
                    ))}
                  </div>
                  {section.pullQuote && (
                    <blockquote className="my-10 border-l-2 border-lime pl-6 font-display text-2xl font-medium leading-snug tracking-[-0.01em] text-ink md:text-3xl">
                      {section.pullQuote}
                    </blockquote>
                  )}
                </section>
              </Reveal>
            ))}

            {/* Status + sources note */}
            <Reveal>
              <aside className="mt-4 rounded-2xl border border-bone-line bg-bone-raise p-6">
                <p className="font-mono text-[13px] text-ink-faint">Status</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink">
                  {product.status}
                </p>
                <p className="mt-4 text-[13px] leading-relaxed text-ink-faint">
                  Figures cited on this page are drawn from KhaM Health&apos;s
                  vision documentation; sources available on request.
                </p>
              </aside>
            </Reveal>
          </div>
        </article>

        {/* ── CTA band ───────────────────────────────────────────── */}
        <section className="border-t border-bone-line bg-bone-raise/60">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 py-16 md:flex-row md:items-center md:px-10">
            <div>
              <h2 className="font-display text-3xl font-medium tracking-[-0.02em] md:text-4xl">
                Talk to us about {product.name}
              </h2>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
                We work with clinicians, institutions, regulators, and funders.
                The pilot waitlist is the fastest way to reach us.
              </p>
            </div>
            <a
              href="/#waitlist"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-base font-semibold text-bone-raise transition hover:bg-ink-soft"
            >
              Join the pilot waitlist
              <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
            </a>
          </div>
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}
