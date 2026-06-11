-- ============================================================
-- GLYPH — Identity Layer (M3): credential-canonical storage
--
-- THE ARCHITECTURAL INVARIANT (Phase 2 brief, non-negotiable #1):
-- the Verifiable Credential is the source of truth; Postgres rows in
-- visits/prescriptions/lab_reports are PROJECTIONS of credentials.
-- Amendments issue a NEW credential with a `replaces` pointer — clinical
-- facts are never overwritten in place.
--
-- Enforcement lives in triggers, not convention:
--   * credentials:           INSERT-only; the ONLY permitted update is a
--                            status transition (active -> revoked/superseded)
--                            with every other column unchanged. No DELETE.
--                            No updated_at column, on purpose.
--   * did_documents:         INSERT-only; key rotation = new row, version+1.
--   * credential_status_log: INSERT-only audit trail of status transitions.
--   * projections:           once a row's *_credential_id is set, its
--                            clinical-fact columns are frozen.
-- ============================================================

-- ============================================================
-- DID + KEY COLUMNS ON PRINCIPALS
-- did: did:web:<host>:.well-known:did:<slug> (host from config, never hardcoded)
-- public_key_jwk:        Ed25519 public key (JWK, @kham/identity StoredKeyPair)
-- encrypted_private_key: AES-256-GCM ciphertext (master key = env
--                        CREDENTIAL_ENCRYPTION_KEY, server-side ops only)
-- key_nonce:             AES-GCM nonce for the ciphertext above
-- ============================================================
ALTER TABLE patients ADD COLUMN did TEXT UNIQUE;
ALTER TABLE patients ADD COLUMN public_key_jwk JSONB;
ALTER TABLE patients ADD COLUMN encrypted_private_key TEXT;
ALTER TABLE patients ADD COLUMN key_nonce TEXT;

ALTER TABLE doctors ADD COLUMN did TEXT UNIQUE;
ALTER TABLE doctors ADD COLUMN public_key_jwk JSONB;
ALTER TABLE doctors ADD COLUMN encrypted_private_key TEXT;
ALTER TABLE doctors ADD COLUMN key_nonce TEXT;

ALTER TABLE clinics ADD COLUMN did TEXT UNIQUE;
ALTER TABLE clinics ADD COLUMN public_key_jwk JSONB;
ALTER TABLE clinics ADD COLUMN encrypted_private_key TEXT;
ALTER TABLE clinics ADD COLUMN key_nonce TEXT;

-- ============================================================
-- CREDENTIALS — the canonical store
-- ============================================================
CREATE TABLE credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vc_id TEXT UNIQUE NOT NULL,            -- the VC's `id` URI
  types TEXT[] NOT NULL,                 -- e.g. {VerifiableCredential,PrescriptionCredential}
  issuer_did TEXT NOT NULL,
  subject_did TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  credential_json JSONB NOT NULL,        -- full VC incl. proof (JCS-canonicalized form signed)
  proof_value TEXT NOT NULL,             -- signature, denormalized for queries
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'superseded')),
  revoked_at TIMESTAMPTZ,
  replaces_credential_id UUID REFERENCES credentials(id),
  created_at TIMESTAMPTZ DEFAULT now()
  -- NO updated_at: this table must never look mutable
);

-- ============================================================
-- DID DOCUMENTS — versioned, INSERT-only (rotation = new version)
-- Published at https://<domain>/.well-known/did/<slug>/did.json
-- ============================================================
CREATE TABLE did_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  did TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  document JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (did, version)
);

-- ============================================================
-- CREDENTIAL STATUS LOG — append-only revocation/supersession audit
-- ============================================================
CREATE TABLE credential_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID REFERENCES credentials(id) NOT NULL,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  reason TEXT,
  actor_did TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PROJECTION LINKS — which canonical credential a row was built from
-- ============================================================
ALTER TABLE visits ADD COLUMN note_credential_id UUID REFERENCES credentials(id);
ALTER TABLE prescriptions ADD COLUMN credential_id UUID REFERENCES credentials(id);
ALTER TABLE lab_reports ADD COLUMN credential_id UUID REFERENCES credentials(id);

-- ============================================================
-- IMMUTABILITY TRIGGERS
-- ============================================================

-- credentials: block DELETE always; block UPDATE unless it is a pure status
-- transition (status/revoked_at may change; everything else must be equal).
CREATE OR REPLACE FUNCTION credentials_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'credentials are append-only: DELETE is not allowed';
  END IF;

  IF NEW.id            IS DISTINCT FROM OLD.id
    OR NEW.vc_id        IS DISTINCT FROM OLD.vc_id
    OR NEW.types        IS DISTINCT FROM OLD.types
    OR NEW.issuer_did   IS DISTINCT FROM OLD.issuer_did
    OR NEW.subject_did  IS DISTINCT FROM OLD.subject_did
    OR NEW.issued_at    IS DISTINCT FROM OLD.issued_at
    OR NEW.expires_at   IS DISTINCT FROM OLD.expires_at
    OR NEW.credential_json IS DISTINCT FROM OLD.credential_json
    OR NEW.proof_value  IS DISTINCT FROM OLD.proof_value
    OR NEW.replaces_credential_id IS DISTINCT FROM OLD.replaces_credential_id
    OR NEW.created_at   IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'credentials are immutable: only status transitions are allowed (amend by issuing a new credential with a replaces pointer)';
  END IF;

  IF NEW.status = OLD.status AND NEW.revoked_at IS NOT DISTINCT FROM OLD.revoked_at THEN
    RAISE EXCEPTION 'no-op credential update rejected';
  END IF;

  -- status may only move forward from active
  IF OLD.status <> 'active' THEN
    RAISE EXCEPTION 'credential status is terminal once revoked/superseded';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_credentials_immutable
  BEFORE UPDATE OR DELETE ON credentials
  FOR EACH ROW EXECUTE FUNCTION credentials_immutable();

-- did_documents + credential_status_log: fully INSERT-only
CREATE OR REPLACE FUNCTION reject_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % not allowed', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_did_documents_immutable
  BEFORE UPDATE OR DELETE ON did_documents
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TRIGGER trg_status_log_immutable
  BEFORE UPDATE OR DELETE ON credential_status_log
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

-- Projections: once credentialed, clinical facts freeze.
-- Operational columns (status, timestamps, api_costs, …) stay mutable.
CREATE OR REPLACE FUNCTION visits_note_frozen()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.note_credential_id IS NOT NULL AND (
       NEW.approved_note  IS DISTINCT FROM OLD.approved_note
    OR NEW.generated_note IS DISTINCT FROM OLD.generated_note
    OR NEW.note_format    IS DISTINCT FROM OLD.note_format
    OR NEW.note_credential_id IS DISTINCT FROM OLD.note_credential_id
  ) THEN
    RAISE EXCEPTION 'note is credentialed and frozen: amend by issuing a new credential';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_visits_note_frozen
  BEFORE UPDATE ON visits
  FOR EACH ROW EXECUTE FUNCTION visits_note_frozen();

CREATE OR REPLACE FUNCTION prescriptions_frozen()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.credential_id IS NOT NULL AND (
       NEW.medications  IS DISTINCT FROM OLD.medications
    OR NEW.diagnosis    IS DISTINCT FROM OLD.diagnosis
    OR NEW.diagnosis_icd10 IS DISTINCT FROM OLD.diagnosis_icd10
    OR NEW.investigations_ordered IS DISTINCT FROM OLD.investigations_ordered
    OR NEW.advice       IS DISTINCT FROM OLD.advice
    OR NEW.credential_id IS DISTINCT FROM OLD.credential_id
  ) THEN
    RAISE EXCEPTION 'prescription is credentialed and frozen: amend by issuing a new credential';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prescriptions_frozen
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION prescriptions_frozen();

CREATE OR REPLACE FUNCTION lab_reports_frozen()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.credential_id IS NOT NULL AND (
       NEW.results       IS DISTINCT FROM OLD.results
    OR NEW.test_category IS DISTINCT FROM OLD.test_category
    OR NEW.credential_id IS DISTINCT FROM OLD.credential_id
  ) THEN
    RAISE EXCEPTION 'lab report is credentialed and frozen: amend by issuing a new credential';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lab_reports_frozen
  BEFORE UPDATE ON lab_reports
  FOR EACH ROW EXECUTE FUNCTION lab_reports_frozen();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_credentials_subject ON credentials(subject_did);
CREATE INDEX idx_credentials_issuer ON credentials(issuer_did);
CREATE INDEX idx_credentials_status ON credentials(status);
CREATE INDEX idx_credentials_types ON credentials USING GIN(types);
CREATE INDEX idx_did_documents_did ON did_documents(did, version DESC);
CREATE INDEX idx_status_log_credential ON credential_status_log(credential_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- Writes go through the service-role issuance seam (bypasses RLS).
-- ============================================================
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE did_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_status_log ENABLE ROW LEVEL SECURITY;

-- A doctor can read credentials they issued, or whose subject is a patient
-- (or doctor/clinic identity) within their clinic.
CREATE POLICY "credentials_clinic_read" ON credentials FOR SELECT USING (
  issuer_did IN (SELECT did FROM doctors WHERE id = auth.uid())
  OR subject_did IN (
    SELECT did FROM patients WHERE clinic_id IN (
      SELECT clinic_id FROM doctors WHERE id = auth.uid()
    )
  )
  OR subject_did IN (SELECT did FROM doctors WHERE id = auth.uid())
  OR subject_did IN (
    SELECT did FROM clinics WHERE id IN (
      SELECT clinic_id FROM doctors WHERE id = auth.uid()
    )
  )
);

-- DID documents are public by design (they are published at .well-known)
CREATE POLICY "did_documents_public_read" ON did_documents FOR SELECT USING (true);

-- Status log follows the credential's visibility
CREATE POLICY "status_log_clinic_read" ON credential_status_log FOR SELECT USING (
  credential_id IN (SELECT id FROM credentials)
);
