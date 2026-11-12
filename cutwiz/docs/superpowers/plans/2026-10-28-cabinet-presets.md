# Cabinet Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Pantry LK standard base cabinets (deep 560 and shallow 300, in 12 widths, with a drawer variant for the deep series) as presets the user can pick, generated from one module with no dependencies that other tools can share later.

**Architecture:** `services/cabinetSeries.ts` is pure TypeScript that turns (series, width, drawers) into board parts, hardware and an extra-board count. `services/cabinetPieces.ts` is the app-side adapter that turns a build into grouped `Piece[]` and counts extra drawer boards. A new `CabinetPresetPicker` component in the existing template window uses the adapter, and `App`/`StatsSummary` add the extra boards to the board count and cost.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, pnpm, Vitest 3 (new), Tailwind via CDN.

**Spec:** `docs/superpowers/specs/2026-10-28-cabinet-presets-design.md`

## Before you start

The working tree has uncommitted user changes in the same files this plan edits (`types.ts`, `services/storage.ts`, `App.tsx`, `components/PieceList.tsx`, `components/StatsSummary.tsx`, `contexts/translations.ts`). Ask the user to commit or stash their own work first. Then create a branch `feat/cabinet-presets`, so the per-task commits contain only this feature.

## Global Constraints

- Boards are 18 mm, so the inside width is `W − 36`. Cabinet height is 750. Sizes are `width × height` in the order the spec's tables give.
- `STANDARD_WIDTHS = [150, 200, 300, 400, 450, 500, 600, 700, 800, 900, 1000, 1200]`.
- Door split: `W ≤ 600` gives 1 door of `W × 750`; `W > 600` gives 2 doors of `(W / 2) × 750`.
- Drawers: deep-560 only, and only for `W ≥ 300`. They give 3 fronts of `W × 250`, no doors, no hinges, 3 handles, 3 pairs of drawer rails and `extraBoards = 1`.
- Grain locked (`canRotate: false`): `side`, `door`, `drawerFront`. Every other part has `canRotate: true`.
- `services/cabinetSeries.ts` must not import from React, `../types`, `./storage` or `../contexts`.
- Every new UI string gets a key in all three blocks (`en`, `es`, `si`) of `contexts/translations.ts`.
- Test files import `describe`, `it`, `expect` and `beforeEach` from `'vitest'` explicitly (no globals config). Tests live next to the code as `services/*.test.ts`.
- Use pnpm only. `pnpm-lock.yaml` changes only through `pnpm add`. The project hook blocks direct edits to it.

## Review Focus

1. **Bad cabinet data in storage:** an unknown `cabinetSeriesId`, or `cabinetDrawers: true` where drawers aren't offered, must not crash the app. `countExtraBoards` counts that group as 0 (Task 3 test).
2. **Old groups from the removed `sys-` presets:** these have `groupId` and `cabinetWidth` but no `cabinetSeriesId`. They must still load and display, and they add no extra boards (Task 3 test).
3. **A cabinet whose parts were partly deleted or edited:** its extra board is counted once per `groupId`, never once per piece, and still counts while at least one piece of the group remains (Task 3 test).
4. **Strange quantity input:** empty, 0, negative, decimal or very large values clamp to an integer from 1 to `MAX_CABINET_QUANTITY` (50) instead of adding 0 or thousands of groups (Task 3 test).
5. **Adding several cabinets at once:** every group and every piece gets a distinct id, even when created in the same millisecond. Use a module counter, not `crypto.randomUUID`, which doesn't exist over plain-HTTP LAN addresses because the dev server listens on `0.0.0.0` (Task 3 test).

---

### Task 1: Vitest and the cabinet series module

**Files:**
- Modify: `package.json` (add a `test` script; the dev dependency comes from `pnpm add`)
- Create: `services/cabinetSeries.ts`
- Test: `services/cabinetSeries.test.ts`

**Interfaces:**
- Produces (exact exports of `services/cabinetSeries.ts`):
  ```ts
  export type CabinetSeriesId = 'deep-560' | 'shallow-300';
  export const STANDARD_WIDTHS: readonly number[];
  export type CabinetPartKey = 'bottom' | 'top' | 'shelf' | 'side' | 'back' | 'topRail' | 'backSupport' | 'door' | 'drawerFront';
  export type HardwareKey = 'legs' | 'hinges' | 'handles' | 'drawerRails';
  export interface CabinetPart { key: CabinetPartKey; width: number; height: number; quantity: number; canRotate: boolean; }
  export interface HardwareItem { key: HardwareKey; quantity: number; }
  export interface CabinetBuild { seriesId: CabinetSeriesId; width: number; depth: number; height: number; drawers: boolean; parts: CabinetPart[]; hardware: HardwareItem[]; extraBoards: number; }
  export const CABINET_SERIES: readonly { id: CabinetSeriesId; depth: number; height: number; supportsDrawers: boolean }[];
  export function isCabinetSeriesId(value: unknown): value is CabinetSeriesId;
  export function drawersAvailable(seriesId: CabinetSeriesId, width: number): boolean;
  export function buildCabinet(seriesId: CabinetSeriesId, width: number, opts: { drawers: boolean }): CabinetBuild;
  ```

- [ ] **Step 1: Install Vitest and add the script**

Run: `pnpm add -D vitest@3.2.4`
Then add `"test": "vitest run"` to `scripts` in `package.json`.
Expected: `pnpm test` runs and reports "No test files found".

- [ ] **Step 2: Write the failing tests in `services/cabinetSeries.test.ts`**

Use a helper `sizes(build)` that maps parts to `` `${key}:${width}x${height}x${quantity}` ``, and `hw(build)` that maps hardware to `{ [key]: quantity }`, leaving out entries with quantity 0.

```ts
it('deep 600 matches the source list', () => {
  const b = buildCabinet('deep-560', 600, { drawers: false });
  expect(sizes(b)).toEqual(['bottom:600x560x1', 'shelf:564x550x1', 'side:750x560x2', 'back:750x600x1', 'topRail:564x100x2', 'door:600x750x1']);
  expect(hw(b)).toEqual({ legs: 4, hinges: 2, handles: 1 });
  expect(b.extraBoards).toBe(0);
  expect([b.depth, b.height]).toEqual([560, 750]);
});
it('shallow 600 matches the source list', () => {
  const b = buildCabinet('shallow-300', 600, { drawers: false });
  expect(sizes(b)).toEqual(['bottom:300x564x1', 'top:300x564x1', 'shelf:300x564x1', 'side:750x300x2', 'back:750x600x1', 'backSupport:564x100x2', 'door:600x750x1']);
  expect(hw(b)).toEqual({ hinges: 2, handles: 1 });
});
it('splits doors above 600', () => {
  expect(sizes(buildCabinet('deep-560', 700, { drawers: false }))).toContain('door:350x750x2');
  expect(hw(buildCabinet('shallow-300', 1200, { drawers: false }))).toEqual({ hinges: 4, handles: 2 });
});
it('drawer variant swaps the door for 3 fronts', () => {
  const b = buildCabinet('deep-560', 900, { drawers: true });
  expect(sizes(b)).toContain('drawerFront:900x250x3');
  expect(b.parts.some(p => p.key === 'door')).toBe(false);
  expect(hw(b)).toEqual({ legs: 4, handles: 3, drawerRails: 3 });
  expect(b.extraBoards).toBe(1);
});
it('limits where drawers are offered', () => {
  expect(drawersAvailable('shallow-300', 600)).toBe(false);
  expect(drawersAvailable('deep-560', 200)).toBe(false);
  expect(drawersAvailable('deep-560', 300)).toBe(true);
  expect(() => buildCabinet('deep-560', 150, { drawers: true })).toThrow();
  expect(() => buildCabinet('shallow-300', 600, { drawers: true })).toThrow();
});
it('rejects invalid widths', () => {
  for (const w of [0, -600, NaN]) expect(() => buildCabinet('deep-560', w, { drawers: false })).toThrow();
});
it('locks grain only on sides, doors and drawer fronts', () => {
  const locked = new Set(['side', 'door', 'drawerFront']);
  for (const b of [buildCabinet('deep-560', 900, { drawers: true }), buildCabinet('shallow-300', 800, { drawers: false })])
    for (const p of b.parts) expect(p.canRotate).toBe(!locked.has(p.key));
});
it('builds every standard width with positive sizes', () => {
  for (const s of CABINET_SERIES) for (const w of STANDARD_WIDTHS)
    for (const p of buildCabinet(s.id, w, { drawers: false }).parts)
      expect(Math.min(p.width, p.height, p.quantity)).toBeGreaterThan(0);
});
it('recognises series ids', () => {
  expect(isCabinetSeriesId('deep-560')).toBe(true);
  expect(isCabinetSeriesId('base-600')).toBe(false);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test`
Expected: FAIL, "Failed to resolve import ./cabinetSeries".

- [ ] **Step 4: Implement `services/cabinetSeries.ts`**

Return parts in the order the tests list them: series body parts first, then the fronts. Put each series' body parts in a small per-series function of `W`, and share one `fronts(W, drawers)` helper that returns the front parts plus front hardware (hinges, handles, drawerRails). Hardware entries with quantity 0 may be left out. `buildCabinet` throws an `Error` when `!(width > 0)` or when `opts.drawers && !drawersAvailable(...)`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test`
Expected: all `cabinetSeries` tests PASS. `node node_modules/typescript/bin/tsc --noEmit -p .` exits 0.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml services/cabinetSeries.ts services/cabinetSeries.test.ts
git commit -m "feat(cabinets): add cabinet series module with vitest"
```

---

### Task 2: Piece fields, storage loader fixes, removal of old presets

**Files:**
- Modify: `types.ts` (`Piece`)
- Modify: `services/storage.ts` (`loadStoredSettings`, `loadStoredPieces`; delete `generateBaseCabinet` and `DEFAULT_TEMPLATES`; simplify `loadStoredTemplates`)
- Modify: `components/PieceList.tsx` (only if it imports `DEFAULT_TEMPLATES`; it currently imports `DEFAULT_PIECES`, which stays)
- Test: `services/storage.test.ts`

**Interfaces:**
- Consumes: `CabinetSeriesId`, `isCabinetSeriesId` from Task 1.
- Produces: `Piece` gains `cabinetSeriesId?: CabinetSeriesId; cabinetDrawers?: boolean;` (import the type with `import type` from `./services/cabinetSeries`). `loadStoredTemplates(): Template[]` now returns only user templates.

- [ ] **Step 1: Write the failing tests in `services/storage.test.ts`**

In `beforeEach`, stub `globalThis.localStorage` with a `Map`-backed object (`getItem`, `setItem`, `removeItem`, `clear`). Import the functions after the stub is in place.

```ts
it('keeps group and cabinet fields across save/load', () => {
  const piece = { id: 'a', name: 'Door', width: 600, height: 750, quantity: 1, canRotate: false,
    groupId: 'g1', groupName: 'Deep base 600', cabinetWidth: 600, cabinetHeight: 750, cabinetSeriesId: 'deep-560', cabinetDrawers: false };
  saveStoredPieces([piece]);
  expect(loadStoredPieces()[0]).toMatchObject(piece);
});
it('drops an unknown cabinetSeriesId but keeps the group', () => {
  localStorage.setItem('cutwizard_pieces_v2', JSON.stringify([{ id: 'a', width: 1, height: 1, quantity: 1, groupId: 'g', cabinetSeriesId: 'bogus' }]));
  const [p] = loadStoredPieces();
  expect(p.groupId).toBe('g');
  expect(p.cabinetSeriesId).toBeUndefined();
});
it('keeps cost settings across save/load', () => {
  const s = { ...DEFAULT_SETTINGS, jobNumber: 'J-12', boardPrice: 9500, edgeBandPricePerM: 60, machineRentPerSqFt: 500, laborPerSqFt: 850, frontAreaSqFt: 12.5 };
  saveStoredSettings(s);
  expect(loadStoredSettings()).toMatchObject(s);
});
it('leaves frontAreaSqFt undefined when it was never set', () => {
  saveStoredSettings(DEFAULT_SETTINGS);
  expect(loadStoredSettings().frontAreaSqFt).toBeUndefined();
});
it('falls back to default kerf and trim when missing', () => {
  localStorage.setItem('cutwizard_settings_v2', JSON.stringify({ boardWidth: 2440, boardHeight: 1220 }));
  expect(loadStoredSettings()).toMatchObject({ kerf: DEFAULT_SETTINGS.kerf, trimMargin: DEFAULT_SETTINGS.trimMargin });
});
it('returns only user templates', () => {
  localStorage.setItem('cutwizard_templates', JSON.stringify([{ id: 'sys-base-600', name: 'x', pieces: [] }, { id: 'u1', name: 'Mine', pieces: [] }]));
  expect(loadStoredTemplates().map(t => t.id)).toEqual(['u1']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test services/storage.test.ts`
Expected: FAIL. The group fields are missing, the cost fields are missing, kerf is `NaN`, and the `sys-` templates are returned.

- [ ] **Step 3: Implement the changes**

- **Settings loader:** use a local `num(value, fallback)` that returns `fallback` unless `Number(value)` is finite. Apply it to `boardWidth`, `boardHeight`, `kerf` and `trimMargin`. Copy `jobNumber` (as a string) and the five cost fields only when they are present in the parsed data.
- **Pieces loader:** copy `groupId`, `groupName`, `cabinetWidth`, `cabinetHeight` and `cabinetDrawers` when present. Set `cabinetSeriesId` only when `isCabinetSeriesId(p.cabinetSeriesId)` is true.
- **Old presets:** delete `generateBaseCabinet` and `DEFAULT_TEMPLATES`. `loadStoredTemplates` returns the parsed array with `sys-` ids filtered out, or `[]`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test`
Expected: all tests PASS. `tsc --noEmit` exits 0.

- [ ] **Step 5: Commit**

```bash
git add types.ts services/storage.ts services/storage.test.ts components/PieceList.tsx
git commit -m "fix(storage): keep group, cabinet and cost fields on reload; drop old sys presets"
```

---

### Task 3: Cabinet-to-pieces adapter and extra boards in board count and cost

**Files:**
- Create: `services/cabinetPieces.ts`
- Test: `services/cabinetPieces.test.ts`
- Modify: `App.tsx` (an `extraBoards` memo, passed to `StatsSummary`)
- Modify: `components/StatsSummary.tsx` (prop, boards KPI, cost formula)
- Modify: `contexts/translations.ts` (key `forDrawers`)

**Interfaces:**
- Consumes: `buildCabinet`, `isCabinetSeriesId`, `CabinetSeriesId`, `CabinetPartKey` from Task 1; the new `Piece` fields from Task 2.
- Produces:
  ```ts
  export const MAX_CABINET_QUANTITY = 50;
  export function clampCabinetQuantity(value: number): number;            // NaN→1, floor, then clamp to 1..50
  export function createCabinetGroups(params: {
    seriesId: CabinetSeriesId; width: number; drawers: boolean; quantity: number;
    groupName: string; partName: (key: CabinetPartKey) => string;
  }): Piece[];                                                            // one group per cabinet
  export function countExtraBoards(pieces: Piece[]): number;
  ```
  `StatsSummaryProps` gains `extraBoards: number`.

- [ ] **Step 1: Write the failing tests in `services/cabinetPieces.test.ts`**

```ts
const make = (o = {}) => createCabinetGroups({ seriesId: 'deep-560', width: 900, drawers: true, quantity: 2, groupName: 'Deep base 900 + drawers', partName: k => k, ...o });

it('creates one group per cabinet with cabinet metadata on every piece', () => {
  const pieces = make();
  expect(new Set(pieces.map(p => p.groupId)).size).toBe(2);
  expect(pieces.every(p => p.cabinetSeriesId === 'deep-560' && p.cabinetDrawers === true && p.cabinetWidth === 900 && p.cabinetHeight === 750 && p.groupName === 'Deep base 900 + drawers')).toBe(true);
  expect(pieces.find(p => p.name === 'drawerFront')).toMatchObject({ width: 900, height: 250, quantity: 3, canRotate: false });
});
it('gives every piece and group a distinct id', () => {
  const pieces = [...make({ quantity: 3 }), ...make({ quantity: 3 })];
  expect(new Set(pieces.map(p => p.id)).size).toBe(pieces.length);
  expect(new Set(pieces.map(p => p.groupId)).size).toBe(6);
});
it('clamps quantity', () => {
  expect([NaN, 0, -3, 2.7, 1000].map(clampCabinetQuantity)).toEqual([1, 1, 1, 2, MAX_CABINET_QUANTITY]);
});
it('counts one extra board per drawer cabinet group', () => {
  expect(countExtraBoards(make())).toBe(2);
  expect(countExtraBoards(make({ drawers: false }))).toBe(0);
});
it('still counts a drawer group once after most of its pieces are removed', () => {
  const one = make({ quantity: 1 });
  expect(countExtraBoards([one[0]])).toBe(1);
});
it('ignores legacy and invalid cabinet groups without throwing', () => {
  const legacy = { id: 'x', width: 600, height: 750, quantity: 1, canRotate: true, groupId: 'old', groupName: 'Standard Base 600', cabinetWidth: 600, cabinetHeight: 750 };
  const invalid = { ...legacy, id: 'y', groupId: 'bad', cabinetSeriesId: 'shallow-300' as const, cabinetDrawers: true };
  expect(countExtraBoards([legacy, invalid])).toBe(0);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test services/cabinetPieces.test.ts`
Expected: FAIL, "Failed to resolve import ./cabinetPieces".

- [ ] **Step 3: Implement `services/cabinetPieces.ts`**

- **Ids:** a module-level counter `seq`. Ids are `` `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}` ``, with prefix `cab` for groups and `piece` for pieces.
- **`createCabinetGroups`:** calls `buildCabinet` once, then for each of `clampCabinetQuantity(quantity)` cabinets maps `parts` to `Piece`. `name` comes from `partName(part.key)`, then `width`, `height`, `quantity` and `canRotate` come from the part, then the group and cabinet fields.
- **`countExtraBoards`:** looks at each distinct `groupId` whose first piece has a valid `cabinetSeriesId` and a `cabinetWidth`. It sums `buildCabinet(...).extraBoards` inside `try/catch`, and a throw counts as 0.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test`
Expected: all tests PASS.

- [ ] **Step 5: Wire up `App.tsx` and `StatsSummary.tsx`**

- **`App.tsx`:** `const extraBoards = useMemo(() => countExtraBoards(pieces), [pieces]);` passed as `<StatsSummary extraBoards={extraBoards} … />`.
- **`StatsSummary.tsx`, boards KPI** (around line 138): next to `{result.totalBoards}`, when `extraBoards > 0`, render a smaller span `+ {extraBoards} {t('forDrawers')}`.
- **`StatsSummary.tsx`, cost** (line 61): use `(result.totalBoards + extraBoards) * boardPrice`.
- **`translations.ts`:** add `forDrawers` with en "for drawers", es "para cajones" and si "ලාච්චු සඳහා".

- [ ] **Step 6: Verify**

Run: `pnpm test` and `node node_modules/typescript/bin/tsc --noEmit -p .`
Expected: all PASS, and tsc exits 0.

- [ ] **Step 7: Commit**

```bash
git add services/cabinetPieces.ts services/cabinetPieces.test.ts App.tsx components/StatsSummary.tsx contexts/translations.ts
git commit -m "feat(cabinets): count extra drawer boards in board total and cost"
```

---

### Task 4: Cabinet preset picker, translations, docs, final check

**Files:**
- Create: `components/CabinetPresetPicker.tsx`
- Modify: `components/PieceList.tsx` (render the picker at the top of the template window; label the saved list "My templates")
- Modify: `contexts/translations.ts` (keys below)
- Modify: `CLAUDE.md` (add `pnpm test` under Commands; describe `cabinetSeries` and `cabinetPieces` under Architecture; delete the "no test runner" line and the note about `sys-` templates)

**Interfaces:**
- Consumes: `CABINET_SERIES`, `STANDARD_WIDTHS`, `drawersAvailable`, `buildCabinet`, `CabinetSeriesId`, `CabinetPartKey` (Task 1); `createCabinetGroups`, `clampCabinetQuantity`, `MAX_CABINET_QUANTITY` (Task 3).
- Produces: `export const CabinetPresetPicker: React.FC<{ darkMode: boolean; onAdd: (pieces: Piece[]) => void }>`. In `PieceList`, `onAdd` appends to `pieces` via `onChange([...pieces, ...newPieces])` and closes the window, the same way `loadTemplate` does today.

- [ ] **Step 1: Add the translation keys** (all three blocks; reuse the existing `widthMm`, `qty` and `templates`)

| Key | en | es | si |
|---|---|---|---|
| `cabinetPresets` | Cabinet presets | Gabinetes estándar | සම්මත කබඩ් |
| `seriesDeep560` | Deep base 560 | Base profunda 560 | ගැඹුරු පාදක 560 |
| `seriesShallow300` | Shallow base 300 | Base poco profunda 300 | නොගැඹුරු පාදක 300 |
| `series` | Series | Serie | මාලාව |
| `drawers` | Drawers | Cajones | ලාච්චු |
| `withDrawersSuffix` | + drawers | + cajones | + ලාච්චු |
| `addCabinet` | Add cabinet | Agregar gabinete | කබඩ් එක් කරන්න |
| `myTemplates` | My templates | Mis plantillas | මගේ සැකිලි |
| `extraDrawerBoard` | +1 extra 8×4 board for drawers | +1 tablero 8×4 extra para cajones | ලාච්චු සඳහා අමතර 8×4 තහඩුවක් +1 |
| `drawersNotForSeries` | Not available for this series | No disponible para esta serie | මෙම මාලාව සඳහා නොමැත |
| `drawersTooNarrow` | Too narrow for drawers | Demasiado angosto para cajones | ලාච්චු සඳහා පළල මදි |
| `partBottom` | Bottom | Piso | පතුල |
| `partTop` | Top | Techo | උඩ තහඩුව |
| `partShelf` | Shelf | Estante | රාක්කය |
| `partSide` | Side | Lateral | පැති තහඩුව |
| `partBack` | Back | Trasera | පිටුපස තහඩුව |
| `partTopRail` | Top rail | Travesaño superior | ඉහළ පටිය |
| `partBackSupport` | Back support | Refuerzo trasero | පිටුපස ආධාරකය |
| `partDoor` | Door | Puerta | දොර |
| `partDrawerFront` | Drawer front | Frente de cajón | ලාච්චු මුහුණත |

The Sinhala column is a draft and must be reviewed by Pantry LK.

- [ ] **Step 2: Build `components/CabinetPresetPicker.tsx`**

- **State:** `seriesId` (default `'deep-560'`), `width` (default `600`), `drawers` (default `false`), `quantity` (default `1`).
- **Clearing drawers:** whenever `drawersAvailable(seriesId, width)` becomes false, set `drawers` to false.
- **Drawers checkbox:** disabled when drawers aren't available. The reason shown is `drawersNotForSeries` when the series has `supportsDrawers === false`, otherwise `drawersTooNarrow`.
- **Preview:** comes from `buildCabinet(seriesId, width, { drawers }).parts` as `name · width × height · ×quantity`, plus `t('extraDrawerBoard')` when `extraBoards > 0`.
- **Name maps:** a `Record<CabinetPartKey, TranslationKey>` maps part keys to the `part*` keys, and another maps series ids to the series keys.
- **Group name:** `` `${t(seriesKey)} ${width}` `` with `` ` ${t('withDrawersSuffix')}` `` added when drawers is on.
- **Quantity input:** `type="number" min=1 max={MAX_CABINET_QUANTITY}`, passed through `clampCabinetQuantity` on change.
- **Add cabinet:** calls `onAdd(createCabinetGroups({...}))`.
- **Styling:** follow the template window's existing Tailwind classes, including the `darkMode` conditionals. The 12 width buttons use a wrapping grid so they fit at phone width.

- [ ] **Step 3: Mount the picker in `PieceList.tsx`**

Render `<CabinetPresetPicker darkMode={darkMode} onAdd={…} />` above the saved-template list inside the `showTemplateModal` block (line ~494), and add a `t('myTemplates')` subheading above the list. The existing "no templates" message stays under that subheading.

- [ ] **Step 4: Verify automatically**

Run: `pnpm test`, then `node node_modules/typescript/bin/tsc --noEmit -p .`, then `pnpm build`
Expected: all tests pass, tsc exits 0, and the build completes with no errors.

- [ ] **Step 5: Verify in the running app**

Start `pnpm dev` (port 3000) and open it in the browser pane.
- Add **Deep 900 + drawers ×2**. The parts list shows two groups, and each has 3 drawer fronts of 900 × 250 locked against rotation.
- Add **Shallow 600 ×1**. Its parts match the shallow 600 list.
- In Stats, the board KPI reads `N + 2 for drawers`, and the board cost goes up by 2 × the board price.
- In the template window, switch to Shallow: the drawers checkbox is disabled with "Not available for this series". Switch to Deep 150: it reads "Too narrow for drawers".
- Reload the page: the groups, cabinet names and cost settings are all still there.
- Switch the language to Español and then සිංහල, and confirm the picker labels change.
- At 375 px width, the width buttons wrap with no horizontal scroll.

- [ ] **Step 6: Commit**

```bash
git add components/CabinetPresetPicker.tsx components/PieceList.tsx contexts/translations.ts CLAUDE.md
git commit -m "feat(cabinets): add cabinet preset picker to the template window"
```
