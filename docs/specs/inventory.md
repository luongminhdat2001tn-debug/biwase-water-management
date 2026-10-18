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
