-- Safe staged regeneration for public Research Library articles.
-- Live article identity, URLs, publication dates, and analytics remain untouched
-- until a validated revision is activated.

CREATE TABLE IF NOT EXISTS public.library_article_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.library_articles(id) ON DELETE CASCADE,
  generation_version VARCHAR(64) NOT NULL,
  source_fingerprint VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'staged'
    CHECK (status IN ('staged', 'active', 'superseded', 'failed')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  executive_summary TEXT NOT NULL DEFAULT '',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  seo JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviews_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  market_saturation VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
  competition_level VARCHAR(16) NOT NULL DEFAULT 'medium',
  products_count INTEGER NOT NULL DEFAULT 0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  generation_error JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  CONSTRAINT uq_library_article_revision_generation
    UNIQUE (article_id, generation_version, source_fingerprint)
);

CREATE INDEX IF NOT EXISTS library_article_revisions_article_status_idx
  ON public.library_article_revisions (article_id, status, created_at DESC);

ALTER TABLE public.library_article_revisions ENABLE ROW LEVEL SECURITY;

-- Revisions are internal staging records. Public clients must never read them.
