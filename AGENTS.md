<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project state

- Fresh `create-next-app` scaffold (Next.js 16.4.0, React 19.3.0, TypeScript strict, Tailwind 4). App code is only `src/app/` (App Router); no Supabase code, migrations, tests, or CI exist yet.
- **`PROJECT.md` is the product spec** (Supabase schema, relationships, RLS/status rules, workflow expectations). Read it before schema or feature work. Its schema describes intent — verify against real migrations/DB before changing columns; it says not to silently rename existing columns.
- `README.md` is stock boilerplate and partly wrong (says `app/page.tsx`; the real path is `src/app/page.tsx`). Trust config and code over it.

## Commands (verified)

- Dev server: `npm run dev` (Turbopack; also regenerates the agent-rules block above).
- Lint: `npm run lint` (ESLint 9 flat config in `eslint.config.mjs`).
- Typecheck: `npx tsc --noEmit` — there is **no** `typecheck` script.
- Build: `npm run build`. Before finishing a change: `npm run lint` → `npx tsc --noEmit` → `npm run build`.
- No test script or test runner is installed. If adding tests, install a runner and say so; don't claim tests passed otherwise.

## Toolchain quirks

- Path alias `@/*` → `./src/*` (only alias; no monorepo/workspace).
- `next.config.ts` enables `cacheComponents`, `partialPrefetching`, and `reactCompiler` (babel-plugin-react-compiler) — data/caching and memoization behavior differs from classic Next.js; check `node_modules/next/dist/docs/01-app/` (e.g. `authentication-with-cache-components.md`, caching guides) before writing data-fetching code.
- Tailwind 4 is CSS-first: `@import "tailwindcss"` in `src/app/globals.css`, loaded via the `@tailwindcss/turbopack` rule in `next.config.ts`. There is no `tailwind.config`/`postcss.config` — don't add one.
- `.env*` files are gitignored; no env vars are required yet. Never expose a Supabase service-role key client-side.

## UI DESIGN

- Always follow the UI design system when creating or reviewing components or pages.
- Design System: @DESIGN.md