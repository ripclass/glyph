-- ============================================================
-- 018_emergency_access.sql
-- Emergency Access v1: opt-in emergency profile, a separate
-- scannable emergency token, the stranger-scan audit log, the
-- time-boxed hospital broadcast, coarse geo on hospital orgs,
-- and the emergency_access consent type. Service-role only.
-- ============================================================

-- Emergency profile fields on patients (reuse blood_group/known_allergies/
-- chronic_conditions/emergency_contact_* already present).
ALTER TABLE patients ADD COLUMN emergency_access_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN emergency_medications TEXT;

-- Coarse geo for hospital broadcast radius filtering.
ALTER TABLE organizations ADD COLUMN latitude NUMERIC(9,6);
ALTER TABLE organizations ADD COLUMN longitude NUMERIC(9,6);

-- New consent type.
ALTER TABLE consent_records DROP CONSTRAINT consent_records_consent_type_check;
ALTER TABLE consent_records ADD CONSTRAINT consent_records_consent_type_check CHECK (consent_type IN (
  'recording','data_storage','ai_processing','image_capture','whatsapp_followup','data_sharing','emergency_access'
));

-- Per-patient emergency token (separate from wallet_access_tokens).
CREATE TABLE emergency_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  token TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  last_scanned_at TIMESTAMPTZ
);
CREATE INDEX idx_emergency_tokens_patient ON emergency_tokens(patient_id);
ALTER TABLE emergency_tokens ENABLE ROW LEVEL SECURITY;
-- Deny-all (service-role only), same as wallet_access_tokens.

-- Append-only scan audit.
CREATE TABLE emergency_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  scan_lat NUMERIC(9,6),
  scan_lon NUMERIC(9,6),
  routed BOOLEAN NOT NULL DEFAULT FALSE,
  broadcast_count INTEGER NOT NULL DEFAULT 0,
  family_notified BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_emergency_scans_patient ON emergency_scans(patient_id);
CREATE INDEX idx_emergency_scans_token_time ON emergency_scans(token, scanned_at);
ALTER TABLE emergency_scans ENABLE ROW LEVEL SECURITY;

-- Time-boxed broadcast to nearby registered hospitals.
CREATE TABLE emergency_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scan_id UUID NOT NULL REFERENCES emergency_scans(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  hospital_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  minimal_dataset JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'created' CHECK (delivery_status IN ('created','sent','failed'))
);
CREATE INDEX idx_emergency_alerts_hospital_exp ON emergency_alerts(hospital_org_id, expires_at);
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
