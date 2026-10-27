// Pantry LK standard cabinet series. Plain TypeScript with no app imports, so the
// quotation maker and 3D planner can share it unchanged.
// Sizes are width × height in mm; boards are 18 mm, so the inside width is W − 36.
// Custom widths are allowed in whole mm from MIN_CABINET_WIDTH to MAX_CABINET_WIDTH.

export type CabinetSeriesId = 'deep-560' | 'shallow-300';

export const STANDARD_WIDTHS: readonly number[] = [150, 200, 300, 400, 450, 500, 600, 700, 800, 900, 1000, 1200];

export const MIN_CABINET_WIDTH = 150;
export const MAX_CABINET_WIDTH = 1200;

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

const BOARD_THICKNESS = 18;
const CABINET_HEIGHT = 750;
const MAX_SINGLE_DOOR_WIDTH = 600;
const MIN_DRAWER_WIDTH = 300;
const DRAWER_COUNT = 3;

// Visible faces keep their grain direction; hidden parts may be rotated by the optimizer.
const GRAIN_LOCKED: ReadonlySet<CabinetPartKey> = new Set(['side', 'door', 'drawerFront']);

export const CABINET_SERIES: readonly { id: CabinetSeriesId; depth: number; height: number; supportsDrawers: boolean }[] = [
  { id: 'deep-560', depth: 560, height: CABINET_HEIGHT, supportsDrawers: true },
  { id: 'shallow-300', depth: 300, height: CABINET_HEIGHT, supportsDrawers: false },
];

const part = (key: CabinetPartKey, width: number, height: number, quantity = 1): CabinetPart => ({
  key,
  width,
  height,
  quantity,
  canRotate: !GRAIN_LOCKED.has(key),
});

const bodies: Record<CabinetSeriesId, (w: number) => { parts: CabinetPart[]; hardware: HardwareItem[] }> = {
  'deep-560': (w) => {
    const inner = w - 2 * BOARD_THICKNESS;
    return {
      parts: [
        part('bottom', w, 560),
        part('shelf', inner, 550),
        part('side', CABINET_HEIGHT, 560, 2),
        part('back', CABINET_HEIGHT, w),
        part('topRail', inner, 100, 2),
      ],
      hardware: [{ key: 'legs', quantity: 4 }],
    };
  },
  'shallow-300': (w) => {
    const inner = w - 2 * BOARD_THICKNESS;
    return {
      parts: [
        part('bottom', 300, inner),
        part('top', 300, inner),
        part('shelf', 300, inner),
        part('side', CABINET_HEIGHT, 300, 2),
        part('back', CABINET_HEIGHT, w),
        part('backSupport', inner, 100, 2),
      ],
      hardware: [],
    };
  },
};

const fronts = (w: number, drawers: boolean): { parts: CabinetPart[]; hardware: HardwareItem[] } => {
  if (drawers) {
    return {
      parts: [part('drawerFront', w, CABINET_HEIGHT / DRAWER_COUNT, DRAWER_COUNT)],
      hardware: [
        { key: 'handles', quantity: DRAWER_COUNT },
        { key: 'drawerRails', quantity: DRAWER_COUNT },
      ],
    };
  }
  const doors = w > MAX_SINGLE_DOOR_WIDTH ? 2 : 1;
  return {
    parts: [part('door', w / doors, CABINET_HEIGHT, doors)],
    hardware: [
      { key: 'hinges', quantity: 2 * doors },
      { key: 'handles', quantity: doors },
    ],
  };
};

export function isCabinetSeriesId(value: unknown): value is CabinetSeriesId {
  return CABINET_SERIES.some((s) => s.id === value);
}

export function isValidCabinetWidth(width: number): boolean {
  return Number.isInteger(width) && width >= MIN_CABINET_WIDTH && width <= MAX_CABINET_WIDTH;
}

export function drawersAvailable(seriesId: CabinetSeriesId, width: number): boolean {
  const series = CABINET_SERIES.find((s) => s.id === seriesId);
  return !!series && series.supportsDrawers && width >= MIN_DRAWER_WIDTH;
}

export function buildCabinet(seriesId: CabinetSeriesId, width: number, opts: { drawers: boolean }): CabinetBuild {
  const series = CABINET_SERIES.find((s) => s.id === seriesId);
  if (!series) throw new Error(`Unknown cabinet series: ${seriesId}`);
  if (!isValidCabinetWidth(width)) throw new Error(`Invalid cabinet width: ${width}`);
  if (opts.drawers && !drawersAvailable(seriesId, width)) {
    throw new Error(`Drawers are not available for ${seriesId} at ${width} mm`);
  }

  const body = bodies[seriesId](width);
  const front = fronts(width, opts.drawers);

  return {
    seriesId,
    width,
    depth: series.depth,
    height: series.height,
    drawers: opts.drawers,
    parts: [...body.parts, ...front.parts],
    hardware: [...body.hardware, ...front.hardware],
    extraBoards: opts.drawers ? 1 : 0,
  };
}
