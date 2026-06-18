'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

interface OrderRow {
  id: string;
  test_category: string;
  status: string;
  ordered_at: string;
  patients: { name: string } | null;
}

export default function CenterDashboard() {
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from('lab_orders')
      .select('id, test_category, status, ordered_at, patients(name)')
      .order('ordered_at', { ascending: false })
      .then(({ data }) => setOrders((data as never) ?? []));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Orders</h1>
        <Link href="/center/orders/new"><Button>New order</Button></Link>
      </div>
      <ul className="space-y-2">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/center/orders/${o.id}`} className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-3">
              <span className="text-ink">{o.patients?.name ?? '—'} · {o.test_category}</span>
              <span className="rounded-full bg-glyph-50 px-2 py-0.5 text-xs text-ink">{o.status}</span>
            </Link>
          </li>
        ))}
        {orders.length === 0 && <li className="text-sm text-clinical-muted">No orders yet.</li>}
      </ul>
    </div>
  );
}
