-- ============================================================
-- VELONA — Booking System (RDV)
-- ============================================================

-- ============================================================
-- BOOKING SETTINGS (one row per pro)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.booking_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  slot_duration INTEGER NOT NULL DEFAULT 30,
  buffer_time INTEGER NOT NULL DEFAULT 0,
  advance_booking_days INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

ALTER TABLE public.booking_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can view own booking settings" ON public.booking_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert own booking settings" ON public.booking_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update own booking settings" ON public.booking_settings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete own booking settings" ON public.booking_settings
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_booking_settings_slug ON public.booking_settings (slug);

CREATE TRIGGER booking_settings_updated_at
  BEFORE UPDATE ON public.booking_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AVAILABILITY (recurring weekly time ranges)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT availability_time_order CHECK (end_time > start_time)
);

ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can view own availability" ON public.availability
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert own availability" ON public.availability
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update own availability" ON public.availability
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete own availability" ON public.availability
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_availability_user_day ON public.availability (user_id, day_of_week);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  service_note TEXT,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can update own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = user_id);

-- Public booking creation happens server-side via the service role key
-- (see /api/bookings/create) — no client-side INSERT policy is needed.

CREATE INDEX idx_bookings_user_date ON public.bookings (user_id, booking_date);

-- Prevent double-booking the same slot (cancelled bookings free the slot back up)
CREATE UNIQUE INDEX idx_bookings_unique_slot ON public.bookings (user_id, booking_date, booking_time)
  WHERE status <> 'cancelled';

-- ============================================================
-- BLOCKED DATES (days off)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.blocked_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can view own blocked dates" ON public.blocked_dates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert own blocked dates" ON public.blocked_dates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can delete own blocked dates" ON public.blocked_dates
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_blocked_dates_user_date ON public.blocked_dates (user_id, date);
