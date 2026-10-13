-- Only admins may add categories/subcategories and task definitions.
-- (Previously any signed-in user could insert; update was already admin-only.)
drop policy "Signed-in users insert categories" on public.categories;

create policy "Admins insert categories"
  on public.categories for insert to authenticated
  with check (public.is_admin());

drop policy "Signed-in users insert tasks" on public.tasks;

create policy "Admins insert tasks"
  on public.tasks for insert to authenticated
  with check (public.is_admin());
