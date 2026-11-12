import { describe, it, expect } from 'vitest';
import { groupPieces } from './cutList';
import { Piece } from '../types';

const cab = (groupId: string, name: string, extra: Partial<Piece> = {}): Piece => ({
  id: `${groupId}-${name}`, width: 1, height: 1, quantity: 1, canRotate: true,
  groupId, groupName: name, cabinetSeriesId: 'deep-560', ...extra,
});

describe('groupPieces', () => {
  it('splits groups from loose parts in first-seen order', () => {
    const loose: Piece = { id: 'l1', width: 5, height: 5, quantity: 1, canRotate: true };
    const r = groupPieces([cab('b', 'B'), loose, cab('a', 'A'), cab('b', 'B', { id: 'b2' })]);
    expect(r.groups.map((g) => [g.groupId, g.name, g.pieces.length])).toEqual([['b', 'B', 2], ['a', 'A', 1]]);
    expect(r.groups.every((g) => g.isCabinet)).toBe(true);
    expect(r.loose).toEqual([loose]);
  });

  it('marks template groups without cabinet data as non-cabinet groups', () => {
    const r = groupPieces([{ id: 't1', width: 1, height: 1, quantity: 1, canRotate: true, groupId: 'tpl', groupName: 'Kitchen A' }]);
    expect(r.groups[0]).toMatchObject({ groupId: 'tpl', name: 'Kitchen A', isCabinet: false });
  });

  it('returns nothing for an empty list', () => {
    expect(groupPieces([])).toEqual({ groups: [], loose: [] });
  });
});
