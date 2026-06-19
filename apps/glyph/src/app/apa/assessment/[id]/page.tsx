'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ASSESSMENT_TYPE_OPTIONS = [
  { value: '', label: 'Select assessment type…' },
  { value: 'pre_placement', label: 'Pre-placement' },
  { value: 'periodic', label: 'Periodic' },
  { value: 'return_to_work', label: 'Return to work' },
  { value: 'incident', label: 'Incident' },
  { value: 'exit', label: 'Exit' },
];

const FITNESS_OPTIONS = [
  { value: '', label: 'Select fitness for role…' },
  { value: 'fit', label: 'Fit' },
  { value: 'fit_with_restrictions', label: 'Fit with restrictions' },
  { value: 'unfit', label: 'Unfit' },
];

interface FindingRow { testName: string; value: string; unit: string; referenceRange: string }

export default function AssessmentDetailPage({ params }: { params: { id: string } }) {
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [assessmentType, setAssessmentType] = useState('');
  const [exposures, setExposures] = useState<string[]>(['']);
  const [findings, setFindings] = useState<FindingRow[]>([{ testName: '', value: '', unit: '', referenceRange: '' }]);
  const [fitnessForRole, setFitnessForRole] = useState('');
  const [restrictions, setRestrictions] = useState<string[]>(['']);
  const [recommendations, setRecommendations] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signResult, setSignResult] = useState<{ occupationalHealthVcId: string; patientDid: string; orgDid: string } | null>(null);

  async function token() {
    const { data: { session } } = await createClient().auth.getSession();
    return session?.access_token;
  }

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from('occupational_assessments')
      .select('*, patients(name)')
      .eq('id', params.id)
      .maybeSingle();
    if (!data) return;
    setRecord(data as Record<string, unknown>);
    if (data.assessment_type) setAssessmentType(data.assessment_type as string);
    if (Array.isArray(data.exposures) && data.exposures.length) {
      setExposures(data.exposures as string[]);
    }
    if (Array.isArray(data.findings) && data.findings.length) {
      setFindings(data.findings as unknown as FindingRow[]);
    }
    if (data.fitness_for_role) setFitnessForRole(data.fitness_for_role as string);
    if (Array.isArray(data.restrictions) && data.restrictions.length) {
      setRestrictions(data.restrictions as string[]);
    }
    if (Array.isArray(data.recommendations) && data.recommendations.length) {
      setRecommendations(data.recommendations as string[]);
    }
  }

  useEffect(() => { void load(); }, [params.id]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/apa/assessments/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({
          assessment_type: assessmentType || null,
          exposures: exposures.filter(Boolean),
          findings: findings.filter((f) => f.testName),
          fitness_for_role: fitnessForRole || null,
          restrictions: restrictions.filter(Boolean),
          recommendations: recommendations.filter(Boolean),
        }),
      });
      const json = await res.json();
      if (!json.success) return toast.error(json.error);
      toast.success('Assessment saved');
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
      const res = await fetch(`/api/apa/assessments/${params.id}/sign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await token()}` },
      });
      const json = await res.json();
      if (!json.success) return toast.error(json.error);
      setSignResult(json.data as { occupationalHealthVcId: string; patientDid: string; orgDid: string });
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
        {patientName} · Occupational assessment
      </h1>
      <p className="text-xs text-clinical-muted">Status: {record.status as string}</p>

      {/* Assessment type */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Assessment type</h2>
        <select
          className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-glyph-400 disabled:opacity-50"
          value={assessmentType}
          disabled={frozen}
          onChange={(e) => setAssessmentType(e.target.value)}
        >
          {ASSESSMENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </section>

      {/* Exposures */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Occupational exposures</h2>
        {exposures.map((exp, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Exposure (e.g. dust, noise, chemicals)"
              value={exp}
              disabled={frozen}
              onChange={(e) => setExposures(exposures.map((x, j) => j === i ? e.target.value : x))}
            />
            {exposures.length > 1 && !frozen && (
              <Button
                variant="ghost"
                onClick={() => setExposures(exposures.filter((_, j) => j !== i))}
              >
                ×
              </Button>
            )}
          </div>
        ))}
        {!frozen && (
          <Button variant="ghost" onClick={() => setExposures([...exposures, ''])}>
            + exposure
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

      {/* Fitness for role */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Fitness for role</h2>
        <select
          className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-glyph-400 disabled:opacity-50"
          value={fitnessForRole}
          disabled={frozen}
          onChange={(e) => setFitnessForRole(e.target.value)}
        >
          {FITNESS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </section>

      {/* Restrictions */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Work restrictions</h2>
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

      {/* Recommendations */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Recommendations</h2>
        {recommendations.map((rec, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Recommendation"
              value={rec}
              disabled={frozen}
              onChange={(e) => setRecommendations(recommendations.map((x, j) => j === i ? e.target.value : x))}
            />
            {recommendations.length > 1 && !frozen && (
              <Button
                variant="ghost"
                onClick={() => setRecommendations(recommendations.filter((_, j) => j !== i))}
              >
                ×
              </Button>
            )}
          </div>
        ))}
        {!frozen && (
          <Button variant="ghost" onClick={() => setRecommendations([...recommendations, ''])}>
            + recommendation
          </Button>
        )}
      </section>

      {/* Save */}
      {!frozen && (
        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save assessment'}
        </Button>
      )}

      {/* Sign panel */}
      <section className="rounded-xl border border-line bg-white p-4">
        {record.status === 'signed' || signResult ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-ink">&#x2713; Signed &middot; OccupationalHealth issued</p>
            <p className="break-all font-mono text-xs text-clinical-muted">
              {signResult?.occupationalHealthVcId ?? (record as { credential_id?: string }).credential_id}
            </p>
          </div>
        ) : assessmentType ? (
          <Button onClick={sign} disabled={signing || frozen}>
            {signing ? 'Signing…' : 'Sign & issue OccupationalHealth'}
          </Button>
        ) : (
          <p className="text-sm text-clinical-muted">Select an assessment type to enable signing.</p>
        )}
      </section>
    </div>
  );
}
