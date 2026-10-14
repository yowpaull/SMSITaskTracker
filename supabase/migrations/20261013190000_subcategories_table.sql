-- Replace the self-referencing category hierarchy (categories.parent_id) with
-- a dedicated subcategories table. New chain: categories → subcategories →
-- tasks (tasks.subcategory_id, NOT NULL).

-- ---------------------------------------------------------------------------
-- 1. subcategories table
-- ---------------------------------------------------------------------------
create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id),
  name text not null,
  short_description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_subcategories_updated_at
  before update on public.subcategories
  for each row execute function public.set_updated_at();

create index subcategories_category_id_idx on public.subcategories (category_id);

create unique index subcategories_category_name_key
  on public.subcategories (category_id, name);

-- ---------------------------------------------------------------------------
-- 2. RLS: everyone reads and inserts; only admins update (mirrors categories)
-- ---------------------------------------------------------------------------
alter table public.subcategories enable row level security;

revoke all on table public.subcategories from anon, authenticated;

grant select, insert, update on table public.subcategories to authenticated;

create policy "Signed-in users read subcategories"
  on public.subcategories for select to authenticated
  using (true);

create policy "Signed-in users insert subcategories"
  on public.subcategories for insert to authenticated
  with check (true);

create policy "Admins update subcategories"
  on public.subcategories for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Move existing two-level categories into subcategories (same ids)
-- ---------------------------------------------------------------------------
insert into public.subcategories (id, category_id, name, short_description, is_active, created_at, updated_at)
select c.id, c.parent_id, c.name, c.short_description, c.is_active, c.created_at, c.updated_at
from public.categories c
where c.parent_id is not null;

-- ---------------------------------------------------------------------------
-- 4. Tasks: add subcategory_id, repoint, then drop category_id
-- ---------------------------------------------------------------------------
alter table public.tasks
  add column subcategory_id uuid references public.subcategories (id);

create index tasks_subcategory_id_idx on public.tasks (subcategory_id);

-- Tasks whose category_id is an old subcategory (row now also in subcategories).
update public.tasks t
set subcategory_id = t.category_id
where exists (
  select 1 from public.subcategories s where s.id = t.category_id
);

-- Mains that still have direct tasks get an auto "General" subcategory.
insert into public.subcategories (category_id, name)
select distinct c.id, 'General'
from public.tasks t
join public.categories c on c.id = t.category_id
where t.subcategory_id is null
  and c.parent_id is null
  and not exists (
    select 1 from public.subcategories s
    where s.category_id = c.id and s.name = 'General'
  );

-- Attach the remaining direct tasks to their main's "General" subcategory.
update public.tasks t
set subcategory_id = s.id
from public.subcategories s
where t.subcategory_id is null
  and s.category_id = t.category_id
  and s.name = 'General';

alter table public.tasks
  alter column subcategory_id set not null;

-- tasks no longer point at categories directly.
alter table public.tasks drop column category_id;

-- ---------------------------------------------------------------------------
-- 5. Categories: back to a flat, globally-unique list
-- ---------------------------------------------------------------------------
drop trigger if exists enforce_categories_two_levels on public.categories;
drop function if exists public.enforce_two_level_categories();

-- Dropping parent_id also drops indexes/constraints involving it.
alter table public.categories drop column parent_id;

alter table public.categories
  add constraint categories_name_key unique (name);
