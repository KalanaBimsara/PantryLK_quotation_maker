# Pantry LK integrations — design

Date: 2026-10-28
Status: approved in conversation, awaiting written-spec review

## Goal

Connect CutWizard to the rest of Pantry LK's tools so a kitchen designed in the 3D planner gets a board count without anyone retyping cabinets, and that board count reaches the quotation maker.

The flow is:

```
3D kitchen planner ──cabinets──▶ CutWizard (board count) ──count + hardware──▶ quotation maker
        │                                                          ▲
        └──────── automatic estimate on save (same code) ──────────┘
```

The quote gets an automatic estimate straight away. Workshop staff can then open the same job in CutWizard, adjust it (add custom pieces, change board settings) and send a refined count, which replaces the estimate.

## Context

| Tool | Built with | Repo | Data it needs |
|---|---|---|---|
| Quotation maker | Next.js + Supabase, non-Vercel host | Next.js repo (with the planner) | Cabinet selection, hardware list, board count and cut plan summary. It does its own pricing, so CutWizard's cost total is **not** sent. |
| 3D kitchen planner | Inside the same Next.js app | Next.js repo | Produces the cabinet selection. Places Pantry LK series cabinets at standard or custom widths. |
| pantrylk website | Same Next.js + Supabase | Next.js repo | Nothing; out of scope. |
| CutWizard | React 19 + Vite, client-only, localStorage | This repo | Receives cabinets, returns board count and hardware. |

Users are Pantry LK staff only, signing in with the same Supabase accounts in every tool.

## Decision

**A shared core package plus Supabase as the shared store.**

- `services/cabinetSeries.ts` and the optimizer move into a new dependency-free package, `pantrylk-core`, used by both repos, so a cabinet has identical parts and an estimate gives an identical board count in every tool.
- A new Supabase table, `cut_jobs`, carries a job from the planner to CutWizard and the quote. Supabase is the backend, so no other server is added.
- CutWizard stays a Vite app and gains a "job mode" that reads and writes `cut_jobs`.

### Alternatives considered

- **JSON export/import files only.** No shared database, but every hop is a manual download and upload that can pick up an old file or the wrong job. Without the shared package there is still no automatic estimate. Rejected.
- **Move CutWizard into the Next.js app as a route.** One codebase and one login session. But this is the Next.js migration: porting the CDN Tailwind setup, the i18n context, print styles and localStorage use to work with SSR, for no gain today. Rejected for now, and still possible later.
- **Embed CutWizard via iframe + postMessage.** Cross-origin sign-in, a message protocol to maintain and printing from inside an iframe add complexity without saving work. Rejected.

### Is a Next.js migration needed?

No. CutWizard's optimizer is pure client-side code. Supabase gives sign-in, the database and row-level security directly from the browser. The missing piece was a shared store, not a server framework. The one cost of staying separate is that staff sign in to CutWizard and to the Next.js app separately; if that becomes annoying, merging CutWizard in as a route can be revisited.

## Part 1: `pantrylk-core` package

A new repo, `KalanaBimsara/pantrylk-core`: plain TypeScript with no runtime dependencies, tested with Vitest.

### Modules

- **`cabinet`:** today's `services/cabinetSeries.ts`, moved without changes except for the width limits below. It keeps returning part and hardware keys, never display names.
- **`optimizer`:** today's `services/optimizer.ts` and the types it uses (`Piece`, `Settings`, `Board`, `PlacedPiece`, `Rect`, `OptimizationResult`, `OptimizationStrategy`), plus `DEFAULT_CUT_SETTINGS` (2440 × 1220, kerf 3, trim margin 10, trim off), which moves out of `services/storage.ts`. `strategyLabel` stays the hardcoded Spanish string.
- **`job`:** the contract types below, a hand-written `parseCutJobInput(value: unknown)` and `parseCutJobResult(value: unknown)` that return the typed value or throw an error naming the bad field (no zod, to stay dependency-free), and `estimateJob(input)`.

### Width limits

Custom widths are allowed. `cabinet` adds:

```ts
export const MIN_CABINET_WIDTH = 150;
export const MAX_CABINET_WIDTH = 1200;
export function isValidCabinetWidth(width: number): boolean; // whole mm, 150–1200
```

`buildCabinet` throws when `isValidCabinetWidth` is false. This replaces today's "positive number" check. The planner uses the same function to check widths before saving. The drawer rule is unchanged: deep series only, W ≥ 300.

### Release and use

- A release is a git tag (`v1.0.0`) with the built `dist/` (JS + `.d.ts`) committed. pnpm 10 blocks install scripts for git dependencies, so the package must not need a build step on install.
- Both repos install it as `"pantrylk-core": "github:KalanaBimsara/pantrylk-core#v1.0.0"` and move to a new tag on purpose.
- Contract changes that break existing rows bump `schemaVersion`. Additive changes only bump the package version.

## Part 2: the shared data format (`schemaVersion: 1`)

```ts
type CutSettings = Pick<Settings, 'boardWidth' | 'boardHeight' | 'kerf' | 'trimMargin' | 'enableTrimMargin'>;

interface CabinetLine {
  lineId: string;            // stable id from the planner, one per placed cabinet type
  seriesId: CabinetSeriesId;
  width: number;             // whole mm, 150–1200
  drawers: boolean;
  quantity: number;          // 1–50
  label?: string;            // e.g. "Sink base", shown in CutWizard's group name
}

interface CutJobInput {
  schemaVersion: 1;
  jobId: string;             // = cut_jobs.id
  inputVersion: number;      // = cut_jobs.input_version
  cabinets: CabinetLine[];
  settings: CutSettings;
}

interface CutJobResult {
  schemaVersion: 1;
  source: 'auto' | 'workshop';
  basedOnInputVersion: number;
  computedAt: string;        // ISO timestamp
  cabinets: CabinetLine[];   // what this result was computed from (the workshop may have removed some)
  hardware: HardwareItem[];  // summed over all cabinets, one entry per key, zero quantities left out
  cutPlan: {
    optimizerBoards: number; // OptimizationResult.totalBoards
    extraBoards: number;     // drawer boards
    totalBoards: number;     // optimizerBoards + extraBoards
    efficiency: number;      // OptimizationResult.totalEfficiency
    wastePct: number;        // OptimizationResult.totalWaste
    linearCutsM: number;
    partsCount: number;
    unplacedCount: number;   // > 0 means the count is not trustworthy
    customPieceCount: number;// pieces not from a cabinet (0 for auto)
  };
  settings: CutSettings;     // the board size and kerf actually used
}
```

`estimateJob(input)` builds every cabinet line × quantity, runs `optimizeCuts` on the resulting pieces with `input.settings`, and returns a `CutJobResult` with `source: 'auto'`, `customPieceCount: 0` and `basedOnInputVersion: input.inputVersion`.

Full board layouts (piece positions) are not part of the result, because the quote doesn't need them. CutWizard keeps its own working state separately (`workshop_state`, below).

## Part 3: Supabase and the Next.js side

These changes are made in the Next.js repo. This spec fixes only what CutWizard depends on.

### Table `cut_jobs`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` pk | also `CutJobInput.jobId` |
| `project_ref` | FK | the existing planner design or quote row; the Next.js repo picks the table |
| `input` | `jsonb` | `CutJobInput` |
| `input_version` | `int` | bumped on every planner save |
| `auto_result` | `jsonb` | `CutJobResult`, `source: 'auto'` |
| `workshop_result` | `jsonb` null | `CutJobResult`, `source: 'workshop'` |
| `workshop_state` | `jsonb` null | `{ schemaVersion: 1, basedOnInputVersion, pieces: Piece[], settings: CutSettings }`; cost settings stay local to each CutWizard browser |
| `status` | `text` | `estimated` \| `in_workshop` \| `sent` |
| `updated_at`, `updated_by` | | set on every write |

Row-level security: signed-in staff can `select` and `update` rows. Only the Next.js app `insert`s rows. CutWizard writes only the `workshop_*`, `status`, `updated_*` columns.

### Planner save

Writes `input` and bumps `input_version`, then runs `estimateJob` on the server and stores `auto_result`. It leaves `workshop_result` alone, which becomes out of date by version.

### Quote

- Uses `workshop_result` when it exists and `basedOnInputVersion === input_version`, labelled "Workshop count".
- Otherwise uses `auto_result`, labelled "Auto estimate". If there is an out-of-date `workshop_result`, it also shows "Workshop count is out of date, design changed".
- Shows a warning when `cutPlan.unplacedCount > 0`.
- Translates hardware keys to names itself.

### Link

The planner or quote gets an **Open in CutWizard** button that opens `https://<cutwizard-host>/?job=<id>`. The CutWizard host is configured in the Next.js app.

## Part 4: changes in CutWizard

### Dependencies and config

- Add `pantrylk-core` (git tag) and `@supabase/supabase-js`.
- Add the env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. If they are missing, job mode is hidden and the app works exactly as it does today.

### Switching to the package (no behaviour change)

- `services/cabinetSeries.ts` becomes `export * from 'pantrylk-core/cabinet'`.
- `services/optimizer.ts` becomes `export * from 'pantrylk-core/optimizer'`.
- `types.ts` re-exports the moved types and keeps the app-only ones (`BoardPreset`, `Template`, `InventoryItem`, `InventoryCategory`).
- `services/storage.ts` imports `DEFAULT_CUT_SETTINGS` and keeps `DEFAULT_SETTINGS` as an alias.

Existing imports in components don't change. `services/cabinetSeries.test.ts` moves to the package. The CutWizard tests keep passing unchanged.

### `Piece` field

`Piece` gains `cabinetLineId?: string`, copied onto every part of a cabinet created from a job line. Add it to the `loadStoredPieces` whitelist and to `services/storage.test.ts`. It also goes in `pantrylk-core`'s `Piece`.

`createCabinetGroups` takes an optional `lineId` and copies it onto each piece.

### New modules

- **`services/supabaseClient.ts`:** creates the client from the env vars, or exports `null` when they are missing.
- **`services/jobs.ts`** (pure, no Supabase, tested):
  - `piecesFromJobInput(input, partName)`: for each line, calls `createCabinetGroups` with the line's `quantity`, `lineId`, and a group name from `label` or else the series name + width (+ drawers).
  - `resultFromWorkspace(pieces, settings, input)`: for each unique `groupId` with cabinet fields, rebuilds the cabinet and sums hardware and extra boards. It turns the groups back into `CabinetLine`s by `cabinetLineId` and counts pieces without `cabinetSeriesId` as custom pieces. It runs `optimizeCuts` and returns a `CutJobResult` with `source: 'workshop'` and `basedOnInputVersion: input.inputVersion`.
  - `replaceCabinetPieces(pieces, input, partName)`: removes every piece with `cabinetSeriesId`, keeps the rest, and appends `piecesFromJobInput(input)`.
- **`services/jobApi.ts`:** `loadJob(id)` (select and parse) and `sendWorkshop(id, state, result)` (an update that sets `status: 'sent'`).

### Job mode (`?job=<id>`)

1. **Sign in.** If there is no Supabase session, show a small email + password screen (Supabase Auth, same accounts). Signing out returns to it.
2. **Load.** Fetch the row and parse `input`. If `workshop_state` exists and its `basedOnInputVersion` equals `input_version`, load its pieces and cut settings. Otherwise build pieces with `piecesFromJobInput` and use `input.settings`. In both cases the cut settings are merged over the local settings, so the local cost settings and job number stay as they are (they aren't part of the job). Set `status: 'in_workshop'` if it was `estimated`.
3. **Work.** The usual pieces list, optimizer and visualizer. While in job mode, `App` doesn't read or write the localStorage pieces and settings, so the local workspace isn't overwritten. Templates, inventory and dark mode still use localStorage.
4. **Job bar.** Above the main view: the job reference, the status, an "unsent changes" marker and a **Send to quote** button. Sending writes `workshop_state`, `workshop_result` (from `resultFromWorkspace`), `status: 'sent'` and `updated_*`. If the result has unplaced pieces, confirm before sending.
5. **Design changed.** If an older `workshop_state` was found in step 2, a banner says the design changed since it was saved and offers **Reload cabinets** (`replaceCabinetPieces`, keeping custom pieces) or **Keep my version**. Either way, the next send is based on the current `input_version`.
6. **Leaving.** A `beforeunload` warning appears while there are unsent changes. A **Leave job** action drops the `?job` parameter and goes back to the local workspace.

New UI strings go into all three translation blocks (`en`, `es`, `si`).

### Error handling

- Job not found, not allowed by RLS, or an unknown `schemaVersion` / failed parse: show a full-screen message with **Back to local mode**. Nothing is loaded into the workspace.
- A `buildCabinet` error for a line (for example a width outside 150–1200): show the same message naming the line. The planner should have prevented it.
- A send that fails because of a network or permission error: keep the edits, show an error with **Retry**, and keep the "unsent changes" marker.
- Session expired during a send: show the sign-in screen as an overlay. After sign-in, retry the send without losing state.

## Testing

- **`pantrylk-core`:** today's `cabinetSeries` tests move here. New tests:
  - `isValidCabinetWidth`: 149, 150, 735, 1200, 1201, and 600.5.
  - `buildCabinet` throws outside the limits and builds a custom 735 deep cabinet with drawers.
  - `estimateJob` for one deep 600 line returns the expected hardware (4 legs, 2 hinges, 1 handle) and `extraBoards` 0, and a drawer line gives `extraBoards` per quantity.
  - The parsers reject a missing field, a wrong `schemaVersion`, a bad `seriesId` and a quantity of 0.
- **CutWizard `services/jobs.test.ts`:**
  - `piecesFromJobInput` gives one group per cabinet with `cabinetLineId` set.
  - `resultFromWorkspace` on unchanged pieces matches `estimateJob` (except `source`), counts added custom pieces, and leaves out deleted groups from `cabinets` and `hardware`.
  - `replaceCabinetPieces` keeps custom pieces.
- **CutWizard `services/storage.test.ts`:** `cabinetLineId` survives a reload.
- **Manual, against a dev Supabase project:** create a job in the planner (or insert a row by hand) with deep 900 + drawers × 2 and shallow 735. Open it in CutWizard, add a custom piece and send it. Check that the quote shows "Workshop count". Change the design in the planner and check that the quote falls back to the estimate with the out-of-date warning, and that CutWizard shows the design-changed banner.

## Delivery order

Each step is its own implementation plan:

1. **`pantrylk-core`:** create the repo, move the code, add the width limits and job contract, tag `v1.0.0`. Switch CutWizard to it with no behaviour change.
2. **Next.js:** add the `cut_jobs` table and RLS, the auto estimate on planner save, the quote display, and the Open in CutWizard link (in the Next.js repo).
3. **CutWizard job mode:** Part 4.

## Prerequisites and risks

- **Git remote:** CutWizard's `origin` is `alvaro-salort/CutWizard`. Before deploying, CutWizard needs a remote and a host under the user's own account. Nothing is pushed to `origin`.
- **Two sign-ins:** staff sign in to CutWizard and the Next.js app separately (same accounts, different origins). Accepted for now.
- **Package drift:** if one repo moves to a new `pantrylk-core` tag and the other doesn't, the auto estimate and the workshop count can differ for the same cabinets. Both repos should move tags together. The result's `settings` field makes a difference in board settings visible.
- **Extra drawer board size:** still always one 8×4 sheet per drawer cabinet, whatever board size is selected (unchanged from the cabinet presets spec).
- **`project_ref` target:** the Next.js repo chooses which existing table `cut_jobs` points to. CutWizard doesn't read it.

## Out of scope

- The pantrylk website.
- Pricing in CutWizard for jobs (the quote prices), and sending CutWizard's cost total.
- Wall, tall and corner cabinets; drawer box cut lists.
- Offline JSON export/import of jobs.
- Merging CutWizard into the Next.js app.
- Removing the leftover `GEMINI_API_KEY` define in `vite.config.ts`.
