'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ASSESSMENT_TYPE_OPTIONS = [
  { value: '', label: 'Assessment type (optional)' },
  { value: 'pre_placement', label: 'Pre-placement' },
  { value: 'periodic', label: 'Periodic' },
  { value: 'return_to_work', label: 'Return to work' },
  { value: 'incident', label: 'Incident' },
  { value: 'exit', label: 'Exit' },
];

export default function NewAssessmentPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    patientName: '',
    phone: '',
    age: '',
    gender: '',
    assessmentType: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/karigor/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          patientName: form.patientName,
          phone: form.phone || null,
          age: form.age ? Number(form.age) : null,
          gender: form.gender || null,
          assessmentType: form.assessmentType || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      router.push(`/karigor/assessment/${json.data.assessmentId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create assessment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-white p-6">
      <h1 className="text-lg font-semibold text-ink">New assessment</h1>
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
        value={form.assessmentType}
        onChange={(e) => setForm({ ...form, assessmentType: e.target.value })}
      >
        {ASSESSMENT_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? '…' : 'Create assessment'}
      </Button>
    </form>
  );
}
