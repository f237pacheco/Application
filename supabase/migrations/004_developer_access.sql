-- ============================================================
-- VELONA — Developer Access Bypass
-- Grants f237pacheco@gmail.com a permanent free Enterprise plan
-- ============================================================

-- 0. Ensure profiles has plan_key column (denormalized for fast reads)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_key TEXT;

-- 1. Handle existing user (if already signed up)
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'f237pacheco@gmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Upsert profile with enterprise plan
    INSERT INTO public.profiles (id, email, first_name, account_type, plan_key)
    VALUES (v_user_id, 'f237pacheco@gmail.com', 'Dev', 'individual', 'enterprise')
    ON CONFLICT (id) DO UPDATE
      SET plan_key   = 'enterprise',
          updated_at = NOW();

    -- Upsert subscription record
    INSERT INTO public.subscriptions (
      user_id,
      plan_key,
      status,
      current_period_end,
      stripe_subscription_id
    )
    VALUES (
      v_user_id,
      'enterprise',
      'active',
      '2099-12-31 23:59:59+00',
      'dev_bypass_enterprise'
    )
    ON CONFLICT (user_id) DO UPDATE
      SET plan_key               = 'enterprise',
          status                 = 'active',
          current_period_end     = '2099-12-31 23:59:59+00',
          stripe_subscription_id = 'dev_bypass_enterprise',
          updated_at             = NOW();
  END IF;
END $$;

-- 2. Trigger so future sign-ups automatically get enterprise
CREATE OR REPLACE FUNCTION public.auto_grant_developer_enterprise()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.email = 'f237pacheco@gmail.com' THEN
    NEW.plan_key := 'enterprise';

    INSERT INTO public.subscriptions (
      user_id,
      plan_key,
      status,
      current_period_end,
      stripe_subscription_id
    )
    VALUES (
      NEW.id,
      'enterprise',
      'active',
      '2099-12-31 23:59:59+00',
      'dev_bypass_enterprise'
    )
    ON CONFLICT (user_id) DO UPDATE
      SET plan_key               = 'enterprise',
          status                 = 'active',
          current_period_end     = '2099-12-31 23:59:59+00',
          stripe_subscription_id = 'dev_bypass_enterprise',
          updated_at             = NOW();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_developer_enterprise ON public.profiles;
CREATE TRIGGER trg_developer_enterprise
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_grant_developer_enterprise();
