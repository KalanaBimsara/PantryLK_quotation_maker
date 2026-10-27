import { describe, it, expect } from 'vitest';
import { buildOptimizationCSV, buildPiecesListCSV, parsePiecesCSV } from './csvHelper';
import { Piece } from '../types';

describe('CSV export', () => {
  it('writes English CSV headers', () => {
    const csv = buildOptimizationCSV({
      boards: [], totalBoards: 0, totalEfficiency: 0, totalWaste: 0, unplacedPieces: [],
      strategyUsed: 'none', strategyLabel: '', totalLinearCuts: 0, totalPartsCount: 0,
    });
    expect(csv.split('\n')[0]).toBe('Board,Part,Description,Width (mm),Height (mm),X (mm),Y (mm),Rotated 90°,Color');
  });

  it('round-trips an exported parts list through import', () => {
    const pieces: Piece[] = [
      { id: 'a', name: 'Door', width: 750, height: 600, quantity: 2, canRotate: false },
      { id: 'b', name: 'Shelf', width: 564, height: 550, quantity: 1, canRotate: true },
    ];
    const back = parsePiecesCSV(buildPiecesListCSV(pieces));
    expect(back.map(({ name, width, height, quantity, canRotate }) => ({ name, width, height, quantity, canRotate }))).toEqual(
      pieces.map(({ name, width, height, quantity, canRotate }) => ({ name, width, height, quantity, canRotate })));
  });
});

describe('CSV import', () => {
  it('names unnamed imported parts "Part N"', () => {
    expect(parsePiecesCSV('width,height,qty\n600,400,2').map((p) => p.name)).toEqual(['Part 1']);
  });

  it('keeps fractional sizes (half-mm doors, thirds) on import', () => {
    expect(parsePiecesCSV('width,height,qty\n450.5,750,2\n820,283.3,3').map((p) => [p.width, p.height])).toEqual([[450.5, 750], [820, 283.3]]);
  });

  it('still imports Spanish headers', () => {
    expect(parsePiecesCSV('ancho;alto;cantidad;nombre\n600;400;2;Puerta')[0]).toMatchObject({ width: 600, height: 400, quantity: 2, name: 'Puerta' });
  });
});
