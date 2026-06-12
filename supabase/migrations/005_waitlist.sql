-- ============================================================
-- GLYPH — Waitlist signups (migration 005)
--
-- The public landing page collects pilot-waitlist signups. This is
-- marketing data, not clinical data — but it still gets the same
-- discipline:
--
--   * NO RLS policies at all: with RLS enabled and zero policies,
--     anon/authenticated roles can neither read nor write. Only the
--     service-role client (the Next.js /api/waitlist route) touches
--     this table. The public form never speaks to PostgREST.
--   * Phone is the identity (BD reality — see CLAUDE.md §9), stored
--     in canonical 01XXXXXXXXX form, unique. Re-signups are upsert-
--     silent, not errors: a person joining twice stays joined once.
--   * Append-mostly: no UPDATE/DELETE expected from the app; status
--     ('pending' → 'invited'/'onboarded') is for the founder working
--     the list from Studio.
-- ============================================================

CREATE TABLE waitlist_signups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE
    CHECK (phone ~ '^01[3-9][0-9]{8}$'),
  role TEXT NOT NULL DEFAULT 'doctor'
    CHECK (role IN ('doctor', 'clinic', 'pharmacy', 'other')),

  district TEXT,
  bmdc_reg_no TEXT,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'invited', 'onboarded', 'declined')),
  source TEXT NOT NULL DEFAULT 'landing'
);

COMMENT ON TABLE waitlist_signups IS
  'Pilot waitlist from the public landing page. Service-role access only.';

ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies: deny-all for anon/authenticated.

CREATE INDEX idx_waitlist_created ON waitlist_signups(created_at DESC);
