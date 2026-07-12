-- New users get 2 starter credits at signup + welcome email on first API touch.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;

-- Existing users: mark welcome as already handled (do not email / do not top-up).
UPDATE public.profiles
SET welcome_email_sent_at = COALESCE(welcome_email_sent_at, now())
WHERE welcome_email_sent_at IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN starter_credits SET DEFAULT 2;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, starter_credits, welcome_email_sent_at)
  VALUES (NEW.id, NEW.email, 2, NULL)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = NOW();
  RETURN NEW;
END;
$$;
