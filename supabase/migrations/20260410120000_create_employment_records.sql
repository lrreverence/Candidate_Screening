-- Employment Record rows for `/profile/resume` (normalized from applicants).
-- Previously lived only in `supabase/employment_records.sql`; tracked here for `supabase db push` / CI.

create table if not exists public.employment_records (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  category text not null check (category in ('job_related', 'non_related')),
  position text,
  agency text,
  place text,
  from_date date,
  to_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employment_records_applicant_id_idx
  on public.employment_records (applicant_id);

create index if not exists employment_records_applicant_category_idx
  on public.employment_records (applicant_id, category);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists employment_records_set_updated_at on public.employment_records;
create trigger employment_records_set_updated_at
before update on public.employment_records
for each row execute function public.set_updated_at();

alter table public.employment_records enable row level security;

drop policy if exists "employment_records_select_own" on public.employment_records;
create policy "employment_records_select_own"
on public.employment_records
for select
using (
  exists (
    select 1
    from public.applicants a
    where a.id = employment_records.applicant_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "employment_records_insert_own" on public.employment_records;
create policy "employment_records_insert_own"
on public.employment_records
for insert
with check (
  exists (
    select 1
    from public.applicants a
    where a.id = employment_records.applicant_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "employment_records_update_own" on public.employment_records;
create policy "employment_records_update_own"
on public.employment_records
for update
using (
  exists (
    select 1
    from public.applicants a
    where a.id = employment_records.applicant_id
      and a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.applicants a
    where a.id = employment_records.applicant_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "employment_records_delete_own" on public.employment_records;
create policy "employment_records_delete_own"
on public.employment_records
for delete
using (
  exists (
    select 1
    from public.applicants a
    where a.id = employment_records.applicant_id
      and a.user_id = auth.uid()
  )
);
