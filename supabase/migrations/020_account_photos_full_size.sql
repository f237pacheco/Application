-- ============================================================
-- VELONA — Store a full-resolution, uncropped copy of each gallery
-- photo alongside the existing 640x640 square thumbnail.
--
-- The thumbnail (`url`/`path`) stays square-cropped for the grid, but
-- was also being reused as the lightbox image — meaning the full-screen
-- viewer only ever showed a cropped, low-res version of every photo.
-- `full_url`/`full_path` hold an uncropped, higher-resolution copy
-- (long edge capped at ~1920px) used by the lightbox instead.
--
-- Nullable: existing rows uploaded before this migration have no full
-- version on disk to backfill, so the app falls back to `url` for them.
-- ============================================================

ALTER TABLE public.account_photos ADD COLUMN IF NOT EXISTS full_url TEXT;
ALTER TABLE public.account_photos ADD COLUMN IF NOT EXISTS full_path TEXT;
