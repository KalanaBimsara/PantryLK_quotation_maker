import type { Piece, OptimizationResult, Settings, CutSettings } from './types.js';
export type * from './types.js';
export declare const DEFAULT_CUT_SETTINGS: CutSettings;
export declare const COLOR_PALETTE: string[];
export declare const generatePieceColor: (index: number) => string;
export declare const optimizeCuts: (piecesInput: Piece[], settings: Settings) => OptimizationResult;
