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
