-- Point assignment by number of training/certificate rows (see admin Training / Certificates → By count).
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS training_count_scoring jsonb
  DEFAULT '{"tier_percentages":[0,20,40,60,80,100]}'::jsonb;

COMMENT ON COLUMN public.jobs.training_count_scoring IS
  'tier_percentages[0..5] for counts 1..5 and 6+; % of Training/Certificates category when applicant has that many filled rows';
