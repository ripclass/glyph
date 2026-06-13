-- ============================================================
-- GLYPH — Wallet access tokens (migration 006)
--
-- Pocket v1: a patient opens their own record via a per-patient BEARER
-- TOKEN (no login — no patient auth exists, and SMS OTP has a recurring
-- cost we avoid). At note approval the doctor's tablet shows a QR; the
-- patient scans it and `/wallet/<token>` opens on their phone.
--
-- Decisions:
--   * RLS enabled with ZERO policies → anon/authenticated can neither read
--     nor write. Only the service-role /api/wallet routes touch this table,
--     exactly like waitlist_signups. Patients never reach PostgREST.
--   * The token is the primary secret (32 bytes of entropy, app-generated).
--     pin_hash is an OPTIONAL second factor (scrypt salt:key) for shared
--     devices — never the main barrier.
--   * One active (non-revoked) token per patient; re-issuing reuses or
--     rotates. Revocation is the kill switch (the doc's patient-control
--     requirement) until real patient-held keys replace bearer tokens.
-- ============================================================

CREATE TABLE wallet_access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  token TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  pin_hash TEXT,
  created_by_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,

  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  last_accessed_at TIMESTAMPTZ
);

COMMENT ON TABLE wallet_access_tokens IS
  'Pocket wallet bearer tokens. Service-role access only (the /api/wallet routes).';

ALTER TABLE wallet_access_tokens ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies: deny-all for anon/authenticated.

-- Fast lookup by token (the hot path) and by patient (find-or-create on issue).
CREATE UNIQUE INDEX idx_wallet_token ON wallet_access_tokens(token);
CREATE INDEX idx_wallet_patient ON wallet_access_tokens(patient_id) WHERE NOT revoked;
