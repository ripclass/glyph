-- ============================================================
-- GLYPH — Document storage (migration 004)
--
-- The "plastic bag" feature's missing infrastructure: intake captures
-- photos of prior prescriptions and lab reports, but no bucket ever
-- existed — camera.ts uploaded to 'documents' and extract-document
-- downloaded from it, both pointing at nothing.
--
-- Decisions:
--   * PRIVATE bucket. These are medical documents (PDPO sensitive
--     category) — no public URLs, ever. The app displays the local
--     capture; the edge function downloads via service role.
--   * Path convention: {patient_id}/{visit_id}/{type}-{doc_id}.jpg
--     The first folder is the patient UUID — storage policies derive
--     clinic scope from it, mirroring the doctor-scoped-by-clinic RLS
--     philosophy of migration 001.
--   * Objects are immutable: insert + read + delete only (retake =
--     delete + new upload). No UPDATE policy.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10 MB: ample for a 1080p JPEG, blocks accidental video uploads
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Storage RLS — clinic-scoped via the patient-id path segment.
-- Comparison is done in text space (p.id::text) so a malformed
-- path can never raise a cast error; it simply matches nothing
-- and the operation is denied. Fail closed.
-- ============================================================

CREATE POLICY "documents_insert_own_clinic" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text
      FROM patients p
      JOIN doctors d ON d.clinic_id = p.clinic_id
      WHERE d.id = auth.uid()
    )
  );

CREATE POLICY "documents_read_own_clinic" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text
      FROM patients p
      JOIN doctors d ON d.clinic_id = p.clinic_id
      WHERE d.id = auth.uid()
    )
  );

CREATE POLICY "documents_delete_own_clinic" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text
      FROM patients p
      JOIN doctors d ON d.clinic_id = p.clinic_id
      WHERE d.id = auth.uid()
    )
  );
