import Link from "next/link";

/** Landing page — login or route to intake/doctor views */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-glyph-50 to-white px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Logo */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-glyph-800">
            Glyph
          </h1>
          <p className="text-sm text-clinical-muted">by KhaM Health</p>
        </div>

        {/* Quick access buttons */}
        <div className="space-y-3">
          <Link
            href="/doctor"
            className="block w-full rounded-xl bg-glyph-600 px-6 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-glyph-700 active:scale-[0.98]"
          >
            Doctor Login
          </Link>

          <Link
            href="/intake"
            className="block w-full rounded-xl border-2 border-glyph-200 bg-white px-6 py-4 text-lg font-semibold text-glyph-700 shadow-sm transition hover:border-glyph-300 hover:bg-glyph-50 active:scale-[0.98]"
          >
            <span className="text-bn">রোগী ইনটেক শুরু করুন</span>
            <span className="mt-1 block text-sm font-normal text-clinical-muted">
              Start Patient Intake
            </span>
          </Link>
        </div>

        <p className="text-xs text-clinical-muted">
          &copy; {new Date().getFullYear()} KhaM Health. All rights reserved.
        </p>
      </div>
    </main>
  );
}
