# Inventory Plan: Duplicate Check on Edit (English)

Goal: spec `docs/specs/inventory.md` — block duplicate Mã hàng / Tên hàng in "Sửa Sản Phẩm Tồn Kho" modal.
Only `app/inventory/page.tsx` changes. No `lib/db.ts`, schema, or history changes.

## Steps
1. Update imports in `app/inventory/page.tsx`:
   - Add `useRef`, `useEffect` to the existing `react` import (line 3).
   - Extend `lib/db` import (line 10) with `findProductByCode`, `normalizeProductCode`, `findProductByNameInWarehouse`.
2. Add duplicate-check state + helpers (place near `isSaving` state, lines 33-34):
   - `duplicateInfo: { warehouseId: string; warehouseName: string } | null`, `checkingCode: boolean`, `latestCodeRef = useRef('')`.
   - `duplicateName: boolean`, `checkingName: boolean`, `latestNameRef = useRef('')`.
   - `warehouseNameById(id)` resolving via local `WAREHOUSES` array.
   - `checkDuplicateCodeForEdit(code)`: if `normalizeProductCode(code) === normalizeProductCode(editingProduct.code)` -> clear + return null; else query `findProductByCode`, guard with `latestCodeRef`, set `duplicateInfo`.
   - `checkDuplicateNameForEdit(name)`: if `trim().toLowerCase()` equals original -> clear + return false; else query `findProductByNameInWarehouse(name, selectedWarehouse)`; dup = `!!found && found.id !== editingProduct.id`, guard with `latestNameRef`.
   - Two `useEffect` debounce (400ms) hooks on `editFormData.code` / `editFormData.name` (only when `isEditModalOpen && editingProduct`); skip query on empty input.
   - Reset all four states + refs in `handleEdit()` when modal opens.
3. Wire UI in edit modal (lines 323-324):
   - Mã hàng input: conditional class `duplicateInfo ? 'border-red-500 bg-red-50' : ''`; below it show `checkingCode && !duplicateInfo` hint `Đang kiểm tra...` and `duplicateInfo` warning `⚠️ Mã hàng này đã tồn tại (tại {warehouseName}). Vui lòng kiểm tra lại`.
   - Tên hàng input: same pattern with `duplicateName` / `checkingName`, warning `⚠️ Tên hàng này đã tồn tại trong kho này. Vui lòng kiểm tra lại`.
4. Update `handleSaveEdit` (lines 75-134):
   - Before image upload / `updateProduct`, `await` both check functions with current `editFormData` values; if code dup -> `alert('Mã hàng này đã tồn tại. Vui lòng kiểm tra lại')` + `setIsSaving(false)` + return; if name dup -> `alert('Tên hàng này đã tồn tại. Vui lòng kiểm tra lại!')` + return.
   - Disable "Cập Nhật" button (line 369): `disabled={isSaving || checkingCode || checkingName || !!duplicateInfo || duplicateName}`.
5. Verify: `npm run build` + manual checklist items 1-7 in `docs/specs/inventory.md`.

## Scope Guard
- No changes to `lib/db.ts` (reuse existing helpers; soft-deleted rows already excluded).
- No new dependencies, no schema migration, no history-log format change.
- Case-only code change (e.g. `vt01` -> `VT01`) counts as unchanged (normalized equal) and is allowed.

## Plan: Mandatory Fields on Edit (English)

Goal: spec `docs/specs/inventory.md` section "Mandatory Fields on Edit".
Only `app/inventory/page.tsx` changes. No `lib/db.ts` / schema changes.

Steps:
1. Add state in `app/inventory/page.tsx` (near `duplicateInfo` states):
   `editFormErrors: { code?: string; name?: string; unit?: string; weight?: string; weightUnit?: string; location?: string; importDate?: string }`
   + `clearEditFieldError(field)` helper (mirror `clearFieldError` in `app/warehouse/page.tsx:62-69`)
   + `validateEditForm()` reading `editFormData`: code/name/unit/location/importDate = whitespace-only -> error;
   weight = `''/null/undefined` or `Number <= 0` -> `Vui lòng nhập khối lượng lớn hơn 0`;
   weightUnit whitespace-only -> `Vui lòng nhập đơn vị khối lượng`.
2. Reset `editFormErrors` to `{}` in `handleEdit()` alongside duplicate-state reset.
3. UI in edit modal: for each of the 7 inputs add `editFormErrors.x ? 'border-red-500 bg-red-50' : ''`
   combined with existing duplicate red (`duplicateInfo || editFormErrors.code`, etc.) + error `<p>` below.
   Each `onChange` calls `clearEditFieldError('x')` (keep existing `setEditFormData`).
   Weight-unit input lives in the Khối lượng row next to weight input.
4. Update `handleSaveEdit`: after `setIsSaving(true)`, run `validateEditForm()` first;
   if errors -> `setEditFormErrors(errors)`, `setIsSaving(false)`, return early
   (before duplicate checks, uploads, `updateProduct`). Keep duplicate checks after mandatory passes.
5. Verify: `npm run build` + manual checklist items 8-12 in `docs/specs/inventory.md`.

Scope guard: no quantity validation (disabled field), no image validation, no new deps.
