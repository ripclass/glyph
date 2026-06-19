'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

interface SpecialistOpinionRow {
  id: string;
  status: string;
  created_at: string | null;
  patients: { name: string } | null;
}

export default function BridgeDashboard() {
  const [records, setRecords] = useState<SpecialistOpinionRow[]>([]);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from('specialist_opinions')
      .select('id, status, created_at, patients(name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRecords((data as never) ?? []));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Specialist opinions</h1>
        <Link href="/bridge/opinion/new"><Button>New opinion</Button></Link>
      </div>
      <ul className="space-y-2">
        {records.map((r) => (
          <li key={r.id}>
            <Link href={`/bridge/opinion/${r.id}`} className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-3">
              <span className="text-ink">{r.patients?.name ?? '—'}</span>
              <span className="rounded-full bg-glyph-50 px-2 py-0.5 text-xs text-ink">{r.status}</span>
            </Link>
          </li>
        ))}
        {records.length === 0 && <li className="text-sm text-clinical-muted">No opinions yet.</li>}
      </ul>
    </div>
  );
}
