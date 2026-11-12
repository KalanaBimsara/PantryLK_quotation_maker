import { describe, it, expect } from 'vitest';
import { templatePiecesFrom, piecesFromTemplate } from './templatePieces';
import { createCabinetGroups, countExtraBoards } from './cabinetPieces';
import { Template } from '../types';

const drawerCabinets = () =>
  createCabinetGroups({
    seriesId: 'deep-560', size: { width: 900, height: 750, depth: 560 }, drawers: true, quantity: 2,
    groupName: 'Deep base 900 + drawers', partName: (k) => k,
  });

describe('template round trip', () => {
  it('keeps drawer boards and one group per cabinet after save and load', () => {
    const original = drawerCabinets();
    const template: Template = { id: 'u1', name: 'Kitchen A', pieces: templatePiecesFrom(original) };
    const loaded = piecesFromTemplate(template);

    expect(countExtraBoards(loaded)).toBe(2);
    expect(new Set(loaded.map((p) => p.groupId)).size).toBe(2);
    expect(loaded.every((p) => p.cabinetWidth === 900 && p.cabinetHeight === 750)).toBe(true);
    expect(loaded.every((p) => p.groupName === 'Deep base 900 + drawers')).toBe(true);
  });

  it('keeps each piece on its board type', () => {
    const template: Template = { id: 'u1', name: 'Kitchen A', pieces: templatePiecesFrom(drawerCabinets()) };
    const loaded = piecesFromTemplate(template);
    expect(loaded.find((p) => p.name === 'back')?.material).toBe('hmr');
    expect(loaded.find((p) => p.name === 'drawerFront')?.material).toBe('agt');
  });

  it('gives loaded pieces fresh ids and groups each time', () => {
    const template: Template = { id: 'u1', name: 'Kitchen A', pieces: templatePiecesFrom(drawerCabinets()) };
    const first = piecesFromTemplate(template);
    const second = piecesFromTemplate(template);
    const all = [...first, ...second];
    expect(new Set(all.map((p) => p.id)).size).toBe(all.length);
    expect(new Set(all.map((p) => p.groupId)).size).toBe(4);
    expect(countExtraBoards(all)).toBe(4);
  });

  it('loads ungrouped pieces and old templates as one group named after the template', () => {
    const template: Template = {
      id: 'old', name: 'Shelf set', cabinetWidth: 800, cabinetHeight: 750,
      pieces: [
        { name: 'Shelf', width: 764, height: 300, quantity: 3, canRotate: true },
        { name: 'Side', width: 750, height: 300, quantity: 2, canRotate: false },
      ],
    };
    const loaded = piecesFromTemplate(template);
    expect(new Set(loaded.map((p) => p.groupId)).size).toBe(1);
    expect(loaded.every((p) => p.groupName === 'Shelf set' && p.cabinetWidth === 800 && p.cabinetHeight === 750)).toBe(true);
    expect(countExtraBoards(loaded)).toBe(0);
  });

  it('does not store piece ids in the template', () => {
    expect(templatePiecesFrom(drawerCabinets()).some((p) => 'id' in p)).toBe(false);
  });
});
