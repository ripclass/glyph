-- ============================================================
-- GLYPH — Proactive scheduled messages (migration 009)
--
-- Leg D of the WhatsApp bridge. A durable queue of business-initiated
-- WhatsApp template sends (follow-ups, appointment reminders, doctor nudges),
-- drained by the whatsapp-scheduler cron. RLS deny-all (service-role only),
-- like the rest of the bridge. Mirrors Juugadu's reminder workflow.
-- ============================================================

CREATE TABLE scheduled_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  kind TEXT NOT NULL CHECK (kind IN ('followup', 'appointment_reminder', 'doctor_nudge')),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
  -- Resolved recipient (E.164 no '+'), captured at enqueue time.
  to_wa_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_lang TEXT NOT NULL DEFAULT 'bn',
  -- Ordered template body params ({{1}},{{2}},...).
  template_vars JSONB NOT NULL DEFAULT '[]'::jsonb,
  fire_at TIMESTAMPTZ NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'running', 'completed', 'failed')),
  result JSONB,
  attempts INT NOT NULL DEFAULT 0
);

COMMENT ON TABLE scheduled_messages IS
  'Proactive WhatsApp template send queue. Service-role only (the scheduler cron).';

-- One scheduled message per (visit, kind) — the dedup that lets enqueue be
-- idempotent (insert ... on conflict do nothing).
CREATE UNIQUE INDEX idx_sched_visit_kind ON scheduled_messages(visit_id, kind) WHERE visit_id IS NOT NULL;
-- The drain hot path.
CREATE INDEX idx_sched_due ON scheduled_messages(fire_at) WHERE state = 'pending';

ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies: deny-all for anon/authenticated.

-- The doctor sets this on note approval; seeds an appointment_reminder.
ALTER TABLE visits ADD COLUMN next_appointment_at TIMESTAMPTZ;
