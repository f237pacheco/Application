-- ============================================================
-- VELONA — Account page: bio text + photo gallery
-- ============================================================

-- ------------------------------------------------------------
-- Bio — free-form text on the user's own profile, capped at 1000
-- characters (also enforced client-side, this is the backstop).
-- ------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_bio_length;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_bio_length CHECK (bio IS NULL OR char_length(bio) <= 1000);

-- ------------------------------------------------------------
-- Gallery — up to 10 photos per user, ordered by `position`.
-- `path` is the storage object path ({user_id}/{filename}), kept
-- separately from `url` (the public URL) so deletion never has to
-- reverse-engineer a storage path out of a URL.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_photos_user_id ON public.account_photos(user_id);

ALTER TABLE public.account_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to account photos" ON public.account_photos;
DROP POLICY IF EXISTS "Owners can insert their account photos" ON public.account_photos;
DROP POLICY IF EXISTS "Owners can update their account photos" ON public.account_photos;
DROP POLICY IF EXISTS "Owners can delete their account photos" ON public.account_photos;

CREATE POLICY "Public read access to account photos" ON public.account_photos
  FOR SELECT USING (true);

CREATE POLICY "Owners can insert their account photos" ON public.account_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update their account photos" ON public.account_photos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete their account photos" ON public.account_photos
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Storage bucket for gallery photos — public read, write restricted to
-- the owner's own folder ({user_id}/...), same pattern as booking-logos.
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('account-gallery', 'account-gallery', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Public read access to account gallery" ON storage.objects;
DROP POLICY IF EXISTS "Owners can upload to their account gallery" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update their account gallery" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete their account gallery" ON storage.objects;

CREATE POLICY "Public read access to account gallery" ON storage.objects
  FOR SELECT USING (bucket_id = 'account-gallery');

CREATE POLICY "Owners can upload to their account gallery" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'account-gallery' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can update their account gallery" ON storage.objects
  FOR UPDATE USING (bucket_id = 'account-gallery' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can delete their account gallery" ON storage.objects
  FOR DELETE USING (bucket_id = 'account-gallery' AND (storage.foldername(name))[1] = auth.uid()::text);
