'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DxRow { text: string; icd10: string; }

export default function SpecialistOpinionDetailPage({ params }: { params: { id: string } }) {
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [specialty, setSpecialty] = useState('');
  const [referralReason, setReferralReason] = useState('');
  const [presentedRecordRefs, setPresentedRecordRefs] = useState<string[]>(['']);
  const [opinion, setOpinion] = useState('');
  const [recommendations, setRecommendations] = useState<string[]>(['']);
  const [differentialDiagnosis, setDifferentialDiagnosis] = useState<DxRow[]>([{ text: '', icd10: '' }]);
  const [saving, setSaving] = useState(false);
  const [vcId, setVcId] = useState<string | null>(null);

  async function token() {
    const { data: { session } } = await createClient().auth.getSession();
    return session?.access_token;
  }

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from('specialist_opinions')
      .select('*, patients(name)')
      .eq('id', params.id)
      .maybeSingle();
    if (!data) return;
    setRecord(data as Record<string, unknown>);
    if (data.specialty) setSpecialty(data.specialty as string);
    if (data.referral_reason) setReferralReason(data.referral_reason as string);
    if (data.opinion) setOpinion(data.opinion as string);
    if (Array.isArray(data.presented_record_refs) && data.presented_record_refs.length) {
      setPresentedRecordRefs(data.presented_record_refs as string[]);
    }
    if (Array.isArray(data.recommendations) && data.recommendations.length) {
      setRecommendations(data.recommendations as string[]);
    }
    if (Array.isArray(data.differential_diagnosis) && data.differential_diagnosis.length) {
      setDifferentialDiagnosis(
        (data.differential_diagnosis as Array<{ text: string; icd10?: string }>).map(
          (d) => ({ text: d.text ?? '', icd10: d.icd10 ?? '' }),
        ),
      );
    }
  }

  useEffect(() => { void load(); }, [params.id]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/bridge/opinions/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({
          specialty: specialty || null,
          referral_reason: referralReason || null,
          presented_record_refs: presentedRecordRefs.filter(Boolean),
          opinion: opinion || null,
          recommendations: recommendations.filter(Boolean),
          differential_diagnosis: differentialDiagnosis
            .filter((d) => d.text)
            .map((d) => ({ text: d.text, ...(d.icd10 ? { icd10: d.icd10 } : {}) })),
        }),
      });
      const json = await res.json();
      if (!json.success) return toast.error(json.error);
      toast.success('Opinion saved');
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!record) return <p className="text-sm text-clinical-muted">Loading…</p>;

  const frozen = Boolean((record as { credential_id?: string | null }).credential_id);
  const isSigned = record.status === 'signed';
  const patientName = (record.patients as { name: string } | null)?.name ?? 'Patient';
  const canSign = Boolean(record.specialty && record.opinion);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-ink">
        {patientName} · Specialist opinion
      </h1>
      <p className="text-xs text-clinical-muted">Status: {record.status as string}</p>

      {/* Specialty + referral reason */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Referral details</h2>
        <Input
          placeholder="Specialty (e.g. Cardiology)"
          value={specialty}
          disabled={frozen}
          onChange={(e) => setSpecialty(e.target.value)}
        />
        <Input
          placeholder="Referral reason"
          value={referralReason}
          disabled={frozen}
          onChange={(e) => setReferralReason(e.target.value)}
        />
      </section>

      {/* Presented record refs */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Presented records</h2>
        {presentedRecordRefs.map((ref, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Record reference (e.g. Lab report ID, Rx credential)"
              value={ref}
              disabled={frozen}
              onChange={(e) => setPresentedRecordRefs(presentedRecordRefs.map((x, j) => j === i ? e.target.value : x))}
            />
            {presentedRecordRefs.length > 1 && !frozen && (
              <Button
                variant="ghost"
                onClick={() => setPresentedRecordRefs(presentedRecordRefs.filter((_, j) => j !== i))}
              >
                ×
              </Button>
            )}
          </div>
        ))}
        {!frozen && (
          <Button variant="ghost" onClick={() => setPresentedRecordRefs([...presentedRecordRefs, ''])}>
            + record
          </Button>
        )}
      </section>

      {/* Opinion */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Opinion</h2>
        <textarea
          className="w-full rounded-lg border border-line bg-white p-3 text-sm text-ink placeholder:text-clinical-muted focus:outline-none focus:ring-2 focus:ring-glyph-400 disabled:opacity-60"
          placeholder="Specialist opinion and clinical assessment"
          rows={5}
          value={opinion}
          disabled={frozen}
          onChange={(e) => setOpinion(e.target.value)}
        />
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

      {/* Differential diagnosis */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Differential diagnosis</h2>
        {differentialDiagnosis.map((dx, i) => (
          <div key={i} className="flex gap-2">
            <Input
              className="flex-1"
              placeholder="Diagnosis text"
              value={dx.text}
              disabled={frozen}
              onChange={(e) => setDifferentialDiagnosis(differentialDiagnosis.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
            />
            <Input
              className="w-32"
              placeholder="ICD-10"
              value={dx.icd10}
              disabled={frozen}
              onChange={(e) => setDifferentialDiagnosis(differentialDiagnosis.map((x, j) => j === i ? { ...x, icd10: e.target.value } : x))}
            />
            {differentialDiagnosis.length > 1 && !frozen && (
              <Button
                variant="ghost"
                onClick={() => setDifferentialDiagnosis(differentialDiagnosis.filter((_, j) => j !== i))}
              >
                ×
              </Button>
            )}
          </div>
        ))}
        {!frozen && (
          <Button variant="ghost" onClick={() => setDifferentialDiagnosis([...differentialDiagnosis, { text: '', icd10: '' }])}>
            + diagnosis
          </Button>
        )}
      </section>

      {/* Save */}
      {!frozen && (
        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save opinion'}
        </Button>
      )}

      {/* Sign panel — placeholder (Task 4); gated on specialty + opinion present */}
      <section className="rounded-xl border border-line bg-white p-4">
        {isSigned ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-ink">&#x2713; Signed &middot; SpecialistOpinion issued</p>
            <p className="break-all font-mono text-xs text-clinical-muted">
              {vcId ?? (record as { credential_id?: string }).credential_id}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-clinical-muted">
              {canSign
                ? 'Issue a signed SpecialistOpinion verifiable credential for this record.'
                : 'Complete specialty and opinion fields before signing.'}
            </p>
            <Button
              variant="accent"
              className="w-full"
              disabled={!canSign || frozen}
              onClick={() => toast.info('Sign route coming in Task 4')}
            >
              Sign &amp; issue SpecialistOpinion
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
