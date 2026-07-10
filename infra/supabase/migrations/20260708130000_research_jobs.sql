-- Phase 1: research jobs + project sources

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS sources JSONB NOT NULL DEFAULT '["g2", "capterra"]'::jsonb;

CREATE TABLE IF NOT EXISTS public.research_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  stage TEXT NOT NULL DEFAULT 'queued',
  progress_pct INT NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  error JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_jobs_project_id ON public.research_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_research_jobs_status ON public.research_jobs(status);

ALTER TABLE public.research_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own research jobs"
  ON public.research_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = research_jobs.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert own research jobs"
  ON public.research_jobs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = research_jobs.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users update own research jobs"
  ON public.research_jobs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = research_jobs.project_id AND p.user_id = auth.uid()
    )
  );
