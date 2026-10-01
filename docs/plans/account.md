# Account Plan: Per-Warehouse Permission IDs (English)

**Goal:** Rename the 4 warehouse permission IDs so they match warehouse tab IDs, with helpers and seed/migration SQL.

**Architecture:** Approach A from brainstorming — IDs identical to tab IDs, so access check is `chucNang.includes(warehouseId)` with admin bypass. No schema change, no modal change.

**Tech Stack:** Next.js 16, TypeScript, Supabase (`TEXT[]` column).

**Spec:** `docs/specs/account.md` (IDs, access rule, migration, session note)

## Global Constraints
- All Supabase access goes through `lib/db.ts` — this plan touches no DB code.
- `next.config.mjs` ignores TS build errors — self-review types; `npm run build` will not catch them.
- Vietnamese UI + Vietnamese code comments stay consistent.
- Never commit `.env.local`, `acc.txt`, or ad-hoc SQL.

## Review Focus
- Account holding a stale old ID (`kho-vat-tu-nha-may`) after rename with no migration run sees zero warehouses — migration SQL in Task 2 covers it; admins must run it once.
- `chucNang` arriving as a non-array (legacy string) breaks `.includes` on arrays only — helpers normalize with `Array.isArray` check, matching existing `hasPermissionFromSession` pattern.
- Admin seed missing the 4 IDs is harmless (bypass) but inconsistent — Task 2 adds them.

---

### Task 1: Rename IDs + access helpers in `lib/constants.ts`

**Files:**
- Modify: `lib/constants.ts` (CHUC_NANG_LIST entries + new helpers)

**Interfaces:**
- Consumes: existing `CHUC_NANG_LIST`, `hasPermissionFromSession` pattern.
- Produces: `canAccessWarehouse(user: { isAdmin?: boolean; chucNang?: string[] | string }, warehouseId: string) => boolean`; `getAccessibleWarehouseIds(user) => string[]` (all 4 tab IDs for admin, else filtered `chucNang`).

- [ ] Step 1: In `CHUC_NANG_LIST`, rename `kho-vat-tu-nha-may` -> `kho-vat-tu` and `kho-xay-dung-co-ban` -> `kho-xay-dung`, keeping names/descriptions. Verify the other two IDs (`kho-phong-thi-nghiem`, `kho-thuong-mai`) already equal tab IDs.
- [ ] Step 2: Add `canAccessWarehouse` (admin bypass OR `chucNang.includes(warehouseId)`, normalizing non-array) and `getAccessibleWarehouseIds` next to `hasPermissionFromSession`, with Vietnamese comments.
- [ ] Step 3: Run `npm run build`. Expected: builds clean (same as before; build ignores type errors, so re-read the diff for typos).
- [ ] Step 4: Commit (`git add lib/constants.ts`, message `feat: warehouse permission IDs match tabs + access helpers`).

### Task 2: Seed + one-time migration in `supabase/schema.sql`

**Files:**
- Modify: `supabase/schema.sql` (admin seed + commented migration block)

**Interfaces:**
- Consumes: Task 1's final IDs.
- Produces: runnable SQL; no code dependency.

- [ ] Step 1: Extend the admin seed `chuc_nang` array with the 4 warehouse IDs.
- [ ] Step 2: Append a commented migration block with the two `array_replace` UPDATEs for old IDs, marked "run once in SQL Editor".
- [ ] Step 3: Self-check: every ID string in seed/migration matches Task 1's IDs character-for-character.
- [ ] Step 4: Commit (`git add supabase/schema.sql`, message `chore: seed + migration for warehouse permission IDs`).
