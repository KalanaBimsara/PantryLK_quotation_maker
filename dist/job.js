// Cut job contract shared by the 3D planner, CutWizard and the quotation maker.
// The planner writes a CutJobInput; an estimate or the workshop writes a CutJobResult.
// Parsers whitelist known fields, never coerce types, and name the bad field in the error.
import { buildCabinet, drawersAvailable, isCabinetSeriesId, isValidCabinetWidth } from './cabinet.js';
import { optimizeCuts } from './optimizer.js';
export const CUT_JOB_SCHEMA_VERSION = 1;
export const MAX_LINE_QUANTITY = 50;
// Record so the compiler flags a hardware key added to cabinet.ts but missing here.
const HARDWARE_KEYS = { legs: true, hinges: true, handles: true, drawerRails: true };
const HARDWARE_ORDER = Object.keys(HARDWARE_KEYS);
const CUT_PLAN_FIELDS = [
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
const fail = (path, reason) => {
    throw new Error(`Invalid cut job: ${path} ${reason}`);
};
const obj = (v, path) => typeof v === 'object' && v !== null && !Array.isArray(v) ? v : fail(path, 'must be an object');
const arr = (v, path) => (Array.isArray(v) ? v : fail(path, 'must be an array'));
const str = (v, path) => typeof v === 'string' && v.length > 0 ? v : fail(path, 'must be a non-empty string');
const bool = (v, path) => (typeof v === 'boolean' ? v : fail(path, 'must be true or false'));
const num = (v, path, min, exclusiveMin = false) => typeof v === 'number' && Number.isFinite(v) && (exclusiveMin ? v > min : v >= min)
    ? v
    : fail(path, `must be a number ${exclusiveMin ? '>' : '>='} ${min}`);
const int = (v, path, min, max = Infinity) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max
    ? v
    : fail(path, `must be a whole number from ${min}${max === Infinity ? '' : ` to ${max}`}`);
const schemaVersion = (v, path) => v === CUT_JOB_SCHEMA_VERSION ? CUT_JOB_SCHEMA_VERSION : fail(path, `must be ${CUT_JOB_SCHEMA_VERSION}`);
function parseLine(v, path) {
    const o = obj(v, path);
    const lineId = str(o.lineId, `${path}.lineId`);
    const seriesId = isCabinetSeriesId(o.seriesId) ? o.seriesId : fail(`${path}.seriesId`, 'is not a known series');
    const width = typeof o.width === 'number' && isValidCabinetWidth(o.width)
        ? o.width
        : fail(`${path}.width`, 'must be a whole number of mm from 150 to 1200');
    const drawers = bool(o.drawers, `${path}.drawers`);
    if (drawers && !drawersAvailable(seriesId, width))
        fail(`${path}.drawers`, `are not available for ${seriesId} at ${width} mm`);
    const quantity = int(o.quantity, `${path}.quantity`, 1, MAX_LINE_QUANTITY);
    const line = { lineId, seriesId, width, drawers, quantity };
    if (o.label !== undefined)
        line.label = str(o.label, `${path}.label`);
    return line;
}
function parseLines(v, path) {
    const seen = new Set();
    return arr(v, path).map((item, i) => {
        const line = parseLine(item, `${path}[${i}]`);
        if (seen.has(line.lineId))
            fail(`${path}[${i}].lineId`, `duplicates "${line.lineId}"`);
        seen.add(line.lineId);
        return line;
    });
}
function parseSettings(v, path) {
    const o = obj(v, path);
    return {
        boardWidth: num(o.boardWidth, `${path}.boardWidth`, 0, true),
        boardHeight: num(o.boardHeight, `${path}.boardHeight`, 0, true),
        kerf: num(o.kerf, `${path}.kerf`, 0),
        trimMargin: num(o.trimMargin, `${path}.trimMargin`, 0),
        enableTrimMargin: o.enableTrimMargin === undefined ? false : bool(o.enableTrimMargin, `${path}.enableTrimMargin`),
    };
}
function parseHardware(v, path) {
    return arr(v, path).map((item, i) => {
        const o = obj(item, `${path}[${i}]`);
        const key = typeof o.key === 'string' && Object.hasOwn(HARDWARE_KEYS, o.key)
            ? o.key
            : fail(`${path}[${i}].key`, 'is not a known hardware key');
        return { key, quantity: int(o.quantity, `${path}[${i}].quantity`, 1) };
    });
}
function parseCutPlan(v, path) {
    const o = obj(v, path);
    const plan = {};
    for (const field of CUT_PLAN_FIELDS)
        plan[field] = num(o[field], `${path}.${field}`, 0);
    return plan;
}
export function parseCutJobInput(value) {
    const o = obj(value, 'input');
    return {
        schemaVersion: schemaVersion(o.schemaVersion, 'schemaVersion'),
        jobId: str(o.jobId, 'jobId'),
        inputVersion: int(o.inputVersion, 'inputVersion', 0),
        cabinets: parseLines(o.cabinets, 'cabinets'),
        settings: parseSettings(o.settings, 'settings'),
    };
}
export function parseCutJobResult(value) {
    const o = obj(value, 'result');
    const source = o.source === 'auto' || o.source === 'workshop' ? o.source : fail('source', 'must be "auto" or "workshop"');
    const computedAt = typeof o.computedAt === 'string' && !Number.isNaN(Date.parse(o.computedAt))
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
export function sumHardware(builds) {
    const totals = new Map();
    for (const { build, quantity } of builds)
        for (const item of build.hardware)
            totals.set(item.key, (totals.get(item.key) ?? 0) + item.quantity * quantity);
    return HARDWARE_ORDER.filter((key) => (totals.get(key) ?? 0) > 0).map((key) => ({ key, quantity: totals.get(key) }));
}
export function cutPlanFrom(result, extraBoards, customPieceCount) {
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
// Part names are the part keys; apps that show the pieces translate them.
export function estimateJob(input, now = () => new Date()) {
    const builds = input.cabinets.map((line) => ({
        line,
        build: buildCabinet(line.seriesId, line.width, { drawers: line.drawers }),
        quantity: line.quantity,
    }));
    const pieces = [];
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
