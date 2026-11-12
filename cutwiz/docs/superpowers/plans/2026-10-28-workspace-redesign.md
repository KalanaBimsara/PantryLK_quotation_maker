# Workspace Redesign and Custom Cabinet Sizes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn CutWizard into a two-pane desktop workspace (build the job on the left, live cut plan on the right) with custom W × H × D cabinets, an empty start, and the remaining Spanish/UX rough edges fixed.

**Architecture:**
- **Data:** `services/cabinetSeries.ts` moves from width-only to a `CabinetSize` (W, H, D) with limits and a non-throwing `tryBuildCabinet`. The adapter, the storage and `Piece` gain `cabinetDepth`.
- **UI:** the UI is rebuilt from the existing components:
  - new `JobBar`, `SettingsDrawer` (wrapping `SettingsPanel`) and `CabinetBuilder` (replacing `CabinetPresetPicker`);
  - `PieceList` reorganised around a pure `groupPieces` helper;
  - `StatsSummary` and `Visualizer` restyled for the right pane.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, pnpm, Vitest 3, Tailwind via CDN, lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-10-28-workspace-redesign-design.md`

## Before you start

- **Branch:** work on a new branch `feat/workspace-redesign` from `main` (`382ac04` or later).
- **Leave alone:** the untracked `.claude/launch.json` (dev-server config), the integrations worktree, and its branch.
- **Dev server:** the preview server config `cutwizard-dev` in `.claude/launch.json` runs `pnpm dev`. It falls back to port 3001 if 3000 is busy.

## Global Constraints

- **Board thickness:** 18 mm.
- **Fixed parts:** rail and back-support height 100.
- **Defaults:** standard height 750; default depth 560 (`deep-560`) and 300 (`shallow-300`).
- **Size limits** (whole millimetres only): width 100–2400, height 300–2400, depth 150–1200.
- **Drawers:** `deep-560` only, W ≥ 300 and H ≥ 450. Fronts are 3 × `W × (H / 3)`. Thirds are not rounded; the display shows one decimal.
- **Doors:** `H × W` (1 door) when W ≤ 600, else 2 doors of `H × (W / 2)`. Half millimetres are kept.
- **Grain locked:** `side`, `door` and `drawerFront` only.
- **`cabinetSeries.ts` isolation:** it imports nothing from the app (no React, `../types`, `./storage` or `../contexts`).
- **Translations:**
  - Every new or changed UI string gets a key in `en`, `es` and `si` in `contexts/translations.ts`.
  - Sinhala text is a draft, to be reviewed by Pantry LK.
- **Focus and labels:** every new or changed button, chip and input gets a visible keyboard focus ring (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500`) and a `<label>`, or an `aria-label` when no visible label fits.
- **Saved data:** no new localStorage keys. The existing `cutwizard_*` keys and their formats stay compatible.
- **Tests:** files import `describe`/`it`/`expect`/`beforeEach` from `'vitest'` and live next to the code as `services/*.test.ts`.
- **Tooling:**
  - Type-check with `node node_modules/typescript/bin/tsc --noEmit -p .`. The project hook also runs it after every `.ts`/`.tsx` edit.
  - Use pnpm only. Never edit `pnpm-lock.yaml` by hand.
- **Commits:** end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Half-typed custom sizes:** "" or "8" in a W/H/D box must not crash the builder's preview. Use `tryBuildCabinet`, which returns `null` and never throws (Task 1 test).
2. **Drawers turned on, then a custom size that can't have them:** for example H 400. Drawers must turn off, and Add must never pass `drawers: true` for an invalid size (Task 1 test of `drawersAvailable`/`tryBuildCabinet`, plus the Task 5 manual check).
3. **Cabinets saved before this change:** they have `cabinetWidth`/`cabinetHeight` but no `cabinetDepth`. They must still count drawer boards, using the series default depth (Task 1 test).
4. **Reloading after Clear all,** or with `[]` or corrupt JSON saved: the list starts empty and does not bring back the examples (Task 2 test).
5. **A custom part bigger than the board** (for example a 2400 × 2400 back): it must appear in the unplaced warning at the top of the right pane, not vanish (Task 6 optimizer test).

---

### Task 1: Custom cabinet sizes in the data layer

**Files:**
- Modify: `services/cabinetSeries.ts`, `services/cabinetSeries.test.ts`
- Modify: `services/cabinetPieces.ts`, `services/cabinetPieces.test.ts`
- Modify: `types.ts` (`Piece.cabinetDepth?: number`)
- Modify: `services/storage.ts` (`loadStoredPieces` keeps `cabinetDepth`), `services/storage.test.ts`
- Modify: `components/CabinetPresetPicker.tsx` (call sites only, so the app keeps compiling; it is replaced in Task 5)
- Modify: `services/templatePieces.test.ts` (only if its call to `createCabinetGroups` needs `size`)

**Interfaces:**
- Produces in `services/cabinetSeries.ts` (in addition to the existing `CabinetSeriesId`, `STANDARD_WIDTHS`, `CabinetPartKey`, `HardwareKey`, `CabinetPart`, `HardwareItem`, `CABINET_SERIES` and `isCabinetSeriesId`):
  ```ts
  export interface CabinetSize { width: number; height: number; depth: number; }
  export const STANDARD_HEIGHT = 750;
  export const SIZE_LIMITS: Readonly<Record<keyof CabinetSize, readonly [number, number]>>; // width [100,2400], height [300,2400], depth [150,1200]
  export interface SizeProblem { field: keyof CabinetSize; min: number; max: number; }
  export function validateCabinetSize(size: CabinetSize): SizeProblem[];          // [] = valid; non-integers, NaN and out-of-range all fail
  export function standardSize(seriesId: CabinetSeriesId, width: number): CabinetSize; // { width, height: 750, depth: series default }
  export function isStandardSize(seriesId: CabinetSeriesId, size: CabinetSize): boolean; // width in STANDARD_WIDTHS, height 750, depth = default
  export function drawersAvailable(seriesId: CabinetSeriesId, size: CabinetSize): boolean;
  export function buildCabinet(seriesId: CabinetSeriesId, size: CabinetSize, opts: { drawers: boolean }): CabinetBuild; // throws if invalid
  export function tryBuildCabinet(seriesId: CabinetSeriesId, size: CabinetSize, opts: { drawers: boolean }): CabinetBuild | null;
  ```
  `CABINET_SERIES[].depth` is the default depth. `CabinetBuild.depth` comes from `size.depth`.
- Produces in `services/cabinetPieces.ts`:
  - `createCabinetGroups({ seriesId, size, drawers, quantity, groupName, partName }): Piece[]` takes `size: CabinetSize` instead of `width`, and sets `cabinetWidth`, `cabinetHeight` and `cabinetDepth`.
  - `countExtraBoards` rebuilds from `{ cabinetWidth, cabinetHeight ?? 750, cabinetDepth ?? series default }`.
- Produces: `Piece.cabinetDepth?: number`.

- [ ] **Step 1: Update and extend the tests in `services/cabinetSeries.test.ts`**

  - **Existing calls:** change them to `buildCabinet(id, standardSize(id, W), opts)` and `drawersAvailable(id, standardSize(id, W))`. Keep every existing expectation: standard outputs must not change.
  - **New tests:**

```ts
it('builds a custom deep cabinet with drawers from W x H x D', () => {
  const b = buildCabinet('deep-560', { width: 820, height: 850, depth: 580 }, { drawers: true });
  expect(sizes(b).slice(0, 5)).toEqual(['bottom:820x580x1', 'shelf:784x570x1', 'side:850x580x2', 'back:850x820x1', 'topRail:784x100x2']);
  const front = b.parts.find((p) => p.key === 'drawerFront')!;
  expect(front.width).toBe(820);
  expect(front.height).toBeCloseTo(283.333, 2);
  expect(front.quantity).toBe(3);
  expect(b.depth).toBe(580);
});
it('uses custom height and depth in the shallow series', () => {
  expect(sizes(buildCabinet('shallow-300', { width: 500, height: 900, depth: 350 }, { drawers: false }))).toEqual(
    ['bottom:350x464x1', 'top:350x464x1', 'shelf:350x464x1', 'side:900x350x2', 'back:900x500x1', 'backSupport:464x100x2', 'door:900x500x1']);
});
it('keeps half-millimetre doors for odd widths over 600', () => {
  expect(sizes(buildCabinet('deep-560', { width: 901, height: 750, depth: 560 }, { drawers: false }))).toContain('door:750x450.5x2');
});
it('validates sizes per field', () => {
  expect(validateCabinetSize({ width: 100, height: 300, depth: 150 })).toEqual([]);
  expect(validateCabinetSize({ width: 2400, height: 2400, depth: 1200 })).toEqual([]);
  expect(validateCabinetSize({ width: 99, height: 2401, depth: 1200.5 }).map((p) => p.field)).toEqual(['width', 'height', 'depth']);
  expect(validateCabinetSize({ width: NaN, height: 750, depth: 560 })).toEqual([{ field: 'width', min: 100, max: 2400 }]);
});
it('needs W >= 300 and H >= 450 for drawers', () => {
  expect(drawersAvailable('deep-560', { width: 300, height: 450, depth: 560 })).toBe(true);
  expect(drawersAvailable('deep-560', { width: 300, height: 449, depth: 560 })).toBe(false);
  expect(drawersAvailable('deep-560', { width: 299, height: 750, depth: 560 })).toBe(false);
  expect(drawersAvailable('shallow-300', { width: 900, height: 750, depth: 300 })).toBe(false);
});
it('throws from buildCabinet but returns null from tryBuildCabinet for invalid input', () => {
  const bad = { width: 8, height: 750, depth: 560 };
  expect(() => buildCabinet('deep-560', bad, { drawers: false })).toThrow();
  expect(tryBuildCabinet('deep-560', bad, { drawers: false })).toBeNull();
  expect(tryBuildCabinet('deep-560', { width: 600, height: 400, depth: 560 }, { drawers: true })).toBeNull();
  expect(tryBuildCabinet('deep-560', standardSize('deep-560', 600), { drawers: false })).not.toBeNull();
});
it('recognises standard sizes', () => {
  expect(isStandardSize('deep-560', { width: 900, height: 750, depth: 560 })).toBe(true);
  expect(isStandardSize('deep-560', { width: 900, height: 750, depth: 580 })).toBe(false);
  expect(isStandardSize('shallow-300', { width: 750, height: 750, depth: 300 })).toBe(false);
});
```

  - **Replace the "rejects invalid widths" test:** `[0, -600, NaN, 36, Infinity]` must all throw.

- [ ] **Step 2: Update and extend `cabinetPieces.test.ts` and `storage.test.ts`**

  - **`cabinetPieces.test.ts`:**
    - Change `make()` to pass `size: { width: 900, height: 750, depth: 560 }` instead of `width: 900`.
    - Add these tests:

```ts
it('stores the cabinet depth on every piece', () => {
  const pieces = make({ size: { width: 820, height: 850, depth: 580 } });
  expect(pieces.every((p) => p.cabinetWidth === 820 && p.cabinetHeight === 850 && p.cabinetDepth === 580)).toBe(true);
});
it('counts drawer boards for cabinets saved before depth was stored', () => {
  const [p] = make({ quantity: 1 });
  const { cabinetDepth, ...old } = p;
  expect(countExtraBoards([old])).toBe(1);
});
it('counts no drawer board when the saved size no longer allows drawers', () => {
  const [p] = make({ quantity: 1 });
  expect(countExtraBoards([{ ...p, cabinetHeight: 400 }])).toBe(0);
});
```

  - **`storage.test.ts`:** add `cabinetDepth: 560` to the piece in "keeps group and cabinet fields across save/load".

- [ ] **Step 3: Run the tests to verify they fail**

  Run: `pnpm test`
  Expected: FAIL. `standardSize`, `validateCabinetSize`, `tryBuildCabinet` and `isStandardSize` are not exported, `createCabinetGroups` ignores `size`, and `cabinetDepth` is dropped by the loader.

- [ ] **Step 4: Implement**

  - **`cabinetSeries.ts`:**
    - The series body functions take `(size)` instead of `(w)`. `fronts(size, drawers)` uses `size.height` for doors and `size.height / 3` for the fronts.
    - `drawersAvailable` checks series support, `width >= 300` and `height >= 450`.
    - `buildCabinet` throws when `validateCabinetSize(size).length > 0`, or when drawers are requested but not available.
    - `tryBuildCabinet` wraps it with try/catch.
  - **`cabinetPieces.ts`, `types.ts`, `storage.ts`:** as the Interfaces block above says. The storage loader copies `cabinetDepth` when it's a positive number.
  - **`CabinetPresetPicker.tsx`:** replace `width`-based calls with `standardSize(seriesId, width)`. There is no behaviour change in this task.

- [ ] **Step 5: Run the tests to verify they pass**

  Run: `pnpm test` and `node node_modules/typescript/bin/tsc --noEmit -p .`
  Expected: all tests PASS (the earlier 26 plus the new ones), and tsc exits 0.

- [ ] **Step 6: Commit**

```bash
git add services/cabinetSeries.ts services/cabinetSeries.test.ts services/cabinetPieces.ts services/cabinetPieces.test.ts services/storage.ts services/storage.test.ts services/templatePieces.test.ts types.ts components/CabinetPresetPicker.tsx
git commit -m "feat(cabinets): support custom width, height and depth with size limits"
```

---

### Task 2: Empty start-up

**Files:**
- Modify: `services/storage.ts` (`DEFAULT_PIECES` → `EXAMPLE_PIECES`, with English names; `loadStoredPieces`)
- Modify: `components/PieceList.tsx` (import rename only: the "Load example pieces" button uses `EXAMPLE_PIECES`)
- Test: `services/storage.test.ts`

**Interfaces:**
- Produces: `export const EXAMPLE_PIECES: Piece[]`, containing the same 5 pieces with English names: "Left side", "Main door", "Top cover", "Inner shelves", "Drawer front".
- `loadStoredPieces(): Piece[]` returns `[]` when there's no data, `[]` is saved, the data isn't an array, or the JSON is invalid.

- [ ] **Step 1: Write the failing tests**

```ts
describe('start-up', () => {
  it('starts empty when nothing is saved', () => {
    expect(loadStoredPieces()).toEqual([]);
  });
  it('stays empty after the list was cleared', () => {
    saveStoredPieces([]);
    expect(loadStoredPieces()).toEqual([]);
  });
  it('starts empty when the saved data is unreadable', () => {
    localStorage.setItem('cutwizard_pieces_v2', '{not json');
    expect(loadStoredPieces()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

  Run: `pnpm test services/storage.test.ts`
  Expected: 3 FAIL. All three currently return the 5 example pieces.

- [ ] **Step 3: Implement**

  - Rename `DEFAULT_PIECES` to `EXAMPLE_PIECES`, with English names.
  - Make `loadStoredPieces` return `[]` in the three cases.
  - Update the `PieceList` import and its usage.

- [ ] **Step 4: Verify**

  Run: `pnpm test` and `tsc`
  Expected: all PASS, and tsc exits 0.

- [ ] **Step 5: Commit**

```bash
git add services/storage.ts services/storage.test.ts components/PieceList.tsx
git commit -m "feat(startup): start with an empty cut list instead of example pieces"
```

---

### Task 3: Spanish clean-up, CSV headers, Melamine label

**Files:**
- Modify: `services/csvHelper.ts` (extract a pure `buildOptimizationCSV`; English headers; "Part N" default)
- Test: `services/csvHelper.test.ts` (new)
- Modify: `services/optimizer.ts` (English `label`s, "Part N" default name, `'No valid pieces'`)
- Modify: `services/storage.ts` (loader default name `Part ${idx + 1}`)
- Modify: `components/SettingsPanel.tsx`:
  - "Presets Comerciales" → `t('boardPresets')`;
  - "Espesor de la sierra" → `t('bladeHint')`;
  - the trim status "Disable" → `t('off')`;
  - Melamine `description` → `'2438.4 × 1219.2 mm (8×4 ft)'`.
- Modify: `components/PieceList.tsx` (`confirm`/`alert` strings → `t('clearAllConfirm')`, `t('csvNoPieces')`)
- Modify: `contexts/LanguageContext.tsx` (set `document.documentElement.lang = language` in an effect)
- Modify: `index.html` (`lang="en"` as the initial value)
- Modify: `contexts/translations.ts`

**Interfaces:**
- Produces: `export function buildOptimizationCSV(result: OptimizationResult): string` in `csvHelper.ts`. `exportOptimizationCSV` now calls it, then triggers the download as before.
- **New translation keys:**

| Key | en | es | si |
|---|---|---|---|
| `boardPresets` | Board presets | Tableros comerciales | සම්මත තහඩු |
| `bladeHint` | Saw blade thickness | Espesor de la sierra | කියත් තලයේ ඝණකම |
| `off` | Off | Desactivado | අක්‍රිය |
| `clearAllConfirm` | Clear the whole cut list? | ¿Vaciar toda la lista de piezas? | සම්පූර්ණ කැපුම් ලැයිස්තුව මකන්නද? |
| `csvNoPieces` | No valid parts found in this file. | No se encontraron piezas válidas en el archivo. | මෙම ගොනුවේ වලංගු කොටස් හමු නොවීය. |

- **The optimizer's strategy labels are not shown anywhere in the UI** (checked: no component reads `strategyLabel`). So they become plain English strings and get no translation keys. This deviates from the spec's "translation key" wording, because there is nothing to translate on screen.

- [ ] **Step 1: Write the failing tests in `services/csvHelper.test.ts`**

```ts
it('writes English CSV headers', () => {
  const csv = buildOptimizationCSV({ boards: [], totalBoards: 0, totalEfficiency: 0, totalWaste: 0, unplacedPieces: [], strategyUsed: 'none', strategyLabel: '', totalLinearCuts: 0, totalPartsCount: 0 });
  expect(csv.split('\n')[0]).toBe('Board,Part,Description,Width (mm),Height (mm),X (mm),Y (mm),Rotated 90°,Color');
});
it('names unnamed imported parts "Part N"', () => {
  expect(parsePiecesCSV('width,height,qty\n600,400,2').map((p) => p.name)).toEqual(['Part 1']);
});
it('still imports Spanish headers', () => {
  expect(parsePiecesCSV('ancho;alto;cantidad;nombre\n600;400;2;Puerta')[0]).toMatchObject({ width: 600, height: 400, quantity: 2, name: 'Puerta' });
});
```

- [ ] **Step 2: Run them to verify they fail**

  Run: `pnpm test services/csvHelper.test.ts`
  Expected: FAIL. `buildOptimizationCSV` isn't exported, and the default name is "Pieza 1".

- [ ] **Step 3: Implement the changes listed under Files**

- [ ] **Step 4: Verify**

  - Run: `pnpm test` and `tsc`. Expected: all PASS, and tsc exits 0.
  - Then run:

    ```bash
    grep -rnE "Pieza|Presets Comerciales|Espesor|Mayor |Sin piezas|¿Deseas|No se pudieron" components services App.tsx
    ```

    Expected: matches only in `contexts/translations.ts` and in CSV-import header regexes (`ancho|alto|cantidad…`).

- [ ] **Step 5: Commit**

```bash
git add services/csvHelper.ts services/csvHelper.test.ts services/optimizer.ts services/storage.ts components/SettingsPanel.tsx components/PieceList.tsx contexts/LanguageContext.tsx contexts/translations.ts index.html
git commit -m "fix(i18n): translate leftover Spanish strings, English CSV headers, correct Melamine label"
```

---

### Task 4: Shell: job bar, settings drawer, two-pane grid

**Files:**
- Create: `components/JobBar.tsx`, `components/SettingsDrawer.tsx`
- Modify: `App.tsx`:
  - `settingsOpen` state;
  - new grid `lg:grid-cols-12` with the left pane `lg:col-span-5` and the right pane `lg:col-span-7`;
  - remove the "Optimize cuts" button and the `isOptimizing` spinner (keep the auto-optimize effect);
  - `SettingsPanel` moves inside `SettingsDrawer`.
- Modify: `components/Navbar.tsx` (tab group: drop `overflow-x-auto`; on narrow widths use `flex-wrap` or hide the tab labels and keep the icons, so no scrollbar appears)
- Modify: `components/SettingsPanel.tsx` (remove its outer card chrome if it doubles up inside the drawer; inputs get `<label htmlFor>`)
- Modify: `contexts/translations.ts`

**Interfaces:**
- Produces:
  - `export const JobBar: React.FC<{ settings: Settings; onSettingsChange: (s: Settings) => void; onOpenSettings: () => void; onPrint: () => void; onExportCsv: () => void; canExport: boolean; darkMode: boolean }>`.
    - The job name input edits `settings.jobNumber`.
    - The board chip reads `` `${boardWidth} × ${boardHeight} · ${t('kerf')} ${kerf} · ${t('trim')} ${enableTrimMargin ? trimMargin : t('off')}` ``.
  - `export const SettingsDrawer: React.FC<{ open: boolean; onClose: () => void; darkMode: boolean; children: React.ReactNode }>`:
    - `role="dialog"`, `aria-modal="true"`, `aria-labelledby` its heading;
    - Esc and a backdrop click call `onClose`;
    - on open, focus goes to the close button; on close, focus returns to the element that opened it;
    - `print:hidden`.
- **New translation keys** (en / es / si):
  - `jobName`: Job name / Nombre del trabajo / රැකියාවේ නම
  - `jobSettings`: Job settings / Ajustes del trabajo / රැකියා සැකසුම්
  - `kerf`: kerf / corte / කැපුම
  - `trim`: trim / refilado / කප්පාදුව
  - `close`: Close / Cerrar / වසන්න
  - `exportCsv`: Export CSV / Exportar CSV / CSV නිර්යාත කරන්න

- [ ] **Step 1: Build `JobBar` and `SettingsDrawer`, and rewire `App.tsx` as described above**

  This is UI work verified in the browser, not by unit tests. The project has no DOM test environment, and the spec pins manual verification for UI.

- [ ] **Step 2: Verify automatically**

  Run: `pnpm test`, then `tsc`, then `pnpm build`
  Expected: all pass, and the build succeeds.

- [ ] **Step 3: Verify in the running app** (`preview_start` with `cutwizard-dev`)

  Expected:
  - at 1366 px, two columns, with the job bar above them;
  - Job settings opens the drawer and focus lands on its close button;
  - Esc closes it and focus returns to the Job settings button; clicking the backdrop also closes it;
  - changing the kerf in the drawer updates the board chip and the plan;
  - no "Optimize cuts" button;
  - at 375 px the navbar tabs show no horizontal scrollbar, and the panes stack;
  - print preview (`window.print`) hides the job bar and the drawer.

- [ ] **Step 4: Commit**

```bash
git add components/JobBar.tsx components/SettingsDrawer.tsx components/SettingsPanel.tsx components/Navbar.tsx App.tsx contexts/translations.ts
git commit -m "feat(ui): two-pane workspace with job bar and settings drawer"
```

---

### Task 5: Left pane: cabinet builder with custom sizes, grouped cut list

**Files:**
- Create: `services/cutList.ts`, `services/cutList.test.ts`
- Create: `components/CabinetBuilder.tsx`. Delete `components/CabinetPresetPicker.tsx`; the builder replaces it, carrying over its quantity, preview and name maps.
- Modify: `components/PieceList.tsx`:
  - render groups from `groupPieces`;
  - an empty state;
  - a ⋯ menu;
  - the template pop-up without the cabinet section.
- Modify: `App.tsx` (render `<CabinetBuilder>` above `<PieceList>` in the left pane)
- Modify: `contexts/translations.ts`

**Interfaces:**
- Consumes (Task 1): `CABINET_SERIES`, `STANDARD_WIDTHS`, `SIZE_LIMITS`, `validateCabinetSize`, `standardSize`, `isStandardSize`, `drawersAvailable`, `tryBuildCabinet`, `CabinetSize` and `createCabinetGroups`. Also the existing `clampCabinetQuantity` and `MAX_CABINET_QUANTITY`.
- Produces:
  - In `services/cutList.ts`:

    ```ts
    export interface PieceGroup { groupId: string; name: string; isCabinet: boolean; pieces: Piece[]; }
    export function groupPieces(pieces: Piece[]): { groups: PieceGroup[]; loose: Piece[] };
    ```

    - Groups come in first-seen order.
    - `name` is the first piece's `groupName`, or `''`.
    - `isCabinet` is true when the first piece has a `cabinetSeriesId`.
  - `export const CabinetBuilder: React.FC<{ darkMode: boolean; onAdd: (pieces: Piece[]) => void }>`.
    - **State:** `seriesId`, `mode: 'standard' | 'custom'`, `width` (standard chip), `custom: { width: string; height: string; depth: string }`, `drawers`, `quantityInput`.
    - **Custom mode:**
      - **Prefill:** clicking **Custom** prefills `custom` from `standardSize(seriesId, width)`.
      - **Validation:** each field shows its `SizeProblem` as ``t('sizeRange')`` (for example "Width must be 100–2400 mm"), under the field with `aria-describedby`.
      - **Add button:** **Add cabinet** is disabled while there are problems.
    - **Group name:**
      - standard size: `` `${t(seriesKey)} ${width}` ``;
      - custom size: `` `${t(seriesKey)} ${w} × ${h} × ${d}` ``;
      - plus `` ` ${t('withDrawersSuffix')}` `` when drawers are on.
    - **Drawers:** use `drawersAvailable(seriesId, size)`, and turn drawers off when it becomes false.
    - **Preview:** uses `tryBuildCabinet`, and shows nothing when it returns `null`. Thirds show with one decimal.
- **Translation changes:**
  - `seriesDeep560` text changes to "Deep base" / "Base profunda" / "ගැඹුරු පාදක", and `seriesShallow300` to "Shallow" / "Poco profunda" / "නොගැඹුරු".
  - **New keys** (en / es / si):
    - `custom`: Custom / Personalizado / අභිරුචි
    - `widthLabel`: Width / Ancho / පළල
    - `heightLabel`: Height / Alto / උස
    - `depthLabel`: Depth / Profundidad / ගැඹුර
    - `sizeRange`: must be {min}–{max} mm / debe ser {min}–{max} mm / {min}–{max} මි.මී. විය යුතුය
    - `drawersTooShort`: Too short for drawers / Demasiado bajo para cajones / ලාච්චු සඳහා උස මදි
    - `addFirstCabinet`: Add your first cabinet / Agrega tu primer gabinete / ඔබේ පළමු කබඩ් එක එක් කරන්න
    - `addFirstCabinetHint`: Pick a size above, or add loose parts below. / Elige una medida arriba o agrega piezas sueltas abajo. / ඉහළින් ප්‍රමාණයක් තෝරන්න, නැතහොත් පහතින් වෙනම කොටස් එක් කරන්න.
    - `looseParts`: Loose parts / Piezas sueltas / වෙනම කොටස්
    - `moreActions`: More actions / Más acciones / තවත් ක්‍රියා
  - **Substitution:** `sizeRange` is filled in by simple `.replace('{min}', …).replace('{max}', …)` at the call site, with the field label prefixed.

- [ ] **Step 1: Write the failing tests in `services/cutList.test.ts`**

```ts
const cab = (groupId: string, name: string, extra = {}) => ({ id: `${groupId}-${name}`, width: 1, height: 1, quantity: 1, canRotate: true, groupId, groupName: name, cabinetSeriesId: 'deep-560' as const, ...extra });
it('splits groups from loose parts in first-seen order', () => {
  const loose = { id: 'l1', width: 5, height: 5, quantity: 1, canRotate: true };
  const r = groupPieces([cab('b', 'B'), loose, cab('a', 'A'), cab('b', 'B', { id: 'b2' })]);
  expect(r.groups.map((g) => [g.groupId, g.name, g.pieces.length])).toEqual([['b', 'B', 2], ['a', 'A', 1]]);
  expect(r.loose).toEqual([loose]);
});
it('marks template groups without cabinet data as non-cabinet groups', () => {
  const r = groupPieces([{ id: 't1', width: 1, height: 1, quantity: 1, canRotate: true, groupId: 'tpl', groupName: 'Kitchen A' }]);
  expect(r.groups[0]).toMatchObject({ groupId: 'tpl', name: 'Kitchen A', isCabinet: false });
});
it('returns nothing for an empty list', () => {
  expect(groupPieces([])).toEqual({ groups: [], loose: [] });
});
```

- [ ] **Step 2: Run them to verify they fail**

  Run: `pnpm test services/cutList.test.ts`
  Expected: FAIL, "Failed to resolve import ./cutList".

- [ ] **Step 3: Implement `groupPieces` and run the tests to verify they pass**

  Run: `pnpm test`
  Expected: PASS.

- [ ] **Step 4: Build `CabinetBuilder` and reorganise `PieceList`**

  - **Groups:** each group is a collapsible row with name, part count and delete. This reuses the existing collapse state and `removeGroup`.
  - **Loose parts:** a "Loose parts" section with an **Add part** row (the existing `addPiece`).
  - **⋯ menu:** a button with `aria-haspopup="menu"`. It contains save template, load template (the existing pop-up, now only "My templates"), import CSV, export parts CSV and clear all. Clear all asks for confirmation with `t('clearAllConfirm')`. The menu closes on outside click or Esc.
  - **Empty state:** when `pieces.length === 0`, show `t('addFirstCabinet')` plus the hint, in place of the table.
  - **Remove** the old "Load example pieces" button from the list header. The right-pane empty state takes it over in Task 6.

- [ ] **Step 5: Verify**

  - **Automated:** run `pnpm test`, `tsc` and `pnpm build`. Expected: all pass.
  - **In the browser:**
    - Add Deep 900 + drawers: a group named "Deep base 900 + drawers" appears.
    - Click Custom, then enter 820 / 850 / 580 with drawers on: the preview shows the check values and the name "Deep base 820 × 850 × 580 + drawers".
    - Type height 400: drawers turn off and say "Too short for drawers".
    - Type width 50: a "Width must be 100–2400 mm" message appears and Add is disabled.
    - Clear the width box: no crash.
    - The ⋯ menu works with the mouse and Esc.
    - A saved template still loads as before.
    - After clearing the list, the empty state shows.

- [ ] **Step 6: Commit**

```bash
git add services/cutList.ts services/cutList.test.ts components/CabinetBuilder.tsx components/PieceList.tsx App.tsx contexts/translations.ts
git rm components/CabinetPresetPicker.tsx
git commit -m "feat(ui): cabinet builder with custom sizes and a cut list grouped by cabinet"
```

---

### Task 6: Right pane: summary row, plan labels, empty state, print line

**Files:**
- Test: `services/optimizer.test.ts` (new)
- Modify: `components/StatsSummary.tsx`:
  - the unplaced warning moves to the top;
  - 4 main KPIs: boards (+ drawers), yield, parts, cost;
  - a "More" toggle reveals waste, linear cut and useful offcuts, with their existing tooltips;
  - the Print and CSV buttons move to the JobBar, so they're removed here.
- Modify: `components/Visualizer.tsx`:
  - a centred part name when `p.w >= 250 && p.h >= 120`;
  - a `<title>` on every part group;
  - the print header for `boardIndex === 1` adds the extra-boards line.
- Modify: `App.tsx`:
  - pass `extraBoards` and `groupNames` to `Visualizer`;
  - pass `onLoadExample` to the right-pane empty state;
  - pass the Print/CSV handlers to `JobBar`.
- Modify: `contexts/translations.ts`

**Interfaces:**
- **New `Visualizer` props:** `groupNames: Record<string, string>` (groupId → groupName, built in `App` with `useMemo` from `pieces`) and `extraBoards: number`.
  - The `<title>` text is `` `${name} · ${w} × ${h} mm${groupName ? ` · ${groupName}` : ''}` ``.
  - The print line is `+ ${extraBoards} ${t('extraBoardsForDrawers')}`. It's shown only when `extraBoards > 0` and `boardIndex === 1`, with `hidden print:block`.
- **Right-pane empty state** (in `App.tsx`, replacing today's "ready to optimize" block): `t('planEmpty')` plus a link-style button `t('loadExample')` that calls `handlePiecesChange(EXAMPLE_PIECES)`.
- **New translation keys** (en / es / si):
  - `more`: More / Más / තවත්
  - `less`: Less / Menos / අඩුවෙන්
  - `planEmpty`: Your cut plan appears here / Tu plan de corte aparecerá aquí / ඔබේ කැපුම් සැලැස්ම මෙහි දිස්වේ
  - `loadExample`: Load example / Cargar ejemplo / උදාහරණය පූරණය කරන්න
  - `extraBoardsForDrawers`: extra 8×4 boards for drawers / tableros 8×4 extra para cajones / ලාච්චු සඳහා අමතර 8×4 තහඩු
  - `parts`: Parts / Piezas / කොටස්

- [ ] **Step 1: Write the failing-first guard test in `services/optimizer.test.ts`**

```ts
it('reports a part larger than the board as unplaced instead of dropping it', () => {
  const result = optimizeCuts(
    [{ id: 'back', name: 'Back', width: 2400, height: 2400, quantity: 1, canRotate: true }, { id: 'ok', width: 600, height: 400, quantity: 1, canRotate: true }],
    { boardWidth: 2440, boardHeight: 1220, kerf: 3, trimMargin: 0, enableTrimMargin: false });
  expect(result.unplacedPieces.map((p) => p.id)).toEqual(['back']);
  expect(result.boards.flatMap((b) => b.placedPieces).map((p) => p.originalId)).toEqual(['ok']);
});
```

  This pins existing optimizer behaviour that the new right pane depends on. It is expected to **pass** on first run. If it fails, stop and debug the optimizer before touching the UI.

- [ ] **Step 2: Run it**

  Run: `pnpm test services/optimizer.test.ts`
  Expected: PASS.

- [ ] **Step 3: Implement the `StatsSummary`, `Visualizer` and `App` changes above**

- [ ] **Step 4: Verify**

  - **Automated:** run `pnpm test`, `tsc` and `pnpm build`. Expected: all pass.
  - **In the browser:**
    - **Empty plan:** with an empty job, the right pane shows "Your cut plan appears here", and **Load example** fills both panes.
    - **Labels:** with Deep 900 + drawers ×2, large parts show their names, and hovering any part shows the tooltip with the cabinet name.
    - **Summary row:** it shows 4 KPIs. **More** reveals waste, linear cut and offcuts, and **Less** hides them.
    - **Unplaced warning:** add a custom deep 2400 × 2400 × 560. The warning appears at the top of the right pane.
    - **Print preview:** board 1's header includes "+ 2 extra 8×4 boards for drawers".

- [ ] **Step 5: Commit**

```bash
git add services/optimizer.test.ts components/StatsSummary.tsx components/Visualizer.tsx App.tsx contexts/translations.ts
git commit -m "feat(ui): right pane with summary row, named plan parts, empty state and print drawer-board line"
```

---

### Task 7: Docs and full app check

**Files:**
- Modify: `CLAUDE.md`:
  - **Architecture:** describe the two-pane shell (`JobBar`, `SettingsDrawer`, `CabinetBuilder`, `groupPieces`), `CabinetSize`/`SIZE_LIMITS`/`tryBuildCabinet`, and `cabinetDepth`.
  - **Start-up:** say that start-up is empty (`EXAMPLE_PIECES` loads only via **Load example**).
  - **Stale text:** remove what's no longer true (`DEFAULT_PIECES`, the Spanish strategy labels, the "Optimize" button).

- [ ] **Step 1: Update `CLAUDE.md` as listed**

- [ ] **Step 2: Run the full manual check in the running app**

  Expected: every item passes. Record the results in the ledger.
  - 1366 px and 375 px, in light and dark mode;
  - English, Spanish and Sinhala: no leftover Spanish in English mode, and the `<html lang>` follows the chosen language;
  - first visit is empty;
  - adding cabinets and reloading keeps the job;
  - Clear all, then reload, stays empty;
  - the settings drawer works with the keyboard;
  - choosing the Melamine preset shows "2438.4 × 1219.2 mm (8×4 ft)";
  - a custom cabinet round-trips through a saved template;
  - print preview: one board per page, the drawer-board line, and no app chrome;
  - Inventory still works.

- [ ] **Step 3: Run the full automated check**

  Run: `pnpm test`, `tsc` and `pnpm build`
  Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: describe the two-pane workspace and custom cabinet sizes"
```
