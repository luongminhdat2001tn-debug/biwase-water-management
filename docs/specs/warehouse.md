# Warehouse Page Spec (English)

## Overview
Warehouse management page (`app/warehouse/page.tsx`) for 4 warehouses.
Shared shell via `components/sidebar.tsx`. All Supabase access via `lib/db.ts`.

## Feature: Red Alert for Mandatory Fields in "Nhap Lieu" Form
- Modal: `modalType === 'import'` (used for both create + edit).
- Mandatory fields (7): `code` (Ma hang), `name` (Ten hang), `unit` (Don vi tinh),
  `quantity` (So luong), `weight` (Khoi luong), `location` (Vi tri), `importDate` (Ngay nhap lieu).
- Optional: `weightUnit` (default `kg`), `productImage`, `locationImage`.
- Behavior (approved):
  - On Save (`handleSave`), validate all 7 fields first. If any empty, show inline red alert
    per field and block save (no Supabase calls, no generic `alert()` for missing fields).
  - Visual reuses existing duplicate-warning pattern: input `border-red-500 bg-red-50`
    + message `<p class="text-red-600 text-xs mt-1">...</p>` (Vietnamese).
  - Errors clear live: each input `onChange` clears its own error.
  - `formErrors` reset on modal open (`handleImport`, `handleEdit`) and on close.
  - Duplicate code/name checks unchanged and run only after mandatory check passes.
- Files: only `app/warehouse/page.tsx` (+ this spec).

## Feature: Mandatory Export Reason in "Xuat Kho" Modal (via history_log.details)
- Modal: `modalType === 'export'` in `app/warehouse/page.tsx`, section `THÔNG TIN XUẤT KHO`.
- UI: new `Lý do *` field (Textarea) directly below `Số lượng xuất *` input.
- No schema change: reuse existing `history_log.details` (TEXT). No new column on
  `products` or `history_log`; no change to `Product` interface in `lib/constants.ts`.
- Validation:
  - `Số lượng xuất *`: mandatory, must be > 0 and <= stock. Replaces existing
    `alert()` guards with inline red errors below the quantity input (same visual
    pattern as Nhập liệu form). Messages: empty / <= 0 -> `Vui lòng nhập số lượng xuất lớn hơn 0!`;
    > stock -> `Số lượng tồn kho không đủ! Hiện có: {stock} {unit}`.
    Error clears live on change; blocks save with no DB calls when invalid.
  - `Lý do *`: mandatory. Empty = `''`, `null`, `undefined`, or whitespace-only.
    On `Xác Nhận Xuất Kho` (`handleConfirmExport`), if reason is empty:
  - Show inline red error below the field: `Vui lòng nhập lý do xuất kho!`
    (input `border-red-500 bg-red-50` + message `<p class="text-red-600 text-xs mt-1">...</p>`,
    same pattern as Nhập liệu form). No generic `alert()` for this case.
  - Block save: no `updateProduct` / `addHistoryEntry` calls.
  - Error clears live when user types (`onChange` clears its own error).
  - State (`exportReason`, `exportReasonError`, `exportQuantityError`) resets on modal
    open (`handleExport`), on product re-search, and on close (X / Hủy buttons).
- Save behavior: on valid submit, append reason into the existing `details` message, e.g.
  `Xuất {qty} {unit} — Lý do: {reason}`. History page + Excel export show it via the
  existing `Thông tin chức năng` (`details`) column with no changes needed.
- Files: `app/warehouse/page.tsx` (+ this spec). No changes to `lib/db.ts`,
  `lib/constants.ts`, `supabase/schema.sql`, or history page.

## Feature: Per-Warehouse Tab Visibility (via warehouse permission IDs)
- Tabs render from `visibleWarehouses = WAREHOUSES.filter(w => canAccessWarehouse(user, w.id))`
  (`canAccessWarehouse` / `getAccessibleWarehouseIds` in `lib/constants.ts`;
  admin bypasses, others need the matching ID in `chucNang`).
- Default `selectedWarehouse` is the user's first accessible warehouse in `WAREHOUSES`
  array order (not hardcoded `kho-vat-tu`); initial `loadProducts` loads that warehouse. If the current selection
  ever becomes inaccessible, fall back to the first accessible one.
- Empty access: render a notice card
  `Bạn không có quyền truy cập kho nào. Vui lòng liên hệ quản trị viên.`
  instead of the product table.
- No changes to product search, import/export/addmore modals, `loadProducts`, inventory
  page, history page, sidebar, or auth. Tab filtering inherently scopes data because
  everything loads per selected warehouse.
- Permission IDs are defined in `docs/specs/account.md`.

## Validation Rules
- Empty = `''`, `null`, `undefined`, or whitespace-only for strings.
- `quantity` / `weight`: empty string counts as missing; `0` is treated as missing
  because quantity/weight must be > 0 to save (consistent with export/addmore `<= 0` guards).
- `importDate`: required, `type="date"` input.

## Manual Test Checklist
1. Open Nhap Lieu empty -> Save -> 7 red messages appear, save blocked.
2. Fill fields one by one -> each red clears live.
3. Valid form -> saves and creates history entry.
4. Edit mode: clear one mandatory field -> Save blocked with red.
5. Duplicate code/name warnings still work after mandatory passes.
6. Export: open Xuat Kho, find product, leave So luong empty/0 -> Confirm -> red
   `Vui lòng nhập số lượng xuất lớn hơn 0!`, save blocked; type valid qty -> red clears.
7. Export: enter qty > stock -> Confirm -> red `Số lượng tồn kho không đủ!...`, save blocked.
8. Export: leave Ly do empty -> Confirm -> red
   `Vui lòng nhập lý do xuất kho!` appears, save blocked.
9. Export: valid qty + reason -> quantity decreases and
   history `details` contains `— Lý do: ...` (visible in Lich Su + Excel).
10. `npm run build` passes.
