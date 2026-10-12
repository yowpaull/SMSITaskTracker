# Plan: Task Tracker (Next.js 16 + Supabase + shadcn/ui)

## 0. Scope & locked decisions
- **Build**: the PROJECT.md task tracker only.
- **Auth/persistence**: Supabase, **hosted project**, repo `supabase/migrations` + `db push`.
- **Access model** (product decision): Admin = add brands/categories/task definitions, add members, view **all** logs, create logs for self **or** any member. User = read brands, add categories/definitions, view/create logs **for self only**.
- **Assumptions** (flag if wrong): **no public registration** — the only accounts are (a) the first admin, created via Supabase Dashboard → Auth → Users ("Add user", auto-confirm) and promoted to `admin` by the `handle_new_user` trigger, and (b) members created later by an admin through the app's Members page (service-role `auth.admin.createUser`, auto-confirm). Supabase Auth setting **"Allow new users to sign up" must be disabled** so `/signup` cannot exist or be bypassed; "delayed" is a *derived* state (deadline passed + status `pending`/`in_progress`) since the enum is `pending|in_progress|completed|cancelled`; log **deletes** are not exposed (cancel instead).

## 1. Architecture

```
Browser (server components + small client islands)
   ↓ RSC render / server actions (mutations)         cacheComponents: dynamic data
src/proxy.ts  →  @supabase/ssr session refresh (Next 16: middleware.ts is now proxy.ts)
src/lib/supabase/{client,server,proxy,admin}.ts      admin.ts = service-role, server-only
src/lib/{auth.ts, status.ts, validations/*.ts}       requireUser/isAdmin, status union, zod schemas
src/lib/data/*.ts                                   'server-only' query fns (RLS-scoped)
Postgres (RLS enforced per policy below)
```
- **Reads**: pages stay non-`async`; data fetched in async children **inside `<Suspense>`** with `loading.tsx` skeletons (required: `cookies()` outside Suspense is a build error under `cacheComponents`). No `'use cache'` for task data — always fresh.
- **Writes**: server actions (`'use server'`) + `useActionState`; auth re-checked inside every action (`getClaims()`/`getUser()`, never client); zod validation at the boundary; errors returned, not thrown; `revalidatePath` after success; `redirect()` outside try/catch.
- **Key Next 16 rules**: `await cookies()`, `params`/`searchParams` are Promises (await inside Suspense child, not page top), `error.tsx` gets `{ error, retry }`, `useActionState` from `react`, no segment `dynamic/revalidate/fetchCache` exports, `proxy.ts` must return the Supabase response (cookies + cache headers).

## 2. Database (migration `0001_init.sql`)
Schema exactly as PROJECT.md (`profiles, brands, categories, tasks, task_logs`) **plus** (PROJECT.md explicitly invites these): `task_logs.assigned_to uuid not null → profiles(id)`, `task_logs.created_by uuid not null default auth.uid() → profiles(id)`; index `task_logs(assigned_to, status)`, `(brand_id)`, `(task_id)`, `(deadline)`; `set_updated_at()` trigger on all tables; `check` constraints on status + `profiles.role ∈ (admin,user)`; `handle_new_user()` trigger inserting profile from `raw_user_meta_data`, **first user → role 'admin'**.

**RLS** (enable on every table; `is_admin()` = `security definer` function to avoid profiles self-recursion):

| table | select | insert | update/delete |
|---|---|---|---|
| profiles | own OR admin | trigger only (no client policy) | admin only (protects `role`) |
| brands | authenticated | admin | admin |
| categories | authenticated | authenticated (both roles) | admin (deactivate) |
| tasks (defs) | authenticated | authenticated (both roles) | admin (deactivate) |
| task_logs | admin OR `assigned_to = auth.uid()` | `created_by = auth.uid()` AND (admin OR `assigned_to = auth.uid()`) | admin OR assignee |

Revoke `anon`, grant minimal to authenticated. Members: admin-only **server action** calling `auth.admin.createUser` (invite/temp password, `full_name` metadata, role) — uses `SUPABASE_SECRET_KEY`, never exposed.

## 3. Routes & pages

```
src/proxy.ts                      session refresh + optimistic redirect → /login
src/app/layout.tsx                root: fonts, metadata, Toaster/TooltipProvider
src/app/page.tsx                  → redirect('/dashboard')
src/app/(auth)/login/page.tsx + actions.ts             useActionState errors; NO signup route
src/app/auth/signout/route.ts     POST signout → /login
src/app/(app)/layout.tsx          app shell; session read inside Suspense (nav skeleton)
src/app/(app)/dashboard/page.tsx  metric cards: total · pending · in progress · completed · cancelled · delayed
src/app/(app)/tasks/page.tsx      task_logs table; filters via searchParams (status/brand/category/assignee/q/sort)
src/app/(app)/tasks/new/page.tsx  create log (user→self only; admin→any member)
src/app/(app)/tasks/[id]/page.tsx edit status/deadline/urgency/importance, history
src/app/(app)/definitions/page.tsx  task definitions CRUD/activate
src/app/(app)/categories/page.tsx   add category; admin deactivates
src/app/(app)/brands/page.tsx       admin add/deactivate; user read-only
src/app/(app)/members/page.tsx      admin list/create/role members (non-admin → redirect)
src/app/(app)/profile/page.tsx      own profile + sign out
+ loading.tsx / error.tsx / not-found.tsx per segment (DESIGN.md skeletons required)
```
Nav (admin sees Members/Brands mgmt): Dashboard · Tasks · Definitions · Categories · Brands · Members(admin) · Profile.

## 4. Components (shadcn/ui)
- Init: `npx shadcn@latest info --json` → `npx shadcn@latest init --preset base-nova -y` (skill default Base UI) → `npx shadcn@latest add button badge card table input textarea select checkbox switch field dialog alert-dialog dropdown-menu tooltip skeleton tabs sonner alert empty spinner separator avatar` (confirm names via `shadcn search` first).
- Theme: rewrite `globals.css` tokens to DESIGN.md palette (primary `#2563EB`, fg `#0F172A`, border `#E2E8F0`, muted `#F8FAFC`, accent `#EFF6FF`); remove scaffold's `prefers-color-scheme` dark block; add `--success/--warning` vars registered in `@theme inline`.
- Feature: `layout/{app-nav,user-menu}`, `tasks/{task-table,task-filters,task-form,status-badge,priority-badge,deadline-cell}`, `metrics/metric-cards`, `definitions|brands|categories|members` table+form pairs, `shared/{page-header,confirm-dialog}`. Forms use `FieldGroup/FieldLabel` pattern; status vocabulary lives only in `src/lib/status.ts`.

## 5. Implementation steps
1. **Toolchain**: `npm i @supabase/supabase-js @supabase/ssr zod`; shadcn init + add + theme tokens.
2. **Supabase**: create hosted project → `npm i -D supabase`, `npx supabase init`, `supabase link`, write `0001_init.sql`, `supabase db push`, `supabase gen types typescript` → `src/types/database.types.ts`, keys in `.env.local` (+ committed `.env.example` names only).
3. **Auth plumbing**: 4 supabase modules, `src/proxy.ts`, login page + signout route, `requireUser()`/`isAdmin()`; disable public signup in Supabase Auth settings; create first admin via Dashboard "Add user"; verify login + first-user-admin trigger.
4. **App shell**: `(app)` layout + nav + profile + shared skeleton/empty/error states.
5. **Reads**: task_logs list + filters + detail; dashboard metrics (`Promise.all` of RLS-scoped `head:true` counts).
6. **Writes**: task-log create/edit/status actions (zod, RLS, revalidate).
7. **Masters**: definitions → categories → brands pages.
8. **Members**: service-role create/role actions + admin page guard.
9. **Polish**: responsive/a11y/contrast pass per DESIGN.md; permission matrix.

## 6. Verification
Per step: `npm run lint` → `npx tsc --noEmit` → `npm run build`. No test runner exists — v1 uses a **manual matrix**: 2 users (admin+member) × {admin-created member can log in, create log, cross-user log isolation (user A must not see B's), admin-only brands/members blocks, signup disabled (404), role-change protection, status/deadline flows, empty/loading/error states}. Note: build needs `.env.local` present or data fns must lazy-fail per request.

## 7. Risks
- `cookies()` outside `<Suspense>` (esp. layouts) = **build error** under `cacheComponents` — biggest gotcha.
- `proxy.ts` naming + must return Supabase response with cache headers.
- Profiles RLS recursion → `is_admin()` security-definer fn; service key must stay server-only.
- Email confirm flow: none needed — all accounts are auto-confirmed (`email_confirm` / Dashboard "Add user"); public signup disabled at the provider, so no confirmation/redirect URL config to get wrong.
- Reconciling DESIGN's `delayed` badge with the 4-value enum (derived, not stored).
