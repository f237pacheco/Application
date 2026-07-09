-- ============================================================
-- VELONA — Remove insecure public-read policies on booking tables
-- ============================================================
-- Policies like `USING (true)` on booking_settings/availability/blocked_dates
-- let ANY client (using the anon key directly, e.g. from a browser console)
-- read every pro's data across the whole app — not just the one row needed
-- for a given /rdv/[slug] page. The public booking flow never needed this:
-- all public reads (/api/bookings/info, /availability, /calendar,
-- /check-slug) already go through the server-side service-role client,
-- which bypasses RLS entirely. Client-side reads must stay owner-only.
-- ============================================================

DROP POLICY IF EXISTS "public_read_settings" ON public.booking_settings;
DROP POLICY IF EXISTS "public_read_availability" ON public.availability;
DROP POLICY IF EXISTS "public_read_blocked" ON public.blocked_dates;
DROP POLICY IF EXISTS "public_read_blocked_dates" ON public.blocked_dates;
DROP POLICY IF EXISTS "public_read_bookings" ON public.bookings;
