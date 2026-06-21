"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, MapPin, HeartHandshake, ShieldAlert } from "lucide-react";

/**
 * The stranger-scan page. A passerby scans a person's emergency QR and lands
 * here. We route them to the nearest hospital and (server-side) alert nearby
 * hospitals + the person's family. NO medical data is ever shown here — this
 * page is the security boundary. Bangla copy, no em dashes, no Devanagari.
 */

// ── Copy (Bangla) ─────────────────────────────────────────────
const COPY = {
  loading: "এক মুহূর্ত...",
  locating: "অবস্থান শনাক্ত করা হচ্ছে...",
  inactiveTitle: "এই কোডটি সক্রিয় নয়",
  inactiveBody: "এই জরুরি কোডটি আর ব্যবহারযোগ্য নয়।",
  needHelpTitle: "এই ব্যক্তির সাহায্য দরকার",
  routedPrefix: "নিকটতম হাসপাতাল:",
  directions: "দিকনির্দেশ দেখুন",
  notifiedFamily: "আমরা পরিবারকে জানিয়েছি।",
  notifiedHospitals: "আমরা কাছের হাসপাতালকে জানিয়েছি।",
  thanks: "থামার জন্য ধন্যবাদ।",
  genericRoute: "অনুগ্রহ করে নিকটতম হাসপাতালে নিয়ে যান।",
};

interface StrangerView {
  state: "ok" | "inactive";
  mapsUrl?: string;
  nearestHospitalName?: string | null;
  alertedHospitals?: number;
  familyNotified?: boolean;
}

export default function EmergencyScanPage() {
  const token = useParams<{ token: string }>().token;
  const [status, setStatus] = useState<"loading" | "locating" | "inactive" | "ok">("loading");
  const [view, setView] = useState<StrangerView | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fire(coords: { lat: number; lon: number } | null) {
      const res = await fetch(`/api/e/${token}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coords ?? {}),
      });
      if (cancelled) return;
      if (!res.ok && res.status === 404) {
        setStatus("inactive");
        return;
      }
      const data = (await res.json()) as StrangerView;
      if (cancelled) return;
      if (data.state === "inactive") {
        setStatus("inactive");
      } else {
        setView(data);
        setStatus("ok");
      }
    }

    async function run() {
      // First confirm the code is active (side-effect-free).
      const resolve = await fetch(`/api/e/${token}`);
      if (cancelled) return;
      if (!resolve.ok) {
        setStatus("inactive");
        return;
      }
      // Try to get coords; degrade gracefully if denied/unavailable.
      setStatus("locating");
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => void fire({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          () => void fire(null),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
        );
      } else {
        void fire(null);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "loading" || status === "locating") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bone p-6 text-ink">
        <Loader2 className="h-6 w-6 animate-spin text-glyph-600" />
        <p className="text-sm text-ink/70">{status === "locating" ? COPY.locating : COPY.loading}</p>
      </main>
    );
  }

  if (status === "inactive") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bone p-6 text-center text-ink">
        <ShieldAlert className="h-10 w-10 text-ink/40" />
        <h1 className="text-lg font-semibold">{COPY.inactiveTitle}</h1>
        <p className="max-w-xs text-sm text-ink/70">{COPY.inactiveBody}</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bone p-6 text-center text-ink">
      <div className="flex flex-col items-center gap-3">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red_flag/10">
          <HeartHandshake className="h-8 w-8 text-red_flag" />
        </span>
        <h1 className="text-xl font-semibold">{COPY.needHelpTitle}</h1>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-5 text-left shadow-sm">
        {view?.nearestHospitalName ? (
          <p className="text-base font-medium text-ink">
            {COPY.routedPrefix} {view.nearestHospitalName}
          </p>
        ) : (
          <p className="text-base font-medium text-ink">{COPY.genericRoute}</p>
        )}

        {view?.mapsUrl && (
          <a
            href={view.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-glyph-600 px-4 py-2 text-sm font-medium text-white"
          >
            <MapPin className="h-4 w-4" />
            {COPY.directions}
          </a>
        )}

        <div className="mt-4 space-y-1 border-t border-line pt-4 text-sm text-ink/70">
          {view?.familyNotified && <p>{COPY.notifiedFamily}</p>}
          {!!view?.alertedHospitals && view.alertedHospitals > 0 && <p>{COPY.notifiedHospitals}</p>}
        </div>
      </div>

      <p className="text-sm text-ink/60">{COPY.thanks}</p>
    </main>
  );
}
