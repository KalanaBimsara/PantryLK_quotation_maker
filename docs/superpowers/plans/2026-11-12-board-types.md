# Separate Board Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut each job from three board types (Carcass 18 mm, AGT 18 mm, HMR 6 mm) and show how many sheets of each to buy.

**Architecture:** Every piece carries a `material`. A new pure module splits the cut list by material and runs the unchanged `optimizeCuts` once per material with that material's sheet size. The right pane, printout and CSV read the resulting list of per-material plans.

**Tech Stack:** React 19, Vite 6, TypeScript 5.8, Vitest 3 (no DOM), Tailwind via CDN, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-12-board-types-design.md`

## Global Constraints

- Branch `feat/board-types`. Never push or pull (origin is someone else's repository).
- The working tree holds the user's own uncommitted edits to `components/Navbar.tsx` and `tsconfig.json`, plus untracked `.claude/launch.json`. Never stage, change or revert them: always `git add` the exact files of the task, never `git add -A` or `git commit -a`.
- Commit messages end with `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.
- `services/cabinetSeries.ts` imports nothing from the app and keeps English comments. Other code comments follow the surrounding file (mostly Spanish).
- Files use CRLF. Make multi-line edits with the Edit tool, not string-replace scripts.
- `optimizeCuts` in `services/optimizer.ts` is not modified.
- Material ids are exactly `'carcass' | 'agt' | 'hmr'`; a missing or unknown value means `carcass`.
- Sheet sizes: 8×4 ft = 2440 × 1220 mm, 9×6 ft = 2745 × 1830 mm. Thickness: carcass 18, agt 18, hmr 6.
- Every new UI string goes into the `en`, `es` and `si` blocks of `contexts/translations.ts`. "AGT" and "HMR" are never translated.
- After each task: `pnpm test` and `pnpm exec tsc --noEmit` both pass.

## Review Focus

1. **A job saved before this change is reopened** (pieces without `material`, settings without the AGT/HMR fields): it opens with every part on Carcass and 8×4 defaults, no crash. Test in Task 2.
2. **A sheet size is blank or 0 while being typed in Job settings:** no crash or hang; that type's parts are reported as not fitting. Test in Task 3.
3. **All carcass parts of a drawer cabinet are moved to another board by hand:** the extra drawer sheets still appear on a Carcass row and in the cost. Test in Task 3.
4. **A CSV whose board type is written loosely** (`agt `, `Hmr`, a `Material` or `Tablero` header, an unknown value): known values map case-insensitively, anything else lands on Carcass, and no row is dropped. Test in Task 4.
5. **Two board types both have a "board 1":** each drawing keeps its own zoom and hover state, and hovering a row highlights the right drawing. Not unit-testable without a DOM; checked in the app in Task 7.

---

### Task 1: Material on cabinet parts and pieces

**Files:**
- Modify: `services/cabinetSeries.ts`, `types.ts`, `services/cabinetPieces.ts`
- Test: `services/cabinetSeries.test.ts`, `services/cabinetPieces.test.ts`

**Interfaces:**
- Produces, from `services/cabinetSeries.ts`:
  - `export type CabinetMaterial = 'carcass' | 'agt' | 'hmr'`
  - `export const MATERIAL_THICKNESS: Readonly<Record<CabinetMaterial, number>>` = `{ carcass: 18, agt: 18, hmr: 6 }`
  - `CabinetPart.material: CabinetMaterial`
- Produces, from `types.ts`: `export type MaterialId = CabinetMaterial` and `Piece.material?: MaterialId`.

- [ ] **Step 1: Write the failing tests**

In `cabinetSeries.test.ts`:

```ts
it('puts doors and drawer fronts on AGT, backs on HMR and the rest on carcass', () => {
  const byKey = (b: CabinetBuild) => Object.fromEntries(b.parts.map((p) => [p.key, p.material]));
  expect(byKey(buildCabinet('deep-560', standardSize('deep-560', 600), { drawers: false }))).toEqual({
    bottom: 'carcass', shelf: 'carcass', side: 'carcass', back: 'hmr', topRail: 'carcass', door: 'agt',
  });
  expect(byKey(buildCabinet('deep-560', standardSize('deep-560', 900), { drawers: true })).drawerFront).toBe('agt');
  expect(byKey(buildCabinet('shallow-300', standardSize('shallow-300', 600), { drawers: false }))).toEqual({
    bottom: 'carcass', top: 'carcass', shelf: 'carcass', side: 'carcass', back: 'hmr', backSupport: 'carcass', door: 'agt',
  });
});

it('knows each material thickness', () => {
  expect(MATERIAL_THICKNESS).toEqual({ carcass: 18, agt: 18, hmr: 6 });
});
```

In `cabinetPieces.test.ts`: `createCabinetGroups` for a deep 600 gives pieces where the door piece has `material: 'agt'`, the back `'hmr'` and the bottom `'carcass'` (find them by the `partName` key, as the existing tests do).

- [ ] **Step 2: Run** `pnpm test services/cabinetSeries.test.ts services/cabinetPieces.test.ts`. Expected: the new tests fail.
- [ ] **Step 3: Implement.** In `cabinetSeries.ts`, the `part()` helper sets `material` from the part key (`door`, `drawerFront` → `agt`; `back` → `hmr`; else `carcass`); sizes and `canRotate` are untouched. In `types.ts` add the alias and the optional field. In `createCabinetGroups` copy `part.material` onto each piece.
- [ ] **Step 4: Run** `pnpm test` and `pnpm exec tsc --noEmit`. Expected: all pass.
- [ ] **Step 5: Commit** the five files: `feat(cabinets): assign each cabinet part to a board type`.

---

### Task 2: Board settings, helpers and persistence

**Files:**
- Create: `services/materials.ts`, `services/materials.test.ts`
- Modify: `types.ts`, `services/storage.ts`, `services/optimizer.test.ts` (settings literal only)
- Test: `services/storage.test.ts`, `services/templatePieces.test.ts`

**Interfaces:**
- Consumes: `MaterialId`, `Piece.material` (Task 1).
- Produces, in `Settings`: `agtWidth: number; agtHeight: number; agtPrice?: number; hmrWidth: number; hmrHeight: number; hmrPrice?: number`. `DEFAULT_SETTINGS` gains `agtWidth: 2440, agtHeight: 1220, hmrWidth: 2440, hmrHeight: 1220`.
- Produces, from `services/materials.ts`:
  - `MATERIAL_ORDER: readonly MaterialId[]` = `['carcass', 'agt', 'hmr']`
  - `MATERIAL_NAMES: Readonly<Record<MaterialId, string>>` = `{ carcass: 'Carcass', agt: 'AGT', hmr: 'HMR' }` (CSV and fallback label)
  - `AGT_SIZES: readonly { id: '8x4' | '9x6'; width: number; height: number }[]`
  - `isMaterialId(value: unknown): value is MaterialId`
  - `parseMaterial(value: unknown): MaterialId | undefined` (trimmed, case-insensitive)
  - `materialOf(piece: { material?: unknown }): MaterialId`
  - `boardFor(settings: Settings, material: MaterialId): { width: number; height: number; price: number }` (price 0 when unset)
  - `sheetLabel(width: number, height: number): string | null`

- [ ] **Step 1: Write the failing tests**

`materials.test.ts`:

```ts
const S = { ...DEFAULT_SETTINGS, boardPrice: 9000, agtWidth: 2745, agtHeight: 1830, agtPrice: 30000 };

it('reads the board for each material', () => {
  expect(boardFor(S, 'carcass')).toEqual({ width: 2440, height: 1220, price: 9000 });
  expect(boardFor(S, 'agt')).toEqual({ width: 2745, height: 1830, price: 30000 });
  expect(boardFor(S, 'hmr')).toEqual({ width: 2440, height: 1220, price: 0 });
});
it('falls back to carcass for a missing or unknown material', () => {
  expect(materialOf({})).toBe('carcass');
  expect(materialOf({ material: 'plywood' })).toBe('carcass');
  expect(materialOf({ material: 'hmr' })).toBe('hmr');
});
it('parses loose material text', () => {
  expect(parseMaterial(' Agt ')).toBe('agt');
  expect(parseMaterial('HMR')).toBe('hmr');
  expect(parseMaterial('Carcass')).toBe('carcass');
  expect(parseMaterial('oak')).toBeUndefined();
  expect(parseMaterial(undefined)).toBeUndefined();
});
it('labels the two standard sheets, within 3 mm', () => {
  expect(sheetLabel(2440, 1220)).toBe('8×4 ft');
  expect(sheetLabel(2438.4, 1219.2)).toBe('8×4 ft');
  expect(sheetLabel(2745, 1830)).toBe('9×6 ft');
  expect(sheetLabel(2000, 1000)).toBeNull();
});
```

`storage.test.ts`:
- a piece saved with `material: 'agt'` reloads with it; `material: 'plywood'` reloads with no `material` key;
- settings saved with `agtWidth: 2745, agtHeight: 1830, agtPrice: 30000, hmrPrice: 4500` reload with those values;
- **Review Focus 1:** with `cutwizard_settings_v2` = `{ boardWidth: 2440, boardHeight: 1220 }` and pieces saved without `material`, settings load with `agtWidth 2440, agtHeight 1220, hmrWidth 2440, hmrHeight 1220` and no `agtPrice`/`hmrPrice` keys, and every piece has `materialOf(p) === 'carcass'`;
- `agtWidth: 0` or `'abc'` in storage loads as 2440.

`templatePieces.test.ts`: `piecesFromTemplate({ ..., pieces: templatePiecesFrom([pieceWith material 'hmr']) })` returns a piece with `material: 'hmr'`.

- [ ] **Step 2: Run** `pnpm test services/materials.test.ts services/storage.test.ts services/templatePieces.test.ts`. Expected: new tests fail.
- [ ] **Step 3: Implement.** `materials.ts` as in Interfaces (pure, imports only types and nothing from React). In `storage.ts`: the piece loader adds `material` only when `isMaterialId`; the settings loader reads the four sizes with the existing `num(...) || default` pattern and adds `agtPrice`/`hmrPrice` to `COST_FIELDS`. In `optimizer.test.ts` build the settings literal from `{ ...DEFAULT_SETTINGS, ... }` so it type-checks.
- [ ] **Step 4: Run** `pnpm test` and `pnpm exec tsc --noEmit`. Expected: all pass.
- [ ] **Step 5: Commit** the listed files: `feat(settings): AGT and HMR sheet sizes and prices, saved with the job`.

---

### Task 3: Per-material plans and totals

**Files:**
- Create: `services/materialPlan.ts`, `services/materialPlan.test.ts`

**Interfaces:**
- Consumes: `optimizeCuts(pieces, settings)`, and from Task 2 `MATERIAL_ORDER`, `materialOf`, `boardFor`.
- Produces:

```ts
export interface MaterialPlan { material: MaterialId; boardWidth: number; boardHeight: number; result: OptimizationResult }
export interface UnplacedPart { piece: Piece; material: MaterialId }
export interface PlanTotals {
  totalBoards: number; totalParts: number;
  efficiency: number; waste: number;        // percent, weighted by sheet area
  linearCuts: number;                        // metres, 2 decimals
  usefulOffcuts: number;
  edgeBandMeters: number;                    // carcass and AGT parts only
  unplaced: UnplacedPart[];
}
export interface BuyRow { material: MaterialId; boardWidth: number; boardHeight: number; cut: number; extra: number; total: number }

export function planByMaterial(pieces: Piece[], settings: Settings): MaterialPlan[];
export function summarizePlans(plans: MaterialPlan[]): PlanTotals;
export function boardsToBuy(plans: MaterialPlan[], settings: Settings, extraBoards: number): BuyRow[];
export function boardsCost(rows: BuyRow[], settings: Settings): number;
export const boardKey = (material: MaterialId, boardId: number): string => `${material}-${boardId}`;
```

Rules the tests do not fully determine:
- `planByMaterial` returns one plan per material that has at least one piece, in `MATERIAL_ORDER`.
- `efficiency` = Σ(plan `totalEfficiency` × plan sheet area) ÷ Σ(plan sheet area), where a plan's sheet area is `totalBoards × boardWidth × boardHeight`; `waste` the same with `totalWaste`. With no boards both are 0.
- `boardsToBuy`: one row per plan with `cut = result.totalBoards`. `extraBoards` go on the carcass row as `extra`; if there is no carcass plan and `extraBoards > 0`, a carcass row with `cut: 0` is added first. Rows with `total === 0` are dropped.
- `boardsCost` = Σ `row.total × boardFor(settings, row.material).price`.

- [ ] **Step 1: Write the failing tests** in `materialPlan.test.ts`, with `S = { ...DEFAULT_SETTINGS, kerf: 3 }` and a helper `pc(id, w, h, material?, qty = 1)`:

```ts
it('plans each used material on its own sheet, in order', () => {
  const plans = planByMaterial([pc('d', 750, 450, 'agt'), pc('s', 750, 560), pc('b', 750, 600, 'hmr')],
    { ...S, agtWidth: 2745, agtHeight: 1830 });
  expect(plans.map((p) => p.material)).toEqual(['carcass', 'agt', 'hmr']);
  expect(plans[1]).toMatchObject({ boardWidth: 2745, boardHeight: 1830 });
  expect(plans[1].result.boards[0]).toMatchObject({ width: 2745, height: 1830 });
  expect(plans.every((p) => p.result.totalBoards === 1)).toBe(true);
});
it('leaves out a material with no parts', () => {
  expect(planByMaterial([pc('s', 750, 560)], S).map((p) => p.material)).toEqual(['carcass']);
  expect(planByMaterial([], S)).toEqual([]);
});
it('fits a tall door on 9×6 that does not fit on 8×4', () => {
  const door = { ...pc('d', 2600, 450, 'agt'), canRotate: false };
  expect(summarizePlans(planByMaterial([door], S)).unplaced).toEqual([{ piece: expect.objectContaining({ id: 'd' }), material: 'agt' }]);
  expect(summarizePlans(planByMaterial([door], { ...S, agtWidth: 2745, agtHeight: 1830 })).unplaced).toEqual([]);
});
it('does not crash on a zero sheet size', () => {           // Review Focus 2
  const totals = summarizePlans(planByMaterial([pc('b', 750, 600, 'hmr')], { ...S, hmrWidth: 0 }));
  expect(totals.unplaced).toHaveLength(1);
  expect(totals.totalBoards).toBe(0);
  expect(totals.efficiency).toBe(0);
});
it('adds totals across materials and skips edge banding on HMR', () => {
  const plans = planByMaterial([pc('s', 1000, 500), pc('b', 1000, 500, 'hmr')], S);
  const totals = summarizePlans(plans);
  expect(totals.totalBoards).toBe(2);
  expect(totals.totalParts).toBe(2);
  expect(totals.edgeBandMeters).toBeCloseTo(3);              // 2 × (1000 + 500) mm, carcass part only
  expect(totals.efficiency).toBeCloseTo(plans[0].result.totalEfficiency); // same sheets, same part
});
it('lists what to buy and what it costs', () => {
  const plans = planByMaterial([pc('s', 750, 560), pc('d', 750, 450, 'agt')], S);
  const rows = boardsToBuy(plans, S, 2);
  expect(rows).toEqual([
    { material: 'carcass', boardWidth: 2440, boardHeight: 1220, cut: 1, extra: 2, total: 3 },
    { material: 'agt', boardWidth: 2440, boardHeight: 1220, cut: 1, extra: 0, total: 1 },
  ]);
  expect(boardsCost(rows, { ...S, boardPrice: 9000, agtPrice: 30000 })).toBe(57000);
});
it('keeps a carcass row for drawer sheets when no part is on carcass', () => {  // Review Focus 3
  const rows = boardsToBuy(planByMaterial([pc('d', 750, 450, 'agt')], S), S, 1);
  expect(rows[0]).toEqual({ material: 'carcass', boardWidth: 2440, boardHeight: 1220, cut: 0, extra: 1, total: 1 });
});
```

- [ ] **Step 2: Run** `pnpm test services/materialPlan.test.ts`. Expected: fails, module not found.
- [ ] **Step 3: Implement** `services/materialPlan.ts` to the Interfaces block and rules above.
- [ ] **Step 4: Run** `pnpm test` and `pnpm exec tsc --noEmit`. Expected: all pass.
- [ ] **Step 5: Commit** both files: `feat(plan): one cut plan per board type with combined totals`.

---

### Task 4: Board type in CSV

**Files:**
- Modify: `services/csvHelper.ts`, `App.tsx` (the export call only)
- Test: `services/csvHelper.test.ts`

**Interfaces:**
- Consumes: `MaterialPlan` (Task 3); `MATERIAL_NAMES`, `materialOf`, `parseMaterial` (Task 2).
- Produces:
  - `buildPiecesListCSV(pieces)`: header `Name,Width (mm),Height (mm),Quantity,Can rotate,Board type`.
  - `buildOptimizationCSV(plans: MaterialPlan[])`: header `Board type,Board,Part,Description,Width (mm),Height (mm),X (mm),Y (mm),Rotated 90°,Color`; rows in plan order.
  - `exportOptimizationCSV(plans: MaterialPlan[]): void` (no download when no plan has a board).
  - `parsePiecesCSV` sets `material` on a piece only when the file has a board-type column with a known value.

- [ ] **Step 1: Write the failing tests**

```ts
it('writes the board type in the parts list and reads it back', () => {
  const csv = buildPiecesListCSV([
    { id: '1', name: 'Door', width: 750, height: 450, quantity: 2, canRotate: false, material: 'agt' },
    { id: '2', name: 'Side', width: 750, height: 560, quantity: 2, canRotate: false },
  ]);
  expect(csv.split('\n')[0]).toBe('Name,Width (mm),Height (mm),Quantity,Can rotate,Board type');
  expect(csv.split('\n')[1]).toBe('"Door",750,450,2,NO,AGT');
  expect(csv.split('\n')[2]).toBe('"Side",750,560,2,NO,Carcass');
  expect(parsePiecesCSV(csv).map((p) => p.material ?? 'carcass')).toEqual(['agt', 'carcass']);
});
it('reads a loosely written board type and never drops the row', () => {   // Review Focus 4
  const rows = parsePiecesCSV('Ancho;Alto;Cantidad;Nombre;Tablero\n600;400;1;A;hmr \n600;400;1;B;Agt\n600;400;1;C;oak\n600;400;1;D;');
  expect(rows.map((p) => p.material)).toEqual(['hmr', 'agt', undefined, undefined]);
  expect(parsePiecesCSV('Width,Height,Qty,Name,Material\n600,400,1,A,HMR')[0].material).toBe('hmr');
});
it('imports a file without the column onto carcass', () => {
  expect(parsePiecesCSV('Width,Height\n600,400')[0].material).toBeUndefined();
});
it('exports the plan with the board type first and board numbers restarting per type', () => {
  const plans = planByMaterial([pc('s', 750, 560), pc('d', 750, 450, 'agt')], DEFAULT_SETTINGS);
  const lines = buildOptimizationCSV(plans).trim().split('\n');
  expect(lines[0].startsWith('Board type,Board,Part,')).toBe(true);
  expect(lines[1].startsWith('Carcass,1,')).toBe(true);
  expect(lines[2].startsWith('AGT,1,')).toBe(true);
});
```

Update the existing optimization-CSV test to the new header and signature.

- [ ] **Step 2: Run** `pnpm test services/csvHelper.test.ts`. Expected: new tests fail.
- [ ] **Step 3: Implement.** Import header aliases: `board type|boardtype|material|tablero|tipo de tablero`. In `App.tsx`, `handleExportCsv` becomes `exportOptimizationCSV(planByMaterial(pieces, settings))` so the type-check stays green; Task 5 switches it to the `plans` state.
- [ ] **Step 4: Run** `pnpm test` and `pnpm exec tsc --noEmit`. Expected: all pass.
- [ ] **Step 5: Commit**: `feat(csv): board type column in both exports and on import`.

---

### Task 5: Right pane, drawings and printout

**Files:**
- Modify: `App.tsx`, `components/StatsSummary.tsx`, `components/Visualizer.tsx`, `contexts/translations.ts`

**Interfaces:**
- Consumes: everything Task 3 produces; `exportOptimizationCSV(plans)` (Task 4); `MATERIAL_THICKNESS` (Task 1); `sheetLabel`, `MATERIAL_NAMES` (Task 2).
- Produces:
  - `App` state `plans: MaterialPlan[] | null` replacing `result`; the debounced effect calls `planByMaterial`. `hasPlan` = some plan has a board.
  - `StatsSummary` props: `{ plans: MaterialPlan[] | null; settings: Settings; darkMode: boolean; extraBoards: number }`.
  - `Visualizer` props: `title?: string` added (e.g. `AGT 18 mm · 9×6 ft`), `buyLines?: string[]` added, `extraBoards` removed. `boardIndex`/`totalBoards` now count within the board type.
  - A shared label helper in `services/materials.ts`: `boardTitle(material: MaterialId, width: number, height: number, carcassName: string): string` → `"<name> <thickness> mm · <sheetLabel or 'W × H mm'>"`, where the name is `carcassName` for carcass and `MATERIAL_NAMES` otherwise. Add a unit test for it in `materials.test.ts` (`boardTitle('agt', 2745, 1830, 'Carcass')` → `'AGT 18 mm · 9×6 ft'`; `boardTitle('carcass', 2000, 1000, 'Carcass')` → `'Carcass 18 mm · 2000 × 1000 mm'`).

Decisions:
- **Boards to buy block** follows the approved mockup: header "Boards to buy" with the grand total; one row per `BuyRow` with name, thickness tag, sheet label and mm size, what goes on it, and `total`; under the number, "N cut + M for drawers" when `extra > 0`, otherwise "board(s)". Then Yield, Parts, Total cost; then the existing More toggle fed by `PlanTotals`.
- **Total cost** = `boardsCost(rows, settings)` + `totals.edgeBandMeters × edgeBandPrice` + front area × (machine rent + labour). Front area logic is unchanged but iterates every plan's placed pieces.
- **Unplaced warning** lists `UnplacedPart`s as `name · W × H mm · <board name and sheet label>`; it still shows when no board could be filled.
- **Drawings:** for each plan a heading (`boardTitle` + board count), then its `Visualizer`s with `key={boardKey(plan.material, board.id)}` and `title`. The on-screen bar shows `<title> · Board #n`.
- **Print header:** `<title> · Board n of m` (translated word for board). The first drawing of the first plan gets `buyLines`, one line per `BuyRow`: `"<boardTitle>: <total>"`; this replaces the "+ N extra 8×4 boards for drawers" line.
- The plan-count caption in the card header shows `totals.totalBoards`.
- New translation keys in all three blocks: `boardsToBuy`, `boardsInTotal`, `materialCarcass`, `cutCount`, `usesCarcass` ("sides, bottoms, shelves, rails"), `usesAgt` ("doors, drawer fronts"), `usesHmr` ("back panels"), `boardSingular`. Remove `extraBoardsForDrawers` if nothing else uses it.

- [ ] **Step 1:** Add `boardTitle` with its failing test, run it, implement, run again (pass).
- [ ] **Step 2:** Rework `App.tsx` to hold `plans` and pass the new props; update the CSV export call.
- [ ] **Step 3:** Rework `StatsSummary.tsx` around `boardsToBuy` and `summarizePlans`.
- [ ] **Step 4:** Update `Visualizer.tsx` props, on-screen bar and print header.
- [ ] **Step 5:** Add the translation keys to `en`, `es`, `si`.
- [ ] **Step 6: Run** `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`. Expected: all pass.
- [ ] **Step 7: Check in the app** (`cutwizard-dev` preview): add a deep 900 with drawers and a deep 600; the block lists Carcass, AGT and HMR with counts that match the drawings under each heading; no console errors.
- [ ] **Step 8: Commit** the changed files: `feat(ui): boards-to-buy summary and a cut plan per board type`.

---

### Task 6: Job settings, cabinet builder and cut list

**Files:**
- Modify: `components/SettingsPanel.tsx`, `components/JobBar.tsx`, `components/CabinetBuilder.tsx`, `components/PieceList.tsx`, `contexts/translations.ts`

**Interfaces:**
- Consumes: `AGT_SIZES`, `sheetLabel`, `MATERIAL_ORDER`, `MATERIAL_NAMES`, `materialOf` (Task 2); `CabinetPart.material` (Task 1); the `materialCarcass` key (Task 5).

Decisions:
- **SettingsPanel:** three labelled blocks. Carcass keeps its presets and width/height and gains the price field (`boardPrice` moves here from Job costing). AGT has two chips from `AGT_SIZES` (pressed when `sheetLabel(agtWidth, agtHeight)` matches that size), editable width/height, and `agtPrice`. HMR has width/height and `hmrPrice`. All number fields use the existing `handleInputChange`.
- **JobBar chip:** `<carcass W × H> · AGT <sheetLabel or W × H> · kerf · trim`.
- **CabinetBuilder preview:** a part whose `material` is not `carcass` shows a small tag with `MATERIAL_NAMES[material]` after its name.
- **PieceList:** every part row gets a compact `<select>` (options in `MATERIAL_ORDER`; labels: translated Carcass, AGT, HMR) with `aria-label` = board type + part name; changing it calls the existing `updateField(id, 'material', value)`. The add-part form gets the same select, default `carcass`. The table must still fit the left pane with no sideways scroll at 1280 px and at 1024 px.
- New translation keys in all three blocks: `boardType`, `carcassBoard`, `agtBoard`, `hmrBoard`, `pricePerSheet`.

- [ ] **Step 1:** SettingsPanel blocks and JobBar chip.
- [ ] **Step 2:** CabinetBuilder tags.
- [ ] **Step 3:** PieceList selector on rows and in the add form.
- [ ] **Step 4:** Translation keys in `en`, `es`, `si`.
- [ ] **Step 5: Run** `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`. Expected: all pass.
- [ ] **Step 6: Check in the app:** switch AGT 8×4 ↔ 9×6 and see the AGT count and drawings change; add a loose part, move it to HMR and see it move to the HMR plan; the cut list has no sideways scroll.
- [ ] **Step 7: Commit** the changed files: `feat(ui): board sizes in job settings and a board selector on every part`.

---

### Task 7: Whole-flow check and docs

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update `CLAUDE.md`:** the Architecture section describes `material` on pieces, `services/materials.ts`, `services/materialPlan.ts`, the per-material plans in `App`, the new `Settings` fields (and that they must be in the storage whitelist), and the CSV board-type column.
- [ ] **Step 2: Check in the app, start to finish:**
  - a mixed job (door and drawer cabinets, one loose part on HMR): counts in Boards to buy equal the drawings per heading, and the Carcass row shows the drawer sheets;
  - **Review Focus 5:** zoom the Carcass board 1, then confirm AGT board 1 is not zoomed; hover a door row and confirm only the AGT drawing highlights;
  - a door 2600 tall on AGT 8×4 appears in the warning with the board name, and disappears after switching to 9×6;
  - reload the page: board choices, AGT size and prices are kept;
  - clear a sheet-size field in Job settings: no crash;
  - dark mode, and 375 px width;
  - export both CSVs and re-import the parts list: board types are kept;
  - print header markup: each drawing carries its title, and the first carries the buy list (structural check only).
- [ ] **Step 3: Run** `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`. Expected: all pass.
- [ ] **Step 4: Commit** `CLAUDE.md` and any fixes from the check: `docs: describe board types and per-material plans`.
