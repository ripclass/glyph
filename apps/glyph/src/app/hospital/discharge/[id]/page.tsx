'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DiagnosisRow { text: string; icd10: string }
interface MedicationRow { name: string; frequency: string }

const CONDITION_OPTIONS = [
  { value: '', label: 'Select condition…' },
  { value: 'recovered', label: 'Recovered' },
  { value: 'improved', label: 'Improved' },
  { value: 'unchanged', label: 'Unchanged' },
  { value: 'referred', label: 'Referred' },
  { value: 'deceased', label: 'Deceased' },
  { value: 'lama', label: 'LAMA (Left Against Medical Advice)' },
];

export default function DischargeDetailPage({ params }: { params: { id: string } }) {
  const [record, setRecord] = useState<any>(null);
  const [diagnoses, setDiagnoses] = useState<DiagnosisRow[]>([{ text: '', icd10: '' }]);
  const [medications, setMedications] = useState<MedicationRow[]>([{ name: '', frequency: '' }]);
  const [followUpList, setFollowUpList] = useState<string[]>(['']);
  const [condition, setCondition] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [dischargeDate, setDischargeDateState] = useState('');
  const [hospitalCourse, setHospitalCourse] = useState('');
  const [saving, setSaving] = useState(false);

  async function token() {
    const { data: { session } } = await createClient().auth.getSession();
    return session?.access_token;
  }

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from('discharge_records')
      .select('*, patients(name)')
      .eq('id', params.id)
      .maybeSingle();
    if (!data) return;
    setRecord(data);
    if (Array.isArray(data.discharge_diagnosis) && data.discharge_diagnosis.length) {
      setDiagnoses(data.discharge_diagnosis as unknown as DiagnosisRow[]);
    }
    if (Array.isArray(data.discharge_medications) && data.discharge_medications.length) {
      setMedications(data.discharge_medications as unknown as MedicationRow[]);
    }
    if (Array.isArray(data.follow_up_instructions) && data.follow_up_instructions.length) {
      setFollowUpList(data.follow_up_instructions as unknown as string[]);
    }
    if (data.discharge_condition) setCondition(data.discharge_condition);
    if (data.admission_date) setAdmissionDate(data.admission_date);
    if (data.discharge_date) setDischargeDateState(data.discharge_date);
    if (data.hospital_course) setHospitalCourse(data.hospital_course);
  }

  useEffect(() => { void load(); }, [params.id]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/hospital/discharges/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({
          discharge_diagnosis: diagnoses.filter((d) => d.text),
          discharge_medications: medications.filter((m) => m.name),
          follow_up_instructions: followUpList.filter(Boolean),
          discharge_condition: condition || null,
          admission_date: admissionDate || null,
          discharge_date: dischargeDate || null,
          hospital_course: hospitalCourse || null,
          procedures: [],
        }),
      });
      const json = await res.json();
      if (!json.success) return toast.error(json.error);
      toast.success('Discharge summary saved');
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!record) return <p className="text-sm text-clinical-muted">Loading…</p>;

  const frozen = Boolean(record.credential_id);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-ink">
        {record.patients?.name ?? 'Patient'} · Discharge summary
      </h1>
      <p className="text-xs text-clinical-muted">Status: {record.status}</p>

      {/* Dates */}
      <section className="space-y-3 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Admission &amp; discharge dates</h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm text-ink/60">Admission date</label>
            <Input
              type="date"
              value={admissionDate}
              disabled={frozen}
              onChange={(e) => setAdmissionDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm text-ink/60">Discharge date</label>
            <Input
              type="date"
              value={dischargeDate}
              disabled={frozen}
              onChange={(e) => setDischargeDateState(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Diagnoses */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Discharge diagnoses</h2>
        {diagnoses.map((d, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Diagnosis (required)"
              value={d.text}
              disabled={frozen}
              onChange={(e) => setDiagnoses(diagnoses.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
            />
            <Input
              placeholder="ICD-10 (optional)"
              className="w-32"
              value={d.icd10}
              disabled={frozen}
              onChange={(e) => setDiagnoses(diagnoses.map((x, j) => j === i ? { ...x, icd10: e.target.value } : x))}
            />
            {diagnoses.length > 1 && !frozen && (
              <Button
                variant="ghost"
                onClick={() => setDiagnoses(diagnoses.filter((_, j) => j !== i))}
              >
                ×
              </Button>
            )}
          </div>
        ))}
        {!frozen && (
          <Button variant="ghost" onClick={() => setDiagnoses([...diagnoses, { text: '', icd10: '' }])}>
            + diagnosis
          </Button>
        )}
      </section>

      {/* Medications */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Discharge medications</h2>
        {medications.map((m, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Drug name"
              value={m.name}
              disabled={frozen}
              onChange={(e) => setMedications(medications.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
            />
            <Input
              placeholder="Frequency (e.g. 1+0+1)"
              value={m.frequency}
              disabled={frozen}
              onChange={(e) => setMedications(medications.map((x, j) => j === i ? { ...x, frequency: e.target.value } : x))}
            />
            {medications.length > 1 && !frozen && (
              <Button
                variant="ghost"
                onClick={() => setMedications(medications.filter((_, j) => j !== i))}
              >
                ×
              </Button>
            )}
          </div>
        ))}
        {!frozen && (
          <Button variant="ghost" onClick={() => setMedications([...medications, { name: '', frequency: '' }])}>
            + medication
          </Button>
        )}
      </section>

      {/* Hospital course */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Hospital course</h2>
        <textarea
          className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink placeholder:text-clinical-muted focus:outline-none focus:ring-2 focus:ring-glyph-400 disabled:opacity-50"
          rows={4}
          placeholder="Summarise the patient's clinical course during this admission…"
          value={hospitalCourse}
          disabled={frozen}
          onChange={(e) => setHospitalCourse(e.target.value)}
        />
      </section>

      {/* Follow-up instructions */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Follow-up instructions</h2>
        {followUpList.map((instr, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Follow-up instruction"
              value={instr}
              disabled={frozen}
              onChange={(e) => setFollowUpList(followUpList.map((x, j) => j === i ? e.target.value : x))}
            />
            {followUpList.length > 1 && !frozen && (
              <Button variant="ghost" onClick={() => setFollowUpList(followUpList.filter((_, j) => j !== i))}>
                ×
              </Button>
            )}
          </div>
        ))}
        {!frozen && (
          <Button variant="ghost" onClick={() => setFollowUpList([...followUpList, ''])}>
            + instruction
          </Button>
        )}
      </section>

      {/* Discharge condition */}
      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h2 className="font-medium text-ink">Discharge condition</h2>
        <select
          className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-glyph-400 disabled:opacity-50"
          value={condition}
          disabled={frozen}
          onChange={(e) => setCondition(e.target.value)}
        >
          {CONDITION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </section>

      {/* Save */}
      {!frozen && (
        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save discharge summary'}
        </Button>
      )}

      {/* Sign panel placeholder — Task 6 */}
      <section className="rounded-xl border border-dashed border-line bg-white p-4 opacity-60">
        <p className="text-sm text-clinical-muted">
          Sign &amp; issue credential — coming in Task 6
        </p>
      </section>
    </div>
  );
}
