-- The init migration granted only select/insert/update on task_logs; RLS
-- policies govern which rows, but Postgres also needs the table-level
-- DELETE privilege for the delete policy (admin or own assigned) to work.
grant delete on table public.task_logs to authenticated;
