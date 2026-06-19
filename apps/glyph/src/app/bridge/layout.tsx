'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useStaffStore } from '@/lib/stores/staff-store';
import { requireOrgType } from '@/lib/services/staff-logic';
import { Button } from '@/components/ui/button';

function BridgeChrome({ children }: { children: React.ReactNode }) {
  const staff = useStaffStore((s) => s.staff);
  const signOut = useStaffStore((s) => s.signOut);
  return (
    <div className="min-h-screen bg-clinical-bg">
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3">
        <Link href="/bridge" className="font-semibold text-ink">{staff?.orgName ?? 'Glyph Bridge'}</Link>
        <div className="flex items-center gap-3 text-sm text-clinical-muted">
          <span>{staff?.role}</span>
          <Button variant="ghost" onClick={() => void signOut()}>Sign out</Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-4">{children}</main>
    </div>
  );
}

/** Guards /bridge/* on a specialist_panel membership. Mirrors MaaGuard but for specialist_panel org type.
 * NOTE: This is the 6th inline owner-guard (after /center, /hospital, /apa, /continuity, /maa).
 * TODO: extract a shared StaffGuard<orgType> component now that 6 surfaces exist. */
function BridgeGuard({ children }: { children: React.ReactNode }) {
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
    // If session loaded but no staff, or staff exists but wrong org type → redirect to bridge login.
    if (checkedRef.current && !isLoading) {
      if (!staff || !requireOrgType(staff, 'specialist_panel')) {
        router.replace('/bridge/login');
      }
    }
  }, [isLoading, staff, router]);

  if (isLoading || !staff || !requireOrgType(staff, 'specialist_panel')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clinical-bg">
        <p className="text-sm text-clinical-muted">Loading…</p>
      </div>
    );
  }

  return <BridgeChrome>{children}</BridgeChrome>;
}

export default function BridgeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Exempt the login page from BridgeGuard to prevent a redirect loop.
  if (pathname === '/bridge/login') {
    return <>{children}</>;
  }
  return <BridgeGuard>{children}</BridgeGuard>;
}
