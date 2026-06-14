/** WhatsApp 24-hour customer-service window — the gate for free-form sends. */
export const WA_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isWindowOpen(expiresAt: Date | string | null | undefined, now: Date): boolean {
  if (!expiresAt) return false;
  const t = typeof expiresAt === "string" ? new Date(expiresAt).getTime() : expiresAt.getTime();
  return t > now.getTime();
}

export function nextWindowExpiry(now: Date): Date {
  return new Date(now.getTime() + WA_WINDOW_MS);
}
