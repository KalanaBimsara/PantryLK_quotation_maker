import { Piece, Template } from '../types';
import { makeId } from './cabinetPieces';

// Guardar/cargar plantillas sin perder la agrupación por gabinete: cada gabinete
// vuelve como su propio grupo, con sus datos de gabinete, para que el área frontal
// y los tableros extra de cajones se sigan contando.

const UNGROUPED = '__ungrouped__';

// Las piezas de la plantilla conservan su groupId solo como clave local de la plantilla.
export function templatePiecesFrom(pieces: Piece[]): Template['pieces'] {
  return pieces.map(({ id, ...rest }) => rest);
}

export function piecesFromTemplate(template: Template): Piece[] {
  const freshGroupIds = new Map<string, string>();

  return template.pieces.map((p) => {
    const key = p.groupId ?? UNGROUPED;
    if (!freshGroupIds.has(key)) freshGroupIds.set(key, makeId('group'));

    return {
      ...p,
      id: makeId('piece'),
      groupId: freshGroupIds.get(key)!,
      // Piezas sueltas (o plantillas antiguas sin grupos) se agrupan bajo el nombre de la plantilla
      groupName: p.groupId ? p.groupName ?? template.name : template.name,
      cabinetWidth: p.cabinetWidth ?? template.cabinetWidth,
      cabinetHeight: p.cabinetHeight ?? template.cabinetHeight,
    };
  });
}
