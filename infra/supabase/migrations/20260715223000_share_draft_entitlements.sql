-- One paid entitlement buys one successfully generated social-share draft.
CREATE TABLE IF NOT EXISTS public.share_draft_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_kind TEXT NOT NULL
    CHECK (source_kind IN ('report', 'library', 'idea_of_week')),
  source_ref TEXT NOT NULL,
  return_path TEXT NOT NULL,
  grant_type TEXT NOT NULL DEFAULT 'stripe'
    CHECK (grant_type IN ('stripe', 'allowlist')),
  stripe_checkout_session_id TEXT UNIQUE,
  amount_cents INT NOT NULL DEFAULT 50 CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'not_required')),
  status TEXT NOT NULL DEFAULT 'ready'
    CHECK (status IN ('ready', 'generating', 'consumed')),
  generation_attempts INT NOT NULL DEFAULT 0,
  generation_started_at TIMESTAMPTZ,
  draft_title TEXT,
  draft_text TEXT,
  last_generation_error JSONB,
  paid_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_draft_entitlements_user
  ON public.share_draft_entitlements (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_share_draft_entitlements_source
  ON public.share_draft_entitlements (source_kind, source_ref);

ALTER TABLE public.share_draft_entitlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.share_draft_entitlements FROM anon, authenticated;
GRANT ALL ON TABLE public.share_draft_entitlements TO service_role;
