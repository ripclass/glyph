import Link from "next/link";

/**
 * Shared marketing-site chrome — nav and footer used by the company
 * page (/) and every product landing (/glyph, /network, …).
 * Anchors are absolute so they work from any page.
 */

export function SiteNav() {
  return (
    <header className="relative z-40">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 md:px-10">
        <Link href="/" className="font-display text-[22px] font-semibold tracking-tight">
          KhaM<span className="text-lime-deep">°</span>
        </Link>

        <div className="hidden items-center gap-7 text-sm text-ink-soft md:flex">
          <Link href="/chamber" className="transition hover:text-ink">
            Chamber
          </Link>
          <a href="/#products" className="transition hover:text-ink">
            Products
            <sup className="ml-0.5 font-mono text-[10px] text-ink-faint">11</sup>
          </a>
          <a href="/#why" className="transition hover:text-ink">
            Why
          </a>
          <a href="/#trust" className="transition hover:text-ink">
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
            href="/#waitlist"
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bone-raise transition hover:bg-ink-soft"
          >
            Join the pilot
          </a>
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-bone-line">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-10 text-sm text-ink-faint md:flex-row md:px-10">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-base font-semibold tracking-tight text-ink">
            KhaM<span className="text-lime-deep">°</span>
          </span>
          <span>Dhaka, Bangladesh</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <a href="mailto:hello@khamhealth.com" className="transition hover:text-ink">
            hello@khamhealth.com
          </a>
          <Link href="/login" className="transition hover:text-ink">
            Doctor login
          </Link>
          <Link href="/start" className="transition hover:text-ink">
            Clinic tablet
          </Link>
          <Link href="/verify" className="transition hover:text-ink">
            Verify a prescription
          </Link>
        </div>
        <p>© {new Date().getFullYear()} KhaM Health · KhaM Labs Inc.</p>
      </div>
      <p className="border-t border-bone-line py-5 text-center font-display text-[13px] italic text-ink-faint">
        In memory of Khayer and Mamataj.
      </p>
    </footer>
  );
}
