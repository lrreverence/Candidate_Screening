-- Applicant Clearances
-- Stores structured clearance info per applicant and clearance type.

create table if not exists public.applicant_clearances (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  clearance_type text not null,
  date_issued date,
  date_expiry date,
  attachment_path text,
  attachment_name text,
  attachment_mime text,
  attachment_size bigint,
  document_id uuid references public.documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applicant_clearances_unique unique (applicant_id, clearance_type)
);

create index if not exists applicant_clearances_applicant_id_idx on public.applicant_clearances(applicant_id);

alter table public.applicant_clearances enable row level security;

-- Users can read their own applicant clearances
create policy "select_own_applicant_clearances"
on public.applicant_clearances
for select
using (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_clearances.applicant_id
      and a.user_id = auth.uid()
  )
);

-- Users can insert their own applicant clearances
create policy "insert_own_applicant_clearances"
on public.applicant_clearances
for insert
with check (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_clearances.applicant_id
      and a.user_id = auth.uid()
  )
);

-- Users can update their own applicant clearances
create policy "update_own_applicant_clearances"
on public.applicant_clearances
for update
using (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_clearances.applicant_id
      and a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_clearances.applicant_id
      and a.user_id = auth.uid()
  )
);

