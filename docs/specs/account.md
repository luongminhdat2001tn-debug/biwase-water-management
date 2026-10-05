# Account Page Spec (English)

## Overview
Account management page (`app/account/page.tsx`). All Supabase access via `lib/db.ts`.
Permission IDs live in `CHUC_NANG_LIST` (`lib/constants.ts`); the Thêm/Sửa Tài Khoản
modal renders them as multi-select checkboxes automatically. Session in `localStorage`
key `'user'`.

## Feature: Per-Warehouse Access Permissions (Approach A — IDs match tabs)
- The 4 warehouse permissions in `CHUC_NANG_LIST` use IDs identical to the warehouse
  tab IDs in `app/warehouse/page.tsx`:
  - `kho-vat-tu` — Kho Vật Tư Nhà Máy
  - `kho-xay-dung` — Kho Xây Dựng Cơ Bản
  - `kho-phong-thi-nghiem` — Kho Phòng Thí Nghiệm
  - `kho-thuong-mai` — Kho Thương Mại
- This renames two previous IDs: `kho-vat-tu-nha-may` -> `kho-vat-tu`,
  `kho-xay-dung-co-ban` -> `kho-xay-dung`. Display names and descriptions are unchanged.
- No account-modal changes: the Thêm/Sửa form already maps over `CHUC_NANG_LIST`,
  so the 4 warehouse checkboxes appear with no code change.
- No schema change: `accounts.chuc_nang` is `TEXT[]` and stores any permission strings.
  No change to `Account` interface or `lib/db.ts` mappers.

## Access Rule
- `canAccessWarehouse(user, warehouseId)` = `user.isAdmin === true`
  OR `chucNang.includes(warehouseId)`.
- Admin bypasses all filtering and always sees all 4 warehouses.
- An account with zero warehouse permissions sees no tabs and gets a no-access
  notice (warehouse page handles the UI; see `docs/specs/warehouse.md`).

## Migration + Seed (`supabase/schema.sql`)
- Admin seed `chuc_nang` includes all 4 warehouse IDs.
- One-time migration for existing rows (run in Supabase SQL Editor):
  `UPDATE accounts SET chuc_nang = array_replace(chuc_nang, 'kho-vat-tu-nha-may', 'kho-vat-tu');`
  `UPDATE accounts SET chuc_nang = array_replace(chuc_nang, 'kho-xay-dung-co-ban', 'kho-xay-dung');`

## Session Note
- Permissions are read from the `localStorage` session at page load. After an admin
  changes someone's warehouse permissions, that user must log out and log back in
  for the change to take effect (same as all existing permissions).

## Manual Test Checklist
1. Open Thêm Tài Khoản -> 4 warehouse checkboxes visible with correct names.
2. Create Account A with only `kho-vat-tu` -> login as A -> warehouse page shows
   1 tab with its data.
3. Add a second warehouse to A (then A re-logs in) -> 2 tabs, switching loads
   the correct products.
4. Remove all warehouse permissions from A (re-login) -> no-access notice.
5. Login as admin -> all 4 tabs visible.
6. `npm run build` passes.
