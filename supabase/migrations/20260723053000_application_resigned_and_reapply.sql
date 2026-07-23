-- Add RESIGNED pipeline status support + notes fields.
-- Rejected applicants may reapply after 30 days (enforced in app using rejected_at).
-- Hired applicants are blocked from other jobs until marked RESIGNED (enforced in app).

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS resigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS resignation_reason text;

COMMENT ON COLUMN public.applications.resigned_at IS 'Set when admin marks a HIRED application as RESIGNED.';
COMMENT ON COLUMN public.applications.resignation_reason IS 'Optional admin notes: resignation reason (and related record text).';

-- Keep any already-resigned rows canonical if present.
UPDATE public.applications
SET status = 'RESIGNED'
WHERE lower(trim(coalesce(status, ''))) = 'resigned'
  AND status IS DISTINCT FROM 'RESIGNED';
