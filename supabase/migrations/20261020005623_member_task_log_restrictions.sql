-- Member task-log restrictions (enforced in the app AND in the database):
-- * Plain members may only UPDATE the status of a task log — task, brand,
--   assignee, deadline, priority and ownership are locked after creation,
--   so assigned work cannot be manipulated by the assignee.
-- * Deletes: admins may delete any log; department heads only their own
--   assigned logs; plain members cannot delete at all.
-- * Task definitions (categories, subcategories, tasks): only admins and
--   department heads may create them.

-- ---------------------------------------------------------------------------
-- task_logs DELETE: admin (any row) or department head (own assigned logs).
-- ---------------------------------------------------------------------------
drop policy "Delete all logs as admin or own assigned logs" on public.task_logs;

create policy "Delete logs as admin or own assigned as head"
  on public.task_logs for delete to authenticated
  using (
    public.is_admin()
    or (assigned_to = (select auth.uid()) and public.is_department_head())
  );

-- ---------------------------------------------------------------------------
-- Task definitions: inserts restricted to admins and department heads.
-- ---------------------------------------------------------------------------
drop policy "Signed-in users insert categories" on public.categories;

create policy "Admins or heads insert categories"
  on public.categories for insert to authenticated
  with check (public.is_admin() or public.is_department_head());

drop policy "Signed-in users insert subcategories" on public.subcategories;

create policy "Admins or heads insert subcategories"
  on public.subcategories for insert to authenticated
  with check (public.is_admin() or public.is_department_head());

drop policy "Signed-in users insert tasks" on public.tasks;

create policy "Admins or heads insert tasks"
  on public.tasks for insert to authenticated
  with check (public.is_admin() or public.is_department_head());

-- ---------------------------------------------------------------------------
-- Status-only guard for plain members on task_logs. RLS cannot restrict
-- columns, so a trigger raises when a member touches any column other than
-- status; completed_at is always re-derived from status (mirrors the
-- server action in src/lib/actions/task-logs.ts).
-- ---------------------------------------------------------------------------
create or replace function public.enforce_member_task_log_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if public.is_admin() or public.is_department_head() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.task_id is distinct from old.task_id
     or new.brand_id is distinct from old.brand_id
     or new.assigned_to is distinct from old.assigned_to
     or new.created_by is distinct from old.created_by
     or new.urgent is distinct from old.urgent
     or new.important is distinct from old.important
     or new.deadline is distinct from old.deadline
     or new.created_at is distinct from old.created_at
  then
    raise exception 'Members may only update the status of a task log';
  end if;

  if new.status = 'completed' then
    new.completed_at := now();
  else
    new.completed_at := null;
  end if;

  return new;
end;
$$;

create trigger task_logs_status_only_for_members
  before update on public.task_logs
  for each row
  execute function public.enforce_member_task_log_update();
