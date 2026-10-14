-- Two-level category hierarchy: main categories (parent_id is null) and
-- subcategories (parent_id points to a main category). Tasks keep pointing
-- at a category id (either level); existing rows stay valid.
alter table public.categories
  add column parent_id uuid references public.categories (id);

create index categories_parent_id_idx on public.categories (parent_id);

-- Replace the global unique name: main category names stay globally unique;
-- subcategory names must only be unique among their siblings.
alter table public.categories drop constraint categories_name_key;

create unique index categories_main_name_key
  on public.categories (name)
  where parent_id is null;

create unique index categories_parent_name_key
  on public.categories (parent_id, name);

-- Enforce max two levels. RLS lets any signed-in user insert categories, so
-- the guard lives in the database, not only in app code.
create or replace function public.enforce_two_level_categories()
returns trigger
language plpgsql
as $$
begin
  if new.parent_id is not null then
    if not exists (
      select 1 from public.categories c
      where c.id = new.parent_id and c.parent_id is null
    ) then
      raise exception 'Subcategories can only be added under a main category';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_categories_two_levels
  before insert or update of parent_id on public.categories
  for each row execute function public.enforce_two_level_categories();
