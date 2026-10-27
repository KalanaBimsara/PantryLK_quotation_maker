import { Piece } from '../types';
import { buildCabinet, isCabinetSeriesId, CabinetPartKey, CabinetSeriesId } from './cabinetSeries';

// Puente entre cabinetSeries (independiente de la app) y la lista de piezas de CutWizard.

export const MAX_CABINET_QUANTITY = 50;

// Contador de módulo: ids únicos aunque se creen varios en el mismo milisegundo
// (crypto.randomUUID no existe al abrir la app por IP en HTTP plano).
let seq = 0;
export const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function clampCabinetQuantity(value: number): number {
  if (!Number.isFinite(value)) return value === Infinity ? MAX_CABINET_QUANTITY : 1;
  return Math.min(MAX_CABINET_QUANTITY, Math.max(1, Math.floor(value)));
}

export function createCabinetGroups(params: {
  seriesId: CabinetSeriesId;
  width: number;
  drawers: boolean;
  quantity: number;
  groupName: string;
  partName: (key: CabinetPartKey) => string;
}): Piece[] {
  const build = buildCabinet(params.seriesId, params.width, { drawers: params.drawers });
  const pieces: Piece[] = [];

  // Un grupo por gabinete, para que el área frontal se cuente una vez por gabinete
  for (let i = 0; i < clampCabinetQuantity(params.quantity); i++) {
    const groupId = makeId('cab');
    for (const part of build.parts) {
      pieces.push({
        id: makeId('piece'),
        name: params.partName(part.key),
        width: part.width,
        height: part.height,
        quantity: part.quantity,
        canRotate: part.canRotate,
        groupId,
        groupName: params.groupName,
        cabinetWidth: build.width,
        cabinetHeight: build.height,
        cabinetSeriesId: build.seriesId,
        cabinetDrawers: build.drawers,
      });
    }
  }
  return pieces;
}

// Tableros extra (cajones) por gabinete; datos viejos o inválidos cuentan 0.
export function countExtraBoards(pieces: Piece[]): number {
  const seen = new Set<string>();
  let total = 0;
  for (const p of pieces) {
    if (!p.groupId || seen.has(p.groupId)) continue;
    seen.add(p.groupId);
    if (!isCabinetSeriesId(p.cabinetSeriesId) || !p.cabinetWidth) continue;
    try {
      total += buildCabinet(p.cabinetSeriesId, p.cabinetWidth, { drawers: !!p.cabinetDrawers }).extraBoards;
    } catch {
      // Combinación no válida (p. ej. cajones donde no se ofrecen): sin tablero extra
    }
  }
  return total;
}
