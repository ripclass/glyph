-- 010_prescription_safety.sql
-- Stores the prescription safety check + the doctor's verdict on each warning,
-- captured at note-approval. Audit trail today; doctor-corrected ground truth
-- for KhaM-Med tomorrow. Shape (app-owned, not enforced here):
--   { status: 'ok'|'failed', warnings: [...], data_completeness, model, checked_at,
--     verdicts: [{ index, verdict, reason }] }
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS prescription_safety_check JSONB;

COMMENT ON COLUMN visits.prescription_safety_check IS
  'Prescription safety check result + per-warning doctor verdicts, recorded at note-approval.';
