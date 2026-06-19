-- ============================================================
-- GLYPH — Continuity v1: clearance-records workflow (migration 015)
-- Additive, owner-org-scoped (org_type='recruiter'). The recruiter analogue of
-- occupational_assessments (014): mutable workflow; the canonical record is the
-- ClearanceRecord credential. Chamber/Lens/Hospital/Karigor untouched.
-- ============================================================
CREATE TABLE clearance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_org_id UUID NOT NULL REFERENCES organizations(id),   -- the recruiter/medical centre
  patient_id UUID NOT NULL REFERENCES patients(id),          -- the migrant worker
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','signed','revoked')),
  purpose TEXT,                         -- overseas_employment/pre_employment/periodic/general
  fitness_status TEXT,                  -- fit/fit_with_restrictions/temporarily_unfit/unfit
  restrictions JSONB,                   -- string[]
  findings JSONB,                       -- [{testName,value,unit,referenceRange,isAbnormal,severity}]
  destination_country TEXT,
  valid_until DATE,
  created_by UUID REFERENCES auth.users(id),
  signatory_user_id UUID REFERENCES auth.users(id),
  signed_at TIMESTAMPTZ,
  credential_id UUID REFERENCES credentials(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_clearance_records_org_status ON clearance_records(owner_org_id, status);
CREATE INDEX idx_clearance_records_patient ON clearance_records(patient_id);

CREATE OR REPLACE FUNCTION clearance_records_frozen()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.credential_id IS NOT NULL AND (
       NEW.purpose             IS DISTINCT FROM OLD.purpose
    OR NEW.fitness_status      IS DISTINCT FROM OLD.fitness_status
    OR NEW.restrictions        IS DISTINCT FROM OLD.restrictions
    OR NEW.findings            IS DISTINCT FROM OLD.findings
    OR NEW.destination_country IS DISTINCT FROM OLD.destination_country
    OR NEW.valid_until         IS DISTINCT FROM OLD.valid_until
    OR NEW.credential_id       IS DISTINCT FROM OLD.credential_id
  ) THEN
    RAISE EXCEPTION 'clearance record is credentialed and frozen: amend by issuing a new credential';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_clearance_records_frozen
  BEFORE UPDATE ON clearance_records
  FOR EACH ROW EXECUTE FUNCTION clearance_records_frozen();

ALTER TABLE clearance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clearance_records_member_all" ON clearance_records FOR ALL
  USING (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()))
  WITH CHECK (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()));
