-- ============================================================
-- VELONA — Client self-service: cancel / reschedule own booking
-- via a secure per-booking token (sent in the confirmation email,
-- never guessable, never shared between bookings).
-- ============================================================

-- Nullable: existing bookings created before this migration simply
-- have no manage link (their confirmation email was already sent
-- without one). Every booking created from now on gets one at
-- insert time (see /api/bookings/create).
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS manage_token TEXT;

-- Every non-null token must be unique so a token can only ever
-- resolve to exactly one booking.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_manage_token
  ON public.bookings (manage_token)
  WHERE manage_token IS NOT NULL;

-- No RLS policy is added for anon/public access to public.bookings:
-- every token-based lookup, cancel, and reschedule goes through the
-- /api/bookings/manage/* server routes using the service role key,
-- which validates the token in application code before touching any
-- row — exactly the same pattern already used by /api/bookings/create
-- and /api/bookings/calendar. This keeps the table itself just as
-- locked down as it is today.
