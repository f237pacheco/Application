-- ============================================================
-- VELONA — Activate Enterprise for f237pacheco@gmail.com
-- Run this directly in the Supabase SQL Editor
-- ============================================================

INSERT INTO subscriptions (user_id, plan_key, status, current_period_end)
SELECT id, 'enterprise', 'active', '2099-12-31'
FROM profiles
WHERE email = 'f237pacheco@gmail.com'
ON CONFLICT (user_id) DO UPDATE
  SET plan_key           = 'enterprise',
      status             = 'active',
      current_period_end = '2099-12-31';
