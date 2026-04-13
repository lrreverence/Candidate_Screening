-- Preserve interview / hire / rejection dates when status changes (updated_at alone overwrites).
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS interviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS hired_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

COMMENT ON COLUMN public.applications.interviewed_at IS 'Set when admin moves application to INTERVIEW.';
COMMENT ON COLUMN public.applications.hired_at IS 'Set when admin marks application HIRED.';
COMMENT ON COLUMN public.applications.rejected_at IS 'Set when admin rejects the application.';

-- Best-effort backfill for rows already in pipeline (interview date unknown for old HIRED).
UPDATE public.applications
SET interviewed_at = COALESCE(interviewed_at, updated_at)
WHERE status = 'INTERVIEW' AND interviewed_at IS NULL;

UPDATE public.applications
SET hired_at = COALESCE(hired_at, updated_at)
WHERE status = 'HIRED' AND hired_at IS NULL;

UPDATE public.applications
SET rejected_at = COALESCE(rejected_at, updated_at)
WHERE status = 'REJECTED' AND rejected_at IS NULL;
