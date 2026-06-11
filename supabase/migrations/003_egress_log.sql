-- ============================================================
-- GLYPH — Egress evidence log (M4): the PDPO audit trail
--
-- Every external-API call (LLM providers, OpenRouter, WhatsApp/Meta) is
-- recorded here BY THE CHOKEPOINT before any bytes leave — including
-- rejected attempts. Fail-closed contract: if this row cannot be written,
-- the egress does not happen.
--
-- Append-only: this table is evidence, not state.
-- ============================================================

CREATE TABLE egress_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  called_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edge_function TEXT NOT NULL,
  -- Tier A: structured-field PII reliably scrubbed before egress
  -- Tier B: free text / images — consent-gated, best-effort redaction
  -- Tier C: protected populations — never leaves; always rejected for now
  tier TEXT NOT NULL CHECK (tier IN ('A', 'B', 'C')),
  -- External processor receiving the data, e.g.
  -- 'openrouter:google/gemini-2.5-flash', 'gemini:gemini-2.0-flash',
  -- 'anthropic:claude-sonnet-4', 'whatsapp:meta'
  processor TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  reject_reason TEXT,
  -- Whether identifier scrubbing ran on the outbound payload
  deidentified BOOLEAN NOT NULL DEFAULT false,
  -- Distinct identifier values replaced (known literals + precise patterns)
  identifiers_scrubbed INTEGER,
  -- Whether the payload contains content scrubbing cannot cover (images, voice)
  contains_unredactable BOOLEAN NOT NULL DEFAULT false,
  consent_id UUID REFERENCES consent_records(id),
  visit_id UUID REFERENCES visits(id)
);

CREATE TRIGGER trg_egress_log_immutable
  BEFORE UPDATE OR DELETE ON egress_log
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE INDEX idx_egress_log_visit ON egress_log(visit_id);
CREATE INDEX idx_egress_log_fn_time ON egress_log(edge_function, called_at DESC);
CREATE INDEX idx_egress_log_denied ON egress_log(allowed) WHERE allowed = false;

-- Service-role writes only (the chokepoint); doctors may read their own
-- clinic's trail for transparency.
ALTER TABLE egress_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "egress_log_clinic_read" ON egress_log FOR SELECT USING (
  visit_id IN (
    SELECT id FROM visits WHERE clinic_id IN (
      SELECT clinic_id FROM doctors WHERE id = auth.uid()
    )
  )
);
