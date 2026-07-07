-- ============================================================
-- VELONA — Add business contact fields to booking_settings
-- Used in confirmation/notification emails (address, phone, and
-- an optional public-facing contact email distinct from the
-- pro's account email in profiles).
-- ============================================================

ALTER TABLE public.booking_settings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.booking_settings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.booking_settings ADD COLUMN IF NOT EXISTS email_contact TEXT;
