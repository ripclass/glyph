'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PURPOSE_OPTIONS = [
  { value: '', label: 'Purpose (optional)' },
  { value: 'employment_abroad', label: 'Employment abroad' },
  { value: 'visa_medical', label: 'Visa medical' },
  { value: 'pre_deployment', label: 'Pre-deployment' },
  { value: 'periodic', label: 'Periodic' },
];

export default function NewClearancePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    patientName: '',
    phone: '',
    age: '',
    gender: '',
    purpose: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/continuity/clearances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          patientName: form.patientName,
          phone: form.phone || null,
          age: form.age ? Number(form.age) : null,
          gender: form.gender || null,
          purpose: form.purpose || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      router.push(`/continuity/clearance/${json.data.clearanceId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create clearance');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-white p-6">
      <h1 className="text-lg font-semibold text-ink">New clearance</h1>
      <Input
        placeholder="Worker name"
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
      <select
        className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-glyph-400"
        value={form.purpose}
        onChange={(e) => setForm({ ...form, purpose: e.target.value })}
      >
        {PURPOSE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? '…' : 'Create clearance'}
      </Button>
    </form>
  );
}
