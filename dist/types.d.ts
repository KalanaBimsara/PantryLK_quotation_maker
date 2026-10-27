import type { CabinetSeriesId } from './cabinet.js';
export interface Piece {
    id: string;
    name?: string;
    width: number;
    height: number;
    quantity: number;
    color?: string;
    label?: string;
    canRotate: boolean;
    groupId?: string;
    groupName?: string;
    cabinetWidth?: number;
    cabinetHeight?: number;
    cabinetSeriesId?: CabinetSeriesId;
    cabinetDrawers?: boolean;
    cabinetLineId?: string;
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
export type OptimizationStrategy = 'area-desc' | 'max-dimension-desc' | 'height-desc' | 'width-desc' | 'perimeter-desc';
export interface OptimizationResult {
    boards: Board[];
    totalBoards: number;
    totalEfficiency: number;
    totalWaste: number;
    unplacedPieces: Piece[];
    strategyUsed: string;
    strategyLabel: string;
    totalLinearCuts: number;
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
export type CutSettings = Pick<Settings, 'boardWidth' | 'boardHeight' | 'kerf' | 'trimMargin' | 'enableTrimMargin'>;
