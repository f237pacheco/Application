-- ============================================================
-- VELONA — Fix "record new has no field updated_at" on booking_settings
-- The booking_settings_updated_at trigger calls update_updated_at(),
-- which does NEW.updated_at = NOW() on every UPDATE. If booking_settings
-- was created by an earlier/partial run (CREATE TABLE IF NOT EXISTS
-- silently preserving an incomplete pre-existing table — the same class
-- of drift fixed for the UNIQUE(user_id) constraint in migration 010),
-- the updated_at column can be missing even though the trigger is
-- attached, and every UPDATE (including the app's upsert) then fails
-- with exactly that error.
-- ============================================================

-- 1. Ensure booking_settings has the updated_at column the trigger needs.
ALTER TABLE public.booking_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Defensive cleanup: none of availability/bookings/blocked_dates were ever
--    designed to have updated_at. If an earlier/partial run attached the
--    update_updated_at() trigger to any of them too, remove it so this
--    class of error can't recur there either.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT t.tgname, c.relname AS table_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE n.nspname = 'public'
      AND c.relname IN ('availability', 'bookings', 'blocked_dates')
      AND p.proname = 'update_updated_at'
      AND NOT t.tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', rec.tgname, rec.table_name);
  END LOOP;
END $$;

-- 3. Re-affirm the trigger is correctly attached to booking_settings only.
DROP TRIGGER IF EXISTS booking_settings_updated_at ON public.booking_settings;
CREATE TRIGGER booking_settings_updated_at
  BEFORE UPDATE ON public.booking_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
