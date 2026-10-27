import { describe, it, expect } from 'vitest';
import { createCabinetGroups, countExtraBoards, clampCabinetQuantity, MAX_CABINET_QUANTITY } from './cabinetPieces';
import { Piece } from '../types';

type Params = Parameters<typeof createCabinetGroups>[0];
const make = (o: Partial<Params> = {}) =>
  createCabinetGroups({
    seriesId: 'deep-560', width: 900, drawers: true, quantity: 2,
    groupName: 'Deep base 900 + drawers', partName: (k) => k, ...o,
  });

describe('createCabinetGroups', () => {
  it('creates one group per cabinet with cabinet metadata on every piece', () => {
    const pieces = make();
    expect(new Set(pieces.map((p) => p.groupId)).size).toBe(2);
    expect(pieces.every((p) =>
      p.cabinetSeriesId === 'deep-560' && p.cabinetDrawers === true && p.cabinetWidth === 900 &&
      p.cabinetHeight === 750 && p.groupName === 'Deep base 900 + drawers')).toBe(true);
    expect(pieces.find((p) => p.name === 'drawerFront')).toMatchObject({ width: 900, height: 250, quantity: 3, canRotate: false });
  });

  it('gives every piece and group a distinct id', () => {
    const pieces = [...make({ quantity: 3 }), ...make({ quantity: 3 })];
    expect(new Set(pieces.map((p) => p.id)).size).toBe(pieces.length);
    expect(new Set(pieces.map((p) => p.groupId)).size).toBe(6);
  });
});

describe('clampCabinetQuantity', () => {
  it('clamps quantity', () => {
    expect([NaN, 0, -3, 2.7, 1000].map(clampCabinetQuantity)).toEqual([1, 1, 1, 2, MAX_CABINET_QUANTITY]);
  });
});

describe('countExtraBoards', () => {
  it('counts one extra board per drawer cabinet group', () => {
    expect(countExtraBoards(make())).toBe(2);
    expect(countExtraBoards(make({ drawers: false }))).toBe(0);
  });

  it('still counts a drawer group once after most of its pieces are removed', () => {
    const one = make({ quantity: 1 });
    expect(countExtraBoards([one[0]])).toBe(1);
  });

  it('ignores legacy and invalid cabinet groups without throwing', () => {
    const legacy: Piece = { id: 'x', width: 600, height: 750, quantity: 1, canRotate: true, groupId: 'old', groupName: 'Standard Base 600', cabinetWidth: 600, cabinetHeight: 750 };
    const invalid: Piece = { ...legacy, id: 'y', groupId: 'bad', cabinetSeriesId: 'shallow-300', cabinetDrawers: true };
    expect(countExtraBoards([legacy, invalid])).toBe(0);
  });
});
