'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { KNOWN_TEST_CATEGORIES } from '@/lib/services/lens-logic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NewOrderPage() {
  const router = useRouter();
  const [form, setForm] = useState({ patientName: '', phone: '', age: '', gender: '', testCategory: 'CBC' });
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/center/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          patientName: form.patientName, phone: form.phone || null,
          age: form.age ? Number(form.age) : null, gender: form.gender || null,
          testCategory: form.testCategory,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      router.push(`/center/orders/${json.data.orderId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create order');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-white p-6">
      <h1 className="text-lg font-semibold text-ink">New order</h1>
      <Input placeholder="Patient name" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
      <Input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <div className="flex gap-3">
        <Input placeholder="Age" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
        <select className="rounded-md border border-line px-3" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
          <option value="">gender</option><option value="male">male</option><option value="female">female</option><option value="other">other</option>
        </select>
      </div>
      <select className="w-full rounded-md border border-line px-3 py-2" value={form.testCategory} onChange={(e) => setForm({ ...form, testCategory: e.target.value })}>
        {KNOWN_TEST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <Button type="submit" className="w-full" disabled={submitting}>{submitting ? '…' : 'Create order'}</Button>
    </form>
  );
}
