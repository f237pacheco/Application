-- ============================================================
-- VELONA — Fix missing UNIQUE(user_id) on booking_settings
-- ============================================================
-- The app's booking_settings save does:
--   supabase.from('booking_settings').upsert({...}, { onConflict: 'user_id' })
-- which compiles to `INSERT ... ON CONFLICT (user_id) DO UPDATE ...` and
-- requires a UNIQUE (or PRIMARY KEY) constraint on exactly that column.
-- If booking_settings was created by an earlier/partial run of migration 009
-- (e.g. `CREATE TABLE IF NOT EXISTS` silently skipping because the table
-- already existed), that constraint may be missing even though the rest of
-- the table looks correct. This migration adds it back, idempotently.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'booking_settings'
      AND tc.constraint_type = 'UNIQUE'
      AND ccu.column_name = 'user_id'
  ) THEN
    ALTER TABLE public.booking_settings
      ADD CONSTRAINT booking_settings_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- ============================================================
-- Sanity check: availability and blocked_dates don't use upsert()/ON
-- CONFLICT in the app (they use delete-then-insert), so no matching
-- constraint is required there. blocked_dates already has UNIQUE
-- (user_id, date) from migration 009 for data integrity, but it isn't
-- relied upon by an ON CONFLICT clause.
-- ============================================================
