-- Dev seed: 50 fake task logs for testing the UI (dashboard metrics, list,
-- filters, search, delayed badges, pagination). Idempotent — first removes
-- previously seeded rows (recognizable 5eed****-… uuid prefix), then
-- re-inserts 50 logs spread across all profiles, statuses, and dates.
-- Skips silently (no-op) on a fresh database that has no profiles, tasks,
-- or brands yet, so `db push` succeeds on a brand-new project.
do $$
declare
  v_profiles uuid[];
  v_tasks uuid[];
  v_brands uuid[];
  v_statuses text[] := array[
    'completed', 'pending', 'in_progress', 'cancelled', 'completed',
    'pending', 'completed', 'in_progress', 'pending', 'completed'
  ];
  v_status text;
  v_id uuid;
  v_assignee uuid;
  v_created timestamptz;
  v_deadline timestamptz;
  v_completed timestamptz;
  i int;
begin
  select array_agg(id order by created_at) into v_profiles from public.profiles;
  select array_agg(id order by created_at) into v_tasks from public.tasks;
  select array_agg(id order by created_at) into v_brands from public.brands;

  if coalesce(array_length(v_profiles, 1), 0) = 0
     or coalesce(array_length(v_tasks, 1), 0) = 0
     or coalesce(array_length(v_brands, 1), 0) = 0 then
    -- Nothing to seed against yet — nothing to do either.
    return;
  end if;

  delete from public.task_logs where id::text like '5eed%';

  for i in 1..50 loop
    v_id := (
      '5eed' || lpad(to_hex(i), 4, '0') || '-0000-4000-8000-'
      || lpad(to_hex(i), 12, '0')
    )::uuid;
    v_assignee := v_profiles[1 + ((i - 1) % array_length(v_profiles, 1))];
    v_status := v_statuses[1 + ((i - 1) % 10)];
    v_created := now() - make_interval(
      days => (i * 19) % 45,
      hours => (i * 7) % 23
    );

    if v_status in ('pending', 'in_progress') then
      if i % 3 = 0 then
        -- past deadline on every third active log → renders as "delayed"
        v_deadline := now() - make_interval(days => 1 + (i % 9));
      else
        v_deadline := now() + make_interval(days => 1 + (i % 21));
      end if;
      v_completed := null;
    elsif v_status = 'completed' then
      v_deadline := v_created + make_interval(days => 1 + (i % 7));
      v_completed := least(
        v_deadline + make_interval(hours => i % 5),
        now()
      );
    else
      v_deadline := v_created + make_interval(days => 2 + (i % 5));
      v_completed := null;
    end if;

    insert into public.task_logs (
      id, task_id, brand_id, assigned_to, created_by,
      status, urgent, important, deadline, completed_at,
      created_at, updated_at
    ) values (
      v_id,
      v_tasks[1 + ((i * 3) % array_length(v_tasks, 1))],
      v_brands[1 + ((i * 7) % array_length(v_brands, 1))],
      v_assignee,
      v_assignee,
      v_status,
      i % 4 = 0,
      i % 5 = 0,
      v_deadline,
      v_completed,
      v_created,
      v_created
    );
  end loop;
end $$;
