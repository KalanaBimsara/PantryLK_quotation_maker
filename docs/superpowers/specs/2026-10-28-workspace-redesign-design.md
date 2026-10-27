# Workspace redesign and custom cabinet sizes: design

Date: 2026-10-28
Status: approved in conversation (sections 1–3), awaiting written-spec review
Builds on: `docs/superpowers/specs/2026-10-28-cabinet-presets-design.md`

## Goal

Make CutWizard faster to use for the person preparing a job on an office laptop or desktop. The aim is a screen where cabinets go in on the left and the cut plan updates live on the right. The work also lets cabinets use custom width, height and depth, beyond the standard sizes, and stops the tool from opening with example pieces.

This work is for CutWizard only. The `pantrylk-core` package on the on-hold integrations branch (`claude/strange-lichterman-5000e8`) is not touched. Before that branch is used, it will need these rules too, alongside the door grain fix.

## Decisions already made

| Topic | Decision |
|---|---|
| Start-up | Reopen the last unfinished job if one is saved, otherwise start empty. Never show example pieces automatically. |
| Custom sizes | Width, height and depth are all customisable and use the same formulas as the standard presets. |
| Main device | Office laptop or desktop. Narrow screens must still work, stacked. |
| Layout | Two-pane workspace: build the job on the left, see the live result on the right. Settings go in a slide-in panel. |

## Out of scope

- Undo
- Several named jobs
- Dragging parts on the plan
- Changes to the optimizer algorithm, or to Inventory
- Hardware display or pricing
- Integrations

## 1. Start-up behaviour

- `loadStoredPieces()` returns `[]` when nothing is saved, when the saved value is an empty array, or when it can't be read. It no longer falls back to `DEFAULT_PIECES`.
- So a job the user clears with **Clear all** stays empty after a reload.
- `DEFAULT_PIECES` is kept, renamed `EXAMPLE_PIECES`, and only loaded through the **Load example** link in the empty state.
- Settings keep loading exactly as now.

## 2. Custom cabinet sizes

### Module change (`services/cabinetSeries.ts`)

The module still imports nothing from the app.

```ts
export interface CabinetSize { width: number; height: number; depth: number; }
export const STANDARD_HEIGHT = 750;
export const SIZE_LIMITS: { width: [100, 2400]; height: [300, 2400]; depth: [150, 1200] };
export function validateCabinetSize(size: CabinetSize): { field: keyof CabinetSize; min: number; max: number }[]; // empty = valid
export function standardSize(seriesId: CabinetSeriesId, width: number): CabinetSize; // height 750, series default depth
export function drawersAvailable(seriesId: CabinetSeriesId, size: CabinetSize): boolean;
export function buildCabinet(seriesId: CabinetSeriesId, size: CabinetSize, opts: { drawers: boolean }): CabinetBuild; // throws when invalid
```

- `CabinetBuild` gains `depth` from the size, not from the series.
- `CABINET_SERIES[].depth` becomes the **default** depth: 560 for deep, 300 for shallow.
- **Validation:**
  - Sizes must be whole millimetres within `SIZE_LIMITS`.
  - `validateCabinetSize` returns every field that breaks a rule.
  - `buildCabinet` throws for an invalid size, or for drawers where they aren't available.

### Formulas (W, H, D in mm; t = 18 mm board)

| Part | Deep base | Shallow |
|---|---|---|
| Bottom | W × D | D × (W − 36) |
| Top | none | D × (W − 36) |
| Shelf | (W − 36) × (D − 10) | D × (W − 36) |
| Side ×2 (grain locked) | H × D | H × D |
| Back | H × W | H × W |
| Top rail ×2 / back support ×2 | (W − 36) × 100 | (W − 36) × 100 |
| Legs | 4 | none |

**Fronts (both series):**
- **W ≤ 600:** one door, H × W.
- **W > 600:** two doors, H × (W / 2). The height comes first so the grain runs vertically, matching the sides.
- **Hardware for doors:** 2 hinges and 1 handle per door.
- **Half widths are kept:** an odd W over 600 gives half-millimetre doors (W = 901 gives two doors of 450.5).
- **Drawers** (deep only, W ≥ 300 and H ≥ 450): no doors. Instead there are 3 fronts of W × (H / 3), grain locked, with 3 handles and 3 pairs of rails. The cabinet also needs 1 extra 8×4 board.

**Check values:**
- At the standard size (H = 750, D = 560 / 300), every part equals today's output.
- Deep 820 × 850 × 580 with drawers gives:
  - bottom 820×580
  - shelf 784×570
  - sides 850×580 ×2
  - back 850×820
  - top rails 784×100 ×2
  - drawer fronts 820×283.33… ×3

  Exact thirds are not rounded. The display shows one decimal.

### Saving and the adapter (`services/cabinetPieces.ts`, `types.ts`, `services/storage.ts`)

- **New field:** `Piece` gains `cabinetDepth?: number`.
- **Adapter:** `createCabinetGroups({ seriesId, size, drawers, quantity, groupName, partName })` takes a `size` instead of `width`, and sets `cabinetWidth`, `cabinetHeight` and `cabinetDepth` from it.
- **Extra boards:** `countExtraBoards` rebuilds each cabinet from `cabinetWidth`, `cabinetHeight` and `cabinetDepth`. Old pieces without a depth fall back to the series default depth.
- **Loader:** `loadStoredPieces` keeps `cabinetDepth`.
- **Templates:** they round-trip it automatically, because they spread the piece.

### Names

- **Standard size:** "Deep base 900" or "Deep base 900 + drawers".
- **Custom size:** "Deep base 820 × 850 × 580", with "+ drawers" when it has drawers.
- **Series names:** shortened to "Deep base" and "Shallow", without the depth. This also fixes the "Shallow base 300 600" naming.

## 3. Two-pane layout

### Shell (`App.tsx`)

**Navbar:** unchanged apart from fixing the Optimizer/Inventory tab overflow, which shows a scrollbar today.

**Job bar** (new, `components/JobBar.tsx`):
- **Job name:** editable inline, backed by `settings.jobNumber`.
- **Board chip:** for example "2440 × 1220 · kerf 3 · trim off".
- **Buttons:** **Job settings**, **Print / PDF** (`window.print()`) and **Export CSV** (`exportOptimizationCSV`).

**Settings drawer** (new, `components/SettingsDrawer.tsx`):
- **What it is:** a right-hand slide-in panel wrapping the existing `SettingsPanel` content: board presets, size, kerf, trim and job costing.
- **Closing it:** Esc, clicking the backdrop, or the close button.
- **Focus:** moves into the panel when it opens, and back to the button when it closes.
- **State:** `settingsOpen` lives in `App`. It isn't saved.

**Body:** `grid lg:grid-cols-12`.
- Left pane: `lg:col-span-5`.
- Right pane: `lg:col-span-7`.
- Below `lg`, the panes stack: builder, then cut list, then plan.
- The **Optimize Cuts** button is removed. The existing auto-optimize effect stays.

### Left pane

1. **Add cabinet** (`components/CabinetBuilder.tsx`, which replaces `CabinetPresetPicker.tsx`), shown on the page instead of in the pop-up:
   - **Controls:** series toggle; 12 standard width chips plus **Custom**; drawers checkbox with the reason shown when it's disabled; quantity (raw text, clamped on use, as now); compact parts preview; **Add cabinet**.
   - **Custom:** shows W, H and D number inputs, prefilled from the current selection. Any limit broken shows an inline message under its field ("Width must be 100–2400 mm"), and **Add cabinet** stays disabled until the size is valid.
2. **Cut list** (`components/PieceList.tsx`, reorganised):
   - **Cabinet groups:** each one is a collapsible row with its name, part count and delete button. Expanding it shows its parts, still editable as now.
   - **Loose parts:** pieces without a group, with an **Add part** row.
   - **Grouping helper:** `services/cutList.ts` exports `groupPieces(pieces): { groups: { groupId; name; isCabinet: boolean; pieces }[]; loose: Piece[] }`. It's pure and tested, and it keeps the order cabinets were added in.
   - **⋯ menu:** save template, load template (the existing pop-up minus the presets section), import CSV, export parts CSV, clear all. Clear all asks for confirmation through the translated message.

### Right pane

- **Unplaced warning:** when any part couldn't be placed, a warning sits at the top. This is the existing data, moved.
- **Summary row** (`StatsSummary.tsx`):
  - **Main numbers:** boards (with "+ N for drawers"), yield, parts and total cost.
  - **More toggle:** opens a second row with waste, linear cut and useful offcuts, plus their existing help tooltips.
- **Cut plan:** boards stacked as today (`Visualizer`), with the same zoom, pan and hover link to the cut list.

## 4. Fixes and polish

- **Translations:** every hardcoded UI string goes through translations in `en`, `es` and `si`:
  - **SettingsPanel:** "Presets Comerciales", "Espesor de la sierra", and the "Disable" status under trim, which becomes the clearer "Off".
  - **PieceList:** the clear-all and CSV-error messages.
  - **Default part names:** "Pieza N" in `storage.ts`, `optimizer.ts` and `csvHelper.ts` becomes the generic "Part N", which is not translated in the saved data.
  - **Optimizer:** strategy labels become `strategyId` → translation key, so the UI shows translated names.
  - **Page language:** `<html lang>` follows the chosen language.
- **CSV:** export headers become English ("Board, Part, Description, Width (mm)…"). Import already accepts English and Spanish headers.
- **Part names on the plan:** inside each part, show the name above the size when the part is at least 250 mm wide and 120 mm high in board units. Otherwise show the size only. Every part gets a `<title>` tooltip with name, size and cabinet name.
- **Empty states:**
  - **Left:** "Add your first cabinet".
  - **Right:** "Your cut plan appears here", with a **Load example** link that loads `EXAMPLE_PIECES`.
- **Extra drawer boards on the printout:** the report adds a line "+ N extra 8×4 boards for drawers" when N > 0. The line is visible in print only.
- **Accessibility:**
  - every input gets a `<label>`, or an `aria-label` where a visible label doesn't fit;
  - visible focus rings on buttons and chips;
  - chips keep `aria-pressed`;
  - the drawer has `role="dialog"` and `aria-modal`.

## 5. Testing

Automated tests, as Vitest specs next to the code:

**`cabinetSeries.test.ts`**
- Standard sizes still give today's outputs: deep 600, shallow 600, the door split, and drawers.
- The custom deep 820 × 850 × 580 with drawers gives the check values above.
- `validateCabinetSize` accepts the limits and rejects 99, 2401, 1200.5 and NaN, per field.
- Drawers are rejected when H < 450 or W < 300, and for shallow.
- `buildCabinet` throws for an invalid size.

**`cabinetPieces.test.ts`**
- `createCabinetGroups` sets `cabinetDepth`.
- `countExtraBoards` uses the saved depth, and falls back to the series default when depth is missing.

**`storage.test.ts`**
- The loader returns `[]` with nothing saved, with `[]` saved, and with unreadable JSON.
- It keeps `cabinetDepth`.

**`cutList.test.ts`**
- `groupPieces` splits groups from loose parts and keeps the order they were added in. A group with a `groupId` but no cabinet data (an old template) is still its own group, with `isCabinet: false`.

**Manual checks in the running app**
- **Sizes:** 1366 px and 375 px, in light and dark mode.
- **Languages:** en, es and si.
- **Settings drawer:** opens and closes with Esc and the backdrop, and focus returns to the button.
- **Custom sizes:** add a custom deep 820 × 850 × 580 with drawers, and check that an invalid size blocks Add.
- **Reload:** the job is kept; after Clear all it reloads empty; a first visit is empty.
- **Plan labels:** names appear on large parts and tooltips on all parts.
- **Print preview:** shows the boards and the drawer-board line, and the bars and drawer are hidden.

## Risks and open points

- **Melamine preset mismatch:** this is a pre-existing bug found while designing. In `SettingsPanel.tsx`, the "Melamine" preset sets the board to 2438.4 × 1219.2, but its label says "2750 × 1830 mm". Choosing it cuts on an 8×4 board while the label promises a larger sheet. **Resolved:** the user confirmed Melamine is an 8×4 sheet, so the size is right and the label is wrong. The plan changes the label to "2438.4 × 1219.2 mm (8×4 ft)" and leaves the size unchanged.
- **Larger part labels:** names make the labels bigger. Small parts fall back to size only, and very small ones rely on the tooltip.
- **Integrations branch:** `pantrylk-core` diverges further, because its `buildCabinet` takes a width. This is accepted while the integration is on hold.
