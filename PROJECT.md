# AGENTS.md — Task Tracker

## Project Overview

Build and maintain a Task Tracker website using Supabase as the backend. The application organizes task definitions by category and records task progress for different brands.

## Database Structure

Use PostgreSQL through Supabase. Keep identifiers and relationships consistent with this schema:

### `profiles`
- `id uuid` — primary key and foreign key to `auth.users(id)`
- `full_name text` — required
- `email text` — required and unique
- `role text` — required; allowed values should be restricted to `admin` and `user`
- `is_active boolean` — default `true`; deactivated accounts cannot sign in
- `department_id uuid` — optional foreign key to `departments(id)`; `NULL` means Unassigned
- `is_department_head boolean` — default `false`; a head heads the department they belong to (DB check: a head must have a `department_id`)
- `created_at timestamptz` — default `now()`
- `updated_at timestamptz` — default `now()`

### `departments`
- `id uuid` — primary key, default `gen_random_uuid()`
- `name text` — required and unique
- `is_active boolean` — default `true`
- `created_at timestamptz` — default `now()`
- `updated_at timestamptz` — default `now()`

Soft-deactivate departments (`is_active = false`); members keep their assignment. Hard delete fails while any head still references the department.

### `brands`
- `id uuid` — primary key, default `gen_random_uuid()`
- `name text` — required and unique
- `is_active boolean` — default `true`
- `created_at timestamptz` — default `now()`
- `updated_at timestamptz` — default `now()`

### `categories`
- `id uuid` — primary key, default `gen_random_uuid()`
- `name text` — required and unique (main categories only; the two-level hierarchy lives in `subcategories`)
- `short_description text` — optional
- `is_active boolean` — default `true`
- `created_at timestamptz` — default `now()`
- `updated_at timestamptz` — default `now()`

### `subcategories`
- `id uuid` — primary key, default `gen_random_uuid()`
- `name text` — required; unique within its category (`(category_id, name)`)
- `category_id uuid` — required foreign key to `categories(id)`
- `short_description text` — optional
- `is_active boolean` — default `true`
- `created_at timestamptz` — default `now()`
- `updated_at timestamptz` — default `now()`

### `tasks`
- `id uuid` — primary key, default `gen_random_uuid()`
- `name text` — required
- `subcategory_id uuid` — required foreign key to `subcategories(id)`
- `is_active boolean` — default `true`
- `created_at timestamptz` — default `now()`
- `updated_at timestamptz` — default `now()`

### `task_logs`
- `id uuid` — primary key, default `gen_random_uuid()`
- `task_id uuid` — required foreign key to `tasks(id)`
- `brand_id uuid` — required foreign key to `brands(id)`
- `status text` — required; use only `pending`, `in_progress`, `completed`, or `cancelled`
- `urgent boolean` — default `false`
- `important boolean` — default `false`
- `completed_at timestamptz` — optional; use this instead of the ambiguous `Decision` field when recording completion time
- `deadline timestamptz` — optional
- `created_at timestamptz` — default `now()`
- `updated_at timestamptz` — default `now()`

If the existing database uses different column names, inspect the actual schema and migrations before changing code or writing migrations. Do not silently rename existing columns.

## Relationships

- `auth.users.id` → `profiles.id` (one-to-one)
- `departments.id` → `profiles.department_id` (one-to-many; a department may have multiple heads via `is_department_head`)
- `categories.id` → `subcategories.category_id` (one-to-many)
- `subcategories.id` → `tasks.subcategory_id` (one-to-many)
- `tasks.id` → `task_logs.task_id` (one-to-many)
- `brands.id` → `task_logs.brand_id` (one-to-many)

## Departments and Heads

- Departments group PEOPLE only; brands and task definitions stay organization-wide. Progress for a department = task logs whose `assigned_to` member belongs to it.
- Admins see overall progress per department (dashboard rollup incl. an "Unassigned" bucket), manage all departments, roles, and head assignments.
- Department Heads (multiple per department allowed) see only their own department: dashboard stats, member list, and they manage their members (create into their department, activate/deactivate, move members in) and may assign/edit task logs for their members. Deleting logs: admins delete any log, department heads their own logs plus logs assigned to members of their department, plain members never.
- Plain members: may create task logs for themselves only (assignee forced to self), may update **only the `status`** of a log after creation (task, brand, assignee, deadline, priority and ownership stay locked — enforced in the server action and by a database trigger, so assigned work cannot be manipulated), and cannot delete any log. Task definitions (categories, subcategories, tasks on the Create Task page) are created by admins and department heads only (staff-only page + insert RLS + staff-checked actions).
- profiles writes by heads go through SECURITY DEFINER server actions using the service client (`SUPABASE_SECRET_KEY`) with explicit same-department checks, because the RLS UPDATE policy on `profiles` is admin-only (RLS cannot restrict columns). task_logs head writes go through RLS policies using `is_head_of_profile()`.
- Existing members without a department stay `department_id = NULL` until an admin assigns them.

The current schema does not include task ownership or assignment. If multi-user ownership or assignment is required, propose and migrate explicit fields such as `created_by` and `assigned_to` referencing `profiles(id)`. Do not assume those fields already exist.

## Password Recovery

- Self-service only: **Forgot password?** on `/login` → `/forgot-password` sends a Supabase recovery email (project uses custom SMTP). The Recovery email template link must be `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`, with **Site URL** in Dashboard → Auth set to the app origin (e.g. `http://localhost:3000`). No Redirect URL allow-list entry is needed.
- `/auth/confirm` exchanges the single-use token for a session, validating `type=recovery` and treating `next` as a same-origin path only (no open redirects), then continues to `/reset-password`.
- `/reset-password` renders only with that session (new password min 8 + confirm match); missing/failed links show an invalid-link state with a request-new-link action, and a deactivated account's recovery session is bounced to `/login?deactivated=1`.
- `/forgot-password` always answers with the same generic "if an account exists…" response — including for unknown emails and rate-limit failures — so responses never reveal whether an account exists (rate-limit details go to server logs only).

## Development Rules

1. Inspect the existing project structure, package scripts, schema, and migrations before making changes.
2. Follow the project's current framework, language, naming conventions, formatting, and component patterns. Do not introduce a new library without a clear need.
3. Keep TypeScript types aligned with the actual Supabase schema. Prefer generated Supabase database types when available.
4. Validate user input at the application boundary and handle Supabase errors explicitly. Show clear success and error feedback in the UI.
5. Use foreign keys and database constraints to enforce data integrity; do not rely only on client-side validation.
6. Use `timestamptz` for timestamps and keep timestamp handling consistent.
7. Update `updated_at` through a database trigger or an existing project-standard mechanism. A column default alone does not update it on later edits.
8. Use migrations for database changes. Do not make destructive schema changes without explaining the impact and confirming the intended behavior.
9. Keep secrets out of source control. Use environment variables; never expose the Supabase service-role key in client-side code.
10. Enable Row Level Security (RLS) on tables exposed through the Supabase API and write policies that match the intended roles and data access. Do not assume that checking a role in the UI is sufficient authorization.
11. Protect the `profiles.role` field. Ordinary users must not be able to promote themselves to `admin`; use trusted server-side logic or restrictive database policies.
12. Use soft deactivation (`is_active = false`) for brands, categories, subcategories, task definitions, departments, and member accounts when historical records may still reference them. Deactivated accounts cannot sign in and are bounced to the login page by `requireUser`.
13. Keep task status values consistent across database constraints, TypeScript types, forms, filters, and dashboard counts.
14. Add or update tests when changing important behavior. Run the relevant lint, type-check, test, and build scripts available in the project.
15. Keep the UI simple, responsive, accessible, and consistent with existing design patterns.

## Task Tracker Behavior

- Categories classify subcategories; subcategories classify task definitions.
- Tasks belong to one subcategory (and therefore one main category).
- Task logs reference a task definition and a brand, and store the task's status, urgency, importance, deadline, and completion time.
- A completed task should have `completed_at` populated; when a task is reopened, clear it if that matches the product's intended behavior.
- Dashboard metrics must be derived from database records and use clearly defined status and date rules.
- Filter and sort tasks using database queries when practical rather than downloading all records unnecessarily.

## Before Finishing a Change

- Summarize the files and behavior changed.
- Mention any database migration or environment variable required.
- Report checks actually run and their results; do not claim checks passed if they were not run.
- Call out assumptions or unresolved schema questions.
