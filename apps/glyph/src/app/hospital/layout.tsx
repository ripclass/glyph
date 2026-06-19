'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useStaffStore } from '@/lib/stores/staff-store';
import { requireOrgType } from '@/lib/services/staff-logic';
import { Button } from '@/components/ui/button';

function HospitalChrome({ children }: { children: React.ReactNode }) {
  const staff = useStaffStore((s) => s.staff);
  const signOut = useStaffStore((s) => s.signOut);
  return (
    <div className="min-h-screen bg-clinical-bg">
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3">
        <Link href="/hospital" className="font-semibold text-ink">{staff?.orgName ?? 'Glyph Hospital'}</Link>
        <div className="flex items-center gap-3 text-sm text-clinical-muted">
          <span>{staff?.role}</span>
          <Button variant="ghost" onClick={() => void signOut()}>Sign out</Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-4">{children}</main>
    </div>
  );
}

/** Guards /hospital/* on a hospital membership. Mirrors StaffGuard but redirects to /hospital/login. */
function HospitalGuard({ children }: { children: React.ReactNode }) {
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
    // If session loaded but no staff, or staff exists but wrong org type → redirect to hospital login.
    if (checkedRef.current && !isLoading) {
      if (!staff || !requireOrgType(staff, 'hospital')) {
        router.replace('/hospital/login');
      }
    }
  }, [isLoading, staff, router]);

  if (isLoading || !staff || !requireOrgType(staff, 'hospital')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clinical-bg">
        <p className="text-sm text-clinical-muted">Loading…</p>
      </div>
    );
  }

  return <HospitalChrome>{children}</HospitalChrome>;
}

export default function HospitalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Exempt the login page from HospitalGuard to prevent a redirect loop.
  if (pathname === '/hospital/login') {
    return <>{children}</>;
  }
  return <HospitalGuard>{children}</HospitalGuard>;
}
