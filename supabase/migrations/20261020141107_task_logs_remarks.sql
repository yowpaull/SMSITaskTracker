-- Task log remarks: free-text notes (links, context) editable by everyone,
-- including plain members (status + remarks are the only member-writable
-- fields). Hard limit: 1000 words, enforced here at the database level
-- (rule 5) in addition to the zod validation in the server action and the
-- live counter in the form. Word count matches countWords() in
-- src/lib/validations/task-log.ts: trim, then split on whitespace runs.

alter table public.task_logs
  add column remarks text;

alter table public.task_logs
  add constraint task_logs_remarks_word_limit
  check (
    remarks is null
    or array_length(regexp_split_to_array(btrim(remarks), '\s+'), 1) <= 1000
  );

-- Refresh the member guard: remarks stays writable for members (it is not
-- in the blocked-column list below); only the comment/message change to
-- document that remarks joins status as member-editable.
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
    raise exception 'Members may only update the status and remarks of a task log';
  end if;

  if new.status = 'completed' then
    new.completed_at := now();
  else
    new.completed_at := null;
  end if;

  return new;
end;
$$;
