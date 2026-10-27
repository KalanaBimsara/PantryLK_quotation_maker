import { describe, it, expect } from 'vitest';
import { parseCutJobInput, parseCutJobResult, estimateJob, CabinetLine, CutJobInput, CutJobResult } from './job.js';
import { DEFAULT_CUT_SETTINGS } from './optimizer.js';

const validInput = (): CutJobInput => ({
  schemaVersion: 1,
  jobId: 'job-1',
  inputVersion: 3,
  cabinets: [{ lineId: 'L1', seriesId: 'deep-560', width: 600, drawers: false, quantity: 1 }],
  settings: { ...DEFAULT_CUT_SETTINGS },
});

const withLine = (patch: Record<string, unknown>) => {
  const input = validInput() as unknown as { cabinets: Record<string, unknown>[] };
  input.cabinets[0] = { ...input.cabinets[0], ...patch };
  return input;
};

const validResult = (): CutJobResult => ({
  schemaVersion: 1,
  source: 'auto',
  basedOnInputVersion: 3,
  computedAt: '2026-10-28T00:00:00.000Z',
  cabinets: validInput().cabinets,
  hardware: [{ key: 'legs', quantity: 4 }],
  cutPlan: {
    optimizerBoards: 1,
    extraBoards: 0,
    totalBoards: 1,
    efficiency: 84,
    wastePct: 16,
    linearCutsM: 12.4,
    partsCount: 8,
    unplacedCount: 0,
    customPieceCount: 0,
  },
  settings: { ...DEFAULT_CUT_SETTINGS },
});

describe('parseCutJobInput', () => {
  it('accepts a valid input and drops unknown fields', () => {
    expect(parseCutJobInput({ ...validInput(), extra: 1 })).toEqual(validInput());
  });

  it('rejects a wrong schemaVersion', () => {
    expect(() => parseCutJobInput({ ...validInput(), schemaVersion: 2 })).toThrow(/schemaVersion/);
  });

  it('rejects bad lines', () => {
    const { jobId: _omit, ...noJobId } = validInput();
    expect(() => parseCutJobInput(noJobId)).toThrow(/jobId/);
    expect(() => parseCutJobInput(withLine({ seriesId: 'base-600' }))).toThrow(/cabinets\[0\]\.seriesId/);
    for (const width of ['600', 600.5, 149, 1201])
      expect(() => parseCutJobInput(withLine({ width }))).toThrow(/cabinets\[0\]\.width/);
    for (const quantity of [0, 51, 1.5])
      expect(() => parseCutJobInput(withLine({ quantity }))).toThrow(/cabinets\[0\]\.quantity/);
    expect(() => parseCutJobInput(withLine({ drawers: 'yes' }))).toThrow(/cabinets\[0\]\.drawers/);
  });

  it('rejects drawers where they are not offered', () => {
    expect(() => parseCutJobInput(withLine({ seriesId: 'shallow-300', width: 600, drawers: true }))).toThrow(/cabinets\[0\]\.drawers/);
    expect(() => parseCutJobInput(withLine({ seriesId: 'deep-560', width: 200, drawers: true }))).toThrow(/cabinets\[0\]\.drawers/);
  });

  it('rejects duplicate lineIds', () => {
    const input = validInput();
    input.cabinets.push({ ...input.cabinets[0], width: 900 });
    expect(() => parseCutJobInput(input)).toThrow(/cabinets\[1\]\.lineId/);
  });

  it('rejects bad settings', () => {
    expect(() => parseCutJobInput({ ...validInput(), settings: { ...DEFAULT_CUT_SETTINGS, kerf: -1 } })).toThrow(/settings\.kerf/);
    expect(() => parseCutJobInput({ ...validInput(), settings: { ...DEFAULT_CUT_SETTINGS, boardWidth: 0 } })).toThrow(/settings\.boardWidth/);
  });

  it('defaults a missing enableTrimMargin to false', () => {
    const { enableTrimMargin: _omit, ...settings } = DEFAULT_CUT_SETTINGS;
    expect(parseCutJobInput({ ...validInput(), settings }).settings.enableTrimMargin).toBe(false);
  });

  it('accepts an empty cabinets list', () => {
    expect(parseCutJobInput({ ...validInput(), cabinets: [] }).cabinets).toEqual([]);
  });

  it('keeps an optional label', () => {
    expect(parseCutJobInput(withLine({ label: 'Sink base' })).cabinets[0].label).toBe('Sink base');
  });
});

describe('parseCutJobResult', () => {
  it('round-trips a valid result and rejects bad fields', () => {
    expect(parseCutJobResult({ ...validResult(), extra: true })).toEqual(validResult());
    expect(() => parseCutJobResult({ ...validResult(), source: 'manual' })).toThrow(/source/);
    expect(() => parseCutJobResult({ ...validResult(), hardware: [{ key: 'screws', quantity: 1 }] })).toThrow(/hardware\[0\]\.key/);
    expect(() =>
      parseCutJobResult({ ...validResult(), cutPlan: { ...validResult().cutPlan, totalBoards: -1 } }),
    ).toThrow(/cutPlan\.totalBoards/);
  });
});

describe('estimateJob', () => {
  const clock = () => new Date('2026-10-28T00:00:00Z');
  const job = (cabinets: CabinetLine[], settings = { ...DEFAULT_CUT_SETTINGS }): CutJobInput => ({ ...validInput(), cabinets, settings });
  const deep600: CabinetLine = { lineId: 'L1', seriesId: 'deep-560', width: 600, drawers: false, quantity: 1 };

  it('estimates one deep 600', () => {
    const input = job([deep600]);
    const r = estimateJob(input, clock);
    expect(r.hardware).toEqual([
      { key: 'legs', quantity: 4 },
      { key: 'hinges', quantity: 2 },
      { key: 'handles', quantity: 1 },
    ]);
    expect(r.cutPlan).toMatchObject({ extraBoards: 0, partsCount: 8, unplacedCount: 0, customPieceCount: 0 });
    expect(r.cutPlan.totalBoards).toBe(r.cutPlan.optimizerBoards);
    expect(r.cutPlan.optimizerBoards).toBeGreaterThanOrEqual(1);
    expect(r.source).toBe('auto');
    expect(r.basedOnInputVersion).toBe(3);
    expect(r.cabinets).toEqual(input.cabinets);
    expect(r.settings).toEqual(input.settings);
  });

  it('counts drawer boards and hardware per quantity', () => {
    const r = estimateJob(job([{ lineId: 'L1', seriesId: 'deep-560', width: 900, drawers: true, quantity: 2 }]), clock);
    expect(r.cutPlan.extraBoards).toBe(2);
    expect(r.cutPlan.totalBoards).toBe(r.cutPlan.optimizerBoards + 2);
    expect(r.cutPlan.partsCount).toBe(20);
    expect(r.hardware).toEqual([
      { key: 'legs', quantity: 8 },
      { key: 'handles', quantity: 6 },
      { key: 'drawerRails', quantity: 6 },
    ]);
  });

  it('sums hardware across lines', () => {
    const shallow735: CabinetLine = { lineId: 'L2', seriesId: 'shallow-300', width: 735, drawers: false, quantity: 1 };
    expect(estimateJob(job([deep600, shallow735]), clock).hardware).toEqual([
      { key: 'legs', quantity: 4 },
      { key: 'hinges', quantity: 6 },
      { key: 'handles', quantity: 3 },
    ]);
  });

  it('uses the injected clock', () => {
    expect(estimateJob(job([deep600]), clock).computedAt).toBe('2026-10-28T00:00:00.000Z');
  });

  it('handles an empty kitchen', () => {
    const r = estimateJob(job([]), clock);
    expect(r.hardware).toEqual([]);
    expect(Object.values(r.cutPlan).every((v) => v === 0)).toBe(true);
  });

  it('reports parts that do not fit', () => {
    const r = estimateJob(job([deep600], { ...DEFAULT_CUT_SETTINGS, boardWidth: 500, boardHeight: 500 }), clock);
    expect(r.cutPlan.unplacedCount).toBeGreaterThan(0);
    expect(r.cutPlan.totalBoards).toBe(r.cutPlan.optimizerBoards);
  });

  it('is deterministic', () => {
    expect(estimateJob(job([deep600]), clock)).toEqual(estimateJob(job([deep600]), clock));
  });

  it('produces a result its own parser accepts', () => {
    const r = estimateJob(job([deep600]), clock);
    expect(parseCutJobResult(r)).toEqual(r);
  });
});
