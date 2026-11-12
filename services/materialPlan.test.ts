import { describe, it, expect } from 'vitest';
import { boardKey, boardsCost, boardsToBuy, planByMaterial, summarizePlans } from './materialPlan';
import { DEFAULT_SETTINGS } from './storage';
import { MaterialId, Piece } from '../types';

const S = { ...DEFAULT_SETTINGS, kerf: 3 };
const pc = (id: string, width: number, height: number, material?: MaterialId, quantity = 1): Piece => ({
  id, name: id, width, height, quantity, canRotate: true, ...(material ? { material } : {}),
});

describe('planByMaterial', () => {
  it('plans each used material on its own sheet, in order', () => {
    const plans = planByMaterial(
      [pc('d', 750, 450, 'agt'), pc('s', 750, 560), pc('b', 750, 600, 'hmr')],
      { ...S, agtWidth: 2745, agtHeight: 1830 }
    );
    expect(plans.map((p) => p.material)).toEqual(['carcass', 'agt', 'hmr']);
    expect(plans[1]).toMatchObject({ boardWidth: 2745, boardHeight: 1830 });
    expect(plans[1].result.boards[0]).toMatchObject({ width: 2745, height: 1830 });
    expect(plans.every((p) => p.result.totalBoards === 1)).toBe(true);
  });

  it('leaves out a material with no parts', () => {
    expect(planByMaterial([pc('s', 750, 560)], S).map((p) => p.material)).toEqual(['carcass']);
    expect(planByMaterial([], S)).toEqual([]);
  });

  it('fits a tall door on 9×6 that does not fit on 8×4', () => {
    const door = { ...pc('d', 2600, 450, 'agt'), canRotate: false };
    expect(summarizePlans(planByMaterial([door], S)).unplaced).toEqual([
      { piece: expect.objectContaining({ id: 'd' }), material: 'agt' },
    ]);
    expect(summarizePlans(planByMaterial([door], { ...S, agtWidth: 2745, agtHeight: 1830 })).unplaced).toEqual([]);
  });

  it('does not crash on a zero sheet size', () => {
    const totals = summarizePlans(planByMaterial([pc('b', 750, 600, 'hmr')], { ...S, hmrWidth: 0 }));
    expect(totals.unplaced).toHaveLength(1);
    expect(totals.totalBoards).toBe(0);
    expect(totals.efficiency).toBe(0);
  });
});

describe('summarizePlans', () => {
  it('adds totals across materials and skips edge banding on HMR', () => {
    const plans = planByMaterial([pc('s', 1000, 500), pc('b', 1000, 500, 'hmr')], S);
    const totals = summarizePlans(plans);
    expect(totals.totalBoards).toBe(2);
    expect(totals.totalParts).toBe(2);
    expect(totals.edgeBandMeters).toBeCloseTo(3);
    expect(totals.efficiency).toBeCloseTo(plans[0].result.totalEfficiency);
    expect(totals.waste).toBeCloseTo(100 - totals.efficiency);
  });

  it('weights yield by sheet area', () => {
    // La misma pieza ocupa menos de una hoja 9×6 que de una 8×4
    const plans = planByMaterial([pc('s', 1000, 500), pc('d', 1000, 500, 'agt')], { ...S, agtWidth: 2745, agtHeight: 1830 });
    const [carcass, agt] = plans.map((p) => p.result.totalEfficiency);
    const areaC = 2440 * 1220;
    const areaA = 2745 * 1830;
    expect(summarizePlans(plans).efficiency).toBeCloseTo((carcass * areaC + agt * areaA) / (areaC + areaA));
  });

  it('is all zeros for no plans', () => {
    expect(summarizePlans([])).toEqual({
      totalBoards: 0, totalParts: 0, efficiency: 0, waste: 0, linearCuts: 0, usefulOffcuts: 0, edgeBandMeters: 0, unplaced: [],
    });
  });
});

describe('boardsToBuy', () => {
  it('lists what to buy and what it costs', () => {
    const plans = planByMaterial([pc('s', 750, 560), pc('d', 750, 450, 'agt')], S);
    const rows = boardsToBuy(plans, S, 2);
    expect(rows).toEqual([
      { material: 'carcass', boardWidth: 2440, boardHeight: 1220, cut: 1, extra: 2, total: 3 },
      { material: 'agt', boardWidth: 2440, boardHeight: 1220, cut: 1, extra: 0, total: 1 },
    ]);
    expect(boardsCost(rows, { ...S, boardPrice: 9000, agtPrice: 30000 })).toBe(57000);
  });

  it('keeps a carcass row for drawer sheets when no part is on carcass', () => {
    const rows = boardsToBuy(planByMaterial([pc('d', 750, 450, 'agt')], S), S, 1);
    expect(rows[0]).toEqual({ material: 'carcass', boardWidth: 2440, boardHeight: 1220, cut: 0, extra: 1, total: 1 });
    expect(rows.map((r) => r.material)).toEqual(['carcass', 'agt']);
  });

  it('drops a board type whose parts all failed to fit', () => {
    const rows = boardsToBuy(planByMaterial([pc('b', 750, 600, 'hmr')], { ...S, hmrWidth: 0 }), S, 0);
    expect(rows).toEqual([]);
  });
});

describe('boardKey', () => {
  it('is unique across board types', () => {
    expect(boardKey('agt', 1)).toBe('agt-1');
    expect(boardKey('carcass', 1)).not.toBe(boardKey('agt', 1));
  });
});
