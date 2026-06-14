-- ============================================================
-- GLYPH — WhatsApp bridge skeleton (migration 008)
--
-- Leg A of the WhatsApp bridge. Three service-role-only tables (RLS deny-all,
-- like wallet_access_tokens / triage_sessions): patients never reach PostgREST.
--   * whatsapp_links     — binds a WhatsApp number (wa_id) to a verified
--                          patient via a one-time code. The identity anchor is
--                          the patient; wa_id is a linked, revocable transport.
--   * wa_conversations   — durable, re-entrant per-thread state (the 24h window
--                          lives here as window_expires_at).
--   * wa_messages        — inbound/outbound log + idempotency (unique
--                          provider_message_id) + audit trail.
-- ============================================================

CREATE TABLE whatsapp_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  -- Set only once the patient redeems the code. NULL while pending.
  wa_id TEXT,
  -- The one-time binding code (set at issue, cleared/kept after redeem).
  bind_code TEXT,
  bind_code_expires_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL
);

COMMENT ON TABLE whatsapp_links IS
  'Binds a WhatsApp number to a verified patient. Service-role only.';

-- One active (verified, non-revoked) link per wa_id.
CREATE UNIQUE INDEX idx_wa_link_active_waid
  ON whatsapp_links(wa_id) WHERE verified_at IS NOT NULL AND NOT revoked;
-- A pending code must be unique while unredeemed.
CREATE UNIQUE INDEX idx_wa_link_pending_code
  ON whatsapp_links(bind_code) WHERE bind_code IS NOT NULL AND verified_at IS NULL;
CREATE INDEX idx_wa_link_patient ON whatsapp_links(patient_id);

ALTER TABLE whatsapp_links ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies: deny-all for anon/authenticated.

CREATE TABLE wa_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wa_id TEXT NOT NULL UNIQUE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  active_flow TEXT NOT NULL DEFAULT 'idle',
  flow_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- The 24h customer-service window. NULL = closed.
  window_expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE wa_conversations IS
  'Durable per-thread WhatsApp conversation state. Service-role only.';

ALTER TABLE wa_conversations ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies: deny-all for anon/authenticated.
CREATE INDEX idx_wa_convo_patient ON wa_conversations(patient_id) WHERE patient_id IS NOT NULL;

CREATE TABLE wa_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Inbound dedupe key (the provider's message id). NULL for outbound.
  provider_message_id TEXT UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  wa_id TEXT NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  -- inbound: received|processing|done|failed ; outbound: sent|failed
  status TEXT NOT NULL CHECK (status IN ('received', 'processing', 'done', 'failed', 'sent')),
  payload JSONB,
  error TEXT
);

COMMENT ON TABLE wa_messages IS
  'WhatsApp inbound/outbound log + idempotency + audit. Service-role only.';

-- The sweeper reads inbound rows stuck in 'received'.
CREATE INDEX idx_wa_messages_inbound_status
  ON wa_messages(status, created_at) WHERE direction = 'inbound';
CREATE INDEX idx_wa_messages_waid ON wa_messages(wa_id, created_at DESC);

ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies: deny-all for anon/authenticated.
