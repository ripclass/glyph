-- ============================================================
-- GLYPH — Hospital v1: discharge-records workflow (migration 013)
-- Additive, owner-org-scoped (org_type='hospital'). The hospital analogue of
-- lab_orders (012): mutable workflow; the canonical record is the DischargeSummary
-- credential. Chamber/Lens untouched.
-- ============================================================
CREATE TABLE discharge_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_org_id UUID NOT NULL REFERENCES organizations(id),   -- the hospital
  patient_id UUID NOT NULL REFERENCES patients(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','signed','revoked')),
  admission_date DATE,
  discharge_date DATE,
  discharge_diagnosis JSONB,          -- [{text,icd10}]
  discharge_medications JSONB,        -- [{name,frequency,...}]
  procedures JSONB,                   -- string[]
  hospital_course TEXT,
  follow_up_instructions JSONB,       -- string[]
  discharge_condition TEXT,           -- recovered/improved/referred/lama/...
  created_by UUID REFERENCES auth.users(id),
  signatory_user_id UUID REFERENCES auth.users(id),
  signed_at TIMESTAMPTZ,
  credential_id UUID REFERENCES credentials(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_discharge_records_org_status ON discharge_records(owner_org_id, status);
CREATE INDEX idx_discharge_records_patient ON discharge_records(patient_id);

CREATE OR REPLACE FUNCTION discharge_records_frozen()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.credential_id IS NOT NULL AND (
       NEW.discharge_diagnosis      IS DISTINCT FROM OLD.discharge_diagnosis
    OR NEW.discharge_medications    IS DISTINCT FROM OLD.discharge_medications
    OR NEW.credential_id            IS DISTINCT FROM OLD.credential_id
    OR NEW.procedures               IS DISTINCT FROM OLD.procedures
    OR NEW.hospital_course          IS DISTINCT FROM OLD.hospital_course
    OR NEW.follow_up_instructions   IS DISTINCT FROM OLD.follow_up_instructions
    OR NEW.discharge_condition      IS DISTINCT FROM OLD.discharge_condition
    OR NEW.admission_date           IS DISTINCT FROM OLD.admission_date
    OR NEW.discharge_date           IS DISTINCT FROM OLD.discharge_date
  ) THEN
    RAISE EXCEPTION 'discharge record is credentialed and frozen: amend by issuing a new credential';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_discharge_records_frozen
  BEFORE UPDATE ON discharge_records
  FOR EACH ROW EXECUTE FUNCTION discharge_records_frozen();

ALTER TABLE discharge_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "discharge_records_member_all" ON discharge_records FOR ALL
  USING (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()))
  WITH CHECK (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()));
