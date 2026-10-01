# Inventory Page Spec (English)

## Overview
Inventory page (`app/inventory/page.tsx`) shows stock per warehouse (4 tabs).
Shared shell via `components/sidebar.tsx`. All Supabase access via `lib/db.ts`.
Edit flow: `handleEdit(product)` -> edit modal "Sửa Sản Phẩm Tồn Kho" -> `handleSaveEdit()` -> `updateProduct()`.

## Feature: Duplicate Check for "Mã hàng" and "Tên hàng" on Edit
- Modal: edit modal in `app/inventory/page.tsx` (`isEditModalOpen`, `editingProduct`, `editFormData`).
- Current behavior (gap): `handleSaveEdit` updates `code` / `name` with no duplicate check.
- Approved behavior:
  - `Mã hàng` (code) must be unique across the WHOLE system (all 4 warehouses), mirroring `app/warehouse/page.tsx` import flow.
    - Keep current value: `normalizeProductCode(newCode) === normalizeProductCode(originalCode)` -> allowed, no DB query needed.
    - Changed value: query `findProductByCode(newCode)` from `lib/db.ts`; any result = duplicate (codes are globally unique, so the hit must be another product).
  - `Tên hàng` (name) must be unique within the CURRENT warehouse (`selectedWarehouse`), mirroring warehouse flow. Same name in a different warehouse is allowed.
    - Keep current value: `trim().toLowerCase()` equal to original -> allowed.
    - Changed value: query `findProductByNameInWarehouse(newName, selectedWarehouse)`; duplicate only when `found && found.id !== editingProduct.id`.
  - Normalization: code = `trim().toUpperCase()` via `normalizeProductCode`; name = `trim()` (compare case-insensitive). Soft-deleted rows (`is_deleted: true`) are already excluded by the `lib/db.ts` helpers.
- UX (mirror `app/warehouse/page.tsx` duplicate pattern):
  - Live check on typing with 400ms debounce + `latestRef` guard against race.
  - States: `duplicateInfo/checkingCode` (code), `duplicateName/checkingName` (name). Reset on `handleEdit()` open.
  - Visual: input `border-red-500 bg-red-50` + message `<p class="text-red-600 text-xs mt-1">...</p>` in Vietnamese:
    - Code: `⚠️ Mã hàng này đã tồn tại (tại {warehouseName}). Vui lòng kiểm tra lại`
    - Name: `⚠️ Tên hàng này đã tồn tại trong kho này. Vui lòng kiểm tra lại`
  - Block save: disable "Cập Nhật" button while `checkingCode || checkingName || duplicateInfo || duplicateName`; `handleSaveEdit` re-checks both before `updateProduct` and shows `alert()` + returns early on duplicate.
- Files: only `app/inventory/page.tsx` (+ this spec). No change to `lib/db.ts`, `lib/constants.ts`, schema, or history logging (existing `changes` log stays as-is).

## Validation Rules
- `editingProduct === null` or empty input -> skip duplicate query (no false positive).
- Warehouse name for code warning resolved via local `WAREHOUSES` list (`warehouseNameById`).

## Feature: Mandatory Fields on Edit ("Sửa Sản Phẩm Tồn Kho")
- Modal: same edit modal in `app/inventory/page.tsx`.
- Mandatory (7): `code` (Mã hàng), `name` (Tên hàng), `unit` (Đơn vị tính),
  `weight` (Khối lượng, must be > 0), `weightUnit` (Đơn vị khối lượng, non-empty),
  `location` (Vị trí), `importDate` (Ngày nhập liệu).
- Optional: `productImage` (Ảnh sản phẩm), `locationImage` (Ảnh vị trí).
- Skipped: `quantity` (Số lượng) — disabled in edit modal, kept unchanged.
- Behavior (approved, mirrors `app/warehouse/page.tsx` import form):
  - On save (`handleSaveEdit`), validate all 7 mandatory fields FIRST. If any invalid,
    show inline red alert per field and block save (no image upload, no duplicate DB
    checks, no `updateProduct` / `addHistoryEntry` calls, no generic `alert()` for missing fields).
  - Visual reuses duplicate-warning pattern: input `border-red-500 bg-red-50`
    + message `<p class="text-red-600 text-xs mt-1 font-medium">⚠️ ...</p>` (Vietnamese).
    Combined with duplicate red: `duplicateInfo || editFormErrors.code`, etc.
  - Errors clear live: each input `onChange` clears its own error.
  - `editFormErrors` reset on modal open (`handleEdit`).
  - Duplicate code/name checks run only AFTER mandatory check passes.
  - Messages: `Vui lòng nhập mã hàng` / `Vui lòng nhập tên hàng` /
    `Vui lòng nhập đơn vị tính` / `Vui lòng nhập khối lượng lớn hơn 0` /
    `Vui lòng nhập đơn vị khối lượng` / `Vui lòng nhập vị trí` /
    `Vui lòng chọn ngày nhập liệu`.
- Files: only `app/inventory/page.tsx` (+ this spec).

## Manual Test Checklist
1. Open Tồn Kho -> pick warehouse -> click edit (Sửa) on a product -> keep Mã + Tên unchanged -> Cập Nhật succeeds.
2. Change Mã to a code existing in ANOTHER warehouse -> red warning with warehouse name appears, Cập Nhật disabled/blocked.
3. Change Mã to a brand-new code -> no warning, save succeeds.
4. Change Tên to a name existing in the SAME warehouse (another product) -> red warning, save blocked.
5. Change Tên to a name existing only in a DIFFERENT warehouse -> allowed, save succeeds.
6. Type fast in Mã/Tên fields -> no stale warning (race guard works).
7. `npm run build` passes.

## Manual Test Checklist (Mandatory Fields)
8. Open edit modal -> clear Mã hàng -> Cập Nhật -> red `Vui lòng nhập mã hàng`, save blocked.
9. Clear each of Tên / Đơn vị tính / Khối lượng (set 0 or empty) / Đơn vị khối lượng / Vị trí / Ngày nhập liệu one by one -> matching red message each time, save blocked.
10. Retype into a red field -> its red clears live.
11. All 7 valid but duplicate Mã/Tên -> duplicate warning still blocks (mandatory passes first).
12. `npm run build` passes.
