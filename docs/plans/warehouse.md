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
