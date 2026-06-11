"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Client-side auth gate for doctor-session areas (/doctor/* and the intake
 * tablet flow — the tablet runs under the clinic doctor's session).
 *
 * Bootstraps `checkSession()` once, shows a quiet loading state, and
 * redirects to /login when no doctor profile is present.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const doctor = useAuthStore((s) => s.doctor);
  const isLoading = useAuthStore((s) => s.isLoading);
  const checkSession = useAuthStore((s) => s.checkSession);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!checkedRef.current) {
      checkedRef.current = true;
      void checkSession();
    }
  }, [checkSession]);

  useEffect(() => {
    if (checkedRef.current && !isLoading && !doctor) {
      router.replace("/login");
    }
  }, [isLoading, doctor, router]);

  if (isLoading || !doctor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clinical-bg">
        <p className="text-sm text-clinical-muted">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
