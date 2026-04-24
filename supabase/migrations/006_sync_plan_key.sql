-- ============================================================
-- VELONA — Sync profiles.plan_key from active subscriptions
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Update profiles.plan_key for all users with an active subscription
UPDATE public.profiles p
SET
  plan_key   = s.plan_key,
  updated_at = NOW()
FROM public.subscriptions s
WHERE s.user_id = p.id
  AND s.status IN ('active', 'trialing')
  AND (p.plan_key IS NULL OR p.plan_key <> s.plan_key);

-- 2. Confirm the update for f237pacheco@gmail.com
SELECT p.email, p.plan_key AS profile_plan_key, s.plan_key AS subscription_plan_key, s.status
FROM public.profiles p
JOIN public.subscriptions s ON s.user_id = p.id
WHERE p.email = 'f237pacheco@gmail.com';
