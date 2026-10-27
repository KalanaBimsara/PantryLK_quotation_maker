import { describe, it, expect } from 'vitest';
import {
  buildCabinet,
  drawersAvailable,
  isCabinetSeriesId,
  CABINET_SERIES,
  STANDARD_WIDTHS,
  CabinetBuild,
} from './cabinetSeries';

const sizes = (b: CabinetBuild) => b.parts.map((p) => `${p.key}:${p.width}x${p.height}x${p.quantity}`);
const hw = (b: CabinetBuild) =>
  Object.fromEntries(b.hardware.filter((h) => h.quantity > 0).map((h) => [h.key, h.quantity]));

describe('buildCabinet', () => {
  it('deep 600 matches the source list', () => {
    const b = buildCabinet('deep-560', 600, { drawers: false });
    expect(sizes(b)).toEqual(['bottom:600x560x1', 'shelf:564x550x1', 'side:750x560x2', 'back:750x600x1', 'topRail:564x100x2', 'door:750x600x1']);
    expect(hw(b)).toEqual({ legs: 4, hinges: 2, handles: 1 });
    expect(b.extraBoards).toBe(0);
    expect([b.depth, b.height]).toEqual([560, 750]);
  });

  it('shallow 600 matches the source list', () => {
    const b = buildCabinet('shallow-300', 600, { drawers: false });
    expect(sizes(b)).toEqual(['bottom:300x564x1', 'top:300x564x1', 'shelf:300x564x1', 'side:750x300x2', 'back:750x600x1', 'backSupport:564x100x2', 'door:750x600x1']);
    expect(hw(b)).toEqual({ hinges: 2, handles: 1 });
  });

  it('splits doors above 600', () => {
    expect(sizes(buildCabinet('deep-560', 700, { drawers: false }))).toContain('door:750x350x2');
    expect(hw(buildCabinet('shallow-300', 1200, { drawers: false }))).toEqual({ hinges: 4, handles: 2 });
  });

  it('cuts doors with the 750 height first so their grain runs vertically like the sides', () => {
    const b = buildCabinet('shallow-300', 1200, { drawers: false });
    const door = b.parts.find((p) => p.key === 'door')!;
    const side = b.parts.find((p) => p.key === 'side')!;
    expect([door.width, door.height]).toEqual([750, 600]);
    expect(door.width).toBe(side.width);
  });

  it('drawer variant swaps the door for 3 fronts', () => {
    const b = buildCabinet('deep-560', 900, { drawers: true });
    expect(sizes(b)).toContain('drawerFront:900x250x3');
    expect(b.parts.some((p) => p.key === 'door')).toBe(false);
    expect(hw(b)).toEqual({ legs: 4, handles: 3, drawerRails: 3 });
    expect(b.extraBoards).toBe(1);
  });

  it('limits where drawers are offered', () => {
    expect(drawersAvailable('shallow-300', 600)).toBe(false);
    expect(drawersAvailable('deep-560', 200)).toBe(false);
    expect(drawersAvailable('deep-560', 300)).toBe(true);
    expect(() => buildCabinet('deep-560', 150, { drawers: true })).toThrow();
    expect(() => buildCabinet('shallow-300', 600, { drawers: true })).toThrow();
  });

  it('rejects invalid widths', () => {
    for (const w of [0, -600, NaN]) expect(() => buildCabinet('deep-560', w, { drawers: false })).toThrow();
  });

  it('locks grain only on sides, doors and drawer fronts', () => {
    const locked = new Set(['side', 'door', 'drawerFront']);
    for (const b of [buildCabinet('deep-560', 900, { drawers: true }), buildCabinet('shallow-300', 800, { drawers: false })])
      for (const p of b.parts) expect(p.canRotate).toBe(!locked.has(p.key));
  });

  it('builds every standard width with positive sizes', () => {
    for (const s of CABINET_SERIES)
      for (const w of STANDARD_WIDTHS)
        for (const p of buildCabinet(s.id, w, { drawers: false }).parts)
          expect(Math.min(p.width, p.height, p.quantity)).toBeGreaterThan(0);
  });
});

describe('isCabinetSeriesId', () => {
  it('recognises series ids', () => {
    expect(isCabinetSeriesId('deep-560')).toBe(true);
    expect(isCabinetSeriesId('base-600')).toBe(false);
  });
});
