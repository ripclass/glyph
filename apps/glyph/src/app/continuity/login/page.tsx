'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useStaffStore } from '@/lib/stores/staff-store';
import { requireOrgType } from '@/lib/services/staff-logic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ContinuityLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const signInWithEmail = useStaffStore((s) => s.signInWithEmail);
  const checkStaffSession = useStaffStore((s) => s.checkStaffSession);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || submitting) return;
    setSubmitting(true);
    try {
      await signInWithEmail(email, password);
      await checkStaffSession();
      const staff = useStaffStore.getState().staff;
      if (!staff || !requireOrgType(staff, 'recruiter')) {
        toast.error('Signed in, but this account is not a recruiter member.');
        return;
      }
      toast.success(staff.orgName);
      router.push('/continuity');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-clinical-bg p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl border border-line bg-white p-6">
        <h1 className="text-lg font-semibold text-ink">Glyph Continuity sign in</h1>
        <Input type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? '…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
