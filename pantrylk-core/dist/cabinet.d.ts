export type CabinetSeriesId = 'deep-560' | 'shallow-300';
export declare const STANDARD_WIDTHS: readonly number[];
export declare const MIN_CABINET_WIDTH = 150;
export declare const MAX_CABINET_WIDTH = 1200;
export type CabinetPartKey = 'bottom' | 'top' | 'shelf' | 'side' | 'back' | 'topRail' | 'backSupport' | 'door' | 'drawerFront';
export type HardwareKey = 'legs' | 'hinges' | 'handles' | 'drawerRails';
export interface CabinetPart {
    key: CabinetPartKey;
    width: number;
    height: number;
    quantity: number;
    canRotate: boolean;
}
export interface HardwareItem {
    key: HardwareKey;
    quantity: number;
}
export interface CabinetBuild {
    seriesId: CabinetSeriesId;
    width: number;
    depth: number;
    height: number;
    drawers: boolean;
    parts: CabinetPart[];
    hardware: HardwareItem[];
    extraBoards: number;
}
export declare const CABINET_SERIES: readonly {
    id: CabinetSeriesId;
    depth: number;
    height: number;
    supportsDrawers: boolean;
}[];
export declare function isCabinetSeriesId(value: unknown): value is CabinetSeriesId;
export declare function isValidCabinetWidth(width: number): boolean;
export declare function drawersAvailable(seriesId: CabinetSeriesId, width: number): boolean;
export declare function buildCabinet(seriesId: CabinetSeriesId, width: number, opts: {
    drawers: boolean;
}): CabinetBuild;
