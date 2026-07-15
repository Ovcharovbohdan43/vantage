-- Public weekly ideas selected from evidence-backed Research Library reports.

CREATE TABLE IF NOT EXISTS public.idea_of_week_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,
  week_slug VARCHAR(16) NOT NULL UNIQUE,
  article_id UUID NOT NULL REFERENCES public.library_articles(id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'failed')),
  headline TEXT NOT NULL,
  dek TEXT NOT NULL,
  why_this_week TEXT NOT NULL,
  trend_query TEXT NOT NULL,
  trend_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  selection_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  selection_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idea_of_week_status_week_idx
  ON public.idea_of_week_selections (status, week_start DESC);
CREATE INDEX IF NOT EXISTS idea_of_week_article_idx
  ON public.idea_of_week_selections (article_id);

ALTER TABLE public.idea_of_week_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "idea_of_week_public_read"
  ON public.idea_of_week_selections
  FOR SELECT
  USING (status = 'published');
