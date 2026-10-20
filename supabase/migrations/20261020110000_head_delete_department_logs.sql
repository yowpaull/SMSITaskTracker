-- Department heads may delete task logs assigned to members of their own
-- department (they already read and update those rows via the
-- is_head_of_profile policies in 20261016081413). Admins keep deleting any
-- log; plain members still cannot delete any log (as in 20261020005623).

drop policy "Delete logs as admin or own assigned as head" on public.task_logs;

create policy "Delete logs as admin or own department as head"
  on public.task_logs for delete to authenticated
  using (
    public.is_admin()
    or (
      public.is_department_head()
      and (
        assigned_to = (select auth.uid())
        or public.is_head_of_profile(assigned_to)
      )
    )
  );
