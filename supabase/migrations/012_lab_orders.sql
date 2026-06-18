-- ============================================================
-- GLYPH — Lens v1: the diagnostic-centre order/result workflow (migration 012)
--
-- ADDITIVE on the owner/scope foundation (011). lab_orders is the centre's
-- mutable workflow (ordered → resulted → signed); the canonical record is the
-- LabResult credential, and lab_reports stays the frozen projection the wallet
-- already reads. Scoped to a diagnostic_centre via memberships RLS. Chamber and
-- every prior table/policy are untouched.
-- ============================================================

CREATE TABLE lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- the diagnostic_centre that owns this order (R2: an owner, not a clinic)
  owner_org_id UUID NOT NULL REFERENCES organizations(id),
  -- the patient (walk-in/provisional under the centre, or a known patient row)
  patient_id UUID NOT NULL REFERENCES patients(id),
  test_category TEXT NOT NULL,            -- CBC / RFT / LFT / HbA1c / Thyroid / ...
  status TEXT NOT NULL DEFAULT 'ordered'
    CHECK (status IN ('ordered', 'resulted', 'signed', 'revoked')),

  ordered_by UUID REFERENCES auth.users(id),
  ordered_at TIMESTAMPTZ DEFAULT now(),

  -- result draft (technologist enters; optionally pre-filled from an image)
  raw_results JSONB,                      -- [{name,value,unit,range,isAbnormal,severity}]
  result_image_path TEXT,                 -- optional Tier-B extraction source
  resulted_by UUID REFERENCES auth.users(id),
  resulted_at TIMESTAMPTZ,

  -- AI normalize output (the "same test, comparable answer" beat)
  normalized_results JSONB,               -- [{testName,value,unit,referenceRange,isAbnormal,severity}]
  sanity_flags JSONB,                     -- [{message,severity}]
  normalized_at TIMESTAMPTZ,

  -- signature: WHICH human authorized (accountability); issuer DID is the org
  signatory_user_id UUID REFERENCES auth.users(id),
  signed_at TIMESTAMPTZ,
  credential_id UUID REFERENCES credentials(id),  -- the LabResult VC (freezes the row)
  lab_report_id UUID REFERENCES lab_reports(id),  -- the projected wallet row

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_lab_orders_org_status ON lab_orders(owner_org_id, status);
CREATE INDEX idx_lab_orders_patient ON lab_orders(patient_id);

-- Once credentialed, the order's clinical content is frozen — amend only by
-- issuing a replacement credential (mirrors lab_reports_frozen from 002).
CREATE OR REPLACE FUNCTION lab_orders_frozen()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.credential_id IS NOT NULL AND (
       NEW.normalized_results IS DISTINCT FROM OLD.normalized_results
    OR NEW.raw_results        IS DISTINCT FROM OLD.raw_results
    OR NEW.credential_id      IS DISTINCT FROM OLD.credential_id
  ) THEN
    RAISE EXCEPTION 'lab order is credentialed and frozen: amend by issuing a new credential';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lab_orders_frozen
  BEFORE UPDATE ON lab_orders
  FOR EACH ROW EXECUTE FUNCTION lab_orders_frozen();

-- RLS: a centre staffer (member of owner_org_id) reads/writes their orders.
-- Service-role routes bypass RLS for writes; this powers the staff-JWT dashboard
-- read and proves cross-centre isolation.
ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lab_orders_member_all" ON lab_orders FOR ALL
  USING (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()))
  WITH CHECK (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()));
