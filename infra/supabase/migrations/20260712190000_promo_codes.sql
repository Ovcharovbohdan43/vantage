-- Promo codes for signup / acquisition campaigns

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  credits INT NOT NULL CHECK (credits > 0),
  max_redemptions INT,
  redemption_count INT NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT promo_codes_code_unique UNIQUE (code),
  CONSTRAINT promo_codes_max_redemptions_check
    CHECK (max_redemptions IS NULL OR max_redemptions > 0)
);

-- Normalize codes to uppercase on insert/update
CREATE OR REPLACE FUNCTION public.normalize_promo_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.code := upper(trim(NEW.code));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_promo_code ON public.promo_codes;
CREATE TRIGGER trg_normalize_promo_code
  BEFORE INSERT OR UPDATE OF code ON public.promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_promo_code();

CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  credits_granted INT NOT NULL CHECK (credits_granted > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT promo_code_redemptions_user_code_unique UNIQUE (promo_code_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user_id
  ON public.promo_code_redemptions(user_id);

-- Backend-only via DATABASE_URL / service_role
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.promo_codes FROM anon, authenticated;
REVOKE ALL ON TABLE public.promo_code_redemptions FROM anon, authenticated;
GRANT ALL ON TABLE public.promo_codes TO service_role;
GRANT ALL ON TABLE public.promo_code_redemptions TO service_role;

-- First working acquisition code: TRYIT → 2 credits
INSERT INTO public.promo_codes (code, credits, max_redemptions, active)
VALUES ('TRYIT', 2, NULL, true)
ON CONFLICT (code) DO UPDATE
SET
  credits = EXCLUDED.credits,
  active = true,
  max_redemptions = NULL;
