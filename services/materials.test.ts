import { describe, it, expect } from 'vitest';
import { AGT_SIZES, MATERIAL_ORDER, boardFor, materialOf, parseMaterial, sheetLabel } from './materials';
import { DEFAULT_SETTINGS } from './storage';

const S = { ...DEFAULT_SETTINGS, boardPrice: 9000, agtWidth: 2745, agtHeight: 1830, agtPrice: 30000 };

describe('materials', () => {
  it('lists the board types in plan order', () => {
    expect(MATERIAL_ORDER).toEqual(['carcass', 'agt', 'hmr']);
    expect(AGT_SIZES.map((s) => `${s.id}:${s.width}x${s.height}`)).toEqual(['8x4:2440x1220', '9x6:2745x1830']);
  });

  it('reads the board for each material', () => {
    expect(boardFor(S, 'carcass')).toEqual({ width: 2440, height: 1220, price: 9000 });
    expect(boardFor(S, 'agt')).toEqual({ width: 2745, height: 1830, price: 30000 });
    expect(boardFor(S, 'hmr')).toEqual({ width: 2440, height: 1220, price: 0 });
  });

  it('falls back to carcass for a missing or unknown material', () => {
    expect(materialOf({})).toBe('carcass');
    expect(materialOf({ material: 'plywood' })).toBe('carcass');
    expect(materialOf({ material: 'hmr' })).toBe('hmr');
  });

  it('parses loose material text', () => {
    expect(parseMaterial(' Agt ')).toBe('agt');
    expect(parseMaterial('HMR')).toBe('hmr');
    expect(parseMaterial('Carcass')).toBe('carcass');
    expect(parseMaterial('oak')).toBeUndefined();
    expect(parseMaterial(undefined)).toBeUndefined();
  });

  it('labels the two standard sheets, within 3 mm', () => {
    expect(sheetLabel(2440, 1220)).toBe('8×4 ft');
    expect(sheetLabel(2438.4, 1219.2)).toBe('8×4 ft');
    expect(sheetLabel(2745, 1830)).toBe('9×6 ft');
    expect(sheetLabel(2000, 1000)).toBeNull();
  });
});
