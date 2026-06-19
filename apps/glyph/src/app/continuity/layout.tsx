'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useStaffStore } from '@/lib/stores/staff-store';
import { requireOrgType } from '@/lib/services/staff-logic';
import { Button } from '@/components/ui/button';

function ContinuityChrome({ children }: { children: React.ReactNode }) {
  const staff = useStaffStore((s) => s.staff);
  const signOut = useStaffStore((s) => s.signOut);
  return (
    <div className="min-h-screen bg-clinical-bg">
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3">
        <Link href="/continuity" className="font-semibold text-ink">{staff?.orgName ?? 'Glyph Continuity'}</Link>
        <div className="flex items-center gap-3 text-sm text-clinical-muted">
          <span>{staff?.role}</span>
          <Button variant="ghost" onClick={() => void signOut()}>Sign out</Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-4">{children}</main>
    </div>
  );
}

/** Guards /continuity/* on a recruiter membership. Mirrors ApaGuard but redirects to /continuity/login.
 * NOTE: This is the 4th inline owner-guard (after /center, /hospital, /apa).
 * TODO: extract a shared StaffGuard<orgType> component now that 4 surfaces exist. */
function ContinuityGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const staff = useStaffStore((s) => s.staff);
  const isLoading = useStaffStore((s) => s.isLoading);
  const checkStaffSession = useStaffStore((s) => s.checkStaffSession);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!checkedRef.current) {
      checkedRef.current = true;
      void checkStaffSession();
    }
  }, [checkStaffSession]);

  useEffect(() => {
    // If session loaded but no staff, or staff exists but wrong org type → redirect to continuity login.
    if (checkedRef.current && !isLoading) {
      if (!staff || !requireOrgType(staff, 'recruiter')) {
        router.replace('/continuity/login');
      }
    }
  }, [isLoading, staff, router]);

  if (isLoading || !staff || !requireOrgType(staff, 'recruiter')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clinical-bg">
        <p className="text-sm text-clinical-muted">Loading…</p>
      </div>
    );
  }

  return <ContinuityChrome>{children}</ContinuityChrome>;
}

export default function ContinuityLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Exempt the login page from ContinuityGuard to prevent a redirect loop.
  if (pathname === '/continuity/login') {
    return <>{children}</>;
  }
  return <ContinuityGuard>{children}</ContinuityGuard>;
}
