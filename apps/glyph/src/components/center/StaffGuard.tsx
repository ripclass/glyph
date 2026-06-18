'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStaffStore } from '@/lib/stores/staff-store';

/** Parallel to AuthGuard: gates /center/* on a diagnostic_centre membership. */
export function StaffGuard({ children }: { children: React.ReactNode }) {
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
    if (checkedRef.current && !isLoading && !staff) {
      router.replace('/center/login');
    }
  }, [isLoading, staff, router]);

  if (isLoading || !staff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clinical-bg">
        <p className="text-sm text-clinical-muted">Loading…</p>
      </div>
    );
  }
  return <>{children}</>;
}
