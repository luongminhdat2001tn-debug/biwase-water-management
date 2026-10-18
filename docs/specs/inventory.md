# Inventory Page Spec (English)

## Overview
Inventory page (`app/inventory/page.tsx`) shows stock per warehouse (4 tabs).
Shared shell via `components/sidebar.tsx`. All Supabase access via `lib/db.ts`.

## Feature: Edit Moved to Warehouse Page (Removed Here)
- The `Thao tác` (edit) column and the dedicated edit modal ("Sửa Sản Phẩm Tồn Kho")
  were MOVED to `app/warehouse/page.tsx`. Full behavior spec lives in
  `docs/specs/warehouse.md` ("Edit & Delete Action Columns").
- Removed from this page: `Thao tác` header + cells, `isEditModalOpen` /
  `editingProduct` / `editFormData` / `editFormErrors` states, duplicate-check
  code+effects for edit, `handleEdit` / `handleSaveEdit`, image-upload handlers used
  only by the edit modal, and the edit modal JSX.
- Table after the move: `STT, Mã Hàng, Tên Hàng, Số Lượng, Thông tin (Xem), Xóa`
  — 6 columns (7 today). Empty-row `colSpan` changes from `hasEditPermission ? 7 : 5`
  to `hasEditPermission ? 6 : 5`.
- NOT changed: `Xem` detail modal, search, warehouse tabs, `loadAllProducts`, history
  logging on delete.
- Gate note: edit/delete on the warehouse page use `canImport` (`nhap-lieu` or admin).
  A user with only `ton-kho` no longer edits products anywhere (accepted in design review).

## Feature: "Có Hình Ảnh" Column (always visible)
- New read-only column `Có Hình Ảnh` in the product table of `app/inventory/page.tsx`,
  placed **immediately before `Thông tin`**.
- Cell: `<Checkbox checked={!!item.productImage} disabled />`
  (`components/ui/checkbox.tsx`). Ticked when `productImage` is a non-empty string
  (from `product_image_url` via `mapProductFromDB`); unticked otherwise. Display only —
  no click handler, no DB write.
- Not permission-gated (shown to every user who can see the table); the checkbox is
  `disabled`, so no permission is required to render it.
- Table becomes `STT, Mã Hàng, Tên Hàng, Số Lượng, Có Hình Ảnh, Thông tin, Xóa`
  (7 columns with `Xóa`; 6 without).
- Empty-row `colSpan` changes from `hasEditPermission ? 6 : 5` to
  `hasEditPermission ? 7 : 6` (both numbers must move, otherwise the empty state
  misaligns).
- Files: `app/inventory/page.tsx` (+ this spec). No changes to `lib/db.ts`,
  `lib/constants.ts`, schema, history page, or the `Xem` detail modal.

## Feature: Delete Confirm Shows Product Name
- Column `Xóa` stays on this page (unchanged permission gate `ton-kho | them-tai-khoan | admin`).
- Confirm message now injects the product name (same template as warehouse):
  `Bạn có chắc chắn muốn xóa "{product.name}" khỏi tồn kho?`
- Behavior otherwise unchanged: `deleteProduct` (soft delete, `is_deleted: true`),
  `addHistoryEntry` with `action: 'Xóa sản phẩm'`, `quantity`, `details: Xóa {quantity} {unit}`,
  then reload.

## Manual Test Checklist
1. Open Tồn Kho -> pick warehouse -> table shows STT/Mã/Tên/Số Lượng/Thông tin/Xóa;
   NO `Thao tác` column and no edit modal anywhere on this page.
2. Click `Xóa` -> confirm text contains the product name; cancel keeps the row.
3. Confirm -> row removed (soft delete), history row `Xóa sản phẩm` present.
4. User with only `xem-co-ban`-style rights (no `ton-kho`/`them-tai-khoan`/admin):
   `Xóa` column hidden.
5. `Xem` modal still opens with product images and details.
6. Warehouse page (`nhap-lieu` user) shows `Thao tác` + `Xóa`; editing there works
   per `docs/specs/warehouse.md` checklist 11-19.
7. `npm run build` passes.

## Feature: Weight + Unit Display in Detail Modal (` - ` separator)
- In `app/inventory/page.tsx` `Thông Tin Sản Phẩm` modal, the `Khối lượng` field
  renders `{selectedProduct.weight} - {selectedProduct.weightUnit}` (line ~200).
- Examples: `5 - kg`, and `0 - Chưa rõ` for a product saved from the warehouse form
  with the `Chưa rõ` checkbox ticked (`weight 0` + `weightUnit 'Chưa rõ'`).
- No fallback added here: the warehouse form always stores a non-empty unit
  (`kg` or `Chưa rõ`); `lib/db.ts` already falls back to `kg` at the mapper level.
- Files: only `app/inventory/page.tsx` (+ this spec). No `lib/db.ts` change.

## Manual Test Checklist ("Có Hình Ảnh" column)
8. Tồn Kho table shows `Có Hình Ảnh` between `Số Lượng` and `Thông tin`; a product with
   `productImage` shows a ticked (disabled) checkbox, one without shows unticked.
9. Column shows for both a `ton-kho` user and a read-only user; the checkbox cannot be
   clicked (disabled).
10. Warehouse with zero products: empty-state message spans the full table width
   (no misaligned row) for both permission cases.
11. `Xem` on a product -> `Khối lượng` reads `5 - kg` (dash + spaces). On a product
    saved with the warehouse `Chưa rõ` checkbox -> `0 - Chưa rõ`.
12. `npm run build` passes.
