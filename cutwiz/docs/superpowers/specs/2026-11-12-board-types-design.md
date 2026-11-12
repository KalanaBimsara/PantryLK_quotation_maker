# Separate board types (Carcass, AGT, HMR): design

Date: 2026-11-12
Status: awaiting review

## Goal

A Pantry LK job is cut from three kinds of board, not one. After the cabinets are added, the
person preparing the job must see how many sheets of each kind to buy, with thickness and size,
and get a cut plan for each kind.

Success looks like this: add a list of cabinets, read "Carcass 18 mm: 4, AGT 18 mm 9×6: 2,
HMR 6 mm: 1" at the top of the right pane, and print a plan whose every sheet says which
board it is.

## Decisions made with the user

| Topic | Decision |
|---|---|
| Doors | Cut from AGT 18 mm |
| Drawer fronts | Cut from AGT 18 mm, same as doors |
| Back panels | Cut from HMR 6 mm, 8×4 ft |
| Everything else in a cabinet | Carcass board 18 mm (today's board setting) |
| AGT sheet size | One size per job, picked in Job settings: 8×4 ft or 9×6 ft |
| Loose parts (hand-added, CSV) | Start on Carcass; every part row has a board selector |
| Summary | A "Boards to buy" block at the top of the right pane (mockup approved) |

Assumptions stated to the user and not corrected:

- 9×6 ft is 2745 × 1830 mm, and the size is editable.
- Jobs saved before this change keep every part on Carcass until the board is changed on the
  row or the cabinet is added again. Old parts were saved without a part type, so there is
  nothing reliable to migrate from.
- The extra 8×4 sheet per drawer cabinet stays counted under Carcass.
- Kerf and trim are one setting shared by all three board types.

## Approach

Each part carries its board type. The tool splits the cut list by board type and runs the
existing optimizer once per type, with that type's sheet size. `optimizeCuts` itself does not
change.

Rejected: teaching the optimizer to handle mixed stock in one pass. A part can only go on its
own board type, so one pass per type gives the same answer with no change to the core.

## Data model

**`services/cabinetSeries.ts`** (shared module, stays free of app imports, comments in English)

```ts
export type CabinetMaterial = 'carcass' | 'agt' | 'hmr';
export const MATERIAL_THICKNESS: Readonly<Record<CabinetMaterial, number>> = { carcass: 18, agt: 18, hmr: 6 };

export interface CabinetPart {
  key: CabinetPartKey;
  width: number;
  height: number;
  quantity: number;
  canRotate: boolean;
  material: CabinetMaterial; // new
}
```

`door` and `drawerFront` get `agt`, `back` gets `hmr`, every other part key gets `carcass`.
Part sizes and formulas do not change.

**`types.ts`**

```ts
export type MaterialId = CabinetMaterial;

interface Piece { /* existing fields */ material?: MaterialId; } // missing means carcass

interface Settings {
  /* existing fields; boardWidth, boardHeight and boardPrice are the carcass board */
  agtWidth: number;   // default 2440
  agtHeight: number;  // default 1220
  agtPrice?: number;
  hmrWidth: number;   // default 2440
  hmrHeight: number;  // default 1220
  hmrPrice?: number;
}
```

Flat fields, because `loadStoredSettings` rebuilds settings from a whitelist of scalar fields
and `SettingsPanel` edits them by field name. Existing saved settings keep working: the three
old fields keep their meaning.

## New modules

**`services/materials.ts`** (pure, no React)

- `MATERIAL_ORDER: readonly MaterialId[]` = carcass, agt, hmr. Used for every list and for
  the plan order.
- `AGT_SIZES` = `[{ id: '8x4', width: 2440, height: 1220 }, { id: '9x6', width: 2745, height: 1830 }]`.
- `materialOf(piece)`: the piece's material, or `carcass` when missing or not a known id.
- `boardFor(settings, material)`: `{ width, height, price }` for that board type.
- `sheetLabel(width, height)`: `'8×4 ft'` for 2440 × 1220, `'9×6 ft'` for 2745 × 1830,
  otherwise `null` (the UI then shows only the mm size).

**`services/materialPlan.ts`** (pure, no React)

```ts
export interface MaterialPlan {
  material: MaterialId;
  boardWidth: number;
  boardHeight: number;
  result: OptimizationResult;
}

export function planByMaterial(pieces: Piece[], settings: Settings): MaterialPlan[];
export function summarizePlans(plans: MaterialPlan[]): PlanTotals;
```

- `planByMaterial` groups pieces with `materialOf`, and for each type that has at least one
  piece calls `optimizeCuts(group, { ...settings, boardWidth, boardHeight })` with that type's
  size. It returns the plans in `MATERIAL_ORDER`. A type with no pieces is left out.
- `PlanTotals` holds what the summary needs across all plans: `totalBoards`, `totalParts`,
  `efficiency` and `waste` (weighted by sheet area, so a 9×6 sheet counts for more than an 8×4),
  `linearCuts`, `usefulOffcuts`, and `unplaced: { piece: Piece; material: MaterialId }[]`.
- Board ids restart at 1 inside each plan. Anything that needs a unique key uses
  `${material}-${board.id}`.

## Changes to existing modules

- **`services/cabinetPieces.ts`**: `createCabinetGroups` copies `part.material` onto each piece.
  `countExtraBoards` is unchanged.
- **`services/storage.ts`**: `loadStoredPieces` keeps `material` only when it is a known id.
  `loadStoredSettings` reads the six new fields; a missing, zero or non-numeric size falls back
  to the default, and the two prices are copied only when saved (same rule as the other cost
  fields). `DEFAULT_SETTINGS` gets the four size defaults.
- **`services/templatePieces.ts`**: no code change expected, because template pieces are copied
  whole. A test pins that `material` survives a save and load.
- **`services/csvHelper.ts`**:
  - Parts list: new last column `Board type` with `Carcass`, `AGT` or `HMR`.
  - Plan: takes the plans instead of one result; new first column `Board type`; the `Board`
    number restarts per type.
  - Import: a `board type` / `material` / `tablero` column is read case-insensitively. A file
    without the column, or with an unknown value, imports onto Carcass.
- **Cost (`StatsSummary`)**: boards cost is the sum over plans of sheets × that type's price,
  plus the extra drawer sheets × the carcass price. Edge banding is counted for Carcass and AGT
  parts only: 6 mm backs are not edge banded. This lowers the edge-band figure compared with
  today for the same job.

## Screens

**Boards to buy (right pane, top).** Replaces the single Boards figure. One row per board type
that has parts, in `MATERIAL_ORDER`: name, a thickness tag ("18 mm", "6 mm"), sheet size
("9×6 ft · 2745 × 1830 mm"), what goes on it, and the count. The Carcass row shows
"3 cut + 1 for drawers" when there are drawer cabinets. The header shows the grand total.
Below it: Yield, Parts and Total cost across all boards, then the existing More toggle
(waste, linear cut, offcuts), also across all boards.

**Parts that don't fit.** The warning stays on top and now names the board each part was meant
for, for example "Door · 2500 × 450 mm · AGT 8×4 ft".

**Cut plan.** Drawings are grouped under a heading per board type ("AGT 18 mm · 9×6 ft ·
2 boards"). Each drawing is numbered within its type ("AGT board 1 of 2").

**Job settings.** The board section becomes three blocks:

- Carcass: today's presets, width, height, plus price per sheet.
- AGT: an 8×4 / 9×6 switch that fills width and height, editable width and height, price.
- HMR: width, height, price.

Kerf, trim and the other costing fields are unchanged.

**Job bar chip.** Shows the carcass size, the AGT size, kerf and trim.

**Cabinet builder preview.** Parts that go on AGT or HMR show a small tag with that name.

**Cut list.** Each part row gets a compact board selector (Carcass / AGT / HMR). The add-part
form gets the same selector, starting on Carcass. Changing it re-runs the plan like any other
edit.

**Printout.** Each printed sheet's header carries its board type, thickness and size, and its
number within the type. The first printed sheet carries the boards-to-buy list; this replaces
today's "+ N extra 8×4 boards for drawers" line.

**Languages.** Every new string is added to the `en`, `es` and `si` blocks. "AGT" and "HMR"
are product names and stay as they are in all three.

## Edge cases

- A board type with no parts is not planned and not listed.
- Switching AGT to a smaller sheet can leave doors that no longer fit; they show in the
  warning with the board name.
- A stored piece with an unknown `material` value is treated as Carcass.
- Drawer cabinets always have carcass parts, so the extra drawer sheets always have a Carcass
  row to sit on.
- Hover highlighting between the cut list and the drawings keeps working across all plans.

## Out of scope

- Mixing 8×4 and 9×6 AGT sheets in one job.
- Separate kerf or trim per board type.
- Changing part formulas for the 6 mm back.
- More board types than these three, or user-defined types.
- The Inventory view.
- The on-hold `pantrylk-core` branch. When it is picked up, its copy of the cabinet series
  needs the `material` field too.

## Testing

Unit tests (Vitest, next to the code):

- `cabinetSeries.test.ts`: door and drawerFront are `agt`, back is `hmr`, the rest `carcass`,
  for both series and for a drawer cabinet.
- `cabinetPieces.test.ts`: created pieces carry the part's material.
- `materials.test.ts`: `materialOf` fallback, `boardFor` per type, `sheetLabel`.
- `materialPlan.test.ts`: one plan per used type in order, each with its own sheet size; an
  unused type is absent; a door too tall for AGT 8×4 is unplaced there and fits on 9×6; totals
  are area-weighted.
- `storage.test.ts`: `material` and the six settings fields survive a save and load; unknown
  material and bad sizes fall back.
- `templatePieces.test.ts`: `material` survives.
- `csvHelper.test.ts`: both exports include the board type; an exported parts list re-imports
  with the same board types; a file without the column imports onto Carcass.

In the running app: add a mix of door and drawer cabinets, check the Boards to buy counts
against the drawings, switch AGT between 8×4 and 9×6, move a loose part to HMR, reload the
page, and check dark mode and the narrow layout. Print is checked structurally only; a real
print preview stays with the user.
