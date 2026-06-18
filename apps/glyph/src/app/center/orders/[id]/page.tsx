'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ResultItem { testName: string; value: string; unit?: string; referenceRange?: string }

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<any>(null);
  const [rows, setRows] = useState<ResultItem[]>([{ testName: '', value: '', unit: '', referenceRange: '' }]);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from('lab_orders').select('*, patients(name)').eq('id', params.id).maybeSingle();
    setOrder(data);
    if (Array.isArray((data as any)?.raw_results) && (data as any).raw_results.length) setRows((data as any).raw_results);
  }
  useEffect(() => { void load(); }, [params.id]);

  async function token() {
    const { data: { session } } = await createClient().auth.getSession();
    return session?.access_token;
  }

  async function saveResults() {
    const res = await fetch(`/api/center/orders/${params.id}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ rawResults: rows.filter((r) => r.testName) }),
    });
    const json = await res.json();
    if (!json.success) return toast.error(json.error);
    toast.success('Results saved'); void load();
  }

  if (!order) return <p className="text-sm text-clinical-muted">Loading…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-ink">{order.patients?.name} · {order.test_category}</h1>
      <p className="text-xs text-clinical-muted">Status: {order.status}</p>

      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Results</h2>
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="Test" value={r.testName} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, testName: e.target.value } : x))} />
            <Input placeholder="Value" value={r.value} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
            <Input placeholder="Unit" value={r.unit ?? ''} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} />
            <Input placeholder="Range" value={r.referenceRange ?? ''} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, referenceRange: e.target.value } : x))} />
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setRows([...rows, { testName: '', value: '', unit: '', referenceRange: '' }])}>+ row</Button>
          <Button onClick={saveResults}>Save results</Button>
        </div>
      </section>
      {/* Normalize panel (Task 6) and Sign panel (Task 7) render below. */}
    </div>
  );
}
