# AGENTS.md — biwase-water-management

Next.js 16 + React 19 + Tailwind v4 + shadcn (`new-york`) + Supabase. Vietnamese-language warehouse/HR app for BIWASE Long An. Product requirements live in `final_requirement.txt` (Vietnamese).

## Commands

- `npm run dev` / `npm run build` / `npm run start` — only scripts in `package.json`. No test, typecheck, or lint setup (no eslint config installed despite `lint` script).
- Path alias: `@/*` maps to repo root (`tsconfig.json`), e.g. `@/lib/db`, `@/components/sidebar`.

## Architecture

- Routes (all `'use client'` pages): `app/page.tsx` (login), `app/dashboard|warehouse|inventory|history|account|hr/page.tsx`. Shared shell: `components/sidebar.tsx`.
- Data layer boundary: **all Supabase access goes through `lib/db.ts`** — pages must not call `supabase.from()` directly. Types, `CHUC_NANG_LIST` (permission IDs), `WAREHOUSES` live in `lib/constants.ts`; client in `lib/supabase.ts`.
- Supabase snake_case ↔ frontend camelCase: always go through the `map*FromDB` / `map*ToDB` mappers in `lib/db.ts` (e.g. `chuc_vu` ↔ `chucVu`). Tables: `accounts`, `products` (soft-delete via `is_deleted`), `history_log`, `employees`. Image bucket: `images` (`uploadImage`/`deleteImage` helpers in `lib/db.ts`).
- Auth is client-side only: `getAccountByCredentials` (plaintext password match) → session in `localStorage` key `'user'` → `window.location.href` redirects (`'/'` if no session). Permission check helper: `hasPermissionFromSession()` in `lib/constants.ts`. Permissions are multi-select checkbox arrays (`chucNang: string[]`).
- Never delete the `is_admin` account. `products` deletes must be soft (`is_deleted: true` via `deleteProduct`).

## Supabase / env

- Env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) comes from `.env.local`, which is gitignored (`.env*`). Never commit it, `acc.txt`, or ad-hoc SQL (`fix_ghi_chu.sql`).
- Schema/migrations are manual: apply `supabase/schema.sql` via Supabase SQL Editor; seed data in `supabase/seed.sql`. RLS is enabled with permissive demo anon policies — keep that way unless asked.

## Conventions & gotchas

- `next.config.mjs` ignores TS build errors and uses unoptimized images — `next build` will not catch type errors, so self-review types.
- Vietnamese UI + Vietnamese code comments are the established style (per client requirements); keep new code commented the same way.
- Tailwind v4 via `@tailwindcss/postcss`; shadcn aliases in `components.json` (`@/components`, `@/lib`, `@/hooks`); icons via `lucide-react`.

## Important rules
- Always check docs folder first:
    + If the feature existed, update the md file in plans/specs folder
    + If the feature doesn't exist, create a new file in plans/specs folder with page_name.md and use english. Like example: warehouse.md
- Before implementing a task, make sure it follow by these steps: create/update spec file in specs folder => user reviewed and approved => create/update plan file in plans folder => user reviewed and approved => implementation