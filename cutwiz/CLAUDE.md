# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Use **pnpm** (other lock files are gitignored).

```bash
pnpm install
pnpm dev                 # Vite dev server on http://localhost:3000 (host 0.0.0.0)
pnpm build               # production build to dist/
pnpm preview             # serve the built bundle
pnpm exec tsc --noEmit   # type-check (no script for it; Vite does not type-check)
pnpm test                # Vitest, all tests once
pnpm test services/cabinetSeries.test.ts   # a single test file
pnpm exec vitest run -t "deep 600"         # a single test by name
```

Tests live next to the code as `services/*.test.ts` and import `describe`/`it`/`expect` from `vitest` explicitly. There is no DOM test environment, so stub `localStorage` in the test (see `services/storage.test.ts`); UI components are checked in the running app. `vite.config.ts` excludes `.claude/**` from Vitest because Claude sessions create git worktrees there. There is no linter or formatter configured.

## Architecture

CutWizard is a client-only React 19 + Vite app: a 2D guillotine cut optimizer for sheet goods. There is no backend; all state lives in `localStorage`. Files sit at the repo root (no `src/`), and `@/` aliases the root.

**Layout and data flow.** `App.tsx` owns `pieces`, `settings`, `darkMode` and `settingsOpen`, loads the first three via `services/storage.ts`, and saves on every change. The optimizer screen is a two-pane workspace:
- `JobBar` on top (job name = `settings.jobNumber`, board chip, Job settings / Print / Export CSV). **Job settings** opens `SettingsDrawer`, a right-hand dialog wrapping `SettingsPanel` (a block per board type with sheet size and price per sheet: Carcass with its presets, AGT with an 8×4 / 9×6 switch, HMR; then kerf, trim, job costing).
- Left pane: `CabinetBuilder` (series, standard widths or **Custom** W × H × D, drawers, quantity, live preview) above `PieceList`, which renders the cut list via `groupPieces` (`services/cutList.ts`) as collapsible cabinet groups plus loose parts, with a ⋯ menu for templates, CSV import/export and Clear all. Every part row has a board selector (Carcass / AGT / HMR).
- Right pane: `StatsSummary` (unplaced-parts warning on top, the **Boards to buy** list with one row per board type, then Yield / Parts / Total cost plus a More toggle), then the drawings grouped under a heading per board type, one `Visualizer` per board.

There is no Optimize button: an effect re-runs `planByMaterial(pieces, settings)` 60 ms after any change (debounced) and keeps the result as `plans: MaterialPlan[]`. `hoveredPieceId` is lifted into `App` so hovering a row in `PieceList` highlights the piece in the SVG and vice versa. `InventoryView` is a separate view (`currentView`) that manages its own state.

**Optimizer (`services/optimizer.ts`).** The core logic, pure functions with no React:
- `optimizeCuts` expands each `Piece` by `quantity` into `InternalPiece`s (id `${piece.id}-${i}`, `originalId` = the source piece), then runs `runSinglePass` once per entry in `STRATEGY_DEFINITIONS` (5 sort heuristics) and keeps the highest score: `avgEfficiency*10 - boards*1000 - unplaced*100000`.
- `runSinglePass` is first-fit across boards and best-fit (least leftover area) across each board's `freeRects`. It places at the rect's top-left corner, then does a guillotine split into two rects along the shorter leftover axis. Kerf is added to the placed size before splitting. Trim margin (only when `enableTrimMargin`) shrinks the usable area on all four sides.
- `canRotate: false` means grain is locked: the piece is never rotated. Pieces that don't fit on an empty board go to `unplacedPieces`.
- Units are millimetres; `totalLinearCuts` is in metres. A "useful offcut" is a free rect of at least 300×300 mm.
- `strategyLabel` strings are plain English and not shown anywhere in the UI.

**Board types (`services/materials.ts`, `services/materialPlan.ts`).** A job is cut from three board types: `carcass` (18 mm, the `boardWidth`/`boardHeight`/`boardPrice` settings), `agt` (18 mm, doors and drawer fronts, `agtWidth`/`agtHeight`/`agtPrice`) and `hmr` (6 mm, backs, `hmrWidth`/`hmrHeight`/`hmrPrice`). `Piece.material` holds the type; missing or unknown means `carcass` (`materialOf`). `planByMaterial` splits the pieces by type and calls the unchanged `optimizeCuts` once per type with that type's sheet, returning one `MaterialPlan` per used type in `MATERIAL_ORDER`. Board ids restart at 1 in each plan, so use `boardKey(material, id)` for anything that must be unique. `summarizePlans` gives the totals across plans (yield and waste weighted by sheet area; edge banding skips HMR), `boardsToBuy` the rows of the buy list (drawer sheets go on the carcass row, even when no part is on carcass) and `boardsCost` their cost. `boardTitle` / `sheetText` / `sheetLabel` format a board for the UI ("AGT 18 mm · 9×6 ft"); a sheet within 3 mm of 2440 × 1220 or 2745 × 1830 is labelled 8×4 ft or 9×6 ft. Kerf and trim are shared by all types.

**Cabinets (`services/cabinetSeries.ts`, `services/cabinetPieces.ts`).** `cabinetSeries.ts` defines the Pantry LK construction styles (`deep-560`, `shallow-300`; the number is only the default depth), the standard widths, and `buildCabinet(series, size, { drawers })` where `size` is a `CabinetSize` `{ width, height, depth }` in whole mm within `SIZE_LIMITS` (W 100–2400, H 300–2400, D 150–1200). `standardSize(series, width)` fills height 750 and the series depth; `validateCabinetSize` returns per-field problems; `tryBuildCabinet` returns `null` instead of throwing (use it for previews of half-typed input). Drawers: deep only, W ≥ 300 and H ≥ 450. `buildCabinet` returns board parts (each with its `material`: doors and drawer fronts `agt`, backs `hmr`, the rest `carcass`), hardware, and `extraBoards` (one 8×4 sheet per drawer cabinet). It deliberately imports nothing from the app (no React, `types.ts`, storage, or i18n) so the quotation maker and 3D planner can share it unchanged; it returns part/hardware *keys*, and the UI translates them. Keep it that way. `cabinetPieces.ts` is the app-side adapter: `createCabinetGroups({ seriesId, size, ... })` turns a build into `Piece[]` (one `groupId` per cabinet, with `cabinetSeriesId`/`cabinetDrawers`/`cabinetWidth`/`cabinetHeight`/`cabinetDepth` copied onto every piece), and `countExtraBoards` recomputes drawer boards from those fields (pieces saved before `cabinetDepth` existed fall back to the series default). `App` passes the count to `StatsSummary` (the carcass row of Boards to buy, and cost); the first printed sheet carries the whole buy list (`Visualizer`'s `buyLines`). Hardware is intentionally not shown in CutWizard. `services/templatePieces.ts` keeps one group per cabinet when templates are saved and loaded.

**Persistence (`services/storage.ts`).** Keys use the `cutwizard_*` prefix; the `_v2` suffix on pieces and settings is a schema version. `loadStoredPieces` and `loadStoredSettings` rebuild objects from an explicit whitelist of fields, so **a new field on `Piece` or `Settings` is silently dropped on reload unless you add it to the loader too** (and to `services/storage.test.ts`). **Start-up is empty:** with nothing saved, `[]` saved, or unreadable data, `loadStoredPieces` returns `[]`; `EXAMPLE_PIECES` load only via the right pane's **Load example** link. Templates are only user-saved ones; leftover `sys-` ids from the removed old presets are filtered out on load. Inventory is stored raw.

**i18n (`contexts/`).** `LanguageProvider` wraps the app in `index.tsx`; components call `const { t } = useLanguage()`. `translations.ts` has `en`, `es` and `si` (Sinhala) blocks. `TranslationKey = keyof typeof translations.en`, so a key must exist in `en` to type-check. Add every new key to all three blocks: a missing `es`/`si` key falls back to English silently. Sinhala strings are drafts awaiting review by Pantry LK. `LanguageProvider` also sets `<html lang>`. Many code comments are in Spanish (except `cabinetSeries.ts`, which is in English because it is meant to be shared).

**Styling.** Tailwind is loaded from the CDN in `index.html` (the inline `tailwind.config` uses `darkMode: 'class'` and adds `gray-750`); there is no PostCSS/Tailwind build step. Dark mode works by toggling the `dark` class on `<html>` in `App.tsx`, and many components also take a `darkMode` prop for conditional classes. Printing (`window.print()` is the "PDF export") relies on Tailwind `print:` variants plus the `.no-print` class and `@media print` rules in `index.css`. `Visualizer` renders each board's header so every printed sheet carries its own job info, board type and number within that type.

**CSV (`services/csvHelper.ts`).** Import auto-detects the `,` / `;` / tab delimiter and matches English or Spanish column headers (e.g. `width|ancho`, `qty|cantidad`), ignoring unit suffixes like `(mm)`, so an exported parts list re-imports. Both exports carry a `Board type` column (Carcass / AGT / HMR) and import reads it back (also as `material` or `tablero`); a file without it, or with an unknown value, imports onto Carcass. Export (English headers) writes the pieces list (`buildPiecesListCSV`) or the optimized layout of every plan with X/Y coordinates (`buildOptimizationCSV(plans)`); the `export*` wrappers only trigger the download.

`vite.config.ts` still injects `GEMINI_API_KEY` as `process.env.*`, left over from the AI Studio scaffold; nothing in the app uses it.
