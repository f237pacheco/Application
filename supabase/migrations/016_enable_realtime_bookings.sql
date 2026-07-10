-- ============================================================
-- VELONA — Enable Realtime on bookings, so the appointments
-- dashboard picks up new/updated reservations live without a
-- manual refresh.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
    END IF;
  ELSE
    RAISE NOTICE 'supabase_realtime publication not found — skipping (Realtime not provisioned on this project)';
  END IF;
END $$;
