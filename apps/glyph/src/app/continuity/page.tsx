'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

interface ClearanceRow {
  id: string;
  status: string;
  created_at: string | null;
  patients: { name: string } | null;
}

export default function ContinuityDashboard() {
  const [records, setRecords] = useState<ClearanceRow[]>([]);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from('clearance_records')
      .select('id, status, created_at, patients(name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRecords((data as never) ?? []));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Clearances</h1>
        <Link href="/continuity/clearance/new"><Button>New clearance</Button></Link>
      </div>
      <ul className="space-y-2">
        {records.map((r) => (
          <li key={r.id}>
            <Link href={`/continuity/clearance/${r.id}`} className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-3">
              <span className="text-ink">{r.patients?.name ?? '—'}</span>
              <span className="rounded-full bg-glyph-50 px-2 py-0.5 text-xs text-ink">{r.status}</span>
            </Link>
          </li>
        ))}
        {records.length === 0 && <li className="text-sm text-clinical-muted">No clearances yet.</li>}
      </ul>
    </div>
  );
}
