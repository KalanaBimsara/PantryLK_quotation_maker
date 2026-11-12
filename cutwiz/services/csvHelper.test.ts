import { describe, it, expect } from 'vitest';
import { buildOptimizationCSV, buildPiecesListCSV, parsePiecesCSV } from './csvHelper';
import { planByMaterial } from './materialPlan';
import { DEFAULT_SETTINGS } from './storage';
import { MaterialId, Piece } from '../types';

const pc = (id: string, width: number, height: number, material?: MaterialId): Piece => ({
  id, name: id, width, height, quantity: 1, canRotate: true, ...(material ? { material } : {}),
});

describe('CSV export', () => {
  it('writes English CSV headers', () => {
    expect(buildOptimizationCSV([]).split('\n')[0]).toBe(
      'Board type,Board,Part,Description,Width (mm),Height (mm),X (mm),Y (mm),Rotated 90°,Color');
  });

  it('exports the plan with the board type first and board numbers restarting per type', () => {
    const plans = planByMaterial([pc('s', 750, 560), pc('d', 750, 450, 'agt')], DEFAULT_SETTINGS);
    const lines = buildOptimizationCSV(plans).trim().split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1].startsWith('Carcass,1,s,')).toBe(true);
    expect(lines[2].startsWith('AGT,1,d,')).toBe(true);
  });

  it('writes the board type in the parts list and reads it back', () => {
    const csv = buildPiecesListCSV([
      { id: '1', name: 'Door', width: 750, height: 450, quantity: 2, canRotate: false, material: 'agt' },
      { id: '2', name: 'Side', width: 750, height: 560, quantity: 2, canRotate: false },
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Name,Width (mm),Height (mm),Quantity,Can rotate,Board type');
    expect(lines[1]).toBe('"Door",750,450,2,NO,AGT');
    expect(lines[2]).toBe('"Side",750,560,2,NO,Carcass');
    expect(parsePiecesCSV(csv).map((p) => p.material ?? 'carcass')).toEqual(['agt', 'carcass']);
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

  it('reads a loosely written board type and never drops the row', () => {
    const rows = parsePiecesCSV('Ancho;Alto;Cantidad;Nombre;Tablero\n600;400;1;A;hmr \n600;400;1;B;Agt\n600;400;1;C;oak\n600;400;1;D;');
    expect(rows.map((p) => p.name)).toEqual(['A', 'B', 'C', 'D']);
    expect(rows.map((p) => p.material)).toEqual(['hmr', 'agt', undefined, undefined]);
    expect(parsePiecesCSV('Width,Height,Qty,Name,Material\n600,400,1,A,HMR')[0].material).toBe('hmr');
  });

  it('imports a file without the column onto carcass', () => {
    expect(parsePiecesCSV('Width,Height\n600,400')[0].material).toBeUndefined();
  });
});
