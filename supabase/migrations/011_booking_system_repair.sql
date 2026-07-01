-- ============================================================
-- VELONA — Booking system: full idempotent setup/repair script
-- Safe to run on a fresh database OR one left in an inconsistent
-- state by earlier partial runs. Re-running this script any
-- number of times must never error. This is the single
-- authoritative script to paste into the Supabase SQL Editor to
-- bring booking_settings/availability/bookings/blocked_dates back
-- into a consistent state — superseding any earlier ad hoc SQL.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 1. TABLES — created only if missing. If a table already
--    exists (even partially/incorrectly), this is a no-op; every
--    constraint/policy it needs is guaranteed separately below.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.booking_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  slot_duration INTEGER NOT NULL DEFAULT 30,
  buffer_time INTEGER NOT NULL DEFAULT 0,
  advance_booking_days INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  service_note TEXT,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blocked_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. FOREIGN KEYS — every user_id must reference public.profiles(id)
--    (the convention used everywhere else in this app: see
--    001_initial_schema.sql and 003_partner_program.sql), never
--    auth.users(id) directly. Fixes or adds the FK on each table.
-- ------------------------------------------------------------

DO $$
DECLARE
  tbl TEXT;
  fkey_name TEXT;
  target TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['booking_settings', 'availability', 'bookings', 'blocked_dates']
  LOOP
    SELECT tc.constraint_name INTO fkey_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = tbl
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'user_id'
    LIMIT 1;

    IF fkey_name IS NOT NULL THEN
      SELECT ccu.table_schema || '.' || ccu.table_name INTO target
      FROM information_schema.constraint_column_usage ccu
      WHERE ccu.constraint_name = fkey_name
      LIMIT 1;

      IF target IS DISTINCT FROM 'public.profiles' THEN
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', tbl, fkey_name);
        fkey_name := NULL;
      END IF;
    END IF;

    IF fkey_name IS NULL THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE',
        tbl, tbl || '_user_id_fkey'
      );
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 3. UNIQUE / CHECK CONSTRAINTS — added only if not already
--    present (checked by column set, not by name, so a
--    differently-named pre-existing constraint is still detected).
-- ------------------------------------------------------------

-- booking_settings.user_id — REQUIRED by the app's upsert(..., { onConflict: 'user_id' })
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public' AND tc.table_name = 'booking_settings'
      AND tc.constraint_type = 'UNIQUE' AND ccu.column_name = 'user_id'
  ) THEN
    ALTER TABLE public.booking_settings ADD CONSTRAINT booking_settings_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- booking_settings.slug — required for the public /rdv/[slug] lookup to be unambiguous
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public' AND tc.table_name = 'booking_settings'
      AND tc.constraint_type = 'UNIQUE' AND ccu.column_name = 'slug'
  ) THEN
    ALTER TABLE public.booking_settings ADD CONSTRAINT booking_settings_slug_key UNIQUE (slug);
  END IF;
END $$;

-- booking_settings.slug format (lowercase letters/digits/hyphens only)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_settings_slug_format') THEN
    ALTER TABLE public.booking_settings
      ADD CONSTRAINT booking_settings_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
  END IF;
END $$;

-- availability.day_of_week range (0=Sunday..6=Saturday)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'availability_day_of_week_check') THEN
    ALTER TABLE public.availability
      ADD CONSTRAINT availability_day_of_week_check CHECK (day_of_week BETWEEN 0 AND 6);
  END IF;
END $$;

-- availability time ordering
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'availability_time_order') THEN
    ALTER TABLE public.availability
      ADD CONSTRAINT availability_time_order CHECK (end_time > start_time);
  END IF;
END $$;

-- bookings.status allowed values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_status_check') THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_status_check CHECK (status IN ('confirmed', 'cancelled', 'completed'));
  END IF;
END $$;

-- blocked_dates (user_id, date) — one row per blocked day per pro
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM (
      SELECT tc.constraint_name,
             array_agg(kcu.column_name::text ORDER BY kcu.column_name) AS cols
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public' AND tc.table_name = 'blocked_dates' AND tc.constraint_type = 'UNIQUE'
      GROUP BY tc.constraint_name
    ) s
    WHERE cols = ARRAY['date', 'user_id']
  ) THEN
    ALTER TABLE public.blocked_dates ADD CONSTRAINT blocked_dates_user_id_date_key UNIQUE (user_id, date);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4. ROW LEVEL SECURITY — idempotent to enable
-- ------------------------------------------------------------

ALTER TABLE public.booking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 5. POLICIES — dropped first so this is safe to re-run
--    regardless of what already exists.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Owner can view own booking settings" ON public.booking_settings;
DROP POLICY IF EXISTS "Owner can insert own booking settings" ON public.booking_settings;
DROP POLICY IF EXISTS "Owner can update own booking settings" ON public.booking_settings;
DROP POLICY IF EXISTS "Owner can delete own booking settings" ON public.booking_settings;

CREATE POLICY "Owner can view own booking settings" ON public.booking_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert own booking settings" ON public.booking_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update own booking settings" ON public.booking_settings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete own booking settings" ON public.booking_settings
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner can view own availability" ON public.availability;
DROP POLICY IF EXISTS "Owner can insert own availability" ON public.availability;
DROP POLICY IF EXISTS "Owner can update own availability" ON public.availability;
DROP POLICY IF EXISTS "Owner can delete own availability" ON public.availability;

CREATE POLICY "Owner can view own availability" ON public.availability
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert own availability" ON public.availability
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update own availability" ON public.availability
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete own availability" ON public.availability
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Owner can update own bookings" ON public.bookings;

CREATE POLICY "Owner can view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can update own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = user_id);

-- Public booking creation happens server-side via the service role key
-- (see /api/bookings/create) — no client-side INSERT policy is needed.

DROP POLICY IF EXISTS "Owner can view own blocked dates" ON public.blocked_dates;
DROP POLICY IF EXISTS "Owner can insert own blocked dates" ON public.blocked_dates;
DROP POLICY IF EXISTS "Owner can delete own blocked dates" ON public.blocked_dates;

CREATE POLICY "Owner can view own blocked dates" ON public.blocked_dates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert own blocked dates" ON public.blocked_dates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can delete own blocked dates" ON public.blocked_dates
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6. INDEXES
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_booking_settings_slug ON public.booking_settings (slug);
CREATE INDEX IF NOT EXISTS idx_availability_user_day ON public.availability (user_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON public.bookings (user_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_user_date ON public.blocked_dates (user_id, date);

-- Prevent double-booking the same slot (a cancelled booking frees the slot back up)
DROP INDEX IF EXISTS idx_bookings_unique_slot;
CREATE UNIQUE INDEX idx_bookings_unique_slot ON public.bookings (user_id, booking_date, booking_time)
  WHERE status <> 'cancelled';

-- ------------------------------------------------------------
-- 7. updated_at TRIGGER on booking_settings
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_settings_updated_at ON public.booking_settings;
CREATE TRIGGER booking_settings_updated_at
  BEFORE UPDATE ON public.booking_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
