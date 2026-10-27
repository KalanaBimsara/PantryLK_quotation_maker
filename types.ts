import type { Piece } from 'pantrylk-core/optimizer';

// Cut and cabinet types are shared with the other Pantry LK tools through pantrylk-core.
export type {
  Piece,
  Rect,
  PlacedPiece,
  Board,
  OptimizationStrategy,
  OptimizationResult,
  Settings,
  CutSettings,
} from 'pantrylk-core/optimizer';

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