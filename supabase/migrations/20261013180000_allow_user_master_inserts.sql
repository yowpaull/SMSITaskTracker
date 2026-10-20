-- Correction of 20261013170000: users may CREATE categories and tasks, but
-- only admins may edit/deactivate them (update policies stay admin-only).
drop policy "Admins insert categories" on public.categories;

create policy "Signed-in users insert categories"
  on public.categories for insert to authenticated
  with check (true);

drop policy "Admins insert tasks" on public.tasks;

create policy "Signed-in users insert tasks"
  on public.tasks for insert to authenticated
  with check (true);
