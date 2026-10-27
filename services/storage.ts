import { Piece, Settings, Template, InventoryItem } from '../types';

const STORAGE_KEYS = {
  PIECES: 'cutwizard_pieces_v2',
  SETTINGS: 'cutwizard_settings_v2',
  THEME: 'cutwizard_theme_v2',
};

export const DEFAULT_SETTINGS: Settings = {
  boardWidth: 2440,
  boardHeight: 1220,
  kerf: 3,
  trimMargin: 10,
  enableTrimMargin: false, // Desactivado por defecto
};

export const DEFAULT_PIECES: Piece[] = [
  { id: '1', name: 'Lateral Izquierdo', width: 600, height: 750, quantity: 2, canRotate: false },
  { id: '2', name: 'Puerta Principal', width: 450, height: 750, quantity: 2, canRotate: false },
  { id: '3', name: 'Tapa Superior', width: 900, height: 600, quantity: 1, canRotate: true },
  { id: '4', name: 'Estantes Interiores', width: 864, height: 550, quantity: 3, canRotate: true },
  { id: '5', name: 'Frente Cajón', width: 860, height: 180, quantity: 2, canRotate: false },
];

export const loadStoredSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      boardWidth: Number(parsed.boardWidth) || DEFAULT_SETTINGS.boardWidth,
      boardHeight: Number(parsed.boardHeight) || DEFAULT_SETTINGS.boardHeight,
      kerf: Number(parsed.kerf) ?? DEFAULT_SETTINGS.kerf,
      trimMargin: Number(parsed.trimMargin) ?? DEFAULT_SETTINGS.trimMargin,
      enableTrimMargin: Boolean(parsed.enableTrimMargin),
    };
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

const generateBaseCabinet = (name: string, width: number, depth: number = 560, height: number = 750): Template => {
  const pieces: Omit<Piece, 'id'>[] = [
    { name: 'Side Panel', width: height, height: depth, quantity: 2, canRotate: true },
    { name: 'Bottom Panel', width: width - 36, height: depth, quantity: 1, canRotate: true },
    { name: 'Top Rail', width: width - 36, height: 100, quantity: 2, canRotate: true },
  ];

  if (width <= 600) {
    pieces.push({ name: 'Door', width: height - 3, height: width - 3, quantity: 1, canRotate: true });
  } else {
    pieces.push({ name: 'Door', width: height - 3, height: (width - 6) / 2, quantity: 2, canRotate: true });
  }

  return {
    id: `sys-base-${width}`,
    name,
    cabinetWidth: width,
    cabinetHeight: height,
    pieces
  };
};

export const DEFAULT_TEMPLATES: Template[] = [
  generateBaseCabinet('Slim Base 150', 150),
  generateBaseCabinet('Single Base 300', 300),
  generateBaseCabinet('Single Base 400', 400),
  generateBaseCabinet('Single Base 450', 450),
  generateBaseCabinet('Single Base 500', 500),
  generateBaseCabinet('Standard Base 600', 600),
  generateBaseCabinet('Double Base 800', 800),
  generateBaseCabinet('Double Base 900', 900),
  generateBaseCabinet('Double Base 1000', 1000),
  generateBaseCabinet('Maxi Base 1200', 1200),
];

export const loadStoredTemplates = (): Template[] => {
  try {
    const raw = localStorage.getItem('cutwizard_templates');
    if (!raw) return DEFAULT_TEMPLATES;
    const parsed = JSON.parse(raw);
    
    // Combine defaults with user templates (user templates take precedence if same ID, though they shouldn't conflict)
    const userTemplates = Array.isArray(parsed) ? parsed : [];
    
    // If the user's stored templates already contain the system ones, we don't want duplicates.
    // In our case, earlier versions might not have defaults.
    // Let's just return defaults + custom.
    const customTemplates = userTemplates.filter((t: Template) => !t.id.startsWith('sys-'));
    return [...DEFAULT_TEMPLATES, ...customTemplates];
  } catch {
    return DEFAULT_TEMPLATES;
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
