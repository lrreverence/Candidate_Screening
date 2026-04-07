-- Create a dedicated table for "Others" in the resume/profile flow.
-- This keeps the applicants table lean and allows strict RLS based on auth.uid().

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.applicant_others (
  applicant_id uuid primary key references public.applicants(id) on delete cascade,
  skills text[] not null default '{}',
  preferred_places text[] not null default '{}',
  preferred_monthly_salary text[] not null default '{}',
  can_start_asap boolean not null default true,
  can_start_date date,
  employment_types text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_applicant_others_updated_at on public.applicant_others;
create trigger set_applicant_others_updated_at
before update on public.applicant_others
for each row execute function public.set_updated_at_timestamp();

alter table public.applicant_others enable row level security;

drop policy if exists "Applicant can read own others" on public.applicant_others;
create policy "Applicant can read own others"
on public.applicant_others
for select
using (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_others.applicant_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "Applicant can insert own others" on public.applicant_others;
create policy "Applicant can insert own others"
on public.applicant_others
for insert
with check (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_others.applicant_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "Applicant can update own others" on public.applicant_others;
create policy "Applicant can update own others"
on public.applicant_others
for update
using (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_others.applicant_id
      and a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_others.applicant_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "Applicant can delete own others" on public.applicant_others;
create policy "Applicant can delete own others"
on public.applicant_others
for delete
using (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_others.applicant_id
      and a.user_id = auth.uid()
  )
);

