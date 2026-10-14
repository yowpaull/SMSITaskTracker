-- Self-service profile edits: users change their own full name via
-- supabase.auth.updateUser({ data: { full_name } }). Users have no UPDATE
-- policy on public.profiles (role stays admin-only), so an auth trigger
-- syncs the name from auth metadata into the profiles row.

create or replace function public.sync_profile_full_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ->> 'full_name'
     is distinct from old.raw_user_meta_data ->> 'full_name' then
    update public.profiles
    set full_name = coalesce(new.raw_user_meta_data ->> 'full_name', '')
    where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_full_name_sync
  after update on auth.users
  for each row
  execute procedure public.sync_profile_full_name();
