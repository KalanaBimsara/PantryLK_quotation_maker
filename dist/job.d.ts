import type { CabinetBuild, CabinetSeriesId, HardwareItem } from './cabinet.js';
import type { CutSettings, OptimizationResult } from './types.js';
export declare const CUT_JOB_SCHEMA_VERSION = 1;
export declare const MAX_LINE_QUANTITY = 50;
export interface CabinetLine {
    lineId: string;
    seriesId: CabinetSeriesId;
    width: number;
    drawers: boolean;
    quantity: number;
    label?: string;
}
export interface CutJobInput {
    schemaVersion: 1;
    jobId: string;
    inputVersion: number;
    cabinets: CabinetLine[];
    settings: CutSettings;
}
export interface CutPlan {
    optimizerBoards: number;
    extraBoards: number;
    totalBoards: number;
    efficiency: number;
    wastePct: number;
    linearCutsM: number;
    partsCount: number;
    unplacedCount: number;
    customPieceCount: number;
}
export interface CutJobResult {
    schemaVersion: 1;
    source: 'auto' | 'workshop';
    basedOnInputVersion: number;
    computedAt: string;
    cabinets: CabinetLine[];
    hardware: HardwareItem[];
    cutPlan: CutPlan;
    settings: CutSettings;
}
export declare function parseCutJobInput(value: unknown): CutJobInput;
export declare function parseCutJobResult(value: unknown): CutJobResult;
export declare function sumHardware(builds: {
    build: CabinetBuild;
    quantity: number;
}[]): HardwareItem[];
export declare function cutPlanFrom(result: OptimizationResult, extraBoards: number, customPieceCount: number): CutPlan;
export declare function estimateJob(input: CutJobInput, now?: () => Date): CutJobResult;
