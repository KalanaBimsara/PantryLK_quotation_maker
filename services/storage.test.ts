import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_SETTINGS,
  loadStoredPieces,
  saveStoredPieces,
  loadStoredSettings,
  saveStoredSettings,
  loadStoredTemplates,
} from './storage';
import { materialOf } from './materials';

beforeEach(() => {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
});

describe('pieces storage', () => {
  it('keeps group and cabinet fields across save/load', () => {
    const piece = {
      id: 'a', name: 'Door', width: 600, height: 750, quantity: 1, canRotate: false,
      groupId: 'g1', groupName: 'Deep base 600', cabinetWidth: 600, cabinetHeight: 750,
      cabinetDepth: 560, cabinetSeriesId: 'deep-560' as const, cabinetDrawers: false,
    };
    saveStoredPieces([piece]);
    expect(loadStoredPieces()[0]).toMatchObject(piece);
  });

  it('keeps a known board type and drops an unknown one', () => {
    localStorage.setItem('cutwizard_pieces_v2', JSON.stringify([
      { id: 'a', width: 1, height: 1, quantity: 1, material: 'agt' },
      { id: 'b', width: 1, height: 1, quantity: 1, material: 'plywood' },
    ]));
    const [a, b] = loadStoredPieces();
    expect(a.material).toBe('agt');
    expect('material' in b).toBe(false);
  });

  it('drops an unknown cabinetSeriesId but keeps the group', () => {
    localStorage.setItem('cutwizard_pieces_v2', JSON.stringify([{ id: 'a', width: 1, height: 1, quantity: 1, groupId: 'g', cabinetSeriesId: 'bogus' }]));
    const [p] = loadStoredPieces();
    expect(p.groupId).toBe('g');
    expect(p.cabinetSeriesId).toBeUndefined();
  });
});

describe('start-up', () => {
  it('starts empty when nothing is saved', () => {
    expect(loadStoredPieces()).toEqual([]);
  });

  it('stays empty after the list was cleared', () => {
    saveStoredPieces([]);
    expect(loadStoredPieces()).toEqual([]);
  });

  it('starts empty when the saved data is unreadable', () => {
    localStorage.setItem('cutwizard_pieces_v2', '{not json');
    expect(loadStoredPieces()).toEqual([]);
  });
});

describe('settings storage', () => {
  it('keeps cost settings across save/load', () => {
    const s = { ...DEFAULT_SETTINGS, jobNumber: 'J-12', boardPrice: 9500, edgeBandPricePerM: 60, machineRentPerSqFt: 500, laborPerSqFt: 850, frontAreaSqFt: 12.5 };
    saveStoredSettings(s);
    expect(loadStoredSettings()).toMatchObject(s);
  });

  it('leaves frontAreaSqFt undefined when it was never set', () => {
    saveStoredSettings(DEFAULT_SETTINGS);
    expect(loadStoredSettings().frontAreaSqFt).toBeUndefined();
  });

  it('falls back to default kerf and trim when missing', () => {
    localStorage.setItem('cutwizard_settings_v2', JSON.stringify({ boardWidth: 2440, boardHeight: 1220 }));
    expect(loadStoredSettings()).toMatchObject({ kerf: DEFAULT_SETTINGS.kerf, trimMargin: DEFAULT_SETTINGS.trimMargin });
  });
});

describe('board type settings', () => {
  it('keeps AGT and HMR sizes and prices across save/load', () => {
    const s = { ...DEFAULT_SETTINGS, agtWidth: 2745, agtHeight: 1830, agtPrice: 30000, hmrPrice: 4500 };
    saveStoredSettings(s);
    expect(loadStoredSettings()).toMatchObject(s);
  });

  it('opens a job saved before board types existed', () => {
    localStorage.setItem('cutwizard_settings_v2', JSON.stringify({ boardWidth: 2440, boardHeight: 1220 }));
    localStorage.setItem('cutwizard_pieces_v2', JSON.stringify([{ id: 'a', name: 'Door', width: 750, height: 600, quantity: 1 }]));
    const s = loadStoredSettings();
    expect(s).toMatchObject({ agtWidth: 2440, agtHeight: 1220, hmrWidth: 2440, hmrHeight: 1220 });
    expect('agtPrice' in s || 'hmrPrice' in s).toBe(false);
    expect(loadStoredPieces().map(materialOf)).toEqual(['carcass']);
  });

  it('falls back to the default sheet when a saved size is zero or not a number', () => {
    localStorage.setItem('cutwizard_settings_v2', JSON.stringify({ agtWidth: 0, agtHeight: 'abc', hmrWidth: null }));
    expect(loadStoredSettings()).toMatchObject({ agtWidth: 2440, agtHeight: 1220, hmrWidth: 2440, hmrHeight: 1220 });
  });
});

describe('templates storage', () => {
  it('returns only user templates', () => {
    localStorage.setItem('cutwizard_templates', JSON.stringify([{ id: 'sys-base-600', name: 'x', pieces: [] }, { id: 'u1', name: 'Mine', pieces: [] }]));
    expect(loadStoredTemplates().map((t) => t.id)).toEqual(['u1']);
  });
});
