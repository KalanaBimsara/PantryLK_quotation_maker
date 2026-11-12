import { describe, it, expect } from 'vitest';
import {
  buildCabinet,
  tryBuildCabinet,
  drawersAvailable,
  validateCabinetSize,
  standardSize,
  isStandardSize,
  isCabinetSeriesId,
  CABINET_SERIES,
  STANDARD_WIDTHS,
  MATERIAL_THICKNESS,
  CabinetBuild,
} from './cabinetSeries';

const sizes = (b: CabinetBuild) => b.parts.map((p) => `${p.key}:${p.width}x${p.height}x${p.quantity}`);
const hw = (b: CabinetBuild) =>
  Object.fromEntries(b.hardware.filter((h) => h.quantity > 0).map((h) => [h.key, h.quantity]));
const deep = (w: number) => standardSize('deep-560', w);
const shallow = (w: number) => standardSize('shallow-300', w);

describe('buildCabinet at standard sizes', () => {
  it('deep 600 matches the source list', () => {
    const b = buildCabinet('deep-560', deep(600), { drawers: false });
    expect(sizes(b)).toEqual(['bottom:600x560x1', 'shelf:564x550x1', 'side:750x560x2', 'back:750x600x1', 'topRail:564x100x2', 'door:750x600x1']);
    expect(hw(b)).toEqual({ legs: 4, hinges: 2, handles: 1 });
    expect(b.extraBoards).toBe(0);
    expect([b.depth, b.height]).toEqual([560, 750]);
  });

  it('shallow 600 matches the source list', () => {
    const b = buildCabinet('shallow-300', shallow(600), { drawers: false });
    expect(sizes(b)).toEqual(['bottom:300x564x1', 'top:300x564x1', 'shelf:300x564x1', 'side:750x300x2', 'back:750x600x1', 'backSupport:564x100x2', 'door:750x600x1']);
    expect(hw(b)).toEqual({ hinges: 2, handles: 1 });
  });

  it('splits doors above 600', () => {
    expect(sizes(buildCabinet('deep-560', deep(700), { drawers: false }))).toContain('door:750x350x2');
    expect(hw(buildCabinet('shallow-300', shallow(1200), { drawers: false }))).toEqual({ hinges: 4, handles: 2 });
  });

  it('cuts doors with the height first so their grain runs vertically like the sides', () => {
    const b = buildCabinet('shallow-300', shallow(1200), { drawers: false });
    const door = b.parts.find((p) => p.key === 'door')!;
    const side = b.parts.find((p) => p.key === 'side')!;
    expect([door.width, door.height]).toEqual([750, 600]);
    expect(door.width).toBe(side.width);
  });

  it('drawer variant swaps the door for 3 fronts', () => {
    const b = buildCabinet('deep-560', deep(900), { drawers: true });
    expect(sizes(b)).toContain('drawerFront:900x250x3');
    expect(b.parts.some((p) => p.key === 'door')).toBe(false);
    expect(hw(b)).toEqual({ legs: 4, handles: 3, drawerRails: 3 });
    expect(b.extraBoards).toBe(1);
  });

  it('limits where drawers are offered', () => {
    expect(drawersAvailable('shallow-300', shallow(600))).toBe(false);
    expect(drawersAvailable('deep-560', deep(200))).toBe(false);
    expect(drawersAvailable('deep-560', deep(300))).toBe(true);
    expect(() => buildCabinet('deep-560', deep(150), { drawers: true })).toThrow();
    expect(() => buildCabinet('shallow-300', shallow(600), { drawers: true })).toThrow();
  });

  it('rejects invalid widths', () => {
    for (const w of [0, -600, NaN, 36, Infinity]) expect(() => buildCabinet('deep-560', deep(w), { drawers: false })).toThrow();
  });

  it('locks grain only on sides, doors and drawer fronts', () => {
    const locked = new Set(['side', 'door', 'drawerFront']);
    for (const b of [buildCabinet('deep-560', deep(900), { drawers: true }), buildCabinet('shallow-300', shallow(800), { drawers: false })])
      for (const p of b.parts) expect(p.canRotate).toBe(!locked.has(p.key));
  });

  it('builds every standard width with positive sizes', () => {
    for (const s of CABINET_SERIES)
      for (const w of STANDARD_WIDTHS)
        for (const p of buildCabinet(s.id, standardSize(s.id, w), { drawers: false }).parts)
          expect(Math.min(p.width, p.height, p.quantity)).toBeGreaterThan(0);
  });
});

describe('buildCabinet at custom sizes', () => {
  it('builds a custom deep cabinet with drawers from W x H x D', () => {
    const b = buildCabinet('deep-560', { width: 820, height: 850, depth: 580 }, { drawers: true });
    expect(sizes(b).slice(0, 5)).toEqual(['bottom:820x580x1', 'shelf:784x570x1', 'side:850x580x2', 'back:850x820x1', 'topRail:784x100x2']);
    const front = b.parts.find((p) => p.key === 'drawerFront')!;
    expect(front.width).toBe(820);
    expect(front.height).toBeCloseTo(283.333, 2);
    expect(front.quantity).toBe(3);
    expect(b.depth).toBe(580);
  });

  it('uses custom height and depth in the shallow series', () => {
    expect(sizes(buildCabinet('shallow-300', { width: 500, height: 900, depth: 350 }, { drawers: false }))).toEqual(
      ['bottom:350x464x1', 'top:350x464x1', 'shelf:350x464x1', 'side:900x350x2', 'back:900x500x1', 'backSupport:464x100x2', 'door:900x500x1']);
  });

  it('keeps half-millimetre doors for odd widths over 600', () => {
    expect(sizes(buildCabinet('deep-560', { width: 901, height: 750, depth: 560 }, { drawers: false }))).toContain('door:750x450.5x2');
  });

  it('validates sizes per field', () => {
    expect(validateCabinetSize({ width: 100, height: 300, depth: 150 })).toEqual([]);
    expect(validateCabinetSize({ width: 2400, height: 2400, depth: 1200 })).toEqual([]);
    expect(validateCabinetSize({ width: 99, height: 2401, depth: 1200.5 }).map((p) => p.field)).toEqual(['width', 'height', 'depth']);
    expect(validateCabinetSize({ width: NaN, height: 750, depth: 560 })).toEqual([{ field: 'width', min: 100, max: 2400 }]);
  });

  it('needs W >= 300 and H >= 450 for drawers', () => {
    expect(drawersAvailable('deep-560', { width: 300, height: 450, depth: 560 })).toBe(true);
    expect(drawersAvailable('deep-560', { width: 300, height: 449, depth: 560 })).toBe(false);
    expect(drawersAvailable('deep-560', { width: 299, height: 750, depth: 560 })).toBe(false);
    expect(drawersAvailable('shallow-300', { width: 900, height: 750, depth: 300 })).toBe(false);
  });

  it('throws from buildCabinet but returns null from tryBuildCabinet for invalid input', () => {
    const bad = { width: 8, height: 750, depth: 560 };
    expect(() => buildCabinet('deep-560', bad, { drawers: false })).toThrow();
    expect(tryBuildCabinet('deep-560', bad, { drawers: false })).toBeNull();
    expect(tryBuildCabinet('deep-560', { width: 600, height: 400, depth: 560 }, { drawers: true })).toBeNull();
    expect(tryBuildCabinet('deep-560', deep(600), { drawers: false })).not.toBeNull();
  });

  it('recognises standard sizes', () => {
    expect(isStandardSize('deep-560', { width: 900, height: 750, depth: 560 })).toBe(true);
    expect(isStandardSize('deep-560', { width: 900, height: 750, depth: 580 })).toBe(false);
    expect(isStandardSize('shallow-300', { width: 750, height: 750, depth: 300 })).toBe(false);
  });
});

describe('isCabinetSeriesId', () => {
  it('recognises series ids', () => {
    expect(isCabinetSeriesId('deep-560')).toBe(true);
    expect(isCabinetSeriesId('base-600')).toBe(false);
  });
});

describe('part materials', () => {
  const byKey = (b: CabinetBuild) => Object.fromEntries(b.parts.map((p) => [p.key, p.material]));

  it('puts doors and drawer fronts on AGT, backs on HMR and the rest on carcass', () => {
    expect(byKey(buildCabinet('deep-560', deep(600), { drawers: false }))).toEqual({
      bottom: 'carcass', shelf: 'carcass', side: 'carcass', back: 'hmr', topRail: 'carcass', door: 'agt',
    });
    expect(byKey(buildCabinet('deep-560', deep(900), { drawers: true })).drawerFront).toBe('agt');
    expect(byKey(buildCabinet('shallow-300', shallow(600), { drawers: false }))).toEqual({
      bottom: 'carcass', top: 'carcass', shelf: 'carcass', side: 'carcass', back: 'hmr', backSupport: 'carcass', door: 'agt',
    });
  });

  it('knows each material thickness', () => {
    expect(MATERIAL_THICKNESS).toEqual({ carcass: 18, agt: 18, hmr: 6 });
  });
});
