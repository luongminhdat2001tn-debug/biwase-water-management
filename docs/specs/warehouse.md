# Warehouse Page Spec (English)

## Overview
Warehouse management page (`app/warehouse/page.tsx`) for 4 warehouses.
Shared shell via `components/sidebar.tsx`. All Supabase access via `lib/db.ts`.

## Feature: Red Alert for Mandatory Fields in "Nhap Lieu" Form
- Modal: `modalType === 'import'` (used for both create + edit).
- Mandatory fields (8): `code` (Ma hang), `name` (Ten hang), `unit` (Don vi tinh),
  `quantity` (So luong), `weight` (Khoi luong), `weightUnit` (Don vi khoi luong, non-empty),
  `location` (Vi tri), `importDate` (Ngay nhap lieu).
- Optional: `productImage`, `locationImage`. `weightUnit` still initializes to `kg`,
  but clearing it blocks save with `Vui lòng nhập đơn vị khối lượng`.
- Behavior (approved):
  - On Save (`handleSave`), validate all 8 fields first. If any empty, show inline red alert
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

## Feature: Edit & Delete Action Columns ("Thao tác", "Xóa")
- Table gains two columns at the end of the product table in `app/warehouse/page.tsx`:
  - `Thao tác`: ghost icon button (`Edit2`, title `Sửa`) -> opens the edit modal.
  - `Xóa`: ghost icon button (`Trash2`, title `Xóa`) -> confirm + soft delete.
- Gate (approved): BOTH columns (header `th` + cell) render only when `canImport`
  (`user?.isAdmin || chucNang.includes('nhap-lieu')`) — the same constant already used
  for the header buttons (line ~475). Not `ton-kho`.
  - Accepted consequence (explicitly approved): a user with ONLY `ton-kho` /
    `them-tai-khoan` loses edit/delete ability everywhere once the edit form leaves
    the inventory page. Header buttons keep their existing `nhap-lieu`/`xuat-kho` gates;
    `canAccessWarehouse` tab gating unchanged.
- Column count 6 -> 8; the existing `colSpan={8}` on loading/empty rows already matches,
  no colSpan change needed.

### Edit modal (moved from `app/inventory/page.tsx`, behavior unchanged)
- Dedicated modal `isEditModalOpen` (NOT the Nhập Liệu modal): title `Sửa Sản Phẩm Tồn Kho`.
- Quantity: `disabled`, labeled `Số lượng (không thể sửa)`; banner
  `⚠️ Lưu ý: Số lượng tồn kho KHÔNG được phép thay đổi tại đây.` Save keeps `quantity: editingProduct.quantity`.
- Mandatory (7): `code`, `name`, `unit`, `weight` (> 0), `weightUnit`, `location`,
  `importDate`. Optional: `productImage`, `locationImage`.
  - Validate FIRST on `handleSaveEdit`; any invalid -> inline red per field
    (`border-red-500 bg-red-50` + `⚠️ ... <p>`), block save before any DB call.
  - Messages identical to `docs/specs/inventory.md` (feature moved here verbatim).
  - Each input `onChange` clears its own error; `editFormErrors` reset on modal open.
- Duplicate checks (run only after mandatory passes), unchanged from the inventory spec:
  - Code: global across all 4 warehouses. Keep original value (`normalizeProductCode`
    equal) -> allowed; changed -> `findProductByCode`, hit = duplicate warning naming the
    warehouse (`warehouseNameById`).
  - Name: unique within `selectedWarehouse` only. Keep original (`trim().toLowerCase()`
    equal) -> allowed; changed -> `findProductByNameInWarehouse`, duplicate only when
    `found && found.id !== editingProduct.id`.
  - 400ms debounce live-check + `editLatestCodeRef` / `editLatestNameRef` race guards;
    states reset on open. Save button disabled while
    `isEditSaving || editCheckingCode || editCheckingName || editDuplicateInfo || editDuplicateName`.
- Save: upload new images if files chosen (`uploadImage`), diff old vs new fields into a
  `changes[]` string, `updateProduct`, then `addHistoryEntry` with `action: 'Tồn kho'`,
  `details: changes.join(', ')` (or `Không có thay đổi`), then reload products.

### Delete
- Confirm message (both pages, name injected):
  `Bạn có chắc chắn muốn xóa "{product.name}" khỏi tồn kho?`
- On confirm: `deleteProduct(id)` (soft, `is_deleted: true` — NEVER hard delete),
  then `addHistoryEntry` with `action: 'Xóa sản phẩm'`, `quantity: product.quantity`,
  `details: Xóa {quantity} {unit}` (warehouse delete becomes auditable; it is silent today),
  then `loadProducts(selectedWarehouse)`.

### Removals (one edit form, not two)
- Delete never-rendered `handleEdit` / `handleDelete` (pre-edit versions) from warehouse.
- `Nhập Liệu` modal becomes create-only: unconditional title `Nhập Liệu`, code input
  loses `disabled={!!editingProduct}`, `handleSave` drops the `updateProduct` branch and
  the `if (!editingProduct)` skip around the global code check (always check on create),
  `editingProduct` state (import-modal's) removed. Import/create duplicate checks,
  export, addmore, mandatory-8 validation, and history logging unchanged.
- Files: `app/warehouse/page.tsx` (+ this spec). No changes to `lib/db.ts`,
  `lib/constants.ts`, `supabase/schema.sql`, sidebar, or history page.

## Validation Rules
- Empty = `''`, `null`, `undefined`, or whitespace-only for strings.
- `quantity` / `weight`: empty string counts as missing; `0` is treated as missing
  because quantity/weight must be > 0 to save (consistent with export/addmore `<= 0` guards).
- `importDate`: required, `type="date"` input.

## Manual Test Checklist
1. Open Nhap Lieu empty -> Save -> 7 red messages appear (weightUnit prefilled `kg`), save blocked.
2. Clear Đơn vị khối lượng too -> Save -> 8 red messages including `Vui lòng nhập đơn vị khối lượng`, save blocked.
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

## Manual Test Checklist (Edit & Delete columns)
11. User with `nhap-lieu` (or admin): both `Thao tác` and `Xóa` columns visible on the
    warehouse product table; user without it: both columns hidden (header + cells), while
    `Xem`-style read access and header buttons behave as before.
12. Click `Sửa` -> "Sửa Sản Phẩm Tồn Kho" opens with quantity DISABLED + amber banner;
    the Nhập Liệu modal still opens create-only from the header button (title `Nhập Liệu`,
    code field editable, save creates a new product).
13. Edit: clear one of the 7 mandatory fields -> red inline error, save blocked; retype ->
    red clears live.
14. Edit: change Mã to a code existing in ANOTHER warehouse -> red warning names that
    warehouse, save blocked; keep original Mã -> allowed.
15. Edit: change Tên to a name existing in the SAME warehouse -> red warning, blocked;
    name existing only in another warehouse -> allowed.
16. Edit valid -> product updated, history row with `action = Tồn kho` and change details
    appears in Lịch Sử; quantity unchanged.
17. Click `Xóa` -> confirm shows the product NAME; cancel leaves it, confirm soft-deletes,
    row disappears, history row `action = Xóa sản phẩm` appears.
18. Repeat 11-17 on the Tồn Kho page for its `Xóa` column (name-injected message) and
    confirm `Thao tác`/edit modal are GONE from Tồn Kho.
19. `npm run build` passes.
