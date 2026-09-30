# Warehouse Page Spec (English)

## Overview
Warehouse management page (`app/warehouse/page.tsx`) for 4 warehouses.
Shared shell via `components/sidebar.tsx`. All Supabase access via `lib/db.ts`.

## Feature: Red Alert for Mandatory Fields in "Nhap Lieu" Form
- Modal: `modalType === 'import'` (used for both create + edit).
- Mandatory fields (7): `code` (Ma hang), `name` (Ten hang), `unit` (Don vi tinh),
  `quantity` (So luong), `weight` (Khoi luong), `location` (Vi tri), `importDate` (Ngay nhap lieu).
- Optional: `weightUnit` (default `kg`), `productImage`, `locationImage`.
- Behavior (approved):
  - On Save (`handleSave`), validate all 7 fields first. If any empty, show inline red alert
    per field and block save (no Supabase calls, no generic `alert()` for missing fields).
  - Visual reuses existing duplicate-warning pattern: input `border-red-500 bg-red-50`
    + message `<p class="text-red-600 text-xs mt-1">...</p>` (Vietnamese).
  - Errors clear live: each input `onChange` clears its own error.
  - `formErrors` reset on modal open (`handleImport`, `handleEdit`) and on close.
  - Duplicate code/name checks unchanged and run only after mandatory check passes.
- Files: only `app/warehouse/page.tsx` (+ this spec).

## Validation Rules
- Empty = `''`, `null`, `undefined`, or whitespace-only for strings.
- `quantity` / `weight`: empty string counts as missing; `0` is treated as missing
  because quantity/weight must be > 0 to save (consistent with export/addmore `<= 0` guards).
- `importDate`: required, `type="date"` input.

## Manual Test Checklist
1. Open Nhap Lieu empty -> Save -> 7 red messages appear, save blocked.
2. Fill fields one by one -> each red clears live.
3. Valid form -> saves and creates history entry.
4. Edit mode: clear one mandatory field -> Save blocked with red.
5. Duplicate code/name warnings still work after mandatory passes.
6. `npm run build` passes.
