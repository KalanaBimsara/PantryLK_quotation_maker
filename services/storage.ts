import { Piece, Settings, Template, InventoryItem } from '../types';
import { isCabinetSeriesId } from './cabinetSeries';
import { DEFAULT_CUT_SETTINGS } from './optimizer';

const STORAGE_KEYS = {
  PIECES: 'cutwizard_pieces_v2',
  SETTINGS: 'cutwizard_settings_v2',
  THEME: 'cutwizard_theme_v2',
};

export const DEFAULT_SETTINGS: Settings = { ...DEFAULT_CUT_SETTINGS };

export const DEFAULT_PIECES: Piece[] = [
  { id: '1', name: 'Lateral Izquierdo', width: 600, height: 750, quantity: 2, canRotate: false },
  { id: '2', name: 'Puerta Principal', width: 450, height: 750, quantity: 2, canRotate: false },
  { id: '3', name: 'Tapa Superior', width: 900, height: 600, quantity: 1, canRotate: true },
  { id: '4', name: 'Estantes Interiores', width: 864, height: 550, quantity: 3, canRotate: true },
  { id: '5', name: 'Frente Cajón', width: 860, height: 180, quantity: 2, canRotate: false },
];

// Número válido o el valor por defecto (evita NaN cuando el campo falta)
const num = (value: unknown, fallback: number): number => {
  const n = Number(value);
  return value !== null && value !== undefined && value !== '' && Number.isFinite(n) ? n : fallback;
};

const COST_FIELDS = ['boardPrice', 'edgeBandPricePerM', 'machineRentPerSqFt', 'laborPerSqFt', 'frontAreaSqFt'] as const;

export const loadStoredSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    const settings: Settings = {
      boardWidth: num(parsed.boardWidth, DEFAULT_SETTINGS.boardWidth) || DEFAULT_SETTINGS.boardWidth,
      boardHeight: num(parsed.boardHeight, DEFAULT_SETTINGS.boardHeight) || DEFAULT_SETTINGS.boardHeight,
      kerf: num(parsed.kerf, DEFAULT_SETTINGS.kerf),
      trimMargin: num(parsed.trimMargin, DEFAULT_SETTINGS.trimMargin),
      enableTrimMargin: Boolean(parsed.enableTrimMargin),
    };
    if (parsed.jobNumber !== undefined && parsed.jobNumber !== null) settings.jobNumber = String(parsed.jobNumber);
    // Campos de costos: solo se copian si fueron guardados
    for (const field of COST_FIELDS) {
      const value = num(parsed[field], NaN);
      if (!Number.isNaN(value)) settings[field] = value;
    }
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveStoredSettings = (settings: Settings): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // Ignorar si hay problemas de cuota o modo incógnito
  }
};

export const loadStoredPieces = (): Piece[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PIECES);
    if (!raw) return DEFAULT_PIECES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PIECES;
    return parsed.map((p, idx) => ({
      id: p.id || String(idx + 1),
      name: p.name || `Pieza ${idx + 1}`,
      width: Number(p.width) || 0,
      height: Number(p.height) || 0,
      quantity: Math.max(1, Number(p.quantity) || 1),
      canRotate: p.canRotate !== false,
      color: p.color,
      // Datos de grupo/gabinete: se conservan para no perder los gabinetes al recargar
      ...(p.groupId ? { groupId: String(p.groupId) } : {}),
      ...(p.groupName ? { groupName: String(p.groupName) } : {}),
      ...(p.cabinetWidth ? { cabinetWidth: Number(p.cabinetWidth) } : {}),
      ...(p.cabinetHeight ? { cabinetHeight: Number(p.cabinetHeight) } : {}),
      ...(isCabinetSeriesId(p.cabinetSeriesId) ? { cabinetSeriesId: p.cabinetSeriesId } : {}),
      ...(typeof p.cabinetDrawers === 'boolean' ? { cabinetDrawers: p.cabinetDrawers } : {}),
    }));
  } catch {
    return DEFAULT_PIECES;
  }
};

export const saveStoredPieces = (pieces: Piece[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.PIECES, JSON.stringify(pieces));
  } catch {
    // Ignorar si storage falla
  }
};

export const loadStoredDarkMode = (): boolean => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.THEME);
    if (raw !== null) {
      return raw === 'dark';
    }
    // Detectar preferencia del sistema operativo si no está seteado
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
};

export const saveStoredDarkMode = (isDark: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
  } catch {
    // Ignorar
  }
};

// Plantillas guardadas por el usuario. Los presets de gabinetes viven en cabinetSeries.ts;
// los antiguos presets "sys-" se descartan si quedaron en datos viejos.
export const loadStoredTemplates = (): Template[] => {
  try {
    const raw = localStorage.getItem('cutwizard_templates');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t: Template) => t && typeof t.id === 'string' && !t.id.startsWith('sys-'));
  } catch {
    return [];
  }
};

export const saveStoredTemplates = (templates: Template[]): void => {
  try {
    // Only save custom templates to avoid storing system ones redundantly
    const customTemplates = templates.filter(t => !t.id.startsWith('sys-'));
    localStorage.setItem('cutwizard_templates', JSON.stringify(customTemplates));
  } catch {
    // Ignorar
  }
};

export const loadStoredInventory = (): InventoryItem[] => {
  try {
    const raw = localStorage.getItem('cutwizard_inventory');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const saveStoredInventory = (items: InventoryItem[]): void => {
  try {
    localStorage.setItem('cutwizard_inventory', JSON.stringify(items));
  } catch {
    // Ignorar
  }
};
