-- Clearances save uses delete-then-insert; allow owners to delete their rows.

drop policy if exists "delete_own_applicant_clearances" on public.applicant_clearances;

create policy "delete_own_applicant_clearances"
on public.applicant_clearances
for delete
using (
  exists (
    select 1
    from public.applicants a
    where a.id = applicant_clearances.applicant_id
      and a.user_id = auth.uid()
  )
);
