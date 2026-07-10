-- Phase: Research Library — public anonymized market research articles

CREATE TABLE IF NOT EXISTS public.library_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'failed', 'skipped')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  executive_summary TEXT NOT NULL DEFAULT '',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  seo JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviews_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  market_saturation TEXT NOT NULL DEFAULT 'MEDIUM',
  competition_level TEXT NOT NULL DEFAULT 'medium',
  products_count INTEGER NOT NULL DEFAULT 0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  total_read_seconds INTEGER NOT NULL DEFAULT 0,
  cta_signup_clicks INTEGER NOT NULL DEFAULT 0,
  cta_research_clicks INTEGER NOT NULL DEFAULT 0,
  cta_purchase_clicks INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  generation_error JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS library_articles_status_published_idx
  ON public.library_articles (status, published_at DESC);

CREATE INDEX IF NOT EXISTS library_articles_category_idx
  ON public.library_articles (category);

CREATE INDEX IF NOT EXISTS library_articles_reviews_count_idx
  ON public.library_articles (reviews_count DESC);

CREATE TABLE IF NOT EXISTS public.library_article_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.library_articles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('view', 'read_time', 'cta_signup', 'cta_research', 'cta_purchase')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS library_article_events_article_idx
  ON public.library_article_events (article_id, created_at DESC);

-- Public read access for published articles (anon + authenticated)
ALTER TABLE public.library_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY library_articles_public_read ON public.library_articles
  FOR SELECT
  USING (status = 'published');

-- Events: insert-only from service; no public read needed
ALTER TABLE public.library_article_events ENABLE ROW LEVEL SECURITY;
