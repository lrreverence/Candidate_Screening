-- Conditional total work experience (cumulative months) bracket scoring for Employment Record.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS employment_experience_scoring jsonb
  DEFAULT '{"preferred_bracket_id":"m_13_24","max_points":10}'::jsonb;

COMMENT ON COLUMN public.jobs.employment_experience_scoring IS
  'preferred_bracket_id + max_points (% of Employment category for Total work experience row); full in bracket, half outside';
