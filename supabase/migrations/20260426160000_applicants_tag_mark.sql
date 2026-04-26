-- Applicant triage tag mark (admin-facing)
-- Allowed values: heart | star | flag | null

alter table public.applicants
add column if not exists tag_mark text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'applicants_tag_mark_check'
  ) then
    alter table public.applicants
    add constraint applicants_tag_mark_check
    check (tag_mark is null or tag_mark in ('heart', 'star', 'flag'));
  end if;
end $$;

