-- ============================================================
-- VELONA — Re-assert booking-logos bucket config + policies
-- Unlike migration 014 (which only created the bucket if missing),
-- this actively FIXES the bucket's config if it already exists with a
-- restrictive file_size_limit or allowed_mime_types — a very plausible
-- silent cause of logo uploads failing with no clear error surfaced
-- client-side until now.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('booking-logos', 'booking-logos', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Public read access to booking logos" ON storage.objects;
DROP POLICY IF EXISTS "Owners can upload their booking logo" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update their booking logo" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete their booking logo" ON storage.objects;

CREATE POLICY "Public read access to booking logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'booking-logos');

CREATE POLICY "Owners can upload their booking logo" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'booking-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can update their booking logo" ON storage.objects
  FOR UPDATE USING (bucket_id = 'booking-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can delete their booking logo" ON storage.objects
  FOR DELETE USING (bucket_id = 'booking-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
