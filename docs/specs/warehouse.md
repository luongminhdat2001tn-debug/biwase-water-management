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
- Duplicate checks (run only after mandatory passes):
  - Code: unique within `selectedWarehouse` only (same as Name). Same code in a different
    warehouse is allowed. Keep original value (`normalizeProductCode` equal) -> allowed;
    changed -> `findProductByCodeInWarehouse(code, selectedWarehouse)`, duplicate only when
    `found && found.id !== editingProduct.id`. Warning
    `Mã hàng này đã tồn tại trong kho này. Vui lòng kiểm tra lại`.
  - Name: unique within `selectedWarehouse` only. Keep original (`trim().toLowerCase()`
    equal) -> allowed; changed -> `findProductByNameInWarehouse`, duplicate only when
    `found && found.id !== editingProduct.id`.
  - 400ms debounce live-check + `editLatestCodeRef` / `editLatestNameRef` race guards;
    states reset on open. Save button disabled while
    `isEditSaving || editCheckingCode || editCheckingName || editDuplicateCode || editDuplicateName`.
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
  the `if (!editingProduct)` skip around the code check (always check on create),
  `editingProduct` state (import-modal's) removed. Import/create duplicate checks,
  export, addmore, mandatory-8 validation, and history logging unchanged.
- Files: `app/warehouse/page.tsx` (+ this spec). No changes to `lib/db.ts`,
  `lib/constants.ts`, `supabase/schema.sql`, sidebar, or history page.

## Feature: "Mã hàng" unique per warehouse (not globally)
- Rule: within one warehouse, two live (not soft-deleted) products may not share the same
  `code` (case-insensitive, trimmed). The same code IS allowed in a different warehouse,
  matching the existing "Tên hàng" rule. Applies to both modals in `app/warehouse/page.tsx`.
- Data layer (`lib/db.ts`):
  - Add `findProductByCodeInWarehouse(code, warehouseId): Promise<{ id } | null>` —
    `ilike('code', normalizeProductCode(code))` exact match + `.eq('warehouse_id', ...)`
    + `.eq('is_deleted', false)`, mirroring `findProductByNameInWarehouse`.
  - Remove `findProductByCode` (global); both call sites now use the warehouse-scoped helper.
- Create (`Nhập Liệu`) modal:
  - Duplicate-code state becomes a boolean `duplicateCode` (mirrors `duplicateName`);
    `warehouseNameById` is deleted (no remaining use).
  - 400ms debounced live-check against `selectedWarehouse` with the same race guard pattern.
  - Inline warning + `handleSave` alert:
    `Mã hàng này đã tồn tại trong kho này. Vui lòng kiểm tra lại`.
  - Save button keeps being disabled while `duplicateCode` is true.
- Edit (`Sửa Sản Phẩm Tồn Kho`) modal: scoped to `selectedWarehouse`; duplicate only when
  `found && found.id !== editingProduct.id`. Keep the unchanged-value early-out, debounce,
  and race guard. Same message as create.
- History page (`app/history/page.tsx`): the ĐVT lookup built from `getAllProducts()` is keyed
  `${warehouse}|${code}` (warehouse display name from the history row) instead of `code`
  alone, so repeated codes across warehouses resolve to their own unit when printing.
- Enforcement is app-only (approved): no schema/DB change. Known ceiling: two concurrent
  saves can still insert a duplicate. Add a partial unique index
  `UNIQUE (warehouse_id, upper(trim(code))) WHERE is_deleted = false` if that risk matters.
- Files: `app/warehouse/page.tsx`, `lib/db.ts`, `app/history/page.tsx` (+ this spec,
  `docs/specs/history.md`). No changes to `lib/constants.ts`, `supabase/schema.sql`,
  inventory page, or sidebar.
- Manual checklist:
  1. Create with a code that exists in the current warehouse -> red warning + blocked.
  2. Create with the same code in a different warehouse -> allowed.
  3. Edit keeping the product's own code -> allowed.
  4. Edit to another product's code in the same warehouse -> red warning + blocked.
  5. Edit to a code used only in a different warehouse -> allowed.
  6. History print shows the correct ĐVT for rows sharing a code across warehouses.

## Feature: "Có Hình Ảnh" Column (always visible)
- New read-only column `Có Hình Ảnh` in the product table of `app/warehouse/page.tsx`,
  placed **immediately before `Thao tác`** (i.e. after `Vị Trí`).
- Cell: `<Checkbox checked={!!item.productImage} disabled />`
  (`components/ui/checkbox.tsx`). Ticked when `productImage` is a non-empty string;
  unticked otherwise. Display only — no click handler, no DB write.
- NOT permission-gated: visible for every user who sees the table (unlike `Thao tác` /
  `Xóa`, which stay behind `canImport`). The checkbox is `disabled`.
- Column count 8 -> 9 (max, with `Thao tác` + `Xóa`). The hardcoded `colSpan={8}` on the
  loading / empty rows (lines ~815, ~818) becomes dynamic:
  `colSpan={canImport ? 9 : 7}` — required now that a non-gated column was added.
- Files: `app/warehouse/page.tsx` (+ this spec). No changes to `lib/db.ts`,
  `lib/constants.ts`, schema, inventory page, or history page.

## Feature: "Chưa rõ" Weight Checkbox (both forms)
- Applies to BOTH forms in `app/warehouse/page.tsx`: the `Nhập Liệu` modal
  (`formData`) and the `Sửa Sản Phẩm Tồn Kho` modal (`editFormData`).
- UI: next to the `Khối lượng *` label, add a `<Checkbox>` + label `Chưa rõ`
  (same row as the label, right-aligned).
- State: one boolean per form — `weightUnknown` (import) and `editWeightUnknown`
  (edit). Both reset to `false` on modal open (`handleImport`, `handleEdit`).
- Tick behavior: `weight = 0`, `weightUnit = 'Chưa rõ'`, both the weight `<Input>` and
  the weightUnit `<Input>` get `disabled` (plus a muted class
  `bg-gray-100 cursor-not-allowed`, matching the disabled `Số lượng` field in the
  edit modal), and both `formErrors.weight` / `formErrors.weightUnit`
  (`editFormErrors.*`) are cleared.
- Untick behavior: inputs re-enabled; `weight = ''` (import form) / `''` cast for
  the edit form, `weightUnit = 'kg'`; the `> 0` rule applies again.
- Validation: `validateForm()` skips the `weight` and `weightUnit` checks when
  `weightUnknown` is true; `validateEditForm()` does the same for
  `editWeightUnknown`. All other mandatory fields unchanged.
- Save: unchanged code paths — `weight: 0` + `weightUnit: 'Chưa rõ'` are persisted via
  the existing `createProduct` / `updateProduct` mappers. No `lib/db.ts`,
  `lib/constants.ts`, `supabase/schema.sql`, history-log-message, or validation change
  (`lib/db.ts`'s `product.weightUnit || 'kg'` fallback is unaffected — `'Chưa rõ'` is truthy).
- Edit modal open: if the loaded product has `weight <= 0`, the checkbox is
  auto-ticked and `editFormData` is normalized to `weight: 0`, `weightUnit: 'Chưa rõ'`
  (so a legacy `0 kg` row reads back as "chưa rõ" and is re-saved as `0 / Chưa rõ`).
- Known ceiling (accepted): `weight 0` is the flag — a product whose unit is a real
  unit but whose weight is genuinely 0 still reads back as "chưa rõ" on open.
  Add a `weight_unknown` boolean column only if the two must be distinguished later.

## Feature: Weight + Unit Display Format (` - ` separator)
- All weight/unit renderings use `{weight} - {weightUnit}` (hyphen with spaces);
  `'kg'` remains the fallback only where no unit is stored.
- `app/warehouse/page.tsx` product table row: `{item.weight} {item.weightUnit || 'kg'}`
  -> `{item.weight} - {item.weightUnit || 'kg'}`.
- `app/warehouse/page.tsx` Xuất kho summary (`foundProduct` lines): same change.
- `app/warehouse/page.tsx` edit-history diff string (line ~570) becomes
  `Khối lượng: {old.weight} - {old.weightUnit || 'kg'} → {editFormData.weight} - {editFormData.weightUnit}`
  (needed now that a unit can be the multi-word `Chưa rõ`).
- Inventory detail modal lives in `docs/specs/inventory.md`.
- Files: `app/warehouse/page.tsx` (+ this spec). No `lib/db.ts` change.
- Files: only `app/warehouse/page.tsx` (+ this spec).

## Feature: "Danh mục" (category_name) — mandatory in both forms
- DB column already exists: `products.category_name VARCHAR(200) NOT NULL`
  (`supabase/schema.sql`). No schema change. Before this feature the code omitted it, so
  `createProduct` violated NOT NULL; this feature also fixes that.
- `lib/constants.ts`: `Product` gains `categoryName: string` (non-optional).
- `lib/db.ts`: `mapProductFromDB` maps `categoryName: row.category_name || ''`;
  `createProduct` inserts `category_name: product.categoryName`;
  `updateProduct` maps `category_name` when `updates.categoryName !== undefined`.
- `app/warehouse/page.tsx`, BOTH forms:
  - `formData` (Nhập Liệu) and `editFormData` (Sửa Sản Phẩm Tồn Kho) gain
    `categoryName: ''`; reset in `handleImport` / `handleEdit` (`handleEdit` copies
    `product.categoryName`).
  - UI: plain `<Input>` (free text — no dropdown, no category table), label
    `Danh mục *`, placed immediately AFTER `Tên hàng` in both modals.
  - Validation: empty / whitespace-only -> inline red error
    `Vui lòng nhập danh mục` (`border-red-500 bg-red-50` + `⚠️ ... <p>`, same pattern as
    the other mandatory fields), blocks save before any DB call. Import form becomes
    9 mandatory fields; edit form becomes 8.
  - Errors clear live on `onChange` (`clearFieldError` / `clearEditFieldError`).
  - Edit history diff adds `Danh mục: {old} → {new}` when changed.
- Existing rows: a product whose `category_name` is empty opens the edit modal with an
  empty field and must be filled before saving (mandatory applies to edits too).
- Out of scope (approved): no `Danh Mục` column in the warehouse product table, no change
  to inventory detail modal, Xuất kho / Nhập kho modals, history page, or Excel export.
- Files: `app/warehouse/page.tsx`, `lib/db.ts`, `lib/constants.ts` (+ this spec).

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

## Manual Test Checklist ("Có Hình Ảnh" column)
20. Warehouse table shows `Có Hình Ảnh` between `Vị Trí` and `Thao tác`; a product with
    `productImage` shows a ticked (disabled) checkbox, one without shows unticked.
21. `nhap-lieu`/admin user: column visible with `Thao tác` + `Xóa`; user without
    `nhap-lieu`: column still visible, `Thao tác`/`Xóa` hidden, and the empty-state row
    spans the full width (`canImport ? 9 : 7`).
22. `npm run build` passes.

## Manual Test Checklist ("Chưa rõ" weight checkbox)
23. Nhập Liệu: tick `Chưa rõ` next to `Khối lượng *` -> weight shows `0`, unit shows
    `kg`, both inputs greyed out and unfocusable; error messages (if any) disappear.
24. Nhập Liệu: with `Chưa rõ` ticked, fill the other mandatory fields -> Save succeeds
    (no `Vui lòng nhập khối lượng lớn hơn 0`); table row shows `0 kg`.
25. Nhập Liệu: untick -> inputs become editable again, weight `0` cleared to empty;
    Save with empty weight -> red `Vui lòng nhập khối lượng lớn hơn 0`, save blocked.
26. Sửa Sản Phẩm Tồn Kho: open a product with a real weight (e.g. `5 kg`) -> checkbox
    UNticked, fields enabled. Open a product saved earlier as `0 kg` -> checkbox
    already ticked, both fields disabled showing `0` / `kg`.
27. Sửa: tick the box on a product with weight `5` -> Save -> product becomes `0 kg`,
    history row details contains `Khối lượng: 5kg → 0kg`.
28. Closing and reopening either modal resets the checkbox to unticked (Nhập Liệu) /
    derived from the product (Sửa).
29. Tick `Chưa rõ` -> the unit input shows `Chưa rõ` (not `kg`); Save -> the product
    row and Xuất kho summary show `0 - Chưa rõ`. Untick -> unit input back to `kg`.
30. Warehouse table / Xuất kho summary show `5 - kg` for a normal product (dash, spaces).
31. Edit a product with weight `5` -> tick `Chưa rõ` -> Save -> history detail reads
    `Khối lượng: 5 - kg → 0 - Chưa rõ`; the edit modal reopens already ticked.
32. `npm run build` passes.

## Manual Test Checklist ("Danh mục" field)
33. Nhập Liệu: leave `Danh mục *` empty -> Save -> red `Vui lòng nhập danh mục`,
    no DB call, no history row. Type -> red clears live.
34. Nhập Liệu: fill all 9 mandatory fields -> Save succeeds; row persists with the
    entered category (reopen Sửa for that product -> same value shown).
35. Sửa Sản Phẩm Tồn Kho: clear `Danh mục *` -> `Cập Nhật` blocked with red; retype ->
    allowed. Change the value -> history row contains `Danh mục: {old} → {new}`.
36. Open Sửa on a product with empty `category_name` -> field empty -> must fill before
    `Cập Nhật` passes.
37. `npm run build` passes.
