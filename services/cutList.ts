import { Piece } from '../types';

// Agrupa la lista de piezas para la vista: un grupo por gabinete (o plantilla) y las piezas sueltas aparte.

export interface PieceGroup {
  groupId: string;
  name: string;
  isCabinet: boolean;
  pieces: Piece[];
}

export function groupPieces(pieces: Piece[]): { groups: PieceGroup[]; loose: Piece[] } {
  const groups: PieceGroup[] = [];
  const byId = new Map<string, PieceGroup>();
  const loose: Piece[] = [];

  for (const p of pieces) {
    if (!p.groupId) {
      loose.push(p);
      continue;
    }
    let group = byId.get(p.groupId);
    if (!group) {
      // El primer elemento decide el nombre y si es un gabinete
      group = { groupId: p.groupId, name: p.groupName ?? '', isCabinet: !!p.cabinetSeriesId, pieces: [] };
      byId.set(p.groupId, group);
      groups.push(group);
    }
    group.pieces.push(p);
  }

  return { groups, loose };
}
