-- ============================================================
-- GLYPH — Maa v1: program org_type + antenatal_visits (migration 016)
-- Additive.
--   1. Widens the organizations org_type CHECK to include 'program'
--      (maternal/CHW program owner). No existing value removed.
--   2. Creates antenatal_visits — the maternal analogue of clearance_records
--      (migration 015). Owner is always a 'program' org; patient is the mother.
-- Chamber/Lens/Hospital/Continuity untouched.
-- ============================================================

-- ── 1. Widen org_type CHECK ────────────────────────────────────────────────
ALTER TABLE organizations DROP CONSTRAINT organizations_org_type_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_org_type_check
  CHECK (org_type IN (
    'clinic','diagnostic_centre','hospital','employer','recruiter','kham_holding','program'
  ));

-- ── 2. antenatal_visits table ─────────────────────────────────────────────
CREATE TABLE antenatal_visits (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_org_id          UUID NOT NULL REFERENCES organizations(id),   -- the maternal program
  patient_id            UUID NOT NULL REFERENCES patients(id),        -- the mother
  status                TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','signed','revoked')),
  visit_number          INT,
  gestational_age_weeks NUMERIC,
  lmp                   DATE,
  edd                   DATE,
  blood_pressure        TEXT,
  weight_kg             NUMERIC,
  fundal_height_cm      NUMERIC,
  fetal_heart_rate_bpm  INT,
  risk_flags            JSONB,                 -- string[]
  next_visit_date       DATE,
  created_by            UUID REFERENCES auth.users(id),
  signatory_user_id     UUID REFERENCES auth.users(id),
  signed_at             TIMESTAMPTZ,
  credential_id         UUID REFERENCES credentials(id),
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_antenatal_visits_org_status ON antenatal_visits(owner_org_id, status);
CREATE INDEX idx_antenatal_visits_patient    ON antenatal_visits(patient_id);

-- ── 3. Freeze trigger ─────────────────────────────────────────────────────
-- Guards all clinical fields once a credential has been issued.
CREATE OR REPLACE FUNCTION antenatal_visits_frozen()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.credential_id IS NOT NULL AND (
       NEW.visit_number          IS DISTINCT FROM OLD.visit_number
    OR NEW.gestational_age_weeks IS DISTINCT FROM OLD.gestational_age_weeks
    OR NEW.lmp                   IS DISTINCT FROM OLD.lmp
    OR NEW.edd                   IS DISTINCT FROM OLD.edd
    OR NEW.blood_pressure        IS DISTINCT FROM OLD.blood_pressure
    OR NEW.weight_kg             IS DISTINCT FROM OLD.weight_kg
    OR NEW.fundal_height_cm      IS DISTINCT FROM OLD.fundal_height_cm
    OR NEW.fetal_heart_rate_bpm  IS DISTINCT FROM OLD.fetal_heart_rate_bpm
    OR NEW.risk_flags            IS DISTINCT FROM OLD.risk_flags
    OR NEW.next_visit_date       IS DISTINCT FROM OLD.next_visit_date
    OR NEW.credential_id         IS DISTINCT FROM OLD.credential_id
  ) THEN
    RAISE EXCEPTION 'antenatal visit is credentialed and frozen: amend by issuing a new credential';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_antenatal_visits_frozen
  BEFORE UPDATE ON antenatal_visits
  FOR EACH ROW EXECUTE FUNCTION antenatal_visits_frozen();

-- ── 4. RLS ────────────────────────────────────────────────────────────────
ALTER TABLE antenatal_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "antenatal_visits_member_all" ON antenatal_visits FOR ALL
  USING (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()))
  WITH CHECK (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()));
