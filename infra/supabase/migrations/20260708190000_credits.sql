-- Credit-based research billing (replaces subscription model)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_preview_used BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS starter_credits INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS founder_credits INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS indie_credits INT NOT NULL DEFAULT 0;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS research_mode TEXT NOT NULL DEFAULT 'preview'
    CHECK (research_mode IN ('preview', 'full')),
  ADD COLUMN IF NOT EXISTS research_plan TEXT NOT NULL DEFAULT 'preview'
    CHECK (research_plan IN ('preview', 'starter', 'founder', 'indie'));

CREATE INDEX IF NOT EXISTS idx_projects_research_mode ON public.projects(research_mode);
