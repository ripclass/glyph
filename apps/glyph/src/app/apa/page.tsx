'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

interface AssessmentRow {
  id: string;
  status: string;
  created_at: string | null;
  patients: { name: string } | null;
}

export default function ApaDashboard() {
  const [records, setRecords] = useState<AssessmentRow[]>([]);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from('occupational_assessments')
      .select('id, status, created_at, patients(name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRecords((data as never) ?? []));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Assessments</h1>
        <Link href="/apa/assessment/new"><Button>New assessment</Button></Link>
      </div>
      <ul className="space-y-2">
        {records.map((r) => (
          <li key={r.id}>
            <Link href={`/apa/assessment/${r.id}`} className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-3">
              <span className="text-ink">{r.patients?.name ?? '—'}</span>
              <span className="rounded-full bg-glyph-50 px-2 py-0.5 text-xs text-ink">{r.status}</span>
            </Link>
          </li>
        ))}
        {records.length === 0 && <li className="text-sm text-clinical-muted">No assessments yet.</li>}
      </ul>
    </div>
  );
}
