// Pantry LK standard cabinet series. Plain TypeScript with no app imports, so the
// quotation maker and 3D planner can share it unchanged.
// Sizes are width × height in mm; boards are 18 mm, so the inside width is W − 36.
// Cabinets take a W × H × D size; the standard presets fill in height 750 and the series depth.

export type CabinetSeriesId = 'deep-560' | 'shallow-300';

export const STANDARD_WIDTHS: readonly number[] = [150, 200, 300, 400, 450, 500, 600, 700, 800, 900, 1000, 1200];

export type CabinetPartKey =
  | 'bottom'
  | 'top'
  | 'shelf'
  | 'side'
  | 'back'
  | 'topRail'
  | 'backSupport'
  | 'door'
  | 'drawerFront';

export type HardwareKey = 'legs' | 'hinges' | 'handles' | 'drawerRails';

export interface CabinetPart {
  key: CabinetPartKey;
  width: number;
  height: number;
  quantity: number;
  canRotate: boolean;
}

export interface HardwareItem {
  key: HardwareKey;
  quantity: number;
}

export interface CabinetBuild {
  seriesId: CabinetSeriesId;
  width: number;
  depth: number;
  height: number;
  drawers: boolean;
  parts: CabinetPart[];
  hardware: HardwareItem[];
  extraBoards: number;
}

// Cabinet size in mm. Standard presets only fill in the defaults.
export interface CabinetSize {
  width: number;
  height: number;
  depth: number;
}

export const STANDARD_HEIGHT = 750;

export const SIZE_LIMITS: Readonly<Record<keyof CabinetSize, readonly [number, number]>> = {
  width: [100, 2400],
  height: [300, 2400],
  depth: [150, 1200],
};

export interface SizeProblem {
  field: keyof CabinetSize;
  min: number;
  max: number;
}

const BOARD_THICKNESS = 18;
const RAIL_HEIGHT = 100;
const MAX_SINGLE_DOOR_WIDTH = 600;
const MIN_DRAWER_WIDTH = 300;
const MIN_DRAWER_HEIGHT = 450;
const DRAWER_COUNT = 3;

// Visible faces keep their grain direction; hidden parts may be rotated by the optimizer.
const GRAIN_LOCKED: ReadonlySet<CabinetPartKey> = new Set(['side', 'door', 'drawerFront']);

// `depth` is the series' default depth; custom sizes may override it.
export const CABINET_SERIES: readonly { id: CabinetSeriesId; depth: number; height: number; supportsDrawers: boolean }[] = [
  { id: 'deep-560', depth: 560, height: STANDARD_HEIGHT, supportsDrawers: true },
  { id: 'shallow-300', depth: 300, height: STANDARD_HEIGHT, supportsDrawers: false },
];

const part = (key: CabinetPartKey, width: number, height: number, quantity = 1): CabinetPart => ({
  key,
  width,
  height,
  quantity,
  canRotate: !GRAIN_LOCKED.has(key),
});

const bodies: Record<CabinetSeriesId, (s: CabinetSize) => { parts: CabinetPart[]; hardware: HardwareItem[] }> = {
  'deep-560': ({ width: w, height: h, depth: d }) => {
    const inner = w - 2 * BOARD_THICKNESS;
    return {
      parts: [
        part('bottom', w, d),
        part('shelf', inner, d - 10),
        part('side', h, d, 2),
        part('back', h, w),
        part('topRail', inner, RAIL_HEIGHT, 2),
      ],
      hardware: [{ key: 'legs', quantity: 4 }],
    };
  },
  'shallow-300': ({ width: w, height: h, depth: d }) => {
    const inner = w - 2 * BOARD_THICKNESS;
    return {
      parts: [
        part('bottom', d, inner),
        part('top', d, inner),
        part('shelf', d, inner),
        part('side', h, d, 2),
        part('back', h, w),
        part('backSupport', inner, RAIL_HEIGHT, 2),
      ],
      hardware: [],
    };
  },
};

const fronts = ({ width: w, height: h }: CabinetSize, drawers: boolean): { parts: CabinetPart[]; hardware: HardwareItem[] } => {
  if (drawers) {
    return {
      parts: [part('drawerFront', w, h / DRAWER_COUNT, DRAWER_COUNT)],
      hardware: [
        { key: 'handles', quantity: DRAWER_COUNT },
        { key: 'drawerRails', quantity: DRAWER_COUNT },
      ],
    };
  }
  const doors = w > MAX_SINGLE_DOOR_WIDTH ? 2 : 1;
  return {
    // Height first, like the sides: grain-locked parts keep their first size along the board's grain
    parts: [part('door', h, w / doors, doors)],
    hardware: [
      { key: 'hinges', quantity: 2 * doors },
      { key: 'handles', quantity: doors },
    ],
  };
};

export function isCabinetSeriesId(value: unknown): value is CabinetSeriesId {
  return CABINET_SERIES.some((s) => s.id === value);
}

export function validateCabinetSize(size: CabinetSize): SizeProblem[] {
  const problems: SizeProblem[] = [];
  for (const field of ['width', 'height', 'depth'] as const) {
    const [min, max] = SIZE_LIMITS[field];
    const value = size[field];
    if (!Number.isInteger(value) || value < min || value > max) problems.push({ field, min, max });
  }
  return problems;
}

export function standardSize(seriesId: CabinetSeriesId, width: number): CabinetSize {
  const series = CABINET_SERIES.find((s) => s.id === seriesId);
  return { width, height: STANDARD_HEIGHT, depth: series ? series.depth : 0 };
}

export function isStandardSize(seriesId: CabinetSeriesId, size: CabinetSize): boolean {
  const std = standardSize(seriesId, size.width);
  return STANDARD_WIDTHS.includes(size.width) && size.height === std.height && size.depth === std.depth;
}

export function drawersAvailable(seriesId: CabinetSeriesId, size: CabinetSize): boolean {
  const series = CABINET_SERIES.find((s) => s.id === seriesId);
  return !!series && series.supportsDrawers && size.width >= MIN_DRAWER_WIDTH && size.height >= MIN_DRAWER_HEIGHT;
}

export function buildCabinet(seriesId: CabinetSeriesId, size: CabinetSize, opts: { drawers: boolean }): CabinetBuild {
  const series = CABINET_SERIES.find((s) => s.id === seriesId);
  if (!series) throw new Error(`Unknown cabinet series: ${seriesId}`);
  const problems = validateCabinetSize(size);
  if (problems.length > 0) {
    throw new Error(`Invalid cabinet size: ${problems.map((p) => `${p.field} must be ${p.min}-${p.max} mm`).join(', ')}`);
  }
  if (opts.drawers && !drawersAvailable(seriesId, size)) {
    throw new Error(`Drawers are not available for ${seriesId} at ${size.width} × ${size.height} mm`);
  }

  const body = bodies[seriesId](size);
  const front = fronts(size, opts.drawers);

  return {
    seriesId,
    width: size.width,
    depth: size.depth,
    height: size.height,
    drawers: opts.drawers,
    parts: [...body.parts, ...front.parts],
    hardware: [...body.hardware, ...front.hardware],
    extraBoards: opts.drawers ? 1 : 0,
  };
}

// Like buildCabinet, but returns null instead of throwing (for previews of half-typed input).
export function tryBuildCabinet(seriesId: CabinetSeriesId, size: CabinetSize, opts: { drawers: boolean }): CabinetBuild | null {
  try {
    return buildCabinet(seriesId, size, opts);
  } catch {
    return null;
  }
}
