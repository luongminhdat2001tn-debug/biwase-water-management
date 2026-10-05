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

## Feature: "Xuất Phiếu Kho" Button (print voucher via preview-print-file)
- Location: `app/history/page.tsx` CardHeader, to the LEFT of the green `Xuất Excel` button. Both buttons visible only when `filteredHistory.length > 0`, wrapped in a `flex gap-2` container.
- Data scope: uses current `filteredHistory` as-is (all actions, respecting active filters). No extra action filtering.
- Row mapping (`HistoryEntry` -> `RowData` for `preview-print-file.tsx`):
  - `wh` = `"TEST"` (hardcoded test value per user decision).
  - `code` = `entry.productCode`, `name` = `entry.productName`, `qty` = `entry.quantity`, `note` (`NỘI DUNG`) = `entry.details`.
  - `unit` (`ĐVT`) = looked up from `products` table by `productCode` via `getAllProducts()` (`Product.unit`); fallback `"—"` when not found. (User phrasing: "map the quantity field of the product" interpreted as the product's unit field.)
- Header of voucher: unchanged template — `Số: 080`, recipient blank `...`, address `Nhà máy`, date = today (`currentDate` logic already in preview file).
- Open behavior: click -> `sessionStorage.setItem('phieu-xuat-kho', JSON.stringify(rows))` -> `window.open('/history/print', '_blank')` for immediate printing. New route `app/history/print/page.tsx` reads from `sessionStorage` and renders refactored `<PreviewPrintFile rows={...} />` (empty-state message if opened directly).
- Refactor `app/history/preview-print-file.tsx`: accept `props { rows: RowData[] }` instead of internal mock `originalData`; remove demo-only `Tạo 1.000 dòng` / `Khôi phục mẫu` generator; keep zoom + `In phiếu (window.print())` + A4 `@page` CSS. Export `RowData` type.
- No schema change, no change to `lib/constants.ts`; DB reads go through `lib/db.ts` (`getHistoryLog` + `getAllProducts` for unit lookup). Vietnamese UI labels unchanged.

## Feature: Signature Grid Pinned to Bottom of Last Printed Page
- Scope: CSS-only change in `app/history/preview-print-file.tsx`. The 5-signature grid (`.signature-footer`) appears exactly once, at the bottom of the last printed page — it is never repeated on every page.
- Root cause: on screen, `.a4-page` is a flex column and `.content-body { flex-grow: 1 }` pushes the footer down; the `@media print` override switches to `display: block; min-height: auto`, which removes that push so the footer floats right after the table in the PDF.
- Behavior:
  - Short voucher (fits one page) -> signatures sit at the bottom of that page, both on screen and in print/PDF.
  - Long voucher (multiple pages) -> signatures stay together as one unbroken block (`break-inside: avoid` kept) right after the table on the last page. True bottom-fill of the last fragment is not reachable with pure CSS fragmentation, so this is the closest correct behavior without repeating footers.
- Side fix: the preview zoom wrapper's `transform: scale(...)` is reset in print (`transform: none !important`) so a non-100% zoom never shrinks content or adds blank pages to the PDF.
- No data, mapping, route, or DB changes.

## Files
- Modify: `app/history/page.tsx` (filter state, options memo, `<select>` UI, two-layer filter; plus print button + unit lookup + `handlePrintPhieu`).
- Modify: `app/history/preview-print-file.tsx` (props-based rows, remove demo data generator).
- Create: `app/history/print/page.tsx` (new-tab print host reading from `sessionStorage`).
- Create: this spec (`docs/specs/history.md`).

## Manual Test Checklist
1. Admin / 4-warehouse account -> dropdown shows "Tất cả" + 4 names, default "Tất cả", all rows visible.
2. 1-warehouse account -> dropdown shows 1 option, pre-selected, no rows from other warehouses visible.
3. 2-warehouse account -> dropdown shows "Tất cả" + 2 names; "Tất cả" shows only those 2 warehouses' rows.
4. 0-warehouse account -> empty dropdown / no-record notice, no rows visible.
5. Select specific warehouse -> only exact-match rows shown.
6. Clear filter -> dropdown returns to permission-based default.
7. `npm run build` passes.
