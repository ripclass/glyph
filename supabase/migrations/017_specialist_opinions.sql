-- ============================================================
-- GLYPH — Bridge v1: specialist_panel org_type + specialist_opinions (migration 017)
-- Additive.
--   1. Widens the organizations org_type CHECK to include 'specialist_panel'
--      (remote / diaspora specialist panel owner). No existing value removed.
--   2. Creates specialist_opinions — the panel analogue of antenatal_visits
--      (migration 016). Owner is always a 'specialist_panel' org; patient is
--      the referral subject.
-- Chamber/Lens/Hospital/Continuity/Maa untouched.
-- ============================================================

-- ── 1. Widen org_type CHECK ────────────────────────────────────────────────
ALTER TABLE organizations DROP CONSTRAINT organizations_org_type_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_org_type_check
  CHECK (org_type IN (
    'clinic','diagnostic_centre','hospital','employer','recruiter','kham_holding','program','specialist_panel'
  ));

-- ── 2. specialist_opinions table ──────────────────────────────────────────
CREATE TABLE specialist_opinions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_org_id             UUID NOT NULL REFERENCES organizations(id),   -- the specialist panel
  patient_id               UUID NOT NULL REFERENCES patients(id),
  status                   TEXT NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft','signed','revoked')),
  specialty                TEXT,
  referral_reason          TEXT,
  presented_record_refs    JSONB,         -- string[] (DIDs/VC ids the opinion references)
  opinion                  TEXT,
  recommendations          JSONB,         -- string[]
  differential_diagnosis   JSONB,         -- [{text,icd10}]
  created_by               UUID REFERENCES auth.users(id),
  signatory_user_id        UUID REFERENCES auth.users(id),
  signed_at                TIMESTAMPTZ,
  credential_id            UUID REFERENCES credentials(id),
  created_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_specialist_opinions_org_status ON specialist_opinions(owner_org_id, status);
CREATE INDEX idx_specialist_opinions_patient    ON specialist_opinions(patient_id);

-- ── 3. Freeze trigger ─────────────────────────────────────────────────────
-- Guards all clinical fields once a credential has been issued.
CREATE OR REPLACE FUNCTION specialist_opinions_frozen()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.credential_id IS NOT NULL AND (
       NEW.specialty               IS DISTINCT FROM OLD.specialty
    OR NEW.referral_reason         IS DISTINCT FROM OLD.referral_reason
    OR NEW.presented_record_refs   IS DISTINCT FROM OLD.presented_record_refs
    OR NEW.opinion                 IS DISTINCT FROM OLD.opinion
    OR NEW.recommendations         IS DISTINCT FROM OLD.recommendations
    OR NEW.differential_diagnosis  IS DISTINCT FROM OLD.differential_diagnosis
    OR NEW.credential_id           IS DISTINCT FROM OLD.credential_id
  ) THEN
    RAISE EXCEPTION 'specialist opinion is credentialed and frozen: amend by issuing a new credential';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_specialist_opinions_frozen
  BEFORE UPDATE ON specialist_opinions
  FOR EACH ROW EXECUTE FUNCTION specialist_opinions_frozen();

-- ── 4. RLS ────────────────────────────────────────────────────────────────
ALTER TABLE specialist_opinions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "specialist_opinions_member_all" ON specialist_opinions FOR ALL
  USING (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()))
  WITH CHECK (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()));
