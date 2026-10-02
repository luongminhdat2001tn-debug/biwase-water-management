# History Page Spec (English)

## Overview
History page (`app/history/page.tsx`) shows `history_log` entries (newest first) with combined filters: date range, product code, product name, warehouse ("Kho Lưu"), and action ("Chức năng"). Shared shell via `components/sidebar.tsx`. All Supabase access via `lib/db.ts` (`getHistoryLog`). Session user comes from `localStorage` key `'user'`.

## Feature: Permission-Based "Kho Lưu" Dropdown (replaces free-text input)
- Current: `filterWarehouse: string` free-text `Input` with `entry.warehouse.toLowerCase().includes(...)` (`app/history/page.tsx:24,83,198-206`).
- New: `<select>` dropdown. Options are derived from the session account's `chucNang` (warehouse permission IDs), resolved via existing helpers `canAccessWarehouse` / `getAccessibleWarehouseIds` in `lib/constants.ts`. Admin (`isAdmin`) sees all warehouses.
- Warehouse IDs (4): `kho-vat-tu`, `kho-xay-dung`, `kho-phong-thi-nghiem`, `kho-thuong-mai`. Permission IDs are defined in `docs/specs/account.md`.
- Display names must match what is stored in `history_log.warehouse` (long names written by warehouse/inventory pages, e.g. `Kho Vật Tư Nhà Máy`, `Kho Xây Dựng Cơ Bản`, `Kho Phòng Thí Nghiệm`, `Kho Thương Mại` — see `WAREHOUSES` in `app/warehouse/page.tsx:13-18`), NOT the short names in `lib/constants.ts` (`Kho Vật Tư`, ...). Mapping: accessible ID -> long display name; filter compares by exact equality on display name.
- "Tất cả" option: shown ONLY when the user can access all 4 warehouses. Otherwise the dropdown lists only the accessible warehouses (no "Tất cả").
- Default value:
  - 4 warehouses accessible -> `"Tất cả"`.
  - 1 warehouse accessible -> that warehouse (pre-selected, per user decision).
  - 2-3 warehouses accessible -> `"Tất cả"` scoped to accessible ones (i.e. shows merged rows of permitted warehouses).
  - 0 warehouses accessible -> empty dropdown + table shows the no-record notice.
- Two-layer filtering:
  1. Hard scope: rows whose `entry.warehouse` maps outside the accessible set are always hidden, regardless of dropdown value (per user decision to hide unauthorized rows).
  2. Dropdown filter: within the accessible set, `"Tất cả"` shows all accessible rows; a specific warehouse shows exact-match rows only.
- `clearAllFilters` resets `filterWarehouse` to the permission-based default above (not to empty string). `hasFilter` logic accounts for "dropdown differs from default".
- Legacy/unknown `entry.warehouse` values (empty string or names not matching any known warehouse): hidden when the user has < 4 accessible warehouses; shown under "Tất cả" only for full-access users. (Keeps old data visible to admins while hiding it from restricted accounts.)
- No schema change, no change to `lib/db.ts` or `lib/constants.ts` (reuse existing helpers). Vietnamese UI labels unchanged.

## Files
- Modify: `app/history/page.tsx` (filter state, options memo, `<select>` UI, two-layer filter).
- Create: this spec (`docs/specs/history.md`).

## Manual Test Checklist
1. Admin / 4-warehouse account -> dropdown shows "Tất cả" + 4 names, default "Tất cả", all rows visible.
2. 1-warehouse account -> dropdown shows 1 option, pre-selected, no rows from other warehouses visible.
3. 2-warehouse account -> dropdown shows "Tất cả" + 2 names; "Tất cả" shows only those 2 warehouses' rows.
4. 0-warehouse account -> empty dropdown / no-record notice, no rows visible.
5. Select specific warehouse -> only exact-match rows shown.
6. Clear filter -> dropdown returns to permission-based default.
7. `npm run build` passes.
