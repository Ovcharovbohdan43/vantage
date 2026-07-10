-- Phase 2: competitors discovered from G2 / Capterra

CREATE TABLE IF NOT EXISTS public.competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  category TEXT,
  rating DOUBLE PRECISION,
  reviews_count INTEGER,
  source TEXT NOT NULL CHECK (source IN ('g2', 'capterra')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT competitors_project_url_unique UNIQUE (project_id, url)
);

CREATE INDEX IF NOT EXISTS idx_competitors_project_id ON public.competitors(project_id);

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own competitors"
  ON public.competitors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = competitors.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert own competitors"
  ON public.competitors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = competitors.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users delete own competitors"
  ON public.competitors FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = competitors.project_id AND p.user_id = auth.uid()
    )
  );
