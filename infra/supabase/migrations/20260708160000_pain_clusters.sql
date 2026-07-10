-- Phase 4: pain clusters from review embeddings

CREATE TABLE IF NOT EXISTS public.pain_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  frequency INTEGER NOT NULL DEFAULT 0,
  severity_score REAL,
  emotional_intensity REAL,
  commercial_opportunity REAL,
  solution_direction TEXT,
  examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  representative_review_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pain_clusters_project_id ON public.pain_clusters(project_id);

-- IVFFlat index for review embeddings (lists=100 is fine for MVP scale)
CREATE INDEX IF NOT EXISTS idx_reviews_embedding
  ON public.reviews USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

ALTER TABLE public.pain_clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own pain clusters"
  ON public.pain_clusters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = pain_clusters.project_id AND p.user_id = auth.uid()
    )
  );
