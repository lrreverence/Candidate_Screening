-- Conditional height (cm) and weight (kg) bracket scoring (full in range, half outside).
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS height_scoring jsonb DEFAULT '{"preferred_bracket_id":"164_168","max_points":10}'::jsonb;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS weight_scoring jsonb DEFAULT '{"preferred_bracket_id":"66_70","max_points":10}'::jsonb;

COMMENT ON COLUMN public.jobs.height_scoring IS
  'preferred_bracket_id + max_points; full in bracket, half outside (cm)';

COMMENT ON COLUMN public.jobs.weight_scoring IS
  'preferred_bracket_id + max_points; full in bracket, half outside (kg)';
