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

## Plan: "Có Hình Ảnh" Column (English)

Goal: spec `docs/specs/inventory.md` section "Có Hình Ảnh" Column — read-only tick column before `Thông tin`.
Only `app/inventory/page.tsx` changes. No `lib/db.ts` / schema changes.

### Task 1: Add the column

**Files:** Modify `app/inventory/page.tsx`

- [ ] **Step 1:** Add `Checkbox` to the imports: `import { Checkbox } from '@/components/ui/checkbox'` (after line 7, near the other `components/ui` imports).
- [ ] **Step 2:** In `<thead>` add, after the `Số Lượng` `<th>` (line 132) and before the `Thông tin` `<th>` (line 133):
      `<th className="text-center py-3 px-4 font-semibold text-gray-700">Có Hình Ảnh</th>`
- [ ] **Step 3:** In the row `<td>` list, after the `Số Lượng` cell (line 146) and before the `Thông tin` cell (line 147):
      `<td className="py-3 px-4 text-center"><Checkbox checked={!!item.productImage} disabled /></td>`
- [ ] **Step 4:** Empty-row colSpan (line 139): `hasEditPermission ? 6 : 5` → `hasEditPermission ? 7 : 6`.
- [ ] **Step 5:** Run `npm run build`; self-review the diff (no other `colSpan` / column-count references left).

### Task 2: Verify

- [ ] **Step 1:** `npm run build` clean.
- [ ] **Step 2:** Manual checklist items 8-11 in `docs/specs/inventory.md`.

### Scope Guard
- No changes to `lib/db.ts`, `lib/constants.ts`, schema, sidebar, `Xem` detail modal, delete gate or history logging.
- Column is not permission-gated; checkbox stays `disabled` (no click handler, no state).

## Plan: Remove Edit Column/Modal + Name-Injected Delete (English)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inventory page loses its `Thao tác` column and edit modal (they now live on the warehouse page); its `Xóa` confirm message shows the product name.

**Architecture:** Pure deletion + one string change in `app/inventory/page.tsx`. The modal's code is preserved on the warehouse page (warehouse plan Tasks 1-4) before this deletion — execute AFTER `docs/plans/warehouse.md` "Edit & Delete Action Columns" Task 2 lands.

**Tech Stack:** Next.js 16 client component. No test framework — verification is `npm run build` + spec manual checklist.

**Spec:** `docs/specs/inventory.md` (both sections).

## Global Constraints
- Soft delete only (`deleteProduct` → `is_deleted: true`); delete column gate unchanged here: `ton-kho | them-tai-khoan | admin`.
- Vietnamese UI text + Vietnamese comments.
- No changes to `lib/db.ts`, `lib/constants.ts`, schema, sidebar.
- `next build` ignores TS errors — self-review diff after build.

## Review Focus
- **Delete message exactness:** confirm must read `Bạn có chắc chắn muốn xóa "{product.name}" khỏi tồn kho?` — name injected, no code/quantity in it.
- **colSpan correctness:** empty-row colSpan drops `hasEditPermission ? 7 : 5` → `hasEditPermission ? 6 : 5`; a wrong colSpan misaligns the empty-state row.
- **No orphaned imports/state:** after removal, `Edit2`, `Save`, `useRef`-for-edit, upload handlers, duplicate-check effects must have zero remaining references (unused imports won't fail the build but pollute the diff).
- **Delete still gated + logged:** `Xóa` column must remain permission-gated and still write `Xóa sản phẩm` history.

---

### Task 1: Remove edit column, modal, and all edit-only code

**Files:**
- Modify: `app/inventory/page.tsx`

**Interfaces:**
- Consumes: nothing (deletion only).
- Produces: page with columns `STT, Mã Hàng, Tên Hàng, Số Lượng, Thông tin, Xóa`.

- [ ] **Step 1:** DELETE state + helpers: `isEditModalOpen`, `editingProduct`, `editFormData`, `productImageFile`/`locationImageFile` (edit-modal-only here), `isSaving`, `duplicateInfo`/`checkingCode`/`latestCodeRef`/`duplicateName`/`checkingName`/`latestNameRef`, `editFormErrors`, `clearEditFieldError`, `validateEditForm`, `checkDuplicateCodeForEdit`, `checkDuplicateNameForEdit`, both 400ms debounce `useEffect`s, `handleEdit`, `handleSaveEdit`, `handleProductImageUpload`, `handleLocationImageUpload`.
- [ ] **Step 2:** DELETE the `Thao tác` `<th>` and its gated `<td>` cell (keep the `Xóa` column + `canEditInventory` gate — rename stays as-is since delete still uses it).
- [ ] **Step 3:** DELETE the Edit Modal JSX block (`{/* Edit Modal ... */}` through its closing `)}`).
- [ ] **Step 4:** Update empty-row colSpan: `hasEditPermission ? 7 : 5` → `hasEditPermission ? 6 : 5`.
- [ ] **Step 5:** Prune now-unused imports (`Edit2`, `Save`, `Upload`, `useRef`, `uploadImage`, `updateProduct`, `findProductByCode`, `normalizeProductCode`, `findProductByNameInWarehouse`) — remove only those with zero remaining references; keep `Eye`, `Trash2`, `deleteProduct`, `addHistoryEntry`, `getAllProducts`.
- [ ] **Step 6:** Run `npm run build`. Expected: clean.

### Task 2: Name-injected delete confirm

**Files:**
- Modify: `app/inventory/page.tsx` (`handleDelete`)

**Interfaces:**
- Consumes: `product` argument already passed in.
- Produces: unchanged signature `handleDelete(product: Product)`.

- [ ] **Step 1:** Change `confirm('Bạn có chắc chắn muốn xóa sản phẩm khỏi tồn kho?')` → `` confirm(`Bạn có chắc chắn muốn xóa "${product.name}" khỏi tồn kho?`) ``. Leave the rest (delete + history + reload) untouched.
- [ ] **Step 2:** Run `npm run build`. Expected: clean.

### Task 3: Verify + commit

- [ ] **Step 1:** `npm run build` + re-read diff (type slips).
- [ ] **Step 2:** Manual checklist items 1-7 in `docs/specs/inventory.md`.
- [ ] **Step 3:** Commit: `git add app/inventory/page.tsx docs/specs/inventory.md docs/plans/inventory.md` → `feat: move edit off inventory page, show name in delete confirm`.

## Scope Guard
- No changes to `lib/db.ts`, `lib/constants.ts`, schema, sidebar, or the Xem detail modal.
- Delete gate (`canEditInventory`) and history logging on delete stay exactly as they are, message aside.

## Plan: Weight + Unit Display in Detail Modal (English)

Goal: spec `docs/specs/inventory.md` section "Weight + Unit Display in Detail Modal".
Only `app/inventory/page.tsx` changes. No `lib/db.ts` / schema changes.

### Task 1: ` - ` separator in the Xem modal

**Files:** Modify `app/inventory/page.tsx` (line ~200)

- [ ] **Step 1:** `Khối lượng` value: `{selectedProduct.weight} {selectedProduct.weightUnit}` → `{selectedProduct.weight} - {selectedProduct.weightUnit}` (` - ` with spaces).
- [ ] **Step 2:** Run `npm run build`. Expected: clean.

### Task 2: Verify

- [ ] **Step 1:** `npm run build` clean.
- [ ] **Step 2:** Manual checklist items 11-12 in `docs/specs/inventory.md`.

### Scope Guard
- No fallback added here — `lib/db.ts`'s `weightUnit: row.weight_unit || 'kg'` already guarantees a non-empty unit.
- No changes to the table columns, delete gate, search, tabs, or history logging.

## Plan: Group Tồn Kho table by Danh mục (English)

Goal: spec `docs/specs/inventory.md` section "Group table by Danh mục". Only
`app/inventory/page.tsx` changes. No `lib/*`, schema, or warehouse-page change.

Reference lines: imports 10-12; `canEditInventory` 29-35; `currentItems`/`filteredItems` 37-42;
table Card 82-137; empty-row `colSpan` 116.

### Task 1: Grouping + accordion state

**Files:** Modify `app/inventory/page.tsx`

- [ ] **Step 1:** Imports: add `ChevronDown, ChevronRight` and `Fragment` (`import { Fragment, useEffect, useState } from 'react'`); drop `Trash2` from `lucide-react` and drop `deleteProduct, addHistoryEntry` from the `@/lib/db` import.
- [ ] **Step 2:** Delete `canEditInventory` and `hasEditPermission` (unused after the `Xóa` column is gone).
- [ ] **Step 3:** Add state `const [openCategory, setOpenCategory] = useState<string | null>(null)`; reset it to `null` when the warehouse changes (in the tab `onClick`, next to `setSelectedWarehouse`).
- [ ] **Step 4:** After `filteredItems`, derive `const isSearching = searchTerm.trim() !== ''` and group:
      `const categoryGroups = (() => { const map = new Map<string, { name: string; total: number; items: Product[] }>(); for (const item of filteredItems) { const key = (item.categoryName || '').trim() || 'Chưa phân loại'; const group = map.get(key) || { name: key, total: 0, items: [] }; group.total += item.quantity; group.items.push(item); map.set(key, group) } return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi')) })()`.
      Vietnamese comment: `// Gom sản phẩm theo danh mục; danh mục trống (dữ liệu cũ) -> "Chưa phân loại"`.

### Task 2: Parent table + nested subtable

**Files:** Modify `app/inventory/page.tsx`

- [ ] **Step 1:** Replace the existing `<thead>`: 3 columns `STT` (center, `w-16`), `Tên Danh Mục` (left), `Tổng Số Lượng` (right).
- [ ] **Step 2:** Replace the `<tbody>` body: empty state -> one row `colSpan={3}` keeping the current `Archive` icon + `Không có sản phẩm tồn kho`; otherwise map `categoryGroups` and return a `Fragment key={group.name}` containing:
      the parent row (`STT` = `index + 1`, name cell = `<button>` with `ChevronRight` when closed / `ChevronDown` when open + `group.name`, total cell = `group.total.toLocaleString()` right-aligned), then
      `{isOpen && (<tr><td colSpan={3} className="p-0"><div className="bg-gray-50 p-4"><table className="w-full text-sm"><thead>STT, Mã Hàng, Tên Hàng, Số Lượng, Có Hình Ảnh, Thông Tin</thead><tbody>{group.items.map((item, i) => ... )}</tbody></table></div></td></tr>)}`.
      Subtable cells are copied verbatim from today's row body (code, name, `quantity + unit`, disabled `Checkbox`, `Xem` button calling `handleViewDetail(item)`), with `STT` = `i + 1`.
- [ ] **Step 3:** `const isOpen = isSearching || openCategory === group.name`; button `onClick={() => setOpenCategory(prev => prev === group.name ? null : group.name)}` (during search the visual stays open; the click only updates the remembered accordion state).
- [ ] **Step 4:** Update the table comment above the Card to describe the grouped layout.

### Task 3: Verify

- [ ] **Step 1:** `npx tsc --noEmit` clean, then `npm run build` clean.
- [ ] **Step 2:** Manual checklist items 13-21 in `docs/specs/inventory.md`.

### Scope Guard
- No `lib/db.ts` / `lib/constants.ts` / schema change; no `Danh mục` row in the detail modal; no unit shown on `Tổng Số Lượng`.
- Search predicate and warehouse tabs unchanged; `Xem` modal unchanged.
