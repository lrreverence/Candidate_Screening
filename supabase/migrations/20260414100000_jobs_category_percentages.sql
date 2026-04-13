-- Weighted resume categories for job match (admin UI + breakdown). Empty array = use code defaults.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS category_percentages jsonb DEFAULT '[]'::jsonb NOT NULL;

ALTER TABLE public.jobs
  ALTER COLUMN category_percentages SET DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.jobs.category_percentages IS
  'Array of {category_key, category, percentage, field_weights}; sums to 100% per job. Empty [] uses DEFAULT_CATEGORY_WEIGHTS in app.';
