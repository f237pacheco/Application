-- Migration 008: Add billing column to subscriptions
-- The subscriptions table already exists from 001_initial_schema.sql.
-- We add the 'billing' column to track monthly vs annual cycle.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing IN ('monthly', 'annual'));

-- Index for quick lookups by stripe_customer_id
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx
  ON public.subscriptions (stripe_customer_id);

-- Allow service role (webhook) to upsert subscriptions
CREATE POLICY IF NOT EXISTS "Service role can manage subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);
