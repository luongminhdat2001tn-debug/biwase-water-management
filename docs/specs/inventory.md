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

## Feature: Group table by Danh mục (empty categories collapsed)
- Parent table replaces the flat product table for the selected warehouse. Columns:
  `STT | Tên Danh Mục | Tổng Số Lượng` (3 columns).
- Grouping: from `filteredItems` (existing search filter, unchanged predicate on product
  name/code), group by `categoryName` trimmed; empty/whitespace falls back to
  `Chưa phân loại` (legacy rows created before the category field existed).
  Category order: `localeCompare('vi')` ascending. Product order inside a group: the
  existing order from `getAllProducts()` (name ascending).
- `Tổng Số Lượng`: plain `sum(quantity)` of the group, rendered right-aligned with
  `toLocaleString()`. Accepted ceiling: quantities of different units are summed as
  numbers, no unit shown on the parent row.
- Expand/collapse (accordion): single-open state `openCategory: string | null`.
  Name cell renders a `<button>` with `ChevronRight` (closed) / `ChevronDown` (open) +
  the category name. Clicking an open category closes it; clicking another one closes
  the previous.
- Search interaction: when `searchTerm` is non-empty, only categories that contain a
  matching product are rendered, and ALL of them render expanded (auto-open), ignoring
  `openCategory` until the search is cleared. Groups with no match are hidden.
- Subtable (rendered in a `<tr><td colSpan={3}>` directly under its category row, nested
  `<table>`): `STT | Mã Hàng | Tên Hàng | Số Lượng | Có Hình Ảnh | Thông Tin`, cells
  identical to the current table (`quantity + unit`, disabled `Checkbox` for
  `productImage`, `Xem` button opening the existing detail modal). `STT` restarts at 1
  in each category.
- Empty state: no products at all -> single row `colSpan={3}` with the existing
  `Không có sản phẩm tồn kho` message.
- Removed: the `Xóa` column and its permission gate (`canEditInventory`,
  `deleteProduct` / `addHistoryEntry` imports, `Trash2`). Deleting a product stays
  available on the Quản Lý Kho page (`nhap-lieu` / admin).
- Unchanged: warehouse tabs + product counts, search input, `loadAllProducts`,
  `Xem` detail modal (no `Danh mục` row added).
- Files: `app/inventory/page.tsx` (+ this spec). No `lib/db.ts`, `lib/constants.ts`,
  schema, or warehouse-page change.

## Manual Test Checklist (grouped table)
13. Tồn Kho -> a warehouse with products in several categories: parent rows are unique
    category names sorted A→Z, each total equals the sum of its products' quantities.
14. Click a category -> subtable appears with STT restarting at 1 and the 6 columns
    (`Mã Hàng`, `Tên Hàng`, `Số Lượng`, `Có Hình Ảnh`, `Thông Tin`); click again -> closes.
15. Click category A then B -> A closes, B opens (accordion).
16. Type a product name/code -> only matching categories remain and are already expanded;
    clear search -> back to accordion with `openCategory` state.
17. Product created before categories existed (`category_name` empty) -> grouped under
    `Chưa phân loại`.
18. `Xóa` column gone for both `ton-kho` and admin users; warehouse page still deletes.
19. `Xem` opens the same detail modal as before.
20. Warehouse with zero products -> empty state spans the full parent width.
21. `npm run build` passes.

## Feature: Full-size image lightbox in `Thông Tin Sản Phẩm`
- Both image blocks in the detail modal (`📷 Hình ảnh sản phẩm` = `productImage`,
  `📍 Ảnh vị trí kho` = `locationImage`) get a `Xem ảnh` button (`Maximize2` icon,
  ghost/sm, blue) in the same row as the block label. The block (and therefore the
  button) only renders when the image URL exists — unchanged condition.
- Clicking sets `lightboxImage: { src, alt } | null`; a fixed overlay
  (`fixed inset-0 z-[60] bg-black/90`, above the detail modal's `z-50`) renders the image
  with `max-w-full max-h-full object-contain` so nothing is cropped (the modal itself
  crops with `object-cover` + fixed heights).
- Close: `X` button top-right, clicking the dark backdrop, or `Esc`
  (`keydown` listener added only while `lightboxImage` is set, removed on cleanup).
- Lightbox renders only when `isDetailModalOpen && lightboxImage` -> closing the detail
  modal hides it too (no stale overlay on next open).
- Accepted ceiling: no pinch-zoom / pan / download / next-image navigation; the browser
  has no native zoom for the overlay. Add a zoom library only if product photos need
  detail inspection.
- Files: `app/inventory/page.tsx` (+ this spec). No `lib/*`, schema, or DB change.

## Manual Test Checklist (image lightbox)
22. Open `Xem` on a product with both images -> each block shows `Xem ảnh`; products
    missing an image show no block and no button.
23. Click `Xem ảnh` on `Hình ảnh sản phẩm` -> full-screen overlay shows the whole,
    uncropped image; the detail modal is not visible/blocking.
24. Close via `X` -> back to the detail modal with content intact; repeat with clicking
    the black backdrop and with `Esc`.
25. Open the location image lightbox -> shows the location image (not the product image).
26. Close the detail modal while the lightbox is open -> next `Xem` on any product shows
    no leftover overlay.
27. `npm run build` passes.
