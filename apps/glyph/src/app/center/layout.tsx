'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { StaffGuard } from '@/components/center/StaffGuard';
import { useStaffStore } from '@/lib/stores/staff-store';
import { Button } from '@/components/ui/button';

function CenterChrome({ children }: { children: React.ReactNode }) {
  const staff = useStaffStore((s) => s.staff);
  const signOut = useStaffStore((s) => s.signOut);
  return (
    <div className="min-h-screen bg-clinical-bg">
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3">
        <Link href="/center" className="font-semibold text-ink">{staff?.orgName ?? 'Glyph Lens'}</Link>
        <div className="flex items-center gap-3 text-sm text-clinical-muted">
          <span>{staff?.role}</span>
          <Button variant="ghost" onClick={() => void signOut()}>Sign out</Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-4">{children}</main>
    </div>
  );
}

export default function CenterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Exempt the login page from StaffGuard to prevent a redirect loop.
  if (pathname === '/center/login') {
    return <>{children}</>;
  }
  return (
    <StaffGuard>
      <CenterChrome>{children}</CenterChrome>
    </StaffGuard>
  );
}
