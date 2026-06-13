-- ============================================================
-- GLYPH — Pocket triage sessions (migration 007)
--
-- Pocket v2: inside their wallet, a patient describes a symptom in Bangla and
-- Glyph runs a short guided triage (1–3 follow-ups → one structured answer
-- that routes, never diagnoses/prescribes). The exchange is persisted so it
-- becomes part of the patient's record — the next doctor sees "triaged for
-- chest pain 3 days ago" — and so the high-liability path is auditable.
--
-- Decisions (mirroring wallet_access_tokens, migration 006):
--   * RLS enabled with ZERO policies → anon/authenticated can neither read nor
--     write. Only the service-role /api/wallet/[token]/triage route touches
--     this table. Patients never reach PostgREST.
--   * `messages` is the full turn-by-turn exchange; `outcome` is the final
--     validated TriageOutcome (route/watchFor/specialty/redFlag) or the
--     forced-urgent result from the deterministic red-flag screen.
--   * `red_flag_screened` records whether the pure-code danger screen fired,
--     so an audit can tell a code-forced escalation from a model one.
-- ============================================================

CREATE TABLE triage_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  -- The wallet token in play, for tracing a session back to its access grant.
  wallet_token_id UUID REFERENCES wallet_access_tokens(id) ON DELETE SET NULL,

  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  outcome JSONB,
  -- TRUE when the deterministic screen forced an urgent answer (vs the model).
  red_flag_screened BOOLEAN NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE triage_sessions IS
  'Pocket triage exchanges. Service-role access only (the /api/wallet/[token]/triage route).';

ALTER TABLE triage_sessions ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies: deny-all for anon/authenticated.

-- The doctor-facing read is "this patient's recent triages, newest first."
CREATE INDEX idx_triage_patient ON triage_sessions(patient_id, created_at DESC);
