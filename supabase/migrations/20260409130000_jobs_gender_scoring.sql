-- Conditional gender scoring (full points if match, half otherwise).
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS gender_scoring jsonb DEFAULT '{"preferred_gender":"male","max_points":10}'::jsonb;

COMMENT ON COLUMN public.jobs.gender_scoring IS
  'preferred_gender: male|female|other; max_points: full credit when match, half otherwise';
