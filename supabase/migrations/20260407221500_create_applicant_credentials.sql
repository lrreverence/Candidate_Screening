-- Create dedicated tables for Licenses and Training/Certificates
-- in the resume/profile flow, with strict RLS based on auth.uid().

create extension if not exists pgcrypto;

create table if not exists public.applicant_licenses (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  category text not null,
  date_issued date,
  date_expiry date,
  attachment jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applicant_licenses_applicant_id_idx on public.applicant_licenses(applicant_id);

drop trigger if exists set_applicant_licenses_updated_at on public.applicant_licenses;
create trigger set_applicant_licenses_updated_at
before update on public.applicant_licenses
for each row execute function public.set_updated_at_timestamp();

alter table public.applicant_licenses enable row level security;

drop policy if exists "Applicant can read own licenses" on public.applicant_licenses;
create policy "Applicant can read own licenses"
on public.applicant_licenses
for select
using (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_licenses.applicant_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "Applicant can insert own licenses" on public.applicant_licenses;
create policy "Applicant can insert own licenses"
on public.applicant_licenses
for insert
with check (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_licenses.applicant_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "Applicant can update own licenses" on public.applicant_licenses;
create policy "Applicant can update own licenses"
on public.applicant_licenses
for update
using (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_licenses.applicant_id
      and a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_licenses.applicant_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "Applicant can delete own licenses" on public.applicant_licenses;
create policy "Applicant can delete own licenses"
on public.applicant_licenses
for delete
using (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_licenses.applicant_id
      and a.user_id = auth.uid()
  )
);

create table if not exists public.applicant_trainings (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  training_attended text not null,
  date text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applicant_trainings_applicant_id_idx on public.applicant_trainings(applicant_id);

drop trigger if exists set_applicant_trainings_updated_at on public.applicant_trainings;
create trigger set_applicant_trainings_updated_at
before update on public.applicant_trainings
for each row execute function public.set_updated_at_timestamp();

alter table public.applicant_trainings enable row level security;

drop policy if exists "Applicant can read own trainings" on public.applicant_trainings;
create policy "Applicant can read own trainings"
on public.applicant_trainings
for select
using (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_trainings.applicant_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "Applicant can insert own trainings" on public.applicant_trainings;
create policy "Applicant can insert own trainings"
on public.applicant_trainings
for insert
with check (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_trainings.applicant_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "Applicant can update own trainings" on public.applicant_trainings;
create policy "Applicant can update own trainings"
on public.applicant_trainings
for update
using (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_trainings.applicant_id
      and a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_trainings.applicant_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "Applicant can delete own trainings" on public.applicant_trainings;
create policy "Applicant can delete own trainings"
on public.applicant_trainings
for delete
using (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_trainings.applicant_id
      and a.user_id = auth.uid()
  )
);

