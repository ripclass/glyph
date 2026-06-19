'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NewDischargePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    patientName: '',
    phone: '',
    age: '',
    gender: '',
    admissionDate: '',
    dischargeDate: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/hospital/discharges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          patientName: form.patientName,
          phone: form.phone || null,
          age: form.age ? Number(form.age) : null,
          gender: form.gender || null,
          admissionDate: form.admissionDate || null,
          dischargeDate: form.dischargeDate || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      router.push(`/hospital/discharge/${json.data.dischargeId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create discharge record');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-white p-6">
      <h1 className="text-lg font-semibold text-ink">New discharge</h1>
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
      <div className="flex gap-3">
        <Input
          placeholder="Age"
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value })}
        />
        <select
          className="rounded-md border border-line px-3"
          value={form.gender}
          onChange={(e) => setForm({ ...form, gender: e.target.value })}
        >
          <option value="">gender</option>
          <option value="male">male</option>
          <option value="female">female</option>
          <option value="other">other</option>
        </select>
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-sm text-ink/60">Admission date</label>
          <Input
            type="date"
            value={form.admissionDate}
            onChange={(e) => setForm({ ...form, admissionDate: e.target.value })}
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm text-ink/60">Discharge date</label>
          <Input
            type="date"
            value={form.dischargeDate}
            onChange={(e) => setForm({ ...form, dischargeDate: e.target.value })}
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? '…' : 'Create discharge record'}
      </Button>
    </form>
  );
}
