-- Conditional age scoring for job postings (full points in preferred bracket, half outside).
-- Safe if column already exists.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS age_scoring jsonb DEFAULT '{"preferred_bracket_id":"26_30","max_points":10}'::jsonb;

COMMENT ON COLUMN public.jobs.age_scoring IS
  'preferred_bracket_id: 20_25|26_30|31_40|41_50|50_plus; max_points: full credit in bracket, half outside';
