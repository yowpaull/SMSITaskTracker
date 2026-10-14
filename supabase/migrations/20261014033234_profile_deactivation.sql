-- Soft deactivation for member accounts. Deactivated users cannot sign in
-- (checked in the login server action) and existing sessions are bounced to
-- /login by requireUser. Historical task logs keep referencing the profile.

alter table public.profiles
  add column is_active boolean not null default true;
