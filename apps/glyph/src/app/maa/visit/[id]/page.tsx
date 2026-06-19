'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AntenatalVisitDetailPage({ params }: { params: { id: string } }) {
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [visitNumber, setVisitNumber] = useState('');
  const [gestationalAgeWeeks, setGestationalAgeWeeks] = useState('');
  const [lmp, setLmp] = useState('');
  const [edd, setEdd] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [fundalHeightCm, setFundalHeightCm] = useState('');
  const [fetalHeartRateBpm, setFetalHeartRateBpm] = useState('');
  const [nextVisitDate, setNextVisitDate] = useState('');
  const [riskFlags, setRiskFlags] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);

  async function token() {
    const { data: { session } } = await createClient().auth.getSession();
    return session?.access_token;
  }

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from('antenatal_visits')
      .select('*, patients(name)')
      .eq('id', params.id)
      .maybeSingle();
    if (!data) return;
    setRecord(data as Record<string, unknown>);
    if (data.visit_number != null) setVisitNumber(String(data.visit_number));
    if (data.gestational_age_weeks != null) setGestationalAgeWeeks(String(data.gestational_age_weeks));
    if (data.lmp) setLmp(data.lmp as string);
    if (data.edd) setEdd(data.edd as string);
    if (data.blood_pressure) setBloodPressure(data.blood_pressure as string);
    if (data.weight_kg != null) setWeightKg(String(data.weight_kg));
    if (data.fundal_height_cm != null) setFundalHeightCm(String(data.fundal_height_cm));
    if (data.fetal_heart_rate_bpm != null) setFetalHeartRateBpm(String(data.fetal_heart_rate_bpm));
    if (data.next_visit_date) setNextVisitDate(data.next_visit_date as string);
    if (Array.isArray(data.risk_flags) && data.risk_flags.length) {
      setRiskFlags(data.risk_flags as string[]);
    }
  }

  useEffect(() => { void load(); }, [params.id]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/maa/visits/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({
          visit_number: visitNumber !== '' ? Number(visitNumber) : null,
          gestational_age_weeks: gestationalAgeWeeks !== '' ? Number(gestationalAgeWeeks) : null,
          lmp: lmp || null,
          edd: edd || null,
          blood_pressure: bloodPressure || null,
          weight_kg: weightKg !== '' ? Number(weightKg) : null,
          fundal_height_cm: fundalHeightCm !== '' ? Number(fundalHeightCm) : null,
          fetal_heart_rate_bpm: fetalHeartRateBpm !== '' ? Number(fetalHeartRateBpm) : null,
          risk_flags: riskFlags.filter(Boolean),
          next_visit_date: nextVisitDate || null,
        }),
      });
      const json = await res.json();
      if (!json.success) return toast.error(json.error);
      toast.success('Visit saved');
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!record) return <p className="text-sm text-clinical-muted">Loading…</p>;

  const frozen = Boolean((record as { credential_id?: string | null }).credential_id);
  const motherName = (record.patients as { name: string } | null)?.name ?? 'Mother';

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-ink">
        {motherName} · Antenatal visit
      </h1>
      <p className="text-xs text-clinical-muted">Status: {record.status as string}</p>

      {/* Visit number + gestational age */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Visit details</h2>
        <div className="flex gap-3">
          <Input
            placeholder="Visit number"
            type="number"
            min={1}
            value={visitNumber}
            disabled={frozen}
            onChange={(e) => setVisitNumber(e.target.value)}
          />
          <Input
            placeholder="Gestational age (weeks)"
            type="number"
            min={0}
            max={45}
            value={gestationalAgeWeeks}
            disabled={frozen}
            onChange={(e) => setGestationalAgeWeeks(e.target.value)}
          />
        </div>
      </section>

      {/* LMP / EDD */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Dates</h2>
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-clinical-muted">LMP</label>
            <Input type="date" value={lmp} disabled={frozen} onChange={(e) => setLmp(e.target.value)} />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs text-clinical-muted">EDD</label>
            <Input type="date" value={edd} disabled={frozen} onChange={(e) => setEdd(e.target.value)} />
          </div>
        </div>
      </section>

      {/* Vitals */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Vitals</h2>
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Blood pressure (e.g. 120/80)"
            value={bloodPressure}
            disabled={frozen}
            onChange={(e) => setBloodPressure(e.target.value)}
          />
          <Input
            placeholder="Weight (kg)"
            type="number"
            min={0}
            step={0.1}
            value={weightKg}
            disabled={frozen}
            onChange={(e) => setWeightKg(e.target.value)}
          />
          <Input
            placeholder="Fundal height (cm)"
            type="number"
            min={0}
            step={0.1}
            value={fundalHeightCm}
            disabled={frozen}
            onChange={(e) => setFundalHeightCm(e.target.value)}
          />
          <Input
            placeholder="Fetal heart rate (bpm)"
            type="number"
            min={0}
            value={fetalHeartRateBpm}
            disabled={frozen}
            onChange={(e) => setFetalHeartRateBpm(e.target.value)}
          />
        </div>
      </section>

      {/* Risk flags */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Risk flags</h2>
        {riskFlags.map((flag, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Risk flag (e.g. gestational hypertension)"
              value={flag}
              disabled={frozen}
              onChange={(e) => setRiskFlags(riskFlags.map((x, j) => j === i ? e.target.value : x))}
            />
            {riskFlags.length > 1 && !frozen && (
              <Button
                variant="ghost"
                onClick={() => setRiskFlags(riskFlags.filter((_, j) => j !== i))}
              >
                ×
              </Button>
            )}
          </div>
        ))}
        {!frozen && (
          <Button variant="ghost" onClick={() => setRiskFlags([...riskFlags, ''])}>
            + flag
          </Button>
        )}
      </section>

      {/* Next visit date */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Next visit date</h2>
        <Input
          type="date"
          value={nextVisitDate}
          disabled={frozen}
          onChange={(e) => setNextVisitDate(e.target.value)}
        />
      </section>

      {/* Save */}
      {!frozen && (
        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save visit'}
        </Button>
      )}

      {/* Sign panel placeholder — Task 4 */}
      {record && (
        <section className="rounded-xl border border-line bg-white p-4">
          {record.status === 'signed' ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-ink">&#x2713; Signed &middot; AntenatalRecord issued</p>
              <p className="break-all font-mono text-xs text-clinical-muted">
                {(record as { credential_id?: string }).credential_id}
              </p>
            </div>
          ) : (
            <p className="text-sm text-clinical-muted">Sign &amp; issue AntenatalRecord — coming in Task 4.</p>
          )}
        </section>
      )}
    </div>
  );
}
