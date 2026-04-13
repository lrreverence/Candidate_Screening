ALTER TABLE public.applicant_licenses
  ADD COLUMN IF NOT EXISTS license_number text;

COMMENT ON COLUMN public.applicant_licenses.license_number IS 'Official license ID number (matches admin resume license display).';
