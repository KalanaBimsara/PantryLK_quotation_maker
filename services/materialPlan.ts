import { MaterialId, OptimizationResult, Piece, Settings } from '../types';
import { optimizeCuts } from './optimizer';
import { MATERIAL_ORDER, boardFor, materialOf } from './materials';

// Un plan de corte por tipo de tablero: la lista se separa por material y cada grupo
// se optimiza con la hoja de ese material. Funciones puras, sin React.

export interface MaterialPlan {
  material: MaterialId;
  boardWidth: number;
  boardHeight: number;
  result: OptimizationResult;
}

export interface UnplacedPart {
  piece: Piece;
  material: MaterialId;
}

export interface PlanTotals {
  totalBoards: number;
  totalParts: number;
  efficiency: number; // %, ponderado por área de hoja
  waste: number; // %, ponderado por área de hoja
  linearCuts: number; // metros
  usefulOffcuts: number;
  edgeBandMeters: number; // solo estructura y AGT: los fondos de 6 mm no llevan tapacanto
  unplaced: UnplacedPart[];
}

// Fila de la lista de compra: hojas del plan (cut) más las extra de cajones (extra)
export interface BuyRow {
  material: MaterialId;
  boardWidth: number;
  boardHeight: number;
  cut: number;
  extra: number;
  total: number;
}

// Los ids de tablero empiezan en 1 en cada plan; esta clave es única entre planes
export const boardKey = (material: MaterialId, boardId: number): string => `${material}-${boardId}`;

export function planByMaterial(pieces: Piece[], settings: Settings): MaterialPlan[] {
  const plans: MaterialPlan[] = [];
  for (const material of MATERIAL_ORDER) {
    const group = pieces.filter((p) => materialOf(p) === material);
    if (group.length === 0) continue;
    const { width, height } = boardFor(settings, material);
    plans.push({
      material,
      boardWidth: width,
      boardHeight: height,
      result: optimizeCuts(group, { ...settings, boardWidth: width, boardHeight: height }),
    });
  }
  return plans;
}

export function summarizePlans(plans: MaterialPlan[]): PlanTotals {
  const totals: PlanTotals = {
    totalBoards: 0,
    totalParts: 0,
    efficiency: 0,
    waste: 0,
    linearCuts: 0,
    usefulOffcuts: 0,
    edgeBandMeters: 0,
    unplaced: [],
  };
  let sheetArea = 0;
  let efficiencyArea = 0;
  let wasteArea = 0;

  for (const { material, boardWidth, boardHeight, result } of plans) {
    const area = result.totalBoards * boardWidth * boardHeight;
    sheetArea += area;
    efficiencyArea += result.totalEfficiency * area;
    wasteArea += result.totalWaste * area;

    totals.totalBoards += result.totalBoards;
    totals.totalParts += result.totalPartsCount;
    totals.linearCuts += result.totalLinearCuts;
    for (const board of result.boards) {
      totals.usefulOffcuts += board.usefulOffcutsCount || 0;
      if (material === 'hmr') continue;
      for (const placed of board.placedPieces) totals.edgeBandMeters += (2 * (placed.w + placed.h)) / 1000;
    }
    for (const piece of result.unplacedPieces) totals.unplaced.push({ piece, material });
  }

  if (sheetArea > 0) {
    totals.efficiency = efficiencyArea / sheetArea;
    totals.waste = wasteArea / sheetArea;
  }
  totals.linearCuts = Math.round(totals.linearCuts * 100) / 100;
  return totals;
}

export function boardsToBuy(plans: MaterialPlan[], settings: Settings, extraBoards: number): BuyRow[] {
  const rows: BuyRow[] = plans.map((plan) => ({
    material: plan.material,
    boardWidth: plan.boardWidth,
    boardHeight: plan.boardHeight,
    cut: plan.result.totalBoards,
    extra: 0,
    total: plan.result.totalBoards,
  }));

  // Las hojas extra de cajones son del tablero de estructura, aunque ninguna pieza se corte de él
  if (extraBoards > 0) {
    let carcass = rows.find((r) => r.material === 'carcass');
    if (!carcass) {
      const { width, height } = boardFor(settings, 'carcass');
      carcass = { material: 'carcass', boardWidth: width, boardHeight: height, cut: 0, extra: 0, total: 0 };
      rows.unshift(carcass);
    }
    carcass.extra = extraBoards;
    carcass.total = carcass.cut + extraBoards;
  }

  return rows.filter((r) => r.total > 0);
}

export function boardsCost(rows: BuyRow[], settings: Settings): number {
  return rows.reduce((sum, row) => sum + row.total * boardFor(settings, row.material).price, 0);
}
