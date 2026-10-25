# Warehouse Plan: Mandatory-Field Red Alerts (English)

## Steps
1. Add `formErrors` state in `app/warehouse/page.tsx`:
   `useState<{ code?: string; name?: string; unit?: string; quantity?: string; weight?: string; weightUnit?: string; location?: string; importDate?: string }>({})`.
2. Add `validateForm()` returning errors object for the 8 mandatory fields
   (code, name, unit, quantity, weight, weightUnit, location, importDate).
   Vietnamese messages, e.g. `Vui lòng nhập mã hàng`, `Vui lòng nhập đơn vị khối lượng`.
3. Update `handleSave`: run `validateForm()` first; if errors -> `setFormErrors`, return early.
   Keep duplicate code/name checks after mandatory check.
4. Wire UI: for each of the 8 inputs, conditional class
   `formErrors.x ? 'border-red-500 bg-red-50' : ''` + error `<p>` below.
   Each `onChange` clears its own key from `formErrors` (including weightUnit input).
5. Reset `formErrors` in `handleImport`, `handleEdit`, and modal close (X / Huy buttons).
6. Verify: `npm run build` + manual checklist in `docs/specs/warehouse.md`.

## Scope Guard
- No changes to `lib/db.ts`, Supabase schema, auth, or other modals (export/addmore).
- No new dependencies.

## Plan: Export Reason + Quantity Inline Validation (English)

Goal: spec `docs/specs/warehouse.md` section "Mandatory Export Reason in Xuat Kho Modal".
Only `app/warehouse/page.tsx` changes. No DB/schema/history-page changes.

Steps:
1. Import `Textarea` (shadcn) in `app/warehouse/page.tsx` if not already present.
2. Add state: `exportReason: string`, `exportReasonError: string`,
   `exportQuantityError: string`. Reset all three in `handleExport`,
   in `handleSearchExportCode` (when product found / not found), and on modal
   close (X / Hủy buttons).
3. UI in `THÔNG TIN XUẤT KHO`, below `Số lượng xuất *` input:
   - Quantity input: conditional class when `exportQuantityError`
     (`border-red-500 bg-red-50`) + error `<p>` below; `onChange` clears
     `exportQuantityError`.
   - New `Textarea` labeled `Lý do *` with same conditional red style for
     `exportReasonError`; `onChange` clears `exportReasonError`.
4. Update `handleConfirmExport`:
   - Keep `if (!foundProduct)` alert.
   - Replace `exportQuantity <= 0` alert with `setExportQuantityError('Vui lòng nhập số lượng xuất lớn hơn 0!')` + return.
   - Replace `exportQuantity > stock` alert with
     `setExportQuantityError(\`Số lượng tồn kho không đủ! Hiện có: ...\`)` + return.
   - Add reason guard: `if (!exportReason.trim())` ->
     `setExportReasonError('Vui lòng nhập lý do xuất kho!')` + return.
   - On success: `details: \`Xuất {qty} {unit} — Lý do: {reason.trim()}\``.
5. Verify: `npm run build` + manual checklist items 6-10 in `docs/specs/warehouse.md`.

Scope guard: no `Product` interface change, no `lib/db.ts` change, no migration,
history page reads existing `details` column.

## Plan: Per-Warehouse Tab Visibility (English)

**Goal:** Warehouse page shows only tabs + data the account may access.

**Architecture:** Filter the existing local `WAREHOUSES` array with
`canAccessWarehouse` from Task 1 (`docs/plans/account.md`); default selection and
fallback follow the filtered list; empty list renders a notice card.

**Tech Stack:** Next.js 16 client component, existing `lib/db.ts` loaders.

**Spec:** `docs/specs/warehouse.md` section "Per-Warehouse Tab Visibility";
IDs + access rule in `docs/specs/account.md`.

### Task 3: Filter tabs + default selection in `app/warehouse/page.tsx`

**Files:**
- Modify: `app/warehouse/page.tsx` (tab list, selection state, empty notice)

**Interfaces:**
- Consumes: `canAccessWarehouse` from `lib/constants.ts` (Task 1).
- Produces: filtered tab UI; no new exports.

- [ ] Step 1: Import `canAccessWarehouse` from `@/lib/constants`. After `user` is set, compute `visibleWarehouses = WAREHOUSES.filter(w => canAccessWarehouse(user, w.id))` (guard `user === null` with full list until session loads to avoid flash of notice).
- [ ] Step 2: Default `selectedWarehouse` to the first accessible warehouse in `WAREHOUSES` order once `user` loads (replace hardcoded `'kho-vat-tu'` initial + mount-time `loadProducts('kho-vat-tu')`).
- [ ] Step 3: Add fallback — if `selectedWarehouse` is not in the accessible list, reset to the first accessible one (covers mid-session permission change).
- [ ] Step 4: Render tabs from `visibleWarehouses`; when empty, render notice card `Bạn không có quyền truy cập kho nào. Vui lòng liên hệ quản trị viên.` instead of the product table card.
- [ ] Step 5: Run `npm run build`. Expected: builds clean; re-read diff for type slips (build ignores them).
- [ ] Step 6: Manual checklist from `docs/specs/account.md` items 2-5 (1-tab account, 2-tab switching, no-access notice, admin sees all).
- [ ] Step 7: Commit (`git add app/warehouse/page.tsx`, message `feat: filter warehouse tabs by permission`).

## Plan: Edit & Delete Action Columns (English)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Warehouse page becomes the only place to edit products (dedicated edit modal) and gains a delete column; inventory loses its edit column/modal.

**Architecture:** Move inventory's existing edit modal (state, validation, duplicate checks, handlers, JSX) into `app/warehouse/page.tsx` unchanged in behavior, gate both new columns with the existing `canImport` constant, and delete warehouse's dead edit path so the Nhập Liệu modal is create-only.

**Tech Stack:** Next.js 16 client component; existing `lib/db.ts` helpers (`updateProduct`, `deleteProduct`, `addHistoryEntry`, `uploadImage`, `findProductByCode`, `findProductByNameInWarehouse`, `normalizeProductCode`). No test framework in repo — verification is `npm run build` + spec manual checklist.

**Spec:** `docs/specs/warehouse.md` section "Edit & Delete Action Columns" (read it before implementing; the spec carries exact messages, field lists, and gate semantics).

## Global Constraints
- Gate for BOTH new columns: `canImport` (`user?.isAdmin || chucNang.includes('nhap-lieu')`), already defined at `app/warehouse/page.tsx:475`.
- Soft delete only: `deleteProduct(id)` sets `is_deleted: true`. Never delete the `is_admin` account; never hard-delete rows.
- Vietnamese UI text + Vietnamese code comments (repo convention).
- No changes to `lib/db.ts`, `lib/constants.ts`, `supabase/schema.sql`, sidebar, history page.
- `next build` ignores TS errors — self-review the diff for type slips after every build.

## Review Focus
- **Quantity must stay immutable on edit:** a stale form or double-save must never write a changed `quantity` — save always passes `quantity: editingProduct.quantity`.
- **Duplicate-check race guards:** fast typing in Mã/Tên must not show a stale warning — `editLatestCodeRef`/`editLatestNameRef` guards carried over from inventory must survive the move.
- **Import modal after edit-branch removal:** create flow must still run the global code-duplicate check (it was previously skipped only when `editingProduct` was set) and must still create + log history.
- **Permission boundary:** non-`nhap-lieu` user sees neither `Thao tác` nor `Xóa` header/cells; `nhap-lieu`-without-`xuat-kho` user still can't export (header gate unchanged).
- **Delete audit trail:** warehouse delete must write `Xóa sản phẩm` history exactly once per confirm (no double-fire from double-click).

---

### Task 1: Gate + two new columns in the product table

**Files:**
- Modify: `app/warehouse/page.tsx` (table `<thead>` ~line 578-586, `<tbody>` rows ~line 598-621)

**Interfaces:**
- Consumes: `canImport` (defined later in render, line ~475 — hoist it above the `return` if JSX needs it earlier; it already sits above `return`, verify order when editing).
- Produces: nothing new; columns call `handleEdit`/`handleDeleteProduct` added in Task 2/3.

- [ ] **Step 1:** In `<thead>` after the `Vị Trí` header, add `{canImport && <th className="text-center py-3 px-4 font-semibold text-gray-700">Thao tác</th>}` and the same for `Xóa`.
- [ ] **Step 2:** In each row `<td>` after the location cell, add gated cells: edit button `<Button variant="ghost" size="sm" onClick={() => handleEdit(item)} className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600" title="Sửa"><Edit2 className="h-4 w-4" /></Button>` and delete button (same shape, `handleDeleteProduct(item)`, `hover:bg-red-100 text-red-600`, `title="Xóa"`, `Trash2`).
- [ ] **Step 3:** Confirm `colSpan={8}` on loading/empty rows still matches (6 existing + 2 new = 8; no edit expected).
- [ ] **Step 4:** Run `npm run build`. Expected: builds clean (functions referenced don't exist yet → add `// @ts-expect-error removed in Task 2/3` stubs OR execute tasks 1-3 before committing; prefer implementing Tasks 1-3 as one commit).

### Task 2: Move edit modal state + handlers + JSX from inventory

**Files:**
- Modify: `app/warehouse/page.tsx` (state block, handlers, modal JSX)
- Source to copy from: `app/inventory/page.tsx` (edit-only blocks — they are deleted from there in `docs/plans/inventory.md` Task 1, so copy BEFORE that deletion or from git history)

**Interfaces:**
- Consumes: `updateProduct`, `deleteProduct`, `addHistoryEntry`, `uploadImage`, `findProductByCode`, `normalizeProductCode`, `findProductByNameInWarehouse` (all already imported), `WAREHOUSES` local array, `loadProducts`, `currentWarehouse`.
- Produces: `handleEdit(product: Product): void` (opens edit modal), `handleSaveEdit(): Promise<void>`, `isEditModalOpen`, `editingProduct`, `editFormData`, `editFormErrors`.

- [ ] **Step 1:** Copy into warehouse's state block: `isEditModalOpen`, `editingProduct` (rename warehouse's existing import-modal `editingProduct` usage — it is removed in Task 4; the moved state takes the name), `editFormData`, `editProductImageFile`/`editLocationImageFile` (distinct from import-modal's `productImageFile`/`locationImageFile`), `isEditSaving`, `editFormErrors`, `clearEditFieldError`, `validateEditForm`, `editDuplicateInfo`/`editCheckingCode`/`editLatestCodeRef`/`editDuplicateName`/`editCheckingName`/`editLatestNameRef`, `checkEditDuplicateCode`, `checkEditDuplicateName`, the two 400ms debounce `useEffect`s. Note: warehouse already has `warehouseNameById` — do NOT copy a duplicate.
- [ ] **Step 2:** Copy `handleEdit` (renamed body opens `setIsEditModalOpen(true)` instead of the import modal), `handleSaveEdit`, `handleProductImageUpload`/`handleLocationImageUpload` — warehouse already has same-named upload handlers wired to `formData`; rename the moved pair to `handleEditProductImageUpload`/`handleEditLocationImageUpload` and have them write `editFormData` + `editProductImageFile`/`editLocationImageFile`.
- [ ] **Step 3:** Copy the edit modal JSX block from inventory verbatim (`{/* Edit Modal ... */}` through its closing `)}`), inserting it after the import modal. Adapt only: history log uses `warehouse: currentWarehouse?.name || ''` (already true) and `loadProducts(selectedWarehouse)` instead of `loadAllProducts()`.
- [ ] **Step 4:** Run `npm run build`. Expected: builds clean; self-review diff for duplicated names (`warehouseNameById`, upload handlers).

### Task 3: Delete with name-injected confirm + history log

**Files:**
- Modify: `app/warehouse/page.tsx` (replace dead `handleDelete` at ~line 368)

**Interfaces:**
- Consumes: `deleteProduct`, `addHistoryEntry`, `loadProducts`, `currentWarehouse`, `user`.
- Produces: `handleDeleteProduct(product: Product): Promise<void>` (takes full product, not just id, for name/quantity in message + log).

- [ ] **Step 1:** Replace the dead `handleDelete(productId: number)` with `handleDeleteProduct(product: Product)` body: `confirm(\`Bạn có chắc chắn muốn xóa "${product.name}" khỏi tồn kho?\`)` → `deleteProduct(product.id)` → `addHistoryEntry({ date/time vi-VN, warehouse: currentWarehouse?.name || '', productCode: product.code, productName: product.name, userName: user?.name || user?.username || '', action: 'Xóa sản phẩm', quantity: product.quantity, details: \`Xóa ${product.quantity} ${product.unit}\` })` → `loadProducts(selectedWarehouse)`.
- [ ] **Step 2:** Run `npm run build`. Expected: clean.

### Task 4: Remove dead edit path; import modal becomes create-only

**Files:**
- Modify: `app/warehouse/page.tsx` (dead `handleEdit` pre-move, import modal JSX ~line 634-831, `handleSave` ~line 376-447, duplicate-check `useEffect`s)

**Interfaces:**
- Consumes: Task 2's `handleEdit`/`editingProduct` (edit-modal's own state).
- Produces: create-only import flow — `handleImport()` unchanged signature.

- [ ] **Step 1:** Delete warehouse's ORIGINAL `handleEdit` (opens import modal, ~line 345-365) — superseded by Task 2's version.
- [ ] **Step 2:** Import modal edits: title → `Nhập Liệu` (drop `{editingProduct ? ... : ...}`); remove `disabled={!!editingProduct}` on code input; guard conditions in the two duplicate-check `useEffect`s drop `|| editingProduct` (edit modal has its own effects now); remove `editingProduct`-conditional skip in `handleSave` around `checkDuplicateGlobally` (always run it); remove the entire `if (editingProduct) { ... updateProduct ... } else {` wrapper in `handleSave` keeping only the create branch; save-button label → `isSaving ? 'Đang lưu...' : 'Nhập Liệu'`.
- [ ] **Step 3:** Remove import-modal-only `editingProduct` state ONLY IF Task 2 renamed its state (check for `useState<Product | null>` duplicates — two `editingProduct` declarations won't compile).
- [ ] **Step 4:** Run `npm run build`. Expected: clean. Grep `app/warehouse/page.tsx` for `editingProduct` — every remaining use must belong to the edit modal (edit-modal state), not the import modal.

### Task 5: Verify + commit

- [ ] **Step 1:** `npm run build`. Expected: clean; re-read full diff for type slips (build ignores TS).
- [ ] **Step 2:** Manual checklist items 11-19 in `docs/specs/warehouse.md` (gate hidden columns, quantity locked, 7 mandatory, both duplicate checks, create-only import, name-in confirm, history rows).
- [ ] **Step 3:** Commit: `git add app/warehouse/page.tsx docs/specs/warehouse.md docs/plans/warehouse.md` → `feat: move product edit + add delete column to warehouse page`.

## Scope Guard
- No changes to `lib/db.ts`, `lib/constants.ts`, schema, sidebar, history page, or export/addmore modals.
- No new dependencies. No quantity validation anywhere on edit (field disabled).

## Plan: "Chưa rõ" Unit Value + ` - ` Display Format (English)

Goal: spec `docs/specs/warehouse.md` sections ""Chưa rõ" Weight Checkbox" (updated
`weightUnit` value) and "Weight + Unit Display Format". No `lib/db.ts` / schema change:
`'Chưa rõ'` is truthy, so `weight_unit: product.weightUnit || 'kg'` stores it as-is.

### Task 1: Tick stores unit `Chưa rõ`

**Files:** Modify `app/warehouse/page.tsx`

- [ ] **Step 1:** `handleToggleWeightUnknown` (~line 78): `weightUnit: 'kg'` → `weightUnit: checked ? 'Chưa rõ' : 'kg'`.
- [ ] **Step 2:** `handleToggleEditWeightUnknown` (~line 229): same one-token change.
- [ ] **Step 3:** `handleEdit` (~line 506): `weightUnit: unknown ? 'kg' : (product.weightUnit || 'kg')` → `weightUnit: unknown ? 'Chưa rõ' : (product.weightUnit || 'kg')`.

### Task 2: ` - ` separator in all three renderings

- [ ] **Step 1:** Table row (~line 879): `{item.weight} {item.weightUnit || 'kg'}` → `{item.weight} - {item.weightUnit || 'kg'}`.
- [ ] **Step 2:** Xuất kho summary (~line 1242): `` `${foundProduct.weight} ${foundProduct.weightUnit || 'kg'}` `` → `` `${foundProduct.weight} - ${foundProduct.weightUnit || 'kg'}` ``.
- [ ] **Step 3:** Edit-history diff (~line 570): `` `Khối lượng: ${old.weight}${old.weightUnit || 'kg'} → ${editFormData.weight}${editFormData.weightUnit}` `` → `` `Khối lượng: ${old.weight} - ${old.weightUnit || 'kg'} → ${editFormData.weight} - ${editFormData.weightUnit}` ``.

### Task 3: Verify

- [ ] **Step 1:** `npm run build` clean.
- [ ] **Step 2:** Manual checklist items 29-32 in `docs/specs/warehouse.md`.

### Scope Guard
- Untick still resets the unit to `kg` and weight to empty (rule applies again).
- No change to `validateForm` / `validateEditForm`, the checkbox disable logic, or `lib/*`.

## Plan: "Chưa rõ" Weight Checkbox (English)

Goal: spec `docs/specs/warehouse.md` section "Chưa rõ" Weight Checkbox — both forms in
`app/warehouse/page.tsx`. No `lib/db.ts`, `lib/constants.ts`, schema, or history changes.

Reference lines: import `formData` 42-53, `validateForm` 73-84 (weight checks 79-80),
`handleImport` reset 339, import modal JSX 950-977 | `editFormData` 181-183,
`validateEditForm` 206-216 (211-212), `handleEdit` 457-479, edit modal JSX 1090-1098.

### Task 1: Nhập Liệu form

**Files:** Modify `app/warehouse/page.tsx`

- [ ] **Step 1:** Add state next to the `formErrors` block: `const [weightUnknown, setWeightUnknown] = useState(false)`.
- [ ] **Step 2:** Add the toggle handler next to `clearFieldError`:
      `const handleToggleWeightUnknown = (checked: boolean) => { setWeightUnknown(checked); setFormData({ ...formData, weight: checked ? 0 : '' as any, weightUnit: 'kg' }); setFormErrors((prev) => { if (!prev.weight && !prev.weightUnit) return prev; const next = { ...prev }; delete next.weight; delete next.weightUnit; return next }) }`
      (Vietnamese comment: `// Tick "Chưa rõ" -> khối lượng 0 kg và khóa 2 ô nhập`).
- [ ] **Step 3:** `validateForm()`: wrap lines 79-80 in `if (!weightUnknown) { ... }`.
- [ ] **Step 4:** `handleImport()`: add `setWeightUnknown(false)` next to `setFormErrors({})`.
- [ ] **Step 5:** Import modal JSX (950-977): replace the `Khối lượng *` label with a flex row
      (label + `Chưa rõ` `<Checkbox checked={weightUnknown} onCheckedChange={(v) => handleToggleWeightUnknown(!!v)} />`);
      add `disabled={weightUnknown}` and `${weightUnknown ? 'bg-gray-100 cursor-not-allowed' : ''}` to BOTH inputs.

### Task 2: Sửa Sản Phẩm Tồn Kho form

- [ ] **Step 1:** Add state next to `editFormErrors`: `const [editWeightUnknown, setEditWeightUnknown] = useState(false)`.
- [ ] **Step 2:** Add `handleToggleEditWeightUnknown` mirroring Task 1 Step 2 (writes `editFormData`, clears `editFormErrors.weight` / `.weightUnit`).
- [ ] **Step 3:** `validateEditForm()`: wrap lines 211-212 in `if (!editWeightUnknown) { ... }`.
- [ ] **Step 4:** `handleEdit()`: derive + normalize — `const unknown = !(Number(product.weight) > 0)`; `setEditWeightUnknown(unknown)`; `weight: unknown ? 0 : product.weight`, `weightUnit: unknown ? 'kg' : (product.weightUnit || 'kg')`.
- [ ] **Step 5:** Edit modal JSX (1090-1098): same label row + BOTH inputs get `disabled={editWeightUnknown}` and the muted class next to the existing error class.

### Task 3: Verify

- [ ] **Step 1:** `npm run build` clean (build ignores TS — re-read the diff for type slips).
- [ ] **Step 2:** Manual checklist items 23-29 in `docs/specs/warehouse.md`.

### Scope Guard
- No schema / mapper / type change: `0 kg` is stored as a real `0`; "unknown" is a UI-only state (accepted ceiling, see spec).
- No changes to export/addmore modals, the products table, history page, or `lib/*`.
- New `Checkbox` usage reuses the import already added for the "Có Hình Ảnh" column.

## Plan: "Có Hình Ảnh" Column (English)

Goal: spec `docs/specs/warehouse.md` section "Có Hình Ảnh" Column — read-only tick column before `Thao tác`.
Current table lines: `<thead>` 802-811, rows 824-856, loading/empty `colSpan={8}` at 815 and 818.
Only `app/warehouse/page.tsx` changes. No `lib/db.ts` / schema changes.

### Task 1: Add the column

**Files:** Modify `app/warehouse/page.tsx`

- [ ] **Step 1:** Add `import { Checkbox } from '@/components/ui/checkbox'` next to the other `components/ui` imports.
- [ ] **Step 2:** In `<thead>` after the `Vị Trí` `<th>` (line 808) and before the `Thao tác` `<th>` (line 809):
      `<th className="text-center py-3 px-4 font-semibold text-gray-700">Có Hình Ảnh</th>`
      (no `canImport` gate — always visible).
- [ ] **Step 3:** In the row, after the `Vị Trí` cell (line 845) and before the `canImport &&` `Thao tác` cell (line 846):
      `<td className="py-3 px-4 text-center"><Checkbox checked={!!item.productImage} disabled /></td>`
- [ ] **Step 4:** Both `colSpan={8}` become `colSpan={canImport ? 9 : 7}` (loading row line 815, empty row line 818).
- [ ] **Step 5:** Run `npm run build`; self-review the diff — the column is not gated, so the header count and both colSpans must line up in both permission cases.

### Task 2: Verify

- [ ] **Step 1:** `npm run build` clean.
- [ ] **Step 2:** Manual checklist items 20-22 in `docs/specs/warehouse.md`.

### Scope Guard
- No changes to `lib/db.ts`, `lib/constants.ts`, schema, inventory page, history page, or the edit/import/export modals.
- Checkbox stays `disabled` (display only, no state, no click handler). No new dependencies.

## Plan: "M� h�ng" unique per warehouse (English)

Goal: spec `docs/specs/warehouse.md` section "M� h�ng" unique per warehouse. App-only
enforcement (approved): no schema change, no DB unique index.

### Task 1: Warehouse-scoped code lookup in `lib/db.ts`

**Files:** Modify `lib/db.ts`

- [ ] **Step 1:** Replace `findProductByCode(code)` (lines ~127-141) with
      `findProductByCodeInWarehouse(code: string, warehouseId: string): Promise<{ id: number } | null>`:
      `.select('id').eq('warehouse_id', warehouseId).ilike('code', normalized).eq('is_deleted', false).limit(1).maybeSingle()`;
      return `{ id: data.id }` or `null`. Mirror the existing `findProductByNameInWarehouse` comments.
- [ ] **Step 2:** Confirm no other file imports `findProductByCode` (grep).

### Task 2: Create + edit modals in `app/warehouse/page.tsx`

**Files:** Modify `app/warehouse/page.tsx`

- [ ] **Step 1:** Update the import from `@/lib/db`: `findProductByCode` -> `findProductByCodeInWarehouse`.
- [ ] **Step 2:** Create-modal duplicate code state: replace `duplicateInfo` object with
      `duplicateCode: boolean` (mirror `duplicateName`); rename `checkDuplicateGlobally` to
      `checkDuplicateCodeInWarehouse`, query `findProductByCodeInWarehouse(normalized, selectedWarehouse)`,
      return boolean; delete `warehouseNameById` (now unused). Reset state in `handleImport`,
      clear on warehouse change.
- [ ] **Step 3:** Replace messages: inline warning `M� h�ng n�y d� t?n t?i trong kho n�y. Vui l�ng ki?m tra l?i`
      and `handleSave` alert same text; save button disabled condition uses `duplicateCode`.
- [ ] **Step 4:** Edit modal: `checkEditDuplicateCode` queries
      `findProductByCodeInWarehouse(normalized, selectedWarehouse)`, duplicate only when
      `found && found.id !== editingProduct.id`; drop `editDuplicateInfo` object in favor of
      boolean `editDuplicateCode` (same pattern as `editDuplicateName`); update the JSX warning.
- [ ] **Step 5:** Vietnamese comments on both check helpers (`// M� h�ng ch? c?n duy nh?t trong kho hi?n t?i`).

### Task 3: History unit lookup key

**Files:** Modify `app/history/page.tsx`

- [ ] **Step 1:** In the `getAllProducts()` effect, key the map by
      `` `${WAREHOUSE_NAMES[wid]}|${code.trim().toLowerCase()}` `` (warehouse display name,
      matching `HistoryEntry.warehouse`).
- [ ] **Step 2:** At the row-mapping line (~198), look up
      `unitMap[`${entry.warehouse}|${(entry.productCode || '').trim().toLowerCase()}`]`.

### Task 4: Verify

- [ ] **Step 1:** `npm run build` clean; self-review the diff for type slips (build ignores TS).
- [ ] **Step 2:** Manual checklist in the spec section (same code in another warehouse allowed,
      duplicates in the same warehouse blocked, own code on edit allowed, print �VT correct).

## Plan: "Danh mục" (category_name) mandatory in both forms (English)

Goal: spec `docs/specs/warehouse.md` section `"Danh mục" (category_name) — mandatory in both forms`.
Free-text input (approved, no dropdown). No schema change: `category_name VARCHAR(200) NOT NULL`
already exists in `supabase/schema.sql`.

Reference lines (verify before editing): `Product` `lib/constants.ts:57-69`;
`mapProductFromDB` `lib/db.ts:312-326`; `createProduct` `lib/db.ts:162-182`;
`updateProduct` `lib/db.ts:185-204`; import `formData` `app/warehouse/page.tsx:42-53`,
`formErrors` 57-60, `validateForm` 89-102, `handleImport` 370-381, import JSX `Tên hàng` 947-963;
`editFormData` 198-200, `editFormErrors` 207-210, `validateEditForm` 239-251,
`handleEdit` 495-522, `handleSaveEdit` diff 567-575, edit JSX `Tên hàng` 1136.

No test framework in repo: verification = `npm run build` + spec manual checklist 33-37.

### Task 1: Type + data layer

**Files:**
- Modify: `lib/constants.ts`, `lib/db.ts`

**Interfaces:**
- Produces: `Product.categoryName: string` (required); `createProduct` / `updateProduct`
  persist `category_name`; `mapProductFromDB` reads it (`|| ''`).

- [ ] **Step 1:** `Product` interface: add `categoryName: string    // Danh mục hàng (bắt buộc)` immediately after `name: string`.
- [ ] **Step 2:** `mapProductFromDB`: add `categoryName: row.category_name || '',` after `name: row.name || '',`.
- [ ] **Step 3:** `createProduct` insert: add `category_name: product.categoryName,` after `name: product.name,`.
- [ ] **Step 4:** `updateProduct`: add `if (updates.categoryName !== undefined) dbUpdates.category_name = updates.categoryName` next to the `name` line.
- [ ] **Step 5:** `grep -rn "categoryName" --include=*.ts --include=*.tsx` — only `lib/db.ts` + `lib/constants.ts` so far (no other `Product` literals to fix).

### Task 2: Nhập Liệu form

**Files:** Modify `app/warehouse/page.tsx`

- [ ] **Step 1:** `formData` initial state: add `categoryName: ''` after `name: ''`.
- [ ] **Step 2:** `formErrors` type: add `categoryName?: string`.
- [ ] **Step 3:** `validateForm()`: add `if (!String(formData.categoryName || '').trim()) errors.categoryName = 'Vui lòng nhập danh mục'` after the `name` check.
- [ ] **Step 4:** `handleImport()` reset object: add `categoryName: ''` after `name: ''`.
- [ ] **Step 5:** Import modal JSX, between the `Tên hàng` block and the `Đơn vị tính` block: `Danh mục *` label + `<Input value={formData.categoryName} onChange={(e) => { setFormData({ ...formData, categoryName: e.target.value }); clearFieldError('categoryName') }} className={`border-2 ${formErrors.categoryName ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`} />` + `formErrors.categoryName` red `<p>` (`⚠️ {formErrors.categoryName}`).

### Task 3: Sửa Sản Phẩm Tồn Kho form

**Files:** Modify `app/warehouse/page.tsx`

- [ ] **Step 1:** `editFormData` initial state: add `categoryName: ''`.
- [ ] **Step 2:** `editFormErrors` type: add `categoryName?: string`.
- [ ] **Step 3:** `validateEditForm()`: add the same `Vui lòng nhập danh mục` rule after the `name` check.
- [ ] **Step 4:** `handleEdit()` `setEditFormData({...})`: add `categoryName: product.categoryName` after `name: product.name`.
- [ ] **Step 5:** Edit modal JSX: add a `Danh mục *` `<div>` (label + `Input` bound to `editFormData.categoryName`, `clearEditFieldError('categoryName')`, red class + red `<p>`) immediately after the `Tên hàng` `<div>` (line ~1136). Grid is 2-col, so it reflows on its own.
- [ ] **Step 6:** `handleSaveEdit()` diff block: add `if (old.categoryName !== editFormData.categoryName) changes.push(`Danh mục: ${old.categoryName} → ${editFormData.categoryName}`)` next to the `Tên` diff.
- [ ] **Step 7:** Confirm the save path needs no other change: `updateProduct(editingProduct.id, { ...editFormData, ... })` carries `categoryName`, and `createProduct({ ...formData, ... })` carries it too.

### Task 4: Verify + commit

- [ ] **Step 1:** `npm run build` clean; re-read the diff for type slips (build ignores TS).
- [ ] **Step 2:** Manual checklist items 33-37 in `docs/specs/warehouse.md`.
- [ ] **Step 3:** Commit: `git add app/warehouse/page.tsx lib/db.ts lib/constants.ts docs/specs/warehouse.md docs/plans/warehouse.md` → `feat: add mandatory category_name to product import and edit forms`.

### Scope Guard
- No `Danh Mục` table column, no inventory detail row, no Xuất kho / Nhập kho / history / Excel changes.
- No schema migration, no new dependency, no category list constant.

## Plan: "Có danh mục" checkbox makes category_name optional (both forms) (English)

Goal: spec `docs/specs/warehouse.md` section `"Danh mục" (category_name) — optional via
"Có danh mục" checkbox (both forms)`. Checkbox UNticked by default; ticked -> field
required. No `lib/*` or schema change: `''` already satisfies `category_name NOT NULL` and
flows through the existing mappers.

Reference lines (verify before editing): `formData` 40-53, `formErrors` 59,
`weightUnknown` 64, `clearFieldError` 67-75, `handleToggleWeightUnknown` 77-87,
`validateForm` 90-105, `handleImport` 374-385, import `Danh mục` block 930-943,
weight toggle row (layout to copy) 1005-1012; `editFormData` 200-202, `editFormErrors`
209-212, `editWeightUnknown` 215, `handleToggleEditWeightUnknown` 228-238,
`validateEditForm` 241-256, `handleEdit` 495-522, `handleSaveEdit` diff 576,
edit `Danh mục` block 1150.

No test framework in repo: verification = `npm run build` + spec manual checklist 33-41.

### Task 1: State + toggle handlers (both forms)

**Files:** Modify `app/warehouse/page.tsx`

- [ ] **Step 1:** Next to `weightUnknown` (line 64) add
      `// Checkbox "Có danh mục": tick -> Danh mục bắt buộc; bỏ tick -> lưu chuỗi rỗng`
      + `const [hasCategory, setHasCategory] = useState(false)`.
- [ ] **Step 2:** Next to `editWeightUnknown` (line 215) add `const [editHasCategory, setEditHasCategory] = useState(false)`.
- [ ] **Step 3:** After `handleToggleWeightUnknown` add `handleToggleHasCategory(checked)`:
      `setHasCategory(checked)`; when `!checked` also `setFormData({ ...formData, categoryName: '' })`
      + `clearFieldError('categoryName')`; when `checked` keep any typed value.
- [ ] **Step 4:** After `handleToggleEditWeightUnknown` add `handleToggleEditHasCategory(checked)`
      with the same shape on `editFormData` / `clearEditFieldError('categoryName')`.
- [ ] **Step 5:** `handleImport()`: add `setHasCategory(false)` next to `setWeightUnknown(false)`.
- [ ] **Step 6:** `handleEdit()`: add `setEditHasCategory(!!(product.categoryName || '').trim())` next to `setEditWeightUnknown(unknown)`.

### Task 2: Validation (conditional)

**Files:** Modify `app/warehouse/page.tsx`

- [ ] **Step 1:** `validateForm()` line 94 -> `if (hasCategory && !String(formData.categoryName || '').trim()) errors.categoryName = 'Vui lòng nhập danh mục'`.
- [ ] **Step 2:** `validateEditForm()` line 245 -> same guard with `editHasCategory` / `editFormData`.

### Task 3: Nhập Liệu JSX

**Files:** Modify `app/warehouse/page.tsx` (lines 930-943)

- [ ] **Step 1:** Replace the `Danh mục *` `<label>` with the toggle row copied from the weight block:
      `<div className="flex items-center justify-between mb-1">` containing
      `<label ...>Danh mục {hasCategory && '*'}</label>` and
      `<label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer"><Checkbox checked={hasCategory} onCheckedChange={(v) => handleToggleHasCategory(!!v)} />Có danh mục</label>`.
- [ ] **Step 2:** Existing `<Input>`: keep `value`/`onChange`/red class, add
      `disabled={!hasCategory}` and append `${!hasCategory ? 'bg-gray-100 cursor-not-allowed' : ''}`.
- [ ] **Step 3:** Keep the red `⚠️ {formErrors.categoryName}` `<p>` unchanged.

### Task 4: Sửa Sản Phẩm Tồn Kho JSX

**Files:** Modify `app/warehouse/page.tsx` (line 1150)

- [ ] **Step 1:** Expand the one-line `<div>` into a multi-line block with the same toggle row
      (`editHasCategory` / `handleToggleEditHasCategory`), `disabled={!editHasCategory}` on the
      `<Input>`, grey class, red `<p>` unchanged. Grid is 2-col, so it reflows on its own.

### Task 5: Edit history diff

**Files:** Modify `app/warehouse/page.tsx` (line 576)

- [ ] **Step 1:** `if (old.categoryName !== editFormData.categoryName) changes.push(`Danh mục: ${old.categoryName || '(trống)'} → ${editFormData.categoryName || '(trống)'}`)`.

### Task 6: Verify + commit

- [ ] **Step 1:** `npm run build` clean; re-read the diff for type slips (build ignores TS).
- [ ] **Step 2:** Manual checklist items 33-41 in `docs/specs/warehouse.md`.
- [ ] **Step 3:** Confirm save paths need no change: `createProduct({ ...formData, ... })` and
      `updateProduct(editingProduct.id, { ...editFormData, ... })` carry `categoryName: ''`.
- [ ] **Step 4:** Commit: `git add app/warehouse/page.tsx docs/specs/warehouse.md docs/plans/warehouse.md`
      → `feat: make product category optional via "Có danh mục" checkbox`.

### Scope Guard
- No `lib/db.ts`, `lib/constants.ts`, schema, inventory, history, Xuất kho / Nhập kho, or Excel changes.
- No dropdown, no category table, no `NULL`-able column, no new dependency.
