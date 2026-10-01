# Warehouse Plan: Mandatory-Field Red Alerts (English)

## Steps
1. Add `formErrors` state in `app/warehouse/page.tsx`:
   `useState<{ code?: string; name?: string; unit?: string; quantity?: string; weight?: string; location?: string; importDate?: string }>({})`.
2. Add `validateForm()` returning errors object for the 7 mandatory fields.
   Vietnamese messages, e.g. `Vui lòng nhập mã hàng`.
3. Update `handleSave`: run `validateForm()` first; if errors -> `setFormErrors`, return early.
   Keep duplicate code/name checks after mandatory check.
4. Wire UI: for each of the 7 inputs, conditional class
   `formErrors.x ? 'border-red-500 bg-red-50' : ''` + error `<p>` below.
   Each `onChange` clears its own key from `formErrors`.
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
