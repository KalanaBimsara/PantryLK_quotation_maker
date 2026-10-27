import { describe, it, expect } from 'vitest';
import { optimizeCuts, DEFAULT_CUT_SETTINGS } from './optimizer.js';

describe('optimizeCuts', () => {
  it('places a grain-locked part without rotating it and counts boards', () => {
    const r = optimizeCuts([{ id: 'a', width: 750, height: 560, quantity: 2, canRotate: false }], DEFAULT_CUT_SETTINGS);
    expect(r.totalBoards).toBe(1);
    expect(r.totalPartsCount).toBe(2);
    expect(r.unplacedPieces).toHaveLength(0);
    expect(r.boards[0].placedPieces.every((p) => !p.isRotated)).toBe(true);
  });

  it('returns an empty result for no valid pieces', () => {
    expect(optimizeCuts([], DEFAULT_CUT_SETTINGS)).toMatchObject({ totalBoards: 0, totalPartsCount: 0, strategyUsed: 'none' });
  });
});
