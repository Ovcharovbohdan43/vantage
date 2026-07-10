-- Phase 3: reviews collected from G2 / Capterra

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('g2', 'capterra')),
  content_hash TEXT NOT NULL,
  rating INTEGER,
  title TEXT,
  text TEXT NOT NULL,
  language TEXT,
  author TEXT,
  review_date TIMESTAMPTZ,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reviews_competitor_hash_unique UNIQUE (competitor_id, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_reviews_competitor_id ON public.reviews(competitor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_source ON public.reviews(source);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own reviews"
  ON public.reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.competitors c
      JOIN public.projects p ON p.id = c.project_id
      WHERE c.id = reviews.competitor_id AND p.user_id = auth.uid()
    )
  );
