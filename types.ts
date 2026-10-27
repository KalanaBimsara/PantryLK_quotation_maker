export interface Piece {
  id: string;
  name?: string;
  width: number;
  height: number;
  quantity: number;
  color?: string;
  label?: string;
  canRotate: boolean; // Control de veta: si es false, no puede girar 90º
  groupId?: string;
  groupName?: string;
  cabinetWidth?: number;
  cabinetHeight?: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlacedPiece extends Rect {
  id: string;
  originalId: string;
  name?: string;
  color: string;
  label: string;
  isRotated: boolean;
  groupId?: string;
  cabinetWidth?: number;
  cabinetHeight?: number;
}

export interface Board {
  id: number;
  width: number;
  height: number;
  trimMargin: number;
  placedPieces: PlacedPiece[];
  freeRects: Rect[];
  efficiency: number;
  waste: number;
  usefulOffcutsCount?: number;
}

export type OptimizationStrategy =
  | 'area-desc'
  | 'max-dimension-desc'
  | 'height-desc'
  | 'width-desc'
  | 'perimeter-desc';

export interface OptimizationResult {
  boards: Board[];
  totalBoards: number;
  totalEfficiency: number;
  totalWaste: number;
  unplacedPieces: Piece[];
  strategyUsed: string;
  strategyLabel: string;
  totalLinearCuts: number; // en metros
  totalPartsCount: number;
}

export interface Settings {
  boardWidth: number;
  boardHeight: number;
  kerf: number;
  trimMargin: number;
  enableTrimMargin?: boolean;
  jobNumber?: string;
  boardPrice?: number;
  edgeBandPricePerM?: number;
  machineRentPerSqFt?: number;
  laborPerSqFt?: number;
  frontAreaSqFt?: number;
}

export interface BoardPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  description: string;
}

export interface Template {
  id: string;
  name: string;
  cabinetWidth?: number;
  cabinetHeight?: number;
  pieces: Omit<Piece, 'id'>[];
}

export type InventoryCategory = 'board' | 'accessory' | 'hardware' | 'other';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  description?: string;
}