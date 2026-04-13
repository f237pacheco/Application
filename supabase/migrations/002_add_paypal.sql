-- Add PayPal subscription ID to subscriptions table
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT UNIQUE;

-- Index for PayPal lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal
  ON public.subscriptions (paypal_subscription_id)
  WHERE paypal_subscription_id IS NOT NULL;
