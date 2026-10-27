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
```

There is no test runner, linter, or formatter configured.

## Architecture

CutWizard is a client-only React 19 + Vite app: a 2D guillotine cut optimizer for sheet goods. There is no backend; all state lives in `localStorage`. Files sit at the repo root (no `src/`), and `@/` aliases the root.

**Data flow.** `App.tsx` owns `pieces`, `settings` and `darkMode`, loads them via `services/storage.ts`, and saves on every change. A `useEffect` on `handleOptimize` re-runs `optimizeCuts(pieces, settings)` automatically whenever pieces or settings change (behind a 60 ms `setTimeout` so the spinner renders). The resulting `OptimizationResult` feeds `StatsSummary` and one `Visualizer` per board. `hoveredPieceId` is lifted into `App` so hovering a row in `PieceList` highlights the piece in the SVG and vice versa. `InventoryView` is a separate view (`currentView`) that manages its own state.

**Optimizer (`services/optimizer.ts`).** The core logic, pure functions with no React:
- `optimizeCuts` expands each `Piece` by `quantity` into `InternalPiece`s (id `${piece.id}-${i}`, `originalId` = the source piece), then runs `runSinglePass` once per entry in `STRATEGY_DEFINITIONS` (5 sort heuristics) and keeps the highest score: `avgEfficiency*10 - boards*1000 - unplaced*100000`.
- `runSinglePass` is first-fit across boards and best-fit (least leftover area) across each board's `freeRects`. It places at the rect's top-left corner, then does a guillotine split into two rects along the shorter leftover axis. Kerf is added to the placed size before splitting. Trim margin (only when `enableTrimMargin`) shrinks the usable area on all four sides.
- `canRotate: false` means grain is locked: the piece is never rotated. Pieces that don't fit on an empty board go to `unplacedPieces`.
- Units are millimetres; `totalLinearCuts` is in metres. A "useful offcut" is a free rect of at least 300×300 mm.
- `strategyLabel` strings are hardcoded Spanish and not translated.

**Persistence (`services/storage.ts`).** Keys use the `cutwizard_*` prefix; the `_v2` suffix on pieces and settings is a schema version. `loadStoredPieces` and `loadStoredSettings` rebuild objects from an explicit whitelist of fields, so **a new field on `Piece` or `Settings` is silently dropped on reload unless you add it to the loader too.** (Today the loaders keep neither the cabinet group fields nor the costing settings.) Templates: system ones (`sys-` id prefix, generated from `generateBaseCabinet`) are never stored; only custom templates are saved. Inventory is stored raw.

**i18n (`contexts/`).** `LanguageProvider` wraps the app in `index.tsx`; components call `const { t } = useLanguage()`. `translations.ts` has `en`, `es` and `si` (Sinhala) blocks. `TranslationKey = keyof typeof translations.en`, so a key must exist in `en` to type-check. Add every new key to all three blocks: a missing `es`/`si` key falls back to English silently. Many code comments are in Spanish.

**Styling.** Tailwind is loaded from the CDN in `index.html` (the inline `tailwind.config` uses `darkMode: 'class'` and adds `gray-750`); there is no PostCSS/Tailwind build step. Dark mode works by toggling the `dark` class on `<html>` in `App.tsx`, and many components also take a `darkMode` prop for conditional classes. Printing (`window.print()` is the "PDF export") relies on Tailwind `print:` variants plus the `.no-print` class and `@media print` rules in `index.css`. `Visualizer` renders each board's header so every printed sheet carries its own job info.

**CSV (`services/csvHelper.ts`).** Import auto-detects the `,` / `;` / tab delimiter and matches English or Spanish column headers (e.g. `width|ancho`, `qty|cantidad`). Export writes the pieces list or the optimized layout with X/Y coordinates.

`vite.config.ts` still injects `GEMINI_API_KEY` as `process.env.*`, left over from the AI Studio scaffold; nothing in the app uses it.
