'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NewSpecialistOpinionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    patientName: '',
    phone: '',
    age: '',
    specialty: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/bridge/opinions', {
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
      const opinionId: string = json.data.opinionId;

      // If specialty was provided, save it immediately.
      if (form.specialty) {
        const saveRes = await fetch(`/api/bridge/opinions/${opinionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ specialty: form.specialty }),
        });
        const saveJson = await saveRes.json();
        if (!saveJson.success) throw new Error(saveJson.error);
      }

      router.push(`/bridge/opinion/${opinionId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create opinion');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-white p-6">
      <h1 className="text-lg font-semibold text-ink">New specialist opinion</h1>
      <Input
        placeholder="Patient name"
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
      <Input
        placeholder="Specialty (e.g. Cardiology)"
        value={form.specialty}
        onChange={(e) => setForm({ ...form, specialty: e.target.value })}
      />
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? '…' : 'Create opinion'}
      </Button>
    </form>
  );
}
