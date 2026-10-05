# History Plan: Permission-Based "Kho Lưu" Dropdown (English)

**Goal:** Replace the free-text "Kho Lưu" filter on the History page with a permission-based dropdown, and hard-scope visible rows to warehouses the session account can access.

**Architecture:** Single-file change in `app/history/page.tsx` reusing existing `getAccessibleWarehouseIds(user)` from `lib/constants.ts`. No schema change, no `lib/db.ts` change. Display-name mapping lives locally in the page (long names matching `history_log.warehouse` values written by warehouse/inventory pages).

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase via `lib/db.ts`.

**Spec:** `docs/specs/history.md`

## Global Constraints
- All Supabase access goes through `lib/db.ts` — this plan touches no DB code.
- `next.config.mjs` ignores TS build errors — self-review types; `npm run build` will not catch them.
- Vietnamese UI + Vietnamese code comments stay consistent.
- Never commit `.env.local`, `acc.txt`, or ad-hoc SQL.

## Review Focus
- `history_log.warehouse` stores display names (long form), not IDs — filter must compare by exact display-name match, not `includes`, to avoid cross-warehouse substring hits (e.g. short "Kho Vật Tư" matching long "Kho Vật Tư Nhà Máy").
- Session may be `null` on first render — memo must handle `null` user (empty accessible set) without crashing; `user` state is set from `localStorage` in `useEffect`.
- `chucNang` may arrive as non-array legacy string — `getAccessibleWarehouseIds` already normalizes, so the page must pass the whole `user` object, not pre-normalize.
- Long-name mapping must match `app/warehouse/page.tsx:13-18` character-for-character.

---

### Task 1: Permission-based Kho Lưu dropdown + two-layer filter in `app/history/page.tsx`

**Files:**
- Modify: `app/history/page.tsx` (filter state, options memo, `<select>` UI, two-layer filter)
- Reference: `docs/specs/history.md`

**Interfaces:**
- Consumes: `getAccessibleWarehouseIds` from `@/lib/constants`; session `user` state (already holds `chucNang` + `isAdmin`).
- Produces: no new exports; internal `warehouseOptions`, `defaultWarehouseFilter`, scoped `filteredHistory`.

- [ ] Step 1: Import `getAccessibleWarehouseIds` from `@/lib/constants`.
- [ ] Step 2: Add local `WAREHOUSE_NAMES: Record<string, string>` mapping the 4 IDs to long display names exactly as stored in history (`kho-vat-tu` -> `Kho Vật Tư Nhà Máy`, `kho-xay-dung` -> `Kho Xây Dựng Cơ Bản`, `kho-phong-thi-nghiem` -> `Kho Phòng Thí Nghiệm`, `kho-thuong-mai` -> `Kho Thương Mại`), with Vietnamese comment noting it must match warehouse/inventory pages.
- [ ] Step 3: Add `accessibleWarehouses` memo via `getAccessibleWarehouseIds(user)` -> map to `{ id, name }`, plus `hasAllWarehouses = accessibleWarehouses.length === 4` and `defaultWarehouseFilter` (`'Tất cả'` if 4 or 2-3 accessible, the single name if 1, `''` if 0).
- [ ] Step 4: Change `filterWarehouse` initial state to `''`, then set/sync it to `defaultWarehouseFilter` once `user` loads (in the existing session `useEffect` or a dedicated effect on `defaultWarehouseFilter`); guard so manual user selection is not overwritten afterwards.
- [ ] Step 5: Replace the `Kho Lưu` `<Input>` with a `<select>` (same styling as the `Chức năng` select): options = `hasAllWarehouses || accessibleWarehouses.length > 1 ? ['Tất cả', ...names] : [...names]`; render a disabled `Không có quyền` placeholder option when empty.
- [ ] Step 6: Rewrite the warehouse filter into two layers: (a) hard scope — drop any `entry` whose `warehouse` is not in the accessible names set (when user has < 4, unknown/legacy names are hidden too); (b) dropdown — if value is not `'Tất cả'`, keep only exact-match `entry.warehouse === filterWarehouse`. Remove the old `includes` check.
- [ ] Step 7: Update `hasFilter` (compare against `defaultWarehouseFilter` instead of `''`) and `clearAllFilters` (reset to `defaultWarehouseFilter`).
- [ ] Step 8: Self-review the diff for exact display-name strings and TS types; run `npm run build`. Expected: builds clean (build ignores type errors, so re-read the diff).
- [ ] Step 9: Manual test per spec checklist (admin/4-kho, 1-kho, 2-kho, 0-kho); verify Excel export (`handleExportExcel`) still exports the filtered rows with no change needed.

---

### Task 2: "Xuất Phiếu Kho" button + print route via `preview-print-file.tsx`

**Files:**
- Modify: `app/history/page.tsx` (add print button left of Excel, unit map, `handlePrintPhieu`)
- Modify: `app/history/preview-print-file.tsx` (props-based `rows`, remove demo generator, export `RowData`)
- Create: `app/history/print/page.tsx` (new-tab host reading `sessionStorage`)
- Reference: `docs/specs/history.md` (Feature: "Xuất Phiếu Kho" Button)

**Interfaces:**
- Consumes: `filteredHistory` (existing), `getAllProducts` from `@/lib/db` for `unit` lookup; `RowData` from `preview-print-file.tsx`.
- Produces: `sessionStorage['phieu-xuat-kho']` JSON consumed by `/history/print`; no new DB writes.

- [ ] Step 1: In `preview-print-file.tsx`, export `RowData` interface; change component signature to `({ rows }: { rows: RowData[] })`; delete `originalData`, `generate1000Rows`, `resetOriginalData` + their two toolbar buttons; keep `currentDate`, zoom, `window.print()`, toast (only if still used), A4 `@page` CSS unchanged.
- [ ] Step 2: Create `app/history/print/page.tsx` as `'use client'` page: `useState<RowData[] | null>(null)`, `useEffect` reads `sessionStorage.getItem('phieu-xuat-kho')`, `JSON.parse`, renders `<PreviewPrintFile rows={...} />` or empty-state message when null/empty.
- [ ] Step 3: In `app/history/page.tsx`, import `Printer` icon, `getAllProducts`, and `RowData` type; add `unitMap: Record<string, string>` state loaded once alongside `getHistoryLog()` (map `code -> unit`); add `handlePrintPhieu` mapping `filteredHistory` to `RowData[]` (`wh: 'TEST'`, `unit: unitMap[code] || '—'`, `note: details`), writing to `sessionStorage` then `window.open('/history/print', '_blank')`.
- [ ] Step 4: Replace the lone Excel `<Button>` in `CardHeader` with `<div className="flex gap-2">` containing orange `Xuất Phiếu Kho` (left, `onClick={handlePrintPhieu}`) + green `Xuất Excel` (right, unchanged handler). Keep `filteredHistory.length > 0` guard for the group. Vietnamese labels/comments.
- [ ] Step 5: Self-review diff (no `supabase.from()` in pages, no TS error introduction); run `npm run build`. Expected: builds clean.
- [ ] Step 6: Manual test: filter -> `Xuất Phiếu Kho` opens `/history/print` new tab with matching row count, TEST/ĐVT/details correct; direct visit to `/history/print` shows empty state; Excel still works.

---

### Task 4: Map warehouse name to MÃ KHO code in "Xuất Phiếu Kho"

**Files:**
- Modify: `app/history/page.tsx` (`WAREHOUSE_CODES` + `handlePrintPhieu`)
- Reference: `docs/specs/history.md` (Feature: "Xuất Phiếu Kho" Button — `wh` mapping)

**Interfaces:**
- Consumes: existing `WAREHOUSE_NAMES` long names + per-row `entry.warehouse`.
- Produces: `RowData[].wh` as `VT` / `XD` / `TN` / `TM`, fallback to full name as-is.

- [ ] Step 1: Add `WAREHOUSE_CODES: Record<string, string>` next to `WAREHOUSE_NAMES` (`Kho Vật Tư Nhà Máy` -> `VT`, `Kho Xây Dựng Cơ Bản` -> `XD`, `Kho Phòng Thí Nghiệm` -> `TN`, `Kho Thương Mại` -> `TM`) with Vietnamese comment; reuse `WAREHOUSE_NAMES` display strings as keys (no new source of truth, no `lib/constants.ts` change).
- [ ] Step 2: In `handlePrintPhieu`, change `wh: 'TEST'` to `wh: WAREHOUSE_CODES[entry.warehouse] ?? entry.warehouse` (per-row lookup; trim-safe if needed); update the two stale `TEST` comments.
- [ ] Step 3: Self-review diff; run `npm run build`. Expected: builds clean.
- [ ] Step 4: Manual test: filter each warehouse -> print -> MÃ KHO shows VT/XD/TN/TM; "Tất cả" shows mixed codes per row; legacy/unknown name shows full name.

---

### Task 3: Pin signature grid to bottom of last printed page in `preview-print-file.tsx`

**Files:**
- Modify: `app/history/preview-print-file.tsx` (print CSS only + zoom-wrapper class)
- Reference: `docs/specs/history.md` (Feature: Signature Grid Pinned to Bottom of Last Printed Page)

**Interfaces:**
- Consumes: existing `.a4-page` / `.content-body` / `.signature-footer` classes; zoom wrapper `div` with inline `transform`.
- Produces: no new exports, no prop changes; print/PDF layout change only.

- [ ] Step 1: In `@media print`, replace `.a4-page { display: block !important; min-height: auto !important; ... }` with flex-column restoration: `display: flex !important; flex-direction: column !important; min-height: 257mm` (297mm A4 minus 2x10mm `@page` margins); keep `box-shadow: none`, `margin: 0`, `width: 100%`, `padding: 0` overrides.
- [ ] Step 2: Give `.signature-footer` `margin-top: auto` in print (keep `break-inside: avoid`); confirm `.content-body { flex-grow: 1 }` rule is shared (not screen-only) so the spacer pushes the footer down.
- [ ] Step 3: Add a class (e.g. `print-zoom-reset`) to the zoom wrapper `div` and a print rule `transform: none !important` so non-100% preview zoom never shrinks print output or adds blank pages.
- [ ] Step 4: Self-review diff (CSS-only, no JSX logic change except the wrapper className); run `npm run build`. Expected: builds clean.
- [ ] Step 5: Manual test: few rows -> signatures at page bottom on screen and in print preview; many rows -> footer kept whole on last page; zoom at 150% then print -> output identical to 100%.
