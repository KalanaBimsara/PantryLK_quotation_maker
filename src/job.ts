// Cut job contract shared by the 3D planner, CutWizard and the quotation maker.
// The planner writes a CutJobInput; an estimate or the workshop writes a CutJobResult.
// Parsers whitelist known fields, never coerce types, and name the bad field in the error.

import { buildCabinet, drawersAvailable, isCabinetSeriesId, isValidCabinetWidth } from './cabinet.js';
import type { CabinetBuild, CabinetSeriesId, HardwareItem, HardwareKey } from './cabinet.js';
import { optimizeCuts } from './optimizer.js';
import type { CutSettings, OptimizationResult, Piece } from './types.js';

export const CUT_JOB_SCHEMA_VERSION = 1;
export const MAX_LINE_QUANTITY = 50;

export interface CabinetLine {
  lineId: string;
  seriesId: CabinetSeriesId;
  width: number;
  drawers: boolean;
  quantity: number;
  label?: string;
}

export interface CutJobInput {
  schemaVersion: 1;
  jobId: string;
  inputVersion: number;
  cabinets: CabinetLine[];
  settings: CutSettings;
}

export interface CutPlan {
  optimizerBoards: number;
  extraBoards: number;
  totalBoards: number;
  efficiency: number;
  wastePct: number;
  linearCutsM: number;
  partsCount: number;
  unplacedCount: number;
  customPieceCount: number;
}

export interface CutJobResult {
  schemaVersion: 1;
  source: 'auto' | 'workshop';
  basedOnInputVersion: number;
  computedAt: string;
  cabinets: CabinetLine[];
  hardware: HardwareItem[];
  cutPlan: CutPlan;
  settings: CutSettings;
}

// Record so the compiler flags a hardware key added to cabinet.ts but missing here.
const HARDWARE_KEYS: Record<HardwareKey, true> = { legs: true, hinges: true, handles: true, drawerRails: true };
const HARDWARE_ORDER = Object.keys(HARDWARE_KEYS) as HardwareKey[];

const CUT_PLAN_FIELDS: readonly (keyof CutPlan)[] = [
  'optimizerBoards',
  'extraBoards',
  'totalBoards',
  'efficiency',
  'wastePct',
  'linearCutsM',
  'partsCount',
  'unplacedCount',
  'customPieceCount',
];

type Obj = Record<string, unknown>;

const fail = (path: string, reason: string): never => {
  throw new Error(`Invalid cut job: ${path} ${reason}`);
};

const obj = (v: unknown, path: string): Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Obj) : fail(path, 'must be an object');

const arr = (v: unknown, path: string): unknown[] => (Array.isArray(v) ? v : fail(path, 'must be an array'));

const str = (v: unknown, path: string): string =>
  typeof v === 'string' && v.length > 0 ? v : fail(path, 'must be a non-empty string');

const bool = (v: unknown, path: string): boolean => (typeof v === 'boolean' ? v : fail(path, 'must be true or false'));

const num = (v: unknown, path: string, min: number, exclusiveMin = false): number =>
  typeof v === 'number' && Number.isFinite(v) && (exclusiveMin ? v > min : v >= min)
    ? v
    : fail(path, `must be a number ${exclusiveMin ? '>' : '>='} ${min}`);

const int = (v: unknown, path: string, min: number, max = Infinity): number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max
    ? v
    : fail(path, `must be a whole number from ${min}${max === Infinity ? '' : ` to ${max}`}`);

const schemaVersion = (v: unknown, path: string): 1 =>
  v === CUT_JOB_SCHEMA_VERSION ? CUT_JOB_SCHEMA_VERSION : fail(path, `must be ${CUT_JOB_SCHEMA_VERSION}`);

function parseLine(v: unknown, path: string): CabinetLine {
  const o = obj(v, path);
  const lineId = str(o.lineId, `${path}.lineId`);
  const seriesId = isCabinetSeriesId(o.seriesId) ? o.seriesId : fail(`${path}.seriesId`, 'is not a known series');
  const width =
    typeof o.width === 'number' && isValidCabinetWidth(o.width)
      ? o.width
      : fail(`${path}.width`, 'must be a whole number of mm from 150 to 1200');
  const drawers = bool(o.drawers, `${path}.drawers`);
  if (drawers && !drawersAvailable(seriesId, width)) fail(`${path}.drawers`, `are not available for ${seriesId} at ${width} mm`);
  const quantity = int(o.quantity, `${path}.quantity`, 1, MAX_LINE_QUANTITY);
  const line: CabinetLine = { lineId, seriesId, width, drawers, quantity };
  if (o.label !== undefined) line.label = str(o.label, `${path}.label`);
  return line;
}

function parseLines(v: unknown, path: string): CabinetLine[] {
  const seen = new Set<string>();
  return arr(v, path).map((item, i) => {
    const line = parseLine(item, `${path}[${i}]`);
    if (seen.has(line.lineId)) fail(`${path}[${i}].lineId`, `duplicates "${line.lineId}"`);
    seen.add(line.lineId);
    return line;
  });
}

function parseSettings(v: unknown, path: string): CutSettings {
  const o = obj(v, path);
  return {
    boardWidth: num(o.boardWidth, `${path}.boardWidth`, 0, true),
    boardHeight: num(o.boardHeight, `${path}.boardHeight`, 0, true),
    kerf: num(o.kerf, `${path}.kerf`, 0),
    trimMargin: num(o.trimMargin, `${path}.trimMargin`, 0),
    enableTrimMargin: o.enableTrimMargin === undefined ? false : bool(o.enableTrimMargin, `${path}.enableTrimMargin`),
  };
}

function parseHardware(v: unknown, path: string): HardwareItem[] {
  return arr(v, path).map((item, i) => {
    const o = obj(item, `${path}[${i}]`);
    const key =
      typeof o.key === 'string' && Object.hasOwn(HARDWARE_KEYS, o.key)
        ? (o.key as HardwareKey)
        : fail(`${path}[${i}].key`, 'is not a known hardware key');
    return { key, quantity: int(o.quantity, `${path}[${i}].quantity`, 1) };
  });
}

function parseCutPlan(v: unknown, path: string): CutPlan {
  const o = obj(v, path);
  const plan = {} as CutPlan;
  for (const field of CUT_PLAN_FIELDS) plan[field] = num(o[field], `${path}.${field}`, 0);
  return plan;
}

export function parseCutJobInput(value: unknown): CutJobInput {
  const o = obj(value, 'input');
  return {
    schemaVersion: schemaVersion(o.schemaVersion, 'schemaVersion'),
    jobId: str(o.jobId, 'jobId'),
    inputVersion: int(o.inputVersion, 'inputVersion', 0),
    cabinets: parseLines(o.cabinets, 'cabinets'),
    settings: parseSettings(o.settings, 'settings'),
  };
}

export function parseCutJobResult(value: unknown): CutJobResult {
  const o = obj(value, 'result');
  const source = o.source === 'auto' || o.source === 'workshop' ? o.source : fail('source', 'must be "auto" or "workshop"');
  const computedAt =
    typeof o.computedAt === 'string' && !Number.isNaN(Date.parse(o.computedAt))
      ? o.computedAt
      : fail('computedAt', 'must be an ISO date string');
  return {
    schemaVersion: schemaVersion(o.schemaVersion, 'schemaVersion'),
    source,
    basedOnInputVersion: int(o.basedOnInputVersion, 'basedOnInputVersion', 0),
    computedAt,
    cabinets: parseLines(o.cabinets, 'cabinets'),
    hardware: parseHardware(o.hardware, 'hardware'),
    cutPlan: parseCutPlan(o.cutPlan, 'cutPlan'),
    settings: parseSettings(o.settings, 'settings'),
  };
}

// Hardware for a set of cabinets: one entry per key in a fixed order, zero quantities left out.
export function sumHardware(builds: { build: CabinetBuild; quantity: number }[]): HardwareItem[] {
  const totals = new Map<HardwareKey, number>();
  for (const { build, quantity } of builds)
    for (const item of build.hardware) totals.set(item.key, (totals.get(item.key) ?? 0) + item.quantity * quantity);
  return HARDWARE_ORDER.filter((key) => (totals.get(key) ?? 0) > 0).map((key) => ({ key, quantity: totals.get(key)! }));
}

export function cutPlanFrom(result: OptimizationResult, extraBoards: number, customPieceCount: number): CutPlan {
  return {
    optimizerBoards: result.totalBoards,
    extraBoards,
    totalBoards: result.totalBoards + extraBoards,
    efficiency: result.totalEfficiency,
    wastePct: result.totalWaste,
    linearCutsM: result.totalLinearCuts,
    partsCount: result.totalPartsCount,
    unplacedCount: result.unplacedPieces.length,
    customPieceCount,
  };
}

// Automatic estimate for a planner design: every cabinet line × quantity, optimized with the job's settings.
// The input is parsed first, so an invalid job fails here instead of storing a result no tool can read.
// Part names are the part keys; apps that show the pieces translate them.
export function estimateJob(raw: CutJobInput, now: () => Date = () => new Date()): CutJobResult {
  const input = parseCutJobInput(raw);
  const builds = input.cabinets.map((line) => ({
    line,
    build: buildCabinet(line.seriesId, line.width, { drawers: line.drawers }),
    quantity: line.quantity,
  }));

  const pieces: Piece[] = [];
  for (const { line, build } of builds) {
    for (let i = 0; i < line.quantity; i++) {
      build.parts.forEach((part, partIndex) => {
        pieces.push({
          id: `${line.lineId}-${i}-${partIndex}`,
          name: part.key,
          width: part.width,
          height: part.height,
          quantity: part.quantity,
          canRotate: part.canRotate,
          groupId: `${line.lineId}-${i}`,
          cabinetWidth: build.width,
          cabinetHeight: build.height,
          cabinetSeriesId: build.seriesId,
          cabinetDrawers: build.drawers,
          cabinetLineId: line.lineId,
        });
      });
    }
  }

  const extraBoards = builds.reduce((sum, { build, quantity }) => sum + build.extraBoards * quantity, 0);

  return {
    schemaVersion: CUT_JOB_SCHEMA_VERSION,
    source: 'auto',
    basedOnInputVersion: input.inputVersion,
    computedAt: now().toISOString(),
    cabinets: input.cabinets.map((line) => ({ ...line })),
    hardware: sumHardware(builds),
    cutPlan: cutPlanFrom(optimizeCuts(pieces, input.settings), extraBoards, 0),
    settings: { ...input.settings },
  };
}
