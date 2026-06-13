"use client";

import * as React from "react";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";

/**
 * Shown after a note is approved: issues the patient's Pocket wallet token and
 * renders a QR the patient scans to open their record on their own phone. The
 * QR is generated client-side, so the bearer link never leaves the tablet.
 * An optional 4-digit PIN can be set with the patient for shared-device safety.
 */
export function WalletHandoff({ patientId }: { patientId: string }) {
  const [token, setToken] = React.useState<string | null>(null);
  const [qr, setQr] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [pin, setPin] = React.useState("");
  const [pinSaved, setPinSaved] = React.useState(false);
  const issuedRef = React.useRef(false);

  const walletUrl = token ? `${window.location.origin}/wallet/${token}` : null;

  const issue = React.useCallback(
    async (withPin?: string) => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/wallet/issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ patientId, ...(withPin ? { pin: withPin } : {}) }),
      });
      const json = await res.json().catch(() => ({ success: false }));
      if (!res.ok || !json.success) {
        setError(json.error ?? "Could not create the wallet link");
        return null;
      }
      return json.token as string;
    },
    [patientId]
  );

  // Issue once when this panel first appears.
  React.useEffect(() => {
    if (issuedRef.current) return;
    issuedRef.current = true;
    void (async () => {
      const t = await issue();
      if (!t) return;
      setToken(t);
      const url = `${window.location.origin}/wallet/${t}`;
      setQr(await QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: "#171a19", light: "#ffffff" } }));
    })();
  }, [issue]);

  const savePin = async () => {
    if (!/^\d{4}$/.test(pin)) return;
    const t = await issue(pin);
    if (t) setPinSaved(true);
  };

  return (
    <div className="mb-5 rounded-2xl border border-bone-line bg-clinical-surface p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
        রোগীর ওয়ালেট · Patient wallet
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        Have the patient scan this to take their record home on their own phone.
      </p>

      {error && <p className="mt-3 text-sm text-red_flag">{error}</p>}

      {qr && walletUrl ? (
        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
          <img src={qr} alt="Wallet QR code" width={150} height={150} className="rounded-xl border border-bone-line" />
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(walletUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="w-full truncate rounded-lg border border-bone-line bg-clinical-bg px-3 py-2 text-left font-mono text-xs text-ink-soft transition hover:border-ink/30"
              title={walletUrl}
            >
              {copied ? "✓ copied" : walletUrl}
            </button>

            {/* Optional PIN */}
            <div className="mt-3 flex items-center gap-2">
              <input
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ""));
                  setPinSaved(false);
                }}
                placeholder="4-digit PIN (optional)"
                className="w-44 rounded-lg border border-bone-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink/40 focus:ring-2 focus:ring-glyph-400/40"
              />
              <button
                type="button"
                onClick={savePin}
                disabled={!/^\d{4}$/.test(pin)}
                className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-bone-raise transition hover:bg-ink-soft disabled:opacity-50"
              >
                {pinSaved ? "✓ PIN set" : "Set PIN"}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-ink-faint">
              A PIN protects the record on a shared phone.
            </p>
          </div>
        </div>
      ) : (
        !error && <p className="mt-3 text-sm text-ink-faint">Preparing wallet link…</p>
      )}
    </div>
  );
}
