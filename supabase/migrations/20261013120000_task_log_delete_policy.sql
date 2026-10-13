-- Allow deleting task logs: admins may delete any log, members may delete
-- logs assigned to them (mirrors the existing update policy).
create policy "Delete all logs as admin or own assigned logs"
  on public.task_logs for delete to authenticated
  using (public.is_admin() or assigned_to = (select auth.uid()));
