import { MaterialId, Settings } from '../types';
import { MATERIAL_THICKNESS } from './cabinetSeries';
import { fmtMm } from './format';

// Tipos de tablero de un trabajo: estructura (carcass), AGT para frentes y HMR para fondos.
// Funciones puras, sin React.

// Orden fijo para listas y para el plan de corte
export const MATERIAL_ORDER: readonly MaterialId[] = ['carcass', 'agt', 'hmr'];

// Nombre para CSV y como texto por defecto; AGT y HMR son nombres de producto y no se traducen
export const MATERIAL_NAMES: Readonly<Record<MaterialId, string>> = { carcass: 'Carcass', agt: 'AGT', hmr: 'HMR' };

export const AGT_SIZES: readonly { id: '8x4' | '9x6'; width: number; height: number }[] = [
  { id: '8x4', width: 2440, height: 1220 },
  { id: '9x6', width: 2745, height: 1830 },
];

export const isMaterialId = (value: unknown): value is MaterialId =>
  typeof value === 'string' && (MATERIAL_ORDER as readonly string[]).includes(value);

// Texto escrito a mano (CSV): sin espacios y sin distinguir mayúsculas
export const parseMaterial = (value: unknown): MaterialId | undefined => {
  if (typeof value !== 'string') return undefined;
  const text = value.trim().toLowerCase();
  return isMaterialId(text) ? text : undefined;
};

// Piezas sin tipo (o con uno desconocido) van al tablero de estructura
export const materialOf = (piece: { material?: unknown }): MaterialId =>
  isMaterialId(piece.material) ? piece.material : 'carcass';

export const boardFor = (settings: Settings, material: MaterialId): { width: number; height: number; price: number } => {
  if (material === 'agt') return { width: settings.agtWidth, height: settings.agtHeight, price: settings.agtPrice || 0 };
  if (material === 'hmr') return { width: settings.hmrWidth, height: settings.hmrHeight, price: settings.hmrPrice || 0 };
  return { width: settings.boardWidth, height: settings.boardHeight, price: settings.boardPrice || 0 };
};

// Tolerancia para reconocer una hoja estándar (2438,4 × 1219,2 también es 8×4)
const SHEET_TOLERANCE = 3;
const SHEET_LABELS: readonly { width: number; height: number; label: string }[] = [
  { width: 2440, height: 1220, label: '8×4 ft' },
  { width: 2745, height: 1830, label: '9×6 ft' },
];

export const sheetLabel = (width: number, height: number): string | null => {
  const match = SHEET_LABELS.find(
    (s) => Math.abs(s.width - width) <= SHEET_TOLERANCE && Math.abs(s.height - height) <= SHEET_TOLERANCE
  );
  return match ? match.label : null;
};

// Texto de la hoja: "9×6 ft" si es estándar; si no, la medida en mm
export const sheetText = (width: number, height: number): string =>
  sheetLabel(width, height) ?? `${fmtMm(width)} × ${fmtMm(height)} mm`;

// Título de un tipo de tablero, p. ej. "AGT 18 mm · 9×6 ft". El nombre de estructura llega traducido.
export const boardTitle = (material: MaterialId, width: number, height: number, carcassName: string): string => {
  const name = material === 'carcass' ? carcassName : MATERIAL_NAMES[material];
  return `${name} ${MATERIAL_THICKNESS[material]} mm · ${sheetText(width, height)}`;
};
