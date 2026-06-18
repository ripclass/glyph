'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ResultItem { testName: string; value: string; unit?: string; referenceRange?: string }
interface NormalizedItem { testName: string; value: string; unit?: string; referenceRange?: string; isAbnormal?: boolean; severity?: string }
interface SanityFlag { message: string; severity: 'info' | 'warning' | 'critical' }

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<any>(null);
  const [rows, setRows] = useState<ResultItem[]>([{ testName: '', value: '', unit: '', referenceRange: '' }]);
  const [normalized, setNormalized] = useState<NormalizedItem[]>([]);
  const [sanityFlags, setSanityFlags] = useState<SanityFlag[]>([]);
  const [signed, setSigned] = useState<{ vcId: string } | null>(null);

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

  async function sign() {
    const res = await fetch(`/api/center/orders/${params.id}/sign`, {
      method: 'POST', headers: { Authorization: `Bearer ${await token()}` },
    });
    const json = await res.json();
    if (!json.success) return toast.error(json.error);
    setSigned({ vcId: json.data.labResultVcId }); toast.success('Signed'); void load();
  }

  async function runNormalize() {
    const res = await fetch(`/api/center/orders/${params.id}/normalize`, {
      method: 'POST', headers: { Authorization: `Bearer ${await token()}` },
    });
    const json = await res.json();
    if (!json.success) return toast.error(json.error);
    setNormalized(json.data.normalized ?? []); setSanityFlags(json.data.sanityFlags ?? []);
    toast.success('Normalized'); void load();
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

      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-ink">AI normalize + sanity-check</h2>
          <Button variant="accent" onClick={runNormalize} disabled={order.status === 'ordered'}>Normalize</Button>
        </div>
        {(normalized.length ? normalized : (order.normalized_results ?? [])).map((r: NormalizedItem, i: number) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-ink">{r.testName}</span>
            <span className={r.isAbnormal ? 'text-red_flag' : 'text-clinical-muted'}>{r.value} {r.unit} ({r.referenceRange})</span>
          </div>
        ))}
        {(sanityFlags.length ? sanityFlags : (order.sanity_flags ?? [])).map((f: SanityFlag, i: number) => (
          <p key={i} className="text-xs text-red_flag">&#x26A0; {f.message}</p>
        ))}
      </section>
      {(order.normalized_results?.length || normalized.length) ? (
        <section className="rounded-xl border border-line bg-white p-4">
          {order.status === 'signed' || signed ? (
            <p className="text-sm text-ink">&#x2713; Signed &middot; LabResult credential issued.</p>
          ) : (
            <Button onClick={sign}>Sign &amp; issue result</Button>
          )}
        </section>
      ) : null}
    </div>
  );
}
