-- Task Tracker — initial schema (see PROJECT.md)
-- Adds task_logs ownership/assignment columns (created_by, assigned_to)
-- that PROJECT.md explicitly allows to be proposed for multi-user tracking.

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null unique,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- brands
-- ---------------------------------------------------------------------------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_brands_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tasks (definitions/templates)
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid not null references public.categories (id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create index tasks_category_id_idx on public.tasks (category_id);

-- ---------------------------------------------------------------------------
-- task_logs (progress records: task x brand x assignee)
-- ---------------------------------------------------------------------------
create table public.task_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id),
  brand_id uuid not null references public.brands (id),
  assigned_to uuid not null references public.profiles (id),
  created_by uuid not null default auth.uid() references public.profiles (id),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  urgent boolean not null default false,
  important boolean not null default false,
  completed_at timestamptz,
  deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_task_logs_updated_at
  before update on public.task_logs
  for each row execute function public.set_updated_at();

create index task_logs_assigned_to_status_idx on public.task_logs (assigned_to, status);
create index task_logs_brand_id_idx on public.task_logs (brand_id);
create index task_logs_task_id_idx on public.task_logs (task_id);
create index task_logs_deadline_idx on public.task_logs (deadline) where deadline is not null;

-- ---------------------------------------------------------------------------
-- Profile bootstrap: every auth user gets a profile.
-- The very first user is promoted to admin.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_role text := 'user';
begin
  if not exists (select 1 from public.profiles) then
    next_role := 'admin';
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    next_role
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- is_admin() — security definer to avoid policies recursing on profiles
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
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
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.task_logs enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.brands from anon, authenticated;
revoke all on table public.categories from anon, authenticated;
revoke all on table public.tasks from anon, authenticated;
revoke all on table public.task_logs from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update on table public.brands to authenticated;
grant select, insert, update on table public.categories to authenticated;
grant select, insert, update on table public.tasks to authenticated;
grant select, insert, update on table public.task_logs to authenticated;

-- profiles: rows are created only by the auth trigger; no client insert/delete.
-- role can only be changed by admins.
create policy "Read own profile or any as admin"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy "Admins update profiles"
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- brands: all signed-in users read; only admins create/edit (soft deactivate via is_active).
create policy "Signed-in users read brands"
  on public.brands for select to authenticated
  using (true);

create policy "Admins insert brands"
  on public.brands for insert to authenticated
  with check (public.is_admin());

create policy "Admins update brands"
  on public.brands for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- categories: both roles add; only admins edit/deactivate.
create policy "Signed-in users read categories"
  on public.categories for select to authenticated
  using (true);

create policy "Signed-in users insert categories"
  on public.categories for insert to authenticated
  with check (true);

create policy "Admins update categories"
  on public.categories for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- tasks (definitions): both roles add; only admins edit/deactivate.
create policy "Signed-in users read tasks"
  on public.tasks for select to authenticated
  using (true);

create policy "Signed-in users insert tasks"
  on public.tasks for insert to authenticated
  with check (true);

create policy "Admins update tasks"
  on public.tasks for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- task_logs: admins see/manage all; users see and edit only logs assigned to them.
-- Anyone who creates a log must assign it to themselves unless they are admin.
create policy "Read all logs as admin or own assigned logs"
  on public.task_logs for select to authenticated
  using (public.is_admin() or assigned_to = (select auth.uid()));

create policy "Insert own-assigned logs (admin may assign to anyone)"
  on public.task_logs for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (public.is_admin() or assigned_to = (select auth.uid()))
  );

create policy "Update all logs as admin or own assigned logs"
  on public.task_logs for update to authenticated
  using (public.is_admin() or assigned_to = (select auth.uid()))
  with check (
    public.is_admin() or assigned_to = (select auth.uid())
  );
