-- ============================================================
-- VELONA — Business logo + practical-details fields for booking_settings
-- ============================================================

ALTER TABLE public.booking_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.booking_settings ADD COLUMN IF NOT EXISTS services TEXT;
ALTER TABLE public.booking_settings ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE public.booking_settings ADD COLUMN IF NOT EXISTS payment_methods TEXT;

-- ------------------------------------------------------------
-- Storage bucket for business logos — public read (shown on the public
-- /rdv/[slug] page), write restricted to the owner's own folder
-- ({user_id}/...), enforced via storage.objects RLS.
-- ------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-logos', 'booking-logos', true)
ON CONFLICT (id) DO NOTHING;

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
