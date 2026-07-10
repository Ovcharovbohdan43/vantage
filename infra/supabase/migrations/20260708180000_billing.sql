-- Phase 7: Stripe billing fields on profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON public.profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- subscription_status: free | pro | past_due | canceled
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status IN ('free', 'pro', 'past_due', 'canceled'));
