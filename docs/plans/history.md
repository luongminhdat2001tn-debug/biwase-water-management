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
