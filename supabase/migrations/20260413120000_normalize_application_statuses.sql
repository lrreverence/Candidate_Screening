-- Normalize public.applications.status to canonical pipeline values:
-- NEW | PENDING | INTERVIEW | HIRED | REJECTED

update public.applications
set status = case
  when lower(trim(coalesce(status, ''))) = 'new' then 'NEW'
  when lower(trim(coalesce(status, ''))) in ('pending', 'submitted') then 'PENDING'
  when lower(trim(coalesce(status, ''))) = 'interview' then 'INTERVIEW'
  when lower(trim(coalesce(status, ''))) = 'hired' then 'HIRED'
  when lower(trim(coalesce(status, ''))) = 'rejected' then 'REJECTED'
  else 'PENDING'
end
where status is not null;
