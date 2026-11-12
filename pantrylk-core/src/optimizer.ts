import type { Piece, Board, PlacedPiece, Rect, OptimizationResult, Settings, OptimizationStrategy, CutSettings } from './types.js';

export type * from './types.js';

export const DEFAULT_CUT_SETTINGS: CutSettings = {
  boardWidth: 2440,
  boardHeight: 1220,
  kerf: 3,
  trimMargin: 10,
  enableTrimMargin: false, // Desactivado por defecto
};

export const COLOR_PALETTE = [
  '#60a5fa', // Blue 400
  '#34d399', // Emerald 400
  '#f87171', // Red 400
  '#fbbf24', // Amber 400
  '#a78bfa', // Violet 400
  '#38bdf8', // Sky 400
  '#fb923c', // Orange 400
  '#4ade80', // Green 400
  '#e879f9', // Fuchsia 400
  '#2dd4bf', // Teal 400
  '#f472b6', // Pink 400
  '#a3e635', // Lime 400
];

export const generatePieceColor = (index: number) => {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
};

const fits = (pieceW: number, pieceH: number, rect: Rect) => {
  return pieceW <= rect.w && pieceH <= rect.h;
};

interface InternalPiece {
  w: number;
  h: number;
  id: string;
  originalId: string;
  name?: string;
  color: string;
  label: string;
  canRotate: boolean;
  groupId?: string;
  cabinetWidth?: number;
  cabinetHeight?: number;
}

const STRATEGY_DEFINITIONS: {
  id: OptimizationStrategy;
  label: string;
  sorter: (a: InternalPiece, b: InternalPiece) => number;
}[] = [
  {
    id: 'area-desc',
    label: 'Mayor Área Primero',
    sorter: (a, b) => (b.w * b.h) - (a.w * a.h),
  },
  {
    id: 'max-dimension-desc',
    label: 'Lado Mayor Primero',
    sorter: (a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h) || (b.w * b.h) - (a.w * a.h),
  },
  {
    id: 'height-desc',
    label: 'Mayor Largo/Alto Primero',
    sorter: (a, b) => b.h - a.h || b.w - a.w,
  },
  {
    id: 'width-desc',
    label: 'Mayor Ancho Primero',
    sorter: (a, b) => b.w - a.w || b.h - a.h,
  },
  {
    id: 'perimeter-desc',
    label: 'Mayor Perímetro Primero',
    sorter: (a, b) => (b.w + b.h) - (a.w + a.h),
  },
];

const runSinglePass = (
  rawPieces: InternalPiece[],
  settings: Settings,
  sorter: (a: InternalPiece, b: InternalPiece) => number
): {
  boards: Board[];
  unplaced: Piece[];
  totalLinearCuts: number;
} => {
  const { boardWidth, boardHeight, kerf, trimMargin = 0, enableTrimMargin } = settings;
  const effectiveTrim = enableTrimMargin ? trimMargin : 0;

  // Área usable tras descontar el refilado perimetral en ambos lados
  const usableX = effectiveTrim;
  const usableY = effectiveTrim;
  const usableW = Math.max(0, boardWidth - (effectiveTrim * 2));
  const usableH = Math.max(0, boardHeight - (effectiveTrim * 2));

  // Clonar y ordenar piezas según la heurística
  const pieces = [...rawPieces].sort(sorter);

  const boards: Board[] = [];
  const unplaced: Piece[] = [];

  const createBoard = (id: number): Board => ({
    id,
    width: boardWidth,
    height: boardHeight,
    trimMargin: effectiveTrim,
    placedPieces: [],
    freeRects: usableW > 0 && usableH > 0 ? [{ x: usableX, y: usableY, w: usableW, h: usableH }] : [],
    efficiency: 0,
    waste: 100,
    usefulOffcutsCount: 0,
  });

  if (pieces.length > 0 && usableW > 0 && usableH > 0) {
    boards.push(createBoard(1));
  }

  let totalLinearCuts = 0;

  for (const piece of pieces) {
    let placed = false;

    for (const board of boards) {
      let bestRectIndex = -1;
      let minWaste = Number.MAX_VALUE;
      let bestRotated = false;

      for (let i = 0; i < board.freeRects.length; i++) {
        const rect = board.freeRects[i];

        // 1. Orientación normal
        if (fits(piece.w, piece.h, rect)) {
          const waste = (rect.w * rect.h) - (piece.w * piece.h);
          if (waste < minWaste) {
            minWaste = waste;
            bestRectIndex = i;
            bestRotated = false;
          }
        }

        // 2. Orientación rotada (SOLO si la pieza permite rotar por veta)
        if (piece.canRotate && piece.w !== piece.h) {
          if (fits(piece.h, piece.w, rect)) {
            const waste = (rect.w * rect.h) - (piece.h * piece.w);
            if (waste < minWaste) {
              minWaste = waste;
              bestRectIndex = i;
              bestRotated = true;
            }
          }
        }
      }

      if (bestRectIndex !== -1) {
        const rect = board.freeRects[bestRectIndex];
        const placedW = bestRotated ? piece.h : piece.w;
        const placedH = bestRotated ? piece.w : piece.h;

        board.placedPieces.push({
          x: rect.x,
          y: rect.y,
          w: placedW,
          h: placedH,
          id: piece.id,
          originalId: piece.originalId,
          name: piece.name,
          color: piece.color,
          label: piece.label,
          isRotated: bestRotated,
          groupId: piece.groupId,
          cabinetWidth: piece.cabinetWidth,
          cabinetHeight: piece.cabinetHeight,
        });

        totalLinearCuts += (placedW + placedH) / 1000;

        board.freeRects.splice(bestRectIndex, 1);

        const actualPlacedW = placedW + kerf;
        const actualPlacedH = placedH + kerf;

        const freeW = rect.w - actualPlacedW;
        const freeH = rect.h - actualPlacedH;

        let newRects: Rect[] = [];

        // División guillotina de zonas libres restantes
        if (freeW < freeH) {
          if (rect.h - actualPlacedH > 0) {
            newRects.push({
              x: rect.x,
              y: rect.y + actualPlacedH,
              w: rect.w,
              h: rect.h - actualPlacedH,
            });
          }
          if (rect.w - actualPlacedW > 0) {
            newRects.push({
              x: rect.x + actualPlacedW,
              y: rect.y,
              w: rect.w - actualPlacedW,
              h: actualPlacedH,
            });
          }
        } else {
          if (rect.w - actualPlacedW > 0) {
            newRects.push({
              x: rect.x + actualPlacedW,
              y: rect.y,
              w: rect.w - actualPlacedW,
              h: rect.h,
            });
          }
          if (rect.h - actualPlacedH > 0) {
            newRects.push({
              x: rect.x,
              y: rect.y + actualPlacedH,
              w: actualPlacedW,
              h: rect.h - actualPlacedH,
            });
          }
        }

        newRects = newRects.filter((r) => r.w > 0 && r.h > 0);
        board.freeRects.push(...newRects);

        placed = true;
        break;
      }
    }

    if (!placed) {
      // Intentar colocar en un nuevo tablero
      const fitsNormal = piece.w <= usableW && piece.h <= usableH;
      const fitsRotated = piece.canRotate && piece.h <= usableW && piece.w <= usableH;

      if (!fitsNormal && !fitsRotated) {
        unplaced.push({
          id: piece.originalId,
          name: piece.name,
          width: piece.w,
          height: piece.h,
          quantity: 1,
          canRotate: piece.canRotate,
        });
        continue;
      }

      const newBoard = createBoard(boards.length + 1);
      boards.push(newBoard);

      const useRotated = !fitsNormal && fitsRotated;
      const placedW = useRotated ? piece.h : piece.w;
      const placedH = useRotated ? piece.w : piece.h;

      newBoard.placedPieces.push({
        x: usableX,
        y: usableY,
        w: placedW,
        h: placedH,
        id: piece.id,
        originalId: piece.originalId,
        name: piece.name,
        color: piece.color,
        label: piece.label,
        isRotated: useRotated,
        groupId: piece.groupId,
        cabinetWidth: piece.cabinetWidth,
        cabinetHeight: piece.cabinetHeight,
      });

      totalLinearCuts += (placedW + placedH) / 1000;

      newBoard.freeRects = [];
      const actualPlacedW = placedW + kerf;
      const actualPlacedH = placedH + kerf;

      const freeW = usableW - actualPlacedW;
      const freeH = usableH - actualPlacedH;

      if (freeW < freeH) {
        if (usableH - actualPlacedH > 0) {
          newBoard.freeRects.push({
            x: usableX,
            y: usableY + actualPlacedH,
            w: usableW,
            h: usableH - actualPlacedH,
          });
        }
        if (usableW - actualPlacedW > 0) {
          newBoard.freeRects.push({
            x: usableX + actualPlacedW,
            y: usableY,
            w: usableW - actualPlacedW,
            h: actualPlacedH,
          });
        }
      } else {
        if (usableW - actualPlacedW > 0) {
          newBoard.freeRects.push({
            x: usableX + actualPlacedW,
            y: usableY,
            w: usableW - actualPlacedW,
            h: usableH,
          });
        }
        if (usableH - actualPlacedH > 0) {
          newBoard.freeRects.push({
            x: usableX,
            y: usableY + actualPlacedH,
            w: actualPlacedW,
            h: usableH - actualPlacedH,
          });
        }
      }

      newBoard.freeRects = newBoard.freeRects.filter((r) => r.w > 0 && r.h > 0);
    }
  }

  // Métricas por tablero
  boards.forEach((b) => {
    const usedArea = b.placedPieces.reduce((acc, p) => acc + p.w * p.h, 0);
    const totalArea = b.width * b.height;
    b.efficiency = totalArea > 0 ? (usedArea / totalArea) * 100 : 0;
    b.waste = 100 - b.efficiency;

    // Retazos útiles: piezas sobrantes mayores a 300x300mm
    b.usefulOffcutsCount = b.freeRects.filter((r) => r.w >= 300 && r.h >= 300).length;
  });

  return {
    boards,
    unplaced,
    totalLinearCuts,
  };
};

export const optimizeCuts = (
  piecesInput: Piece[],
  settings: Settings
): OptimizationResult => {
  const allPieces: InternalPiece[] = [];
  let totalPartsCount = 0;

  piecesInput.forEach((p, idx) => {
    if (p.width <= 0 || p.height <= 0 || p.quantity <= 0) return;
    totalPartsCount += p.quantity;

    for (let i = 0; i < p.quantity; i++) {
      allPieces.push({
        w: p.width,
        h: p.height,
        id: `${p.id}-${i}`,
        originalId: p.id,
        name: p.name || `Pieza #${idx + 1}`,
        color: p.color || generatePieceColor(idx),
        label: `${p.width} × ${p.height}`,
        canRotate: p.canRotate !== false, // Por defecto rota libremente a menos que se restrinja
        groupId: p.groupId,
        cabinetWidth: p.cabinetWidth,
        cabinetHeight: p.cabinetHeight,
      });
    }
  });

  if (allPieces.length === 0) {
    return {
      boards: [],
      totalBoards: 0,
      totalEfficiency: 0,
      totalWaste: 0,
      unplacedPieces: [],
      strategyUsed: 'none',
      strategyLabel: 'Sin piezas válidas',
      totalLinearCuts: 0,
      totalPartsCount: 0,
    };
  }

  // MULTI-PASS OPTIMIZER:
  // Ejecutamos las 5 heurísticas de ordenamiento y comparamos las soluciones
  let bestSolution: {
    boards: Board[];
    unplaced: Piece[];
    strategyId: string;
    strategyLabel: string;
    totalLinearCuts: number;
    score: number;
  } | null = null;

  for (const strategy of STRATEGY_DEFINITIONS) {
    const outcome = runSinglePass(allPieces, settings, strategy.sorter);

    // Score de calidad:
    // 1. Penalización máxima por piezas que no entraron
    // 2. Penalización por cantidad de tableros
    // 3. Recompensa por eficiencia promedio
    // 4. Bonificación si la última placa queda con retazo más compacto (menor waste disperso)
    const avgEfficiency = outcome.boards.length > 0
      ? outcome.boards.reduce((acc, b) => acc + b.efficiency, 0) / outcome.boards.length
      : 0;

    const unplacedPenalty = outcome.unplaced.length * 100000;
    const boardPenalty = outcome.boards.length * 1000;
    const score = (avgEfficiency * 10) - boardPenalty - unplacedPenalty;

    if (!bestSolution || score > bestSolution.score) {
      bestSolution = {
        boards: outcome.boards,
        unplaced: outcome.unplaced,
        strategyId: strategy.id,
        strategyLabel: strategy.label,
        totalLinearCuts: outcome.totalLinearCuts,
        score,
      };
    }
  }

  const winner = bestSolution!;
  const boardsCount = winner.boards.length;
  const totalEfficiency = boardsCount > 0
    ? winner.boards.reduce((acc, b) => acc + b.efficiency, 0) / boardsCount
    : 0;

  return {
    boards: winner.boards,
    totalBoards: boardsCount,
    totalEfficiency,
    totalWaste: boardsCount > 0 ? 100 - totalEfficiency : 0,
    unplacedPieces: winner.unplaced,
    strategyUsed: winner.strategyId,
    strategyLabel: winner.strategyLabel,
    totalLinearCuts: Math.round(winner.totalLinearCuts * 10) / 10,
    totalPartsCount,
  };
};