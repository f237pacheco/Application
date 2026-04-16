-- ============================================================
-- VELONA — Partner Programme extended tables
-- ============================================================

-- Track which promo code was used when subscribing
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS promo_code_used TEXT;

-- Table recording each promo code usage
CREATE TABLE IF NOT EXISTS public.promo_code_uses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscriber_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  promo_code TEXT NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.promo_code_uses ENABLE ROW LEVEL SECURITY;

-- Referrers can see their own earned uses
CREATE POLICY "Users can view own promo uses" ON public.promo_code_uses
  FOR SELECT USING (auth.uid() = referrer_user_id);

-- Service role can insert (backend only)
CREATE POLICY "Service role can insert promo uses" ON public.promo_code_uses
  FOR INSERT WITH CHECK (true);

-- Index for counting uses per referrer
CREATE INDEX idx_promo_code_uses_referrer ON public.promo_code_uses (referrer_user_id);

-- Admin can update partner_submissions (for approval/rejection)
CREATE POLICY "Service role can update partner submissions" ON public.partner_submissions
  FOR UPDATE USING (true);
