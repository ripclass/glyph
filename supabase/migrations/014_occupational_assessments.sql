-- ============================================================
-- GLYPH — Karigor v1: occupational-assessments workflow (migration 014)
-- Additive, owner-org-scoped (org_type='employer'). The employer analogue of
-- discharge_records (013): mutable workflow; the canonical record is the
-- OccupationalAssessment credential. Chamber/Lens/Hospital untouched.
-- ============================================================
CREATE TABLE occupational_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_org_id UUID NOT NULL REFERENCES organizations(id),   -- the employer/factory
  patient_id UUID NOT NULL REFERENCES patients(id),          -- the worker
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','signed','revoked')),
  assessment_type TEXT,                 -- pre_placement/periodic/return_to_work/incident/exit
  exposures JSONB,                      -- string[]
  findings JSONB,                       -- [{testName,value,unit,referenceRange,isAbnormal,severity}]
  fitness_for_role TEXT,                -- fit/fit_with_restrictions/unfit
  restrictions JSONB,                   -- string[]
  recommendations JSONB,               -- string[]
  created_by UUID REFERENCES auth.users(id),
  signatory_user_id UUID REFERENCES auth.users(id),
  signed_at TIMESTAMPTZ,
  credential_id UUID REFERENCES credentials(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_occ_assessments_org_status ON occupational_assessments(owner_org_id, status);
CREATE INDEX idx_occ_assessments_patient ON occupational_assessments(patient_id);

CREATE OR REPLACE FUNCTION occupational_assessments_frozen()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.credential_id IS NOT NULL AND (
       NEW.assessment_type   IS DISTINCT FROM OLD.assessment_type
    OR NEW.exposures         IS DISTINCT FROM OLD.exposures
    OR NEW.findings          IS DISTINCT FROM OLD.findings
    OR NEW.fitness_for_role  IS DISTINCT FROM OLD.fitness_for_role
    OR NEW.restrictions      IS DISTINCT FROM OLD.restrictions
    OR NEW.recommendations   IS DISTINCT FROM OLD.recommendations
    OR NEW.credential_id     IS DISTINCT FROM OLD.credential_id
  ) THEN
    RAISE EXCEPTION 'occupational assessment is credentialed and frozen: amend by issuing a new credential';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_occupational_assessments_frozen
  BEFORE UPDATE ON occupational_assessments
  FOR EACH ROW EXECUTE FUNCTION occupational_assessments_frozen();

ALTER TABLE occupational_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "occupational_assessments_member_all" ON occupational_assessments FOR ALL
  USING (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()))
  WITH CHECK (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()));
