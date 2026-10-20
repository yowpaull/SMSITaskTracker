-- Departments: group people (task_logs already point at profiles via
-- assigned_to). Multiple Department Heads per department are allowed via
-- profiles.is_department_head; a head heads the department they belong to.
-- Existing members keep department_id = NULL ("Unassigned" bucket).
-- Writes to profiles stay admin-only (RLS cannot restrict columns); head
-- management writes go through SECURITY DEFINER server actions (service client).
-- Soft-deactivate departments (is_active = false); hard delete fails while
-- any head still references the department (check below).

-- ---------------------------------------------------------------------------
-- departments
-- ---------------------------------------------------------------------------
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_departments_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- profiles: department link + head flag
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column department_id uuid references public.departments (id) on delete set null,
  add column is_department_head boolean not null default false,
  add constraint profiles_head_requires_department
    check (not is_department_head or department_id is not null);

create index profiles_department_id_idx on public.profiles (department_id);

-- ---------------------------------------------------------------------------
-- RLS helpers (security definer, same pattern as is_admin(): auth.uid()
-- checked inside so they are safe despite public EXECUTE)
-- ---------------------------------------------------------------------------
create or replace function public.is_department_head()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_department_head = true
  );
$$;

grant execute on function public.is_department_head() to authenticated;

-- True when the caller is a Department Head AND the target profile belongs
-- to the caller's department. Used by profiles/task_logs read policies and
-- task_logs insert/update policies (heads manage logs of their members).
create or replace function public.is_head_of_profile(target uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles viewer
    join public.profiles member
      on member.department_id = viewer.department_id
    where viewer.id = (select auth.uid())
      and viewer.is_department_head = true
      and member.id = target
  );
$$;

grant execute on function public.is_head_of_profile(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: departments — read for all signed-in users (names are not sensitive,
-- same as brands); writes admin-only.
-- ---------------------------------------------------------------------------
alter table public.departments enable row level security;

revoke all on table public.departments from anon, authenticated;
grant select, insert, update on table public.departments to authenticated;

create policy "Signed-in users read departments"
  on public.departments for select to authenticated
  using (true);

create policy "Admins insert departments"
  on public.departments for insert to authenticated
  with check (public.is_admin());

create policy "Admins update departments"
  on public.departments for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- profiles: extend the SELECT policy so heads read their members.
-- UPDATE stays admin-only (head writes go through service-client actions).
-- ---------------------------------------------------------------------------
drop policy "Read own profile or any as admin" on public.profiles;

create policy "Read own profile, any as admin, members as dept head"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or public.is_admin()
    or public.is_head_of_profile(id)
  );

-- ---------------------------------------------------------------------------
-- task_logs: heads read and manage (insert/update, not delete) logs whose
-- assignee is in their department. created_by must always be the writer.
-- ---------------------------------------------------------------------------
drop policy "Read all logs as admin or own assigned logs" on public.task_logs;

create policy "Read logs as admin, assignee, or dept head"
  on public.task_logs for select to authenticated
  using (
    public.is_admin()
    or assigned_to = (select auth.uid())
    or public.is_head_of_profile(assigned_to)
  );

drop policy "Insert own-assigned logs (admin may assign to anyone)" on public.task_logs;

create policy "Insert own-assigned logs (admin or dept head may assign)"
  on public.task_logs for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      public.is_admin()
      or assigned_to = (select auth.uid())
      or public.is_head_of_profile(assigned_to)
    )
  );

drop policy "Update all logs as admin or own assigned logs" on public.task_logs;

create policy "Update logs as admin, assignee, or dept head"
  on public.task_logs for update to authenticated
  using (
    public.is_admin()
    or assigned_to = (select auth.uid())
    or public.is_head_of_profile(assigned_to)
  )
  with check (
    public.is_admin()
    or assigned_to = (select auth.uid())
    or public.is_head_of_profile(assigned_to)
  );

-- Delete policy from 20261013120000 intentionally untouched: deleting logs
-- remains admin-only even for department heads.
