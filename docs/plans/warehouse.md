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
