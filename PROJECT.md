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
- `created_at timestamptz` — default `now()`
- `updated_at timestamptz` — default `now()`

### `brands`
- `id uuid` — primary key, default `gen_random_uuid()`
- `name text` — required and unique
- `is_active boolean` — default `true`
- `created_at timestamptz` — default `now()`
- `updated_at timestamptz` — default `now()`

### `categories`
- `id uuid` — primary key, default `gen_random_uuid()`
- `name text` — required; unique among main categories and among sibling subcategories
- `parent_id uuid` — optional self-reference to `categories(id)`; `null` = main category, otherwise a subcategory (two levels only, enforced by trigger)
- `short_description text` — optional
- `is_active boolean` — default `true`
- `created_at timestamptz` — default `now()`
- `updated_at timestamptz` — default `now()`

### `tasks`
- `id uuid` — primary key, default `gen_random_uuid()`
- `name text` — required
- `category_id uuid` — required foreign key to `categories(id)`
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
- `categories.id` → `tasks.category_id` (one-to-many)
- `tasks.id` → `task_logs.task_id` (one-to-many)
- `brands.id` → `task_logs.brand_id` (one-to-many)

The current schema does not include task ownership or assignment. If multi-user ownership or assignment is required, propose and migrate explicit fields such as `created_by` and `assigned_to` referencing `profiles(id)`. Do not assume those fields already exist.

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
12. Use soft deactivation (`is_active = false`) for brands, categories, and task definitions when historical records may still reference them.
13. Keep task status values consistent across database constraints, TypeScript types, forms, filters, and dashboard counts.
14. Add or update tests when changing important behavior. Run the relevant lint, type-check, test, and build scripts available in the project.
15. Keep the UI simple, responsive, accessible, and consistent with existing design patterns.

## Task Tracker Behavior

- Categories classify task definitions.
- Tasks belong to one category.
- Task logs reference a task definition and a brand, and store the task's status, urgency, importance, deadline, and completion time.
- A completed task should have `completed_at` populated; when a task is reopened, clear it if that matches the product's intended behavior.
- Dashboard metrics must be derived from database records and use clearly defined status and date rules.
- Filter and sort tasks using database queries when practical rather than downloading all records unnecessarily.

## Before Finishing a Change

- Summarize the files and behavior changed.
- Mention any database migration or environment variable required.
- Report checks actually run and their results; do not claim checks passed if they were not run.
- Call out assumptions or unresolved schema questions.
