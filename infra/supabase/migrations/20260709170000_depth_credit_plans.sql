-- Allow research_plan to store depth for credit-priced full runs

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_research_plan_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_research_plan_check
  CHECK (research_plan IN ('preview', 'starter', 'founder', 'indie', 'shallow', 'standard', 'deep'));
