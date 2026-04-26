-- Store admin-entered interview outcome/notes per application.
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS interview_result text;

COMMENT ON COLUMN public.applications.interview_result IS 'Admin-entered result/notes for the interview.';

