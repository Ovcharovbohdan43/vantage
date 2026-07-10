-- Idempotent Stripe checkout fulfillment (webhook + success-page backup)

CREATE TABLE IF NOT EXISTS public.stripe_checkout_fulfillments (
  session_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pack TEXT NOT NULL CHECK (pack IN ('starter', 'founder', 'indie')),
  credits_added INT NOT NULL,
  source TEXT NOT NULL DEFAULT 'webhook',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_fulfillments_user_id
  ON public.stripe_checkout_fulfillments(user_id);
