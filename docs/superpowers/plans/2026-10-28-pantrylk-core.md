# pantrylk-core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the dependency-free `pantrylk-core` package (cabinet rules, optimizer, job contract, `estimateJob`), release it as `v1.0.0`, and switch CutWizard to it with no change in behaviour.

**Architecture:** A new git repo next to CutWizard holds plain TypeScript in `src/`, compiled by `tsc` into a committed `dist/`, and exposed through three subpath exports: `pantrylk-core/cabinet`, `pantrylk-core/optimizer` and `pantrylk-core/job`. CutWizard installs it from a git tag. Its `services/cabinetSeries.ts`, `services/optimizer.ts` and `types.ts` become thin re-exports, so no component import changes.

**Tech Stack:** TypeScript ~5.8.2 (NodeNext modules, strict), Vitest 3.2.4, pnpm 12. CutWizard: React 19 + Vite 6.

**Spec:** `docs/superpowers/specs/2026-10-28-integrations-design.md` (Part 1, Part 2, and the "Switching to the package" section of Part 4). This plan is delivery step 1.

## Global Constraints

- Package repo: `C:\Users\LENOVO LOQ\Desktop\cutwiz\pantrylk-core` locally, `KalanaBimsara/pantrylk-core` on GitHub. Never push anything to CutWizard's `origin` (`alvaro-salort/CutWizard`).
- No runtime dependencies. No imports from React, the DOM, Node built-ins, or any CutWizard file. `tsconfig` uses `"lib": ["ES2022"]` and `"types": []` to enforce this.
- No `prepare`, `postinstall` or other install scripts: pnpm blocks them for git dependencies. A release commits the built `dist/` (JS + `.d.ts`).
- Relative imports inside `src/` use the `.js` extension (NodeNext), so `dist/` runs in plain Node as well as in bundlers.
- The cabinet module still returns part and hardware **keys**, never display names. `strategyLabel` stays the hardcoded Spanish string.
- Width limits: `MIN_CABINET_WIDTH = 150` and `MAX_CABINET_WIDTH = 1200`, whole millimetres only. The drawer rule is unchanged: deep series only, W ≥ 300.
- Contract: `schemaVersion: 1`, and line `quantity` must be a whole number from 1 to 50.
- Moving code must not change its logic. Strict-mode fixes are limited to type annotations, narrowing and non-null assertions.
- Creating the GitHub repo and pushing to it are outward-facing: the user creates the repo, picks private or public, and approves the push. If the repo is private, every host that runs `pnpm install` for CutWizard or the Next.js app needs a GitHub token. Tell the user this at the push step.
- CutWizard: use pnpm only, never edit `pnpm-lock.yaml` by hand, and keep CLAUDE.md accurate.

## Review Focus

- **Duplicate `lineId`s in a job input.** Step 3 maps CutWizard groups back to lines by `lineId`, so duplicates must be rejected by `parseCutJobInput`, not silently merged. Test in Task 3.
- **Drawers requested where they aren't offered** (shallow series, or width < 300). The parser must reject it with the field path; `estimateJob` must not be the first place it fails. Test in Task 3.
- **JSON-shaped wrong types:** a width of `"600"` (string), 600.5, or a quantity of 0 or 51. The parser rejects all of them and doesn't coerce. Test in Task 3.
- **An empty kitchen** (`cabinets: []`). `estimateJob` returns an all-zero cut plan and empty hardware, without throwing. Test in Task 4.
- **Parts that don't fit the board** (a tiny board in `settings`). `estimateJob` reports `unplacedCount > 0` with consistent totals instead of throwing. Test in Task 4.

---

### Task 1: Package scaffold and the cabinet module with width limits

**Files:**
- Create: `pantrylk-core/package.json`, `pantrylk-core/tsconfig.json`, `pantrylk-core/tsconfig.build.json`, `pantrylk-core/.gitignore`, `pantrylk-core/README.md`
- Create: `pantrylk-core/src/cabinet.ts` (copied from CutWizard `services/cabinetSeries.ts`)
- Test: `pantrylk-core/src/cabinet.test.ts` (copied from CutWizard `services/cabinetSeries.test.ts`)

**Interfaces:**
- Produces: everything `services/cabinetSeries.ts` exports today (`CabinetSeriesId`, `STANDARD_WIDTHS`, `CabinetPartKey`, `HardwareKey`, `CabinetPart`, `HardwareItem`, `CabinetBuild`, `CABINET_SERIES`, `isCabinetSeriesId`, `drawersAvailable`, `buildCabinet`), plus `MIN_CABINET_WIDTH: 150`, `MAX_CABINET_WIDTH: 1200` and `isValidCabinetWidth(width: number): boolean`.

- [ ] **Step 1: Scaffold the repo**

  Run `git init` in `C:\Users\LENOVO LOQ\Desktop\cutwiz\pantrylk-core`. Then create:
  - **`package.json`:** `"name": "pantrylk-core"`, `"version": "1.0.0"`, `"type": "module"`, `"sideEffects": false`, `"files": ["dist"]`.
    - `exports`: one entry per subpath `./cabinet`, `./optimizer`, `./job`, each `{ "types": "./dist/<name>.d.ts", "default": "./dist/<name>.js" }`.
    - Scripts: `build` = `tsc -p tsconfig.build.json`, `typecheck` = `tsc --noEmit`, `test` = `vitest run`.
    - Dev dependencies: `typescript ~5.8.2`, `vitest 3.2.4`. No `dependencies` field.
  - **`tsconfig.json`:** `target ES2022`, `module`/`moduleResolution` `NodeNext`, `lib ["ES2022"]`, `types []`, `strict true`, `isolatedModules true`, `include ["src"]`, `noEmit true`.
  - **`tsconfig.build.json`:** extends it with `noEmit false`, `declaration true`, `rootDir src`, `outDir dist`, `exclude ["src/**/*.test.ts"]`.
  - **`.gitignore`:** `node_modules/` only. `dist/` is committed.
  - **`README.md`:** what the package is; the three subpaths; install with `pnpm add github:KalanaBimsara/pantrylk-core#vX.Y.Z`; the release steps (`pnpm test`, `pnpm build`, commit `dist/`, tag); the no-dependencies rule.

  Run `pnpm install`.

- [ ] **Step 2: Copy the cabinet code and test**

  Copy `services/cabinetSeries.ts` to `src/cabinet.ts` and `services/cabinetSeries.test.ts` to `src/cabinet.test.ts`. In the test, change the import to `from './cabinet.js'`.

  Run: `pnpm test`
  Expected: PASS, the same 9 tests as in CutWizard.

- [ ] **Step 3: Write the failing width-limit tests**

  In `src/cabinet.test.ts`, replace the body of `rejects invalid widths` and add a test:

```ts
it('rejects invalid widths', () => {
  for (const w of [0, -600, NaN, 149, 1201, 600.5]) expect(() => buildCabinet('deep-560', w, { drawers: false })).toThrow();
});

it('accepts whole-mm custom widths inside the limits', () => {
  expect([149, 150, 735, 1200, 1201, 600.5].map(isValidCabinetWidth)).toEqual([false, true, true, true, false, false]);
  expect(MIN_CABINET_WIDTH).toBe(150);
  expect(MAX_CABINET_WIDTH).toBe(1200);
  const b = buildCabinet('deep-560', 735, { drawers: true });
  expect(sizes(b)).toContain('drawerFront:735x250x3');
  expect(b.extraBoards).toBe(1);
});
```

  Run: `pnpm test`
  Expected: FAIL (`isValidCabinetWidth` is not exported; 149/1201/600.5 don't throw).

- [ ] **Step 4: Add the limits in `src/cabinet.ts`**

  Export `MIN_CABINET_WIDTH = 150`, `MAX_CABINET_WIDTH = 1200` and `isValidCabinetWidth(width)`, which is `Number.isInteger(width)` and inside the range. In `buildCabinet`, replace the `!(width > 0)` check with `!isValidCabinetWidth(width)`, keeping the same error message. Update the file's header comment to mention the limits.

  Run: `pnpm test && pnpm typecheck`
  Expected: PASS, with no type errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(cabinet): add cabinet series module with custom width limits"
```

---

### Task 2: Optimizer and shared types

**Files:**
- Create: `pantrylk-core/src/types.ts` (from CutWizard `types.ts`, the optimizer types only)
- Create: `pantrylk-core/src/optimizer.ts` (copied from CutWizard `services/optimizer.ts`)
- Test: `pantrylk-core/src/optimizer.test.ts`

**Interfaces:**
- Consumes: `CabinetSeriesId` from `./cabinet.js`.
- Produces from `pantrylk-core/optimizer`:
  - the types `Piece`, `Rect`, `PlacedPiece`, `Board`, `OptimizationStrategy`, `OptimizationResult`, `Settings`, and `CutSettings = Pick<Settings, 'boardWidth' | 'boardHeight' | 'kerf' | 'trimMargin' | 'enableTrimMargin'>`;
  - `DEFAULT_CUT_SETTINGS: CutSettings` = `{ boardWidth: 2440, boardHeight: 1220, kerf: 3, trimMargin: 10, enableTrimMargin: false }`;
  - `optimizeCuts`, `COLOR_PALETTE`, `generatePieceColor`, unchanged.
- `Piece` gains `cabinetLineId?: string`. CutWizard doesn't use it until delivery step 3.

- [ ] **Step 1: Write the failing smoke test** (`src/optimizer.test.ts`)

```ts
it('places a grain-locked part without rotating it and counts boards', () => {
  const r = optimizeCuts([{ id: 'a', width: 750, height: 560, quantity: 2, canRotate: false }], DEFAULT_CUT_SETTINGS);
  expect(r.totalBoards).toBe(1);
  expect(r.totalPartsCount).toBe(2);
  expect(r.unplacedPieces).toHaveLength(0);
  expect(r.boards[0].placedPieces.every((p) => !p.isRotated)).toBe(true);
});

it('returns an empty result for no valid pieces', () => {
  expect(optimizeCuts([], DEFAULT_CUT_SETTINGS)).toMatchObject({ totalBoards: 0, totalPartsCount: 0, strategyUsed: 'none' });
});
```

  Run: `pnpm test src/optimizer.test.ts`
  Expected: FAIL (the module doesn't exist).

- [ ] **Step 2: Move the code**

  - Create `src/types.ts` with `Piece`, `Rect`, `PlacedPiece`, `Board`, `OptimizationStrategy`, `OptimizationResult` and `Settings` copied from CutWizard `types.ts` (comments included). Import `type CabinetSeriesId` from `./cabinet.js`. Add `cabinetLineId?: string` to `Piece` after `cabinetDrawers`, and add `CutSettings`.
  - Copy `services/optimizer.ts` to `src/optimizer.ts`, change its import to `./types.js`, and add `DEFAULT_CUT_SETTINGS`.
  - Add `export type * from './types.js'` so the types come out of the `optimizer` subpath.
  - Fix any strict-mode errors within the Global Constraints rule (types only).

  Run: `pnpm test && pnpm typecheck`
  Expected: PASS, with no type errors. Also run `git diff --no-index <CutWizard>/services/optimizer.ts src/optimizer.ts`: it should show only the import line, `DEFAULT_CUT_SETTINGS`, the re-export, and type-only edits.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(optimizer): move cut optimizer and shared types into the package"
```

---

### Task 3: Job contract and parsers

**Files:**
- Create: `pantrylk-core/src/job.ts`
- Test: `pantrylk-core/src/job.test.ts`

**Interfaces:**
- Consumes: `isCabinetSeriesId`, `isValidCabinetWidth`, `drawersAvailable`, `CabinetSeriesId`, `HardwareItem`, `HardwareKey` from `./cabinet.js`; `CutSettings` from `./types.js`.
- Produces from `pantrylk-core/job`:
  - `CUT_JOB_SCHEMA_VERSION = 1` and `MAX_LINE_QUANTITY = 50`;
  - the types `CabinetLine`, `CutJobInput`, `CutJobResult` and `CutPlan` (the `cutPlan` object type), exactly as in spec Part 2;
  - `parseCutJobInput(value: unknown): CutJobInput` and `parseCutJobResult(value: unknown): CutJobResult`.

  Both parsers return a new object containing only the known fields (unknown fields are dropped). On bad input they throw an `Error` whose message contains the field path in `a.b[0].c` form. They never coerce types.

- [ ] **Step 1: Write the failing tests** (`src/job.test.ts`)

  Use a `validInput()` factory: one line `{ lineId: 'L1', seriesId: 'deep-560', width: 600, drawers: false, quantity: 1 }` with `settings: DEFAULT_CUT_SETTINGS`, `jobId: 'job-1'`, `inputVersion: 3`. Tests:
  - `accepts a valid input and drops unknown fields`: `parseCutJobInput({ ...validInput(), extra: 1 })` deep-equals `validInput()`.
  - `rejects a wrong schemaVersion`: version 2 throws `/schemaVersion/`.
  - `rejects bad lines`, one `expect(...).toThrow(regex)` per case:
    - a missing `jobId` → `/jobId/`;
    - `seriesId: 'base-600'` → `/cabinets\[0\]\.seriesId/`;
    - each width in `"600"`, `600.5`, `149`, `1201` → `/cabinets\[0\]\.width/`;
    - each quantity in `0`, `51`, `1.5` → `/cabinets\[0\]\.quantity/`;
    - `drawers: 'yes'` → `/cabinets\[0\]\.drawers/`.
  - `rejects drawers where they are not offered`: `shallow-300` at 600 with drawers, and `deep-560` at 200 with drawers, both throw `/cabinets\[0\]\.drawers/`.
  - `rejects duplicate lineIds`: two lines with `lineId: 'L1'` throw `/cabinets\[1\]\.lineId/`.
  - `rejects bad settings`: `kerf: -1` → `/settings\.kerf/`; `boardWidth: 0` → `/settings\.boardWidth/`.
  - `defaults a missing enableTrimMargin to false`.
  - `accepts an empty cabinets list`.
  - `parseCutJobResult round-trips a valid result and rejects`:
    - `source: 'manual'` → `/source/`;
    - hardware key `'screws'` → `/hardware\[0\]\.key/`;
    - a negative `cutPlan.totalBoards` → `/cutPlan\.totalBoards/`.

  Run: `pnpm test src/job.test.ts`
  Expected: FAIL (the module doesn't exist).

- [ ] **Step 2: Implement `src/job.ts`**

  - Use small private helpers (`obj`, `str`, `int`, `num`, `bool`), each taking a path and throwing ``new Error(`Invalid cut job: ${path} ${reason}`)``.
  - Shared private validators `parseLine(v, path)` and `parseSettings(v, path)` serve both parsers.
  - Settings rules: `boardWidth` and `boardHeight` are finite and > 0; `kerf` and `trimMargin` are finite and ≥ 0.
  - Integer rules: `inputVersion` and `basedOnInputVersion` are integers ≥ 0. Every `cutPlan` field is finite and ≥ 0.
  - Check hardware keys with a `Record<HardwareKey, true>` so the compiler flags a missing key. `quantity` is an integer > 0.
  - `computedAt` is a string that `Date.parse` accepts.

  Run: `pnpm test && pnpm typecheck`
  Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(job): add cut job contract with strict parsers"
```

---

### Task 4: `estimateJob` and its shared helpers

**Files:**
- Modify: `pantrylk-core/src/job.ts`
- Test: `pantrylk-core/src/job.test.ts`

**Interfaces:**
- Consumes: `buildCabinet` and `CabinetBuild` from `./cabinet.js`; `optimizeCuts`, `Piece` and `OptimizationResult` from `./optimizer.js`; the Task 3 types.
- Produces (all exported, because delivery step 3's `resultFromWorkspace` must reuse them to stay in step with this code):
  - **`sumHardware(builds: { build: CabinetBuild; quantity: number }[]): HardwareItem[]`:** one entry per key in the fixed order `legs, hinges, handles, drawerRails`, zero quantities left out.
  - **`cutPlanFrom(result: OptimizationResult, extraBoards: number, customPieceCount: number): CutPlan`:**
    - `optimizerBoards = result.totalBoards` and `totalBoards = optimizerBoards + extraBoards`;
    - `efficiency = result.totalEfficiency` and `wastePct = result.totalWaste`;
    - `linearCutsM = result.totalLinearCuts` and `partsCount = result.totalPartsCount`;
    - `unplacedCount = result.unplacedPieces.length`.
  - **`estimateJob(input: CutJobInput, now: () => Date = () => new Date()): CutJobResult`.**

- [ ] **Step 1: Write the failing tests**

  - `estimates one deep 600`:
    - `hardware` equals `[{ key: 'legs', quantity: 4 }, { key: 'hinges', quantity: 2 }, { key: 'handles', quantity: 1 }]`;
    - `cutPlan.extraBoards === 0`, `cutPlan.partsCount === 8`, `unplacedCount === 0`, `customPieceCount === 0`;
    - `totalBoards === optimizerBoards`, and `optimizerBoards >= 1`;
    - `source === 'auto'` and `basedOnInputVersion === 3`;
    - `cabinets` and `settings` deep-equal the input's.
  - `counts drawer boards and hardware per quantity`: a deep 900 line with drawers and quantity 2 gives:
    - `extraBoards === 2`, `totalBoards === optimizerBoards + 2`, `partsCount === 20`;
    - `hardware` equals `[legs 8, handles 6, drawerRails 6]`, with no hinges.
  - `sums hardware across lines`: deep 600 ×1 plus shallow 735 ×1 (735 > 600, so 2 doors) gives `[legs 4, hinges 6, handles 3]`.
  - `uses the injected clock`: `now = () => new Date('2026-10-28T00:00:00Z')` gives `computedAt === '2026-10-28T00:00:00.000Z'`.
  - `handles an empty kitchen`: `cabinets: []` gives `hardware: []` and every `cutPlan` field 0.
  - `reports parts that do not fit`: `settings.boardWidth = 500` and `boardHeight = 500` with one deep 600 give `unplacedCount > 0` and `totalBoards === optimizerBoards`, without throwing.
  - `is deterministic`: two calls with the same `now` deep-equal each other.

  Run: `pnpm test src/job.test.ts`
  Expected: FAIL (`estimateJob` isn't exported).

- [ ] **Step 2: Implement the helpers**

  - Build each line once with `buildCabinet`.
  - Expand it into `quantity` cabinets. Each part becomes a `Piece` with id `` `${lineId}-${i}-${partIndex}` `` and `groupId` `` `${lineId}-${i}` ``, plus the part's size, quantity and `canRotate`, and the cabinet fields `cabinetSeriesId`, `cabinetDrawers`, `cabinetWidth`, `cabinetHeight` and `cabinetLineId: lineId`.
  - Set `name` to the part key: the package has no translations.
  - `extraBoards` is the sum of `build.extraBoards × quantity`.
  - Call `optimizeCuts(pieces, input.settings)`.
  - Return a result with copies of `input.cabinets` and `input.settings`.

  Run: `pnpm test && pnpm typecheck`
  Expected: PASS.

- [ ] **Step 3: Build and commit**

  Run: `pnpm build`
  Expected: `dist/` contains `cabinet.js`, `optimizer.js`, `job.js`, `types.js` and their `.d.ts` files, and no `*.test.*`.

  Then run this to confirm `dist/` works in plain Node:

  `node -e "import('./dist/job.js').then(m => console.log(m.estimateJob({schemaVersion:1,jobId:'j',inputVersion:1,cabinets:[{lineId:'L1',seriesId:'deep-560',width:600,drawers:false,quantity:1}],settings:{boardWidth:2440,boardHeight:1220,kerf:3,trimMargin:10,enableTrimMargin:false}}).cutPlan.partsCount))"`

  Expected: prints `8`.

```bash
git add -A
git commit -m "feat(job): add estimateJob with hardware and cut plan summaries"
```

---

### Task 5: Release v1.0.0 and switch CutWizard to the package

**Files (CutWizard, this worktree):**
- Modify: `package.json` and `pnpm-lock.yaml` (via `pnpm add`)
- Modify: `services/cabinetSeries.ts`, `services/optimizer.ts`, `types.ts`, `services/storage.ts:10-16`, `CLAUDE.md` (the "Optimizer" and "Cabinet presets" paragraphs)
- Delete: `services/cabinetSeries.test.ts` (now in the package)

**Interfaces:**
- Consumes: `pantrylk-core/cabinet`, `pantrylk-core/optimizer` (Tasks 1–2).
- Produces: CutWizard module paths that are unchanged, so every component and `services/*` import keeps working.

- [ ] **Step 1: Release (needs the user)**

  Ask the user to create `KalanaBimsara/pantrylk-core` on GitHub, choosing private or public. If private, tell them each host needs a token to install it. Once they approve, add it as `origin` in the package repo, push `main`, then run `git tag v1.0.0` and `git push origin v1.0.0`.

- [ ] **Step 2: Install in CutWizard**

  Run: `pnpm add github:KalanaBimsara/pantrylk-core#v1.0.0`
  Expected: `package.json` lists it under `dependencies`, and pnpm doesn't ask to approve any build scripts.

- [ ] **Step 3: Replace the moved code with re-exports**

  - **`services/cabinetSeries.ts`:** a one-line comment saying the module lives in `pantrylk-core`, then `export * from 'pantrylk-core/cabinet';`.
  - **`services/optimizer.ts`:** the same, with `export * from 'pantrylk-core/optimizer';`.
  - **`types.ts`:** `export type { Piece, Rect, PlacedPiece, Board, OptimizationStrategy, OptimizationResult, Settings, CutSettings } from 'pantrylk-core/optimizer';`. Keep `BoardPreset`, `Template`, `InventoryCategory` and `InventoryItem` local, with `Template` importing `type Piece`.
  - **`services/storage.ts`:** `export const DEFAULT_SETTINGS: Settings = { ...DEFAULT_CUT_SETTINGS };`, importing it from `./optimizer`.
  - Delete `services/cabinetSeries.test.ts`.
  - In `CLAUDE.md`, say the cabinet rules, optimizer and shared types come from `pantrylk-core`, so changes are made there and released with a new tag. Mention the 150–1200 mm width limit. Keep the rest of those paragraphs, since they still describe the behaviour.

  Run: `pnpm exec tsc --noEmit && pnpm test && pnpm build`
  Expected: no type errors, all remaining CutWizard tests pass (cabinetPieces, storage, templatePieces), and the build succeeds.

- [ ] **Step 4: Manual check in the running app**

  Run `pnpm dev`, then:
  - Add Deep 900 with drawers ×2 and Shallow 600 from the template window.
  - Check the grouped parts list, "+ 2 for drawers" in the board count, the grain-locked parts, and the cost.
  - Reload the page and check that all of it survives the reload.
  - Import a CSV and check it still optimizes.

  Expected: behaviour is identical to before the switch.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml services/cabinetSeries.ts services/optimizer.ts types.ts services/storage.ts CLAUDE.md services/cabinetSeries.test.ts
git commit -m "refactor: use pantrylk-core for cabinet rules, optimizer and shared types"
```
