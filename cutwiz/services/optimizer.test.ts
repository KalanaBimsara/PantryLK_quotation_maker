import { describe, it, expect } from 'vitest';
import { optimizeCuts } from './optimizer';
import { DEFAULT_SETTINGS } from './storage';

describe('optimizeCuts', () => {
  it('reports a part larger than the board as unplaced instead of dropping it', () => {
    const result = optimizeCuts(
      [
        { id: 'back', name: 'Back', width: 2400, height: 2400, quantity: 1, canRotate: true },
        { id: 'ok', width: 600, height: 400, quantity: 1, canRotate: true },
      ],
      { ...DEFAULT_SETTINGS, boardWidth: 2440, boardHeight: 1220, kerf: 3, trimMargin: 0, enableTrimMargin: false }
    );
    expect(result.unplacedPieces.map((p) => p.id)).toEqual(['back']);
    expect(result.boards.flatMap((b) => b.placedPieces).map((p) => p.originalId)).toEqual(['ok']);
  });
});
