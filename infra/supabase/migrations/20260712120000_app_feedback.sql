-- App feedback from users after research (one submitted review per account)

CREATE TABLE IF NOT EXISTS public.app_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_feedback_created_at_idx
  ON public.app_feedback (created_at DESC);

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert/read their own feedback via API (service uses JWT user id).
-- Direct anon access not required; API uses service DB connection.
DROP POLICY IF EXISTS app_feedback_owner_select ON public.app_feedback;
CREATE POLICY app_feedback_owner_select ON public.app_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS app_feedback_owner_insert ON public.app_feedback;
CREATE POLICY app_feedback_owner_insert ON public.app_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
