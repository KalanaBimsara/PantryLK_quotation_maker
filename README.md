# pantrylk-core

Shared code for Pantry LK's tools (CutWizard, the quotation maker and the 3D kitchen planner), so a cabinet has the same parts and a job gets the same board count everywhere.

Plain TypeScript with **no runtime dependencies**: no React, DOM, Node built-ins or app code. Keep it that way.

## Modules

| Import | Contents |
|---|---|
| `pantrylk-core/cabinet` | Cabinet series (`deep-560`, `shallow-300`), standard widths, width limits (150–1200 mm, whole mm) and `buildCabinet`, which returns board parts, hardware and extra boards as keys (the UI translates them). |
| `pantrylk-core/optimizer` | The guillotine cut optimizer (`optimizeCuts`), the shared types (`Piece`, `Settings`, `OptimizationResult`, …) and `DEFAULT_CUT_SETTINGS`. |
| `pantrylk-core/job` | The cut job contract (`CutJobInput`, `CutJobResult`, `schemaVersion: 1`), strict parsers, and `estimateJob`. |

## Install

```bash
pnpm add github:KalanaBimsara/pantrylk-core#v1.0.0
```

Move to a new tag on purpose, in every tool at the same time, so estimates stay in step.

## Release

`dist/` is committed, because pnpm does not run install scripts for git dependencies.

```bash
pnpm test
pnpm typecheck
pnpm build
git add -A && git commit -m "release: vX.Y.Z"
git tag vX.Y.Z && git push origin main vX.Y.Z
```

Bump `schemaVersion` in `src/job.ts` only for contract changes that break stored jobs; additive changes only bump the package version.
