# Cabinet presets — design

Date: 2026-10-28
Status: approved in conversation, awaiting written-spec review

## Goal

Let the workshop add a standard Pantry LK base cabinet to the cut list in a few clicks: pick a series, a standard width and (where offered) drawers, and CutWizard adds that cabinet's board parts with the right sizes. The cabinet rules live in one dependency-free module so the quotation maker and 3D planner can later use the same definitions, which means a 900 mm cabinet has identical parts in every tool.

CutWizard itself deals only with board parts. Hardware is defined in the module for the other tools but is not shown in CutWizard.

## Scope

In scope:
- Two cabinet series, deep (560 mm) and shallow (300 mm), each in 12 standard widths.
- A drawer variant for the deep series.
- A picker in the existing "Load template" window.
- Counting the extra drawer board in the board count and board cost.
- Fixing the storage loaders that currently drop fields on reload.
- A test runner (Vitest) and tests for the new module and the loader fixes.

Out of scope (later sub-projects):
- Showing, printing or pricing hardware in CutWizard.
- A shared export format, and connections to the quotation maker, the pantrylk website and the 3D planner.
- Checking hardware against Inventory stock.
- Formulas you can edit in the app, new series (wall, tall), and cut lists for drawer boxes.

## Cabinet rules

W = cabinet width in mm. Boards are 18 mm, so the inside width is W − 36. All cabinets are 750 mm high. Part sizes are written as `width × height`, matching the order used in the source lists.

Standard widths: 150, 200, 300, 400, 450, 500, 600, 700, 800, 900, 1000, 1200.

### Deep base (`deep-560`): 560 mm deep

| Part | Size | Qty | Grain locked |
|---|---|---|---|
| Bottom | W × 560 | 1 | no |
| Shelf | (W − 36) × 550 | 1 | no |
| Side | 750 × 560 | 2 | yes |
| Back | 750 × W | 1 | no |
| Top rail | (W − 36) × 100 | 2 | no |
| Door(s) | see "Fronts" | | yes |

Hardware: 4 legs, plus whatever the fronts need (below).

### Shallow base (`shallow-300`): 300 mm deep

| Part | Size | Qty | Grain locked |
|---|---|---|---|
| Bottom | 300 × (W − 36) | 1 | no |
| Top | 300 × (W − 36) | 1 | no |
| Shelf | 300 × (W − 36) | 1 | no |
| Side | 750 × 300 | 2 | yes |
| Back | 750 × W | 1 | no |
| Back support | (W − 36) × 100 | 2 | no |
| Door(s) | see "Fronts" | | yes |

Hardware: no legs, plus whatever the fronts need.

### Fronts (both series)

- **W ≤ 600:** 1 door, 750 × W (height first, so the grain runs vertically like the sides). Hardware: 2 hinges, 1 handle.
- **W > 600:** 2 doors, 750 × (W ÷ 2). Hardware: 4 hinges, 2 handles.
- **Drawers** (deep series only, W ≥ 300): no doors. Instead there are 3 drawer fronts of W × 250, grain locked. Hardware: 3 handles, 3 pairs of drawer rails, no hinges. The cabinet also needs **1 extra 8×4 ft board** for the drawer boxes.

Drawers are not offered for the shallow series or for widths 150 and 200.

Check value (deep 600, no drawers): bottom 600×560, shelf 564×550, 2 sides 750×560, back 750×600, 2 top rails 564×100, door 750×600; 4 legs, 2 hinges, 1 handle. This matches the source list, except that the door is written 750 × 600 (changed 2026-10-28 so door grain runs vertically like the sides).

## Module: `services/cabinetSeries.ts`

Plain TypeScript with no imports from React, `services/storage.ts` or `contexts/`, so another project can copy or package it unchanged.

```ts
export type CabinetSeriesId = 'deep-560' | 'shallow-300';
export const STANDARD_WIDTHS: readonly number[];

export type CabinetPartKey =
  'bottom' | 'top' | 'shelf' | 'side' | 'back' | 'topRail' | 'backSupport' | 'door' | 'drawerFront';
export type HardwareKey = 'legs' | 'hinges' | 'handles' | 'drawerRails';

export interface CabinetPart { key: CabinetPartKey; width: number; height: number; quantity: number; canRotate: boolean; }
export interface HardwareItem { key: HardwareKey; quantity: number; }

export interface CabinetBuild {
  seriesId: CabinetSeriesId;
  width: number; depth: number; height: number;
  drawers: boolean;
  parts: CabinetPart[];
  hardware: HardwareItem[];   // for the quotation maker / 3D planner; unused in CutWizard
  extraBoards: number;        // 1 for a drawer cabinet, else 0
}

export const CABINET_SERIES: { id: CabinetSeriesId; depth: number; height: number; supportsDrawers: boolean }[];
export function drawersAvailable(seriesId: CabinetSeriesId, width: number): boolean;
export function buildCabinet(seriesId: CabinetSeriesId, width: number, opts: { drawers: boolean }): CabinetBuild;
```

The module returns part and hardware **keys**, never display names. The UI turns keys into names through the translation files. `buildCabinet` throws if `drawers` is requested where `drawersAvailable` returns false, or if the width is not a positive number.

## Data and storage changes

- **`types.ts`:** `Piece` gains `cabinetSeriesId?: CabinetSeriesId` and `cabinetDrawers?: boolean`. Like the existing `cabinetWidth` and `cabinetHeight`, these are copied onto every part of an added cabinet. Together with the width they are enough to rebuild the full `CabinetBuild`, hardware included, for the export work later. No new storage key is needed.
- **`loadStoredPieces`:** keep `groupId`, `groupName`, `cabinetWidth`, `cabinetHeight`, `cabinetSeriesId` and `cabinetDrawers`. Today the first four are dropped, so cabinet groups are lost on reload.
- **`loadStoredSettings`:** keep `jobNumber`, `boardPrice`, `edgeBandPricePerM`, `machineRentPerSqFt`, `laborPerSqFt` and `frontAreaSqFt` when they are present. Today they are dropped on reload. Also fix `Number(x) ?? default` for `kerf` and `trimMargin`. That expression gives `NaN` instead of the default when the value is missing, so fall back whenever the number is not finite.
- **Old presets removed:** `generateBaseCabinet` and `DEFAULT_TEMPLATES` are deleted. `loadStoredTemplates` returns only the user's own templates and keeps filtering out `sys-` ids, so old saved data stays clean.

## Extra drawer board in board count and cost

`App.tsx` gets an `extraBoards` value (a `useMemo`, like `autoFrontAreaSqFt`). It visits each unique `groupId` that has `cabinetSeriesId` set, calls `buildCabinet(...)` and adds up `extraBoards`. It passes the total to `StatsSummary`, which:
- shows the boards KPI as `N` normally, or as `N + E for drawers` when E > 0;
- calculates board cost as `(result.totalBoards + extraBoards) × boardPrice`. The extra 8×4 board is priced at the configured board price.

The optimizer itself is unchanged, because the extra board is not part of the cut plan.

## Picker UI (`components/PieceList.tsx`)

The existing "Load template" window gets a **Cabinet presets** section above the saved templates:

1. A series toggle: Deep 560 / Shallow 300.
2. 12 width buttons.
3. A **Drawers** checkbox, disabled when `drawersAvailable` is false, with a short reason ("Not available for this series" / "Too narrow for drawers"). Switching to a choice that doesn't support drawers turns the checkbox off.
4. **Quantity**, default 1.
5. A live preview list of each part's name, size and quantity, plus "+1 extra board for drawers" when it applies.
6. An **Add cabinet** button.

Adding a cabinet creates one new group per cabinet (so `quantity` cabinets means that many groups). Each group gets a fresh `groupId` and `groupName`, such as "Deep base 900 + drawers", along with `cabinetWidth`, `cabinetHeight = 750`, `cabinetSeriesId` and `cabinetDrawers`. One group per cabinet keeps the front-area cost (counted once per `groupId`) correct. Part names are filled in from the current language when the cabinet is added.

Below it, the user's saved templates stay as **My templates**, and saving and deleting work as before.

If this makes `PieceList.tsx` much larger, the presets section moves into its own `components/CabinetPresetPicker.tsx`.

## Translations

Add keys to all three blocks (`en`, `es`, `si`) in `contexts/translations.ts`:
- series names;
- the 9 part keys;
- picker labels (Cabinet presets, Series, Width, Drawers, Quantity, Add cabinet, My templates, "+ for drawers", and the two "not available" reasons).

The Sinhala text will be drafted and must be checked by Pantry LK before release.

## Testing

- Add `vitest` as a dev dependency, plus a `"test": "vitest run"` script, and list `pnpm test` in CLAUDE.md.
- `services/cabinetSeries.test.ts`:
  - Deep 600 and Shallow 600 match the source lists exactly (parts and hardware).
  - At 700 mm and above there are 2 doors of W/2 with doubled hinges and handles; at 600 there is 1 door.
  - The drawer variant has no door, 3 fronts of W × 250, 3 handles, 3 pairs of rails, no hinges, and `extraBoards` = 1.
  - `drawersAvailable` is false for shallow-300 and for widths 150 and 200, and `buildCabinet` throws in those cases.
  - `canRotate` is false for side, door and drawer front, and true for everything else.
  - Every standard width builds in both series without any zero or negative sizes.
- `services/storage.test.ts`, with a small in-memory `localStorage` stub instead of a DOM library:
  - pieces with group and cabinet fields survive saving and loading;
  - cost settings survive saving and loading;
  - a missing `kerf` falls back to the default instead of `NaN`.
- Manual check in the running app: add Deep 900 with drawers ×2 and Shallow 600, then confirm the parts list groups, the board count reading "+ 2 for drawers", the cost, the grain-locked parts, and that everything survives a page reload.

## Risks and open points

- **Sharing with other tools:** this design only guarantees the module is ready to share. Whether it becomes a shared package, an API or a copied file depends on what the quotation maker and 3D planner are built with, and is decided in the integration sub-project.
- **Extra board size:** the extra drawer board is always an 8×4 ft sheet priced at `boardPrice`, even if a different board size is selected in Settings. This is acceptable for now, and can become its own setting if prices differ.
- **Sinhala wording:** needs review by a native speaker.
