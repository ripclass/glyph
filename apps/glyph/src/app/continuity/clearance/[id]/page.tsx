'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PURPOSE_OPTIONS = [
  { value: '', label: 'Select purpose…' },
  { value: 'overseas_employment', label: 'Overseas employment' },
  { value: 'pre_employment', label: 'Pre-employment' },
  { value: 'periodic', label: 'Periodic' },
  { value: 'general', label: 'General' },
];

const FITNESS_STATUS_OPTIONS = [
  { value: '', label: 'Select fitness status…' },
  { value: 'fit', label: 'Fit' },
  { value: 'fit_with_restrictions', label: 'Fit with restrictions' },
  { value: 'temporarily_unfit', label: 'Temporarily unfit' },
  { value: 'unfit', label: 'Unfit' },
];

interface FindingRow { testName: string; value: string; unit: string; referenceRange: string }

export default function ClearanceDetailPage({ params }: { params: { id: string } }) {
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [purpose, setPurpose] = useState('');
  const [fitnessStatus, setFitnessStatus] = useState('');
  const [restrictions, setRestrictions] = useState<string[]>(['']);
  const [findings, setFindings] = useState<FindingRow[]>([{ testName: '', value: '', unit: '', referenceRange: '' }]);
  const [destinationCountry, setDestinationCountry] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signResult, setSignResult] = useState<{ medicalClearanceVcId: string; patientDid: string; orgDid: string } | null>(null);

  async function token() {
    const { data: { session } } = await createClient().auth.getSession();
    return session?.access_token;
  }

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from('clearance_records')
      .select('*, patients(name)')
      .eq('id', params.id)
      .maybeSingle();
    if (!data) return;
    setRecord(data as Record<string, unknown>);
    if (data.purpose) setPurpose(data.purpose as string);
    if (data.fitness_status) setFitnessStatus(data.fitness_status as string);
    if (Array.isArray(data.restrictions) && data.restrictions.length) {
      setRestrictions(data.restrictions as string[]);
    }
    if (Array.isArray(data.findings) && data.findings.length) {
      setFindings(data.findings as unknown as FindingRow[]);
    }
    if (data.destination_country) setDestinationCountry(data.destination_country as string);
    if (data.valid_until) setValidUntil(data.valid_until as string);
  }

  useEffect(() => { void load(); }, [params.id]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/continuity/clearances/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({
          purpose: purpose || null,
          fitness_status: fitnessStatus || null,
          restrictions: restrictions.filter(Boolean),
          findings: findings.filter((f) => f.testName),
          destination_country: destinationCountry || null,
          valid_until: validUntil || null,
        }),
      });
      const json = await res.json();
      if (!json.success) return toast.error(json.error);
      toast.success('Clearance saved');
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function sign() {
    setSigning(true);
    try {
      const res = await fetch(`/api/continuity/clearances/${params.id}/sign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await token()}` },
      });
      const json = await res.json();
      if (!json.success) return toast.error(json.error);
      setSignResult(json.data as { medicalClearanceVcId: string; patientDid: string; orgDid: string });
      toast.success('Signed');
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign failed');
    } finally {
      setSigning(false);
    }
  }

  if (!record) return <p className="text-sm text-clinical-muted">Loading…</p>;

  const frozen = Boolean((record as { credential_id?: string | null }).credential_id);
  const patientName = (record.patients as { name: string } | null)?.name ?? 'Worker';

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-ink">
        {patientName} · Medical clearance
      </h1>
      <p className="text-xs text-clinical-muted">Status: {record.status as string}</p>

      {/* Purpose */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Purpose</h2>
        <select
          className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-glyph-400 disabled:opacity-50"
          value={purpose}
          disabled={frozen}
          onChange={(e) => setPurpose(e.target.value)}
        >
          {PURPOSE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </section>

      {/* Fitness status */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Fitness status</h2>
        <select
          className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-glyph-400 disabled:opacity-50"
          value={fitnessStatus}
          disabled={frozen}
          onChange={(e) => setFitnessStatus(e.target.value)}
        >
          {FITNESS_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </section>

      {/* Restrictions */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Restrictions</h2>
        {restrictions.map((r, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Restriction (e.g. no heavy lifting)"
              value={r}
              disabled={frozen}
              onChange={(e) => setRestrictions(restrictions.map((x, j) => j === i ? e.target.value : x))}
            />
            {restrictions.length > 1 && !frozen && (
              <Button
                variant="ghost"
                onClick={() => setRestrictions(restrictions.filter((_, j) => j !== i))}
              >
                ×
              </Button>
            )}
          </div>
        ))}
        {!frozen && (
          <Button variant="ghost" onClick={() => setRestrictions([...restrictions, ''])}>
            + restriction
          </Button>
        )}
      </section>

      {/* Findings */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Clinical findings</h2>
        {findings.map((f, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Test name"
              value={f.testName}
              disabled={frozen}
              onChange={(e) => setFindings(findings.map((x, j) => j === i ? { ...x, testName: e.target.value } : x))}
            />
            <Input
              placeholder="Value"
              className="w-24"
              value={f.value}
              disabled={frozen}
              onChange={(e) => setFindings(findings.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
            />
            <Input
              placeholder="Unit"
              className="w-20"
              value={f.unit}
              disabled={frozen}
              onChange={(e) => setFindings(findings.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))}
            />
            <Input
              placeholder="Ref. range"
              className="w-28"
              value={f.referenceRange}
              disabled={frozen}
              onChange={(e) => setFindings(findings.map((x, j) => j === i ? { ...x, referenceRange: e.target.value } : x))}
            />
            {findings.length > 1 && !frozen && (
              <Button
                variant="ghost"
                onClick={() => setFindings(findings.filter((_, j) => j !== i))}
              >
                ×
              </Button>
            )}
          </div>
        ))}
        {!frozen && (
          <Button variant="ghost" onClick={() => setFindings([...findings, { testName: '', value: '', unit: '', referenceRange: '' }])}>
            + finding
          </Button>
        )}
      </section>

      {/* Destination country */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Destination country</h2>
        <Input
          placeholder="e.g. Saudi Arabia"
          value={destinationCountry}
          disabled={frozen}
          onChange={(e) => setDestinationCountry(e.target.value)}
        />
      </section>

      {/* Valid until */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Valid until</h2>
        <Input
          type="date"
          value={validUntil}
          disabled={frozen}
          onChange={(e) => setValidUntil(e.target.value)}
        />
      </section>

      {/* Save */}
      {!frozen && (
        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save clearance'}
        </Button>
      )}

      {/* Sign panel */}
      <section className="rounded-xl border border-line bg-white p-4">
        {record.status === 'signed' || signResult ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-ink">&#x2713; Signed &middot; MedicalClearance issued</p>
            <p className="break-all font-mono text-xs text-clinical-muted">
              {signResult?.medicalClearanceVcId ?? (record as { credential_id?: string }).credential_id}
            </p>
          </div>
        ) : (record?.purpose || purpose) && (record?.fitness_status || fitnessStatus) ? (
          <Button onClick={sign} disabled={signing || frozen}>
            {signing ? 'Signing…' : 'Sign & issue MedicalClearance'}
          </Button>
        ) : (
          <p className="text-sm text-clinical-muted">Select a purpose and fitness status to enable signing.</p>
        )}
      </section>
    </div>
  );
}
