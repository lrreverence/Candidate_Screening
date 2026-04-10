-- Conditional Others scoring: preferred skills, places, salary bands, start availability, employment types.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS others_scoring jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.jobs.others_scoring IS
  'Preferred Others values vs applicant resume; weights come from category_percentages.others field_weights';
