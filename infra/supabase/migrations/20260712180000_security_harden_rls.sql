-- Harden PostgREST exposure: backend-only tables + protect billing columns on profiles.

-- 1) email_messages — previously no RLS (anyone with anon key could read all mail bodies)
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated ⇒ deny all via PostgREST.
-- API continues to use DATABASE_URL (bypasses RLS).
REVOKE ALL ON TABLE public.email_messages FROM anon, authenticated;
GRANT ALL ON TABLE public.email_messages TO service_role;

-- 2) stripe_checkout_fulfillments — previously no RLS
ALTER TABLE public.stripe_checkout_fulfillments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stripe_checkout_fulfillments FROM anon, authenticated;
GRANT ALL ON TABLE public.stripe_checkout_fulfillments TO service_role;

-- 3) Catalog / analytics — belt-and-suspenders revoke (already RLS-on with no policies)
DO $$
BEGIN
  IF to_regclass('public.library_article_events') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.library_article_events FROM anon, authenticated;
    GRANT ALL ON TABLE public.library_article_events TO service_role;
  END IF;
  IF to_regclass('public.review_products') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.review_products FROM anon, authenticated;
    GRANT ALL ON TABLE public.review_products TO service_role;
  END IF;
  IF to_regclass('public.catalog_reviews') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.catalog_reviews FROM anon, authenticated;
    GRANT ALL ON TABLE public.catalog_reviews TO service_role;
  END IF;
END $$;

-- 4) Block credit/billing self-escalation via profiles UPDATE through PostgREST
CREATE OR REPLACE FUNCTION public.protect_profile_billing_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role / postgres (API via DATABASE_URL) may change billing fields;
  -- authenticated JWT path via PostgREST must not.
  IF COALESCE(auth.role(), '') IN ('authenticated', 'anon') THEN
    NEW.starter_credits := OLD.starter_credits;
    NEW.founder_credits := OLD.founder_credits;
    NEW.indie_credits := OLD.indie_credits;
    NEW.free_preview_used := OLD.free_preview_used;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.subscription_status := OLD.subscription_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_billing ON public.profiles;
CREATE TRIGGER trg_protect_profile_billing
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_billing_columns();

-- 5) research_jobs — clients must not mutate job state (API owns writes)
DROP POLICY IF EXISTS "Users insert own research jobs" ON public.research_jobs;
DROP POLICY IF EXISTS "Users update own research jobs" ON public.research_jobs;
