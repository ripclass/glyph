-- ============================================================
-- GLYPH — Owner/Scope Foundation (migration 011)
-- Foundation audit Decision #2: "clinic is ONE owner type."
--
-- ADDITIVE + Chamber-safe: every existing clinic_id column, policy and index
-- is left byte-for-byte unchanged. New owner surfaces ride ALONGSIDE the live
-- clinic path. R1 (anchor to DID) + R2 (owner is an abstraction).
-- See docs/superpowers/specs/2026-06-17-glyph-foundation-audit.md
-- ============================================================

-- ---------- ORGANIZATIONS: the general owner ----------
-- clinic is one org_type; diagnostic_centre/hospital/employer/recruiter are the
-- incoming owner types; kham_holding owns provisional/unaffiliated patients.
-- Same DID/key columns the other principals carry (migration 002); minted
-- lazily app-side via ensureEntityIdentity.
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_type TEXT NOT NULL CHECK (org_type IN (
    'clinic', 'diagnostic_centre', 'hospital', 'employer', 'recruiter', 'kham_holding'
  )),
  district TEXT,
  phone TEXT,
  did TEXT UNIQUE,
  public_key_jwk JSONB,
  encrypted_private_key TEXT,
  key_nonce TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- MEMBERSHIPS: who may act for an owner ----------
-- Generalizes the scalar doctors.clinic_id: a user (auth.users) belongs to an
-- organization in a role. This is what lets NON-doctor centre/hospital staff
-- log in and act for their owner.
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  role TEXT NOT NULL CHECK (role IN (
    'owner', 'admin', 'doctor', 'technologist', 'signatory', 'staff'
  )),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

-- ---------- A clinic is a 1:1 satellite of its organization ----------
ALTER TABLE clinics ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Backfill: one clinic-type org per existing clinic, then link the clinic to it.
DO $$
DECLARE c RECORD; new_org_id UUID;
BEGIN
  FOR c IN SELECT id, name, district, phone, created_at FROM clinics LOOP
    INSERT INTO organizations (name, org_type, district, phone, created_at)
    VALUES (c.name, 'clinic', c.district, c.phone, c.created_at)
    RETURNING id INTO new_org_id;
    UPDATE clinics SET organization_id = new_org_id WHERE id = c.id;
  END LOOP;
END $$;

-- ---------- The provisional-holding singleton ----------
-- Exactly one kham_holding org (the front-door / walk-in owner of last resort).
CREATE UNIQUE INDEX uq_one_kham_holding ON organizations(org_type)
  WHERE org_type = 'kham_holding';
INSERT INTO organizations (name, org_type)
  VALUES ('KhaM Holding (Provisional Patients)', 'kham_holding');

-- ---------- INDEXES ----------
CREATE INDEX idx_organizations_type ON organizations(org_type);
CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_org ON memberships(organization_id);

-- ---------- RLS (new tables only — Chamber's policies untouched) ----------
-- Writes go through the service-role onboarding/issuance seam (bypasses RLS),
-- same pattern as the credential issuance seam.
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Members see their own organization(s). Relies on membership_self_read
-- exposing the user's own membership rows to this sub-select.
CREATE POLICY "org_member_read" ON organizations FOR SELECT USING (
  id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid())
);

-- A user sees their own membership rows.
CREATE POLICY "membership_self_read" ON memberships FOR SELECT USING (
  user_id = auth.uid()
);

-- ---------- PATIENTS: generalize ownership ----------
-- owner_org_id = the new owner pointer (any org_type). clinic_id relaxes to
-- nullable so a centre/provisional patient needs no clinic. Existing Chamber
-- patients keep clinic_id with a NULL owner_org_id — their RLS is untouched.
ALTER TABLE patients ADD COLUMN owner_org_id UUID REFERENCES organizations(id);
ALTER TABLE patients ALTER COLUMN clinic_id DROP NOT NULL;
CREATE INDEX idx_patients_owner_org ON patients(owner_org_id);

-- Backfill a membership for every existing doctor → their clinic's org. Lets a
-- clinic become an owner later with no retrofit; dormant for Chamber today
-- (Chamber reads via clinic_id, not memberships).
DO $$
DECLARE d RECORD; org UUID;
BEGIN
  FOR d IN SELECT id, clinic_id FROM doctors WHERE clinic_id IS NOT NULL LOOP
    SELECT organization_id INTO org FROM clinics WHERE id = d.clinic_id;
    IF org IS NOT NULL THEN
      INSERT INTO memberships (user_id, organization_id, role)
      VALUES (d.id, org, 'doctor')
      ON CONFLICT (user_id, organization_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- New owner-scoped access to patients, ALONGSIDE the untouched clinic policy.
-- PERMISSIVE policies OR together: a clinic doctor still reaches clinic patients
-- via "doctors_own_clinic"; org members reach owner_org patients here. No leak:
-- clinic patients have owner_org_id NULL, owner-scoped patients have clinic_id NULL.
CREATE POLICY "patients_owner_org" ON patients FOR ALL
  USING (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()))
  WITH CHECK (owner_org_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()));

-- ---------- SCOPE-EXCLUSIVITY INVARIANT (security boundary) ----------
-- The two PERMISSIVE patient policies (doctors_own_clinic, patients_owner_org)
-- OR their WITH CHECK clauses. Without this, a writer could set BOTH clinic_id
-- (own) and owner_org_id (foreign) on one row — passing one policy's check and
-- exposing the row to the other scope. This RESTRICTIVE policy AND's across all
-- writes, enforcing that a patient is owned by EXACTLY ONE scope. USING (true)
-- leaves reads/row-visibility to the permissive policies; only writes are
-- constrained. Service-role writes bypass RLS entirely (unaffected).
CREATE POLICY "patients_single_scope" ON patients AS RESTRICTIVE FOR ALL
  USING (true)
  WITH CHECK (num_nonnulls(clinic_id, owner_org_id) = 1);

-- Belt-and-suspenders: the RESTRICTIVE policy above only constrains RLS-bound
-- (authenticated) writes; service-role writes bypass RLS. This table CHECK makes
-- the single-scope invariant UNCONDITIONAL — it holds for every writer, incl.
-- the service-role provisional-patient path. All existing Chamber rows are
-- clinic-only (num_nonnulls = 1), so it validates cleanly. The deferred
-- Chamber→owner_org migration must move clinic_id→owner_org_id per-row (never
-- both set at once) to stay within this constraint.
ALTER TABLE patients
  ADD CONSTRAINT patients_one_scope CHECK (num_nonnulls(clinic_id, owner_org_id) = 1);
