'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NewAntenatalVisitPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    patientName: '',
    phone: '',
    age: '',
    visitNumber: '',
    gestationalAgeWeeks: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/maa/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          patientName: form.patientName,
          phone: form.phone || null,
          age: form.age ? Number(form.age) : null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const visitId: string = json.data.visitId;

      // If initial clinical fields were provided, save them immediately.
      if (form.visitNumber || form.gestationalAgeWeeks) {
        const saveRes = await fetch(`/api/maa/visits/${visitId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({
            ...(form.visitNumber ? { visit_number: Number(form.visitNumber) } : {}),
            ...(form.gestationalAgeWeeks ? { gestational_age_weeks: Number(form.gestationalAgeWeeks) } : {}),
          }),
        });
        const saveJson = await saveRes.json();
        if (!saveJson.success) throw new Error(saveJson.error);
      }

      router.push(`/maa/visit/${visitId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create visit');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-white p-6">
      <h1 className="text-lg font-semibold text-ink">New antenatal visit</h1>
      <Input
        placeholder="Mother name"
        required
        value={form.patientName}
        onChange={(e) => setForm({ ...form, patientName: e.target.value })}
      />
      <Input
        placeholder="Phone (optional)"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />
      <Input
        placeholder="Age (optional)"
        type="number"
        min={0}
        value={form.age}
        onChange={(e) => setForm({ ...form, age: e.target.value })}
      />
      <div className="flex gap-3">
        <Input
          placeholder="Visit number (optional)"
          type="number"
          min={1}
          value={form.visitNumber}
          onChange={(e) => setForm({ ...form, visitNumber: e.target.value })}
        />
        <Input
          placeholder="Gestational age (weeks)"
          type="number"
          min={0}
          max={45}
          value={form.gestationalAgeWeeks}
          onChange={(e) => setForm({ ...form, gestationalAgeWeeks: e.target.value })}
        />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? '…' : 'Create visit'}
      </Button>
    </form>
  );
}
