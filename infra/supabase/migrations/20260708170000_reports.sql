-- Phase 5: market analysis reports

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  market_saturation TEXT NOT NULL DEFAULT 'MEDIUM'
    CHECK (market_saturation IN ('HIGH', 'MEDIUM', 'LOW')),
  market_score REAL NOT NULL DEFAULT 50,
  risk_score REAL NOT NULL DEFAULT 50,
  data_confidence TEXT NOT NULL DEFAULT 'medium'
    CHECK (data_confidence IN ('high', 'medium', 'low')),
  recommendations JSONB NOT NULL DEFAULT '{}'::jsonb,
  pain_clusters_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  competitors_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_project_id ON public.reports(project_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own reports"
  ON public.reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = reports.project_id AND p.user_id = auth.uid()
    )
  );
