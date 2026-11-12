import { describe, it, expect } from 'vitest';
import { fmtMm } from './format';

describe('fmtMm', () => {
  it('shows whole millimetres as they are', () => {
    expect([600, 750, 0].map(fmtMm)).toEqual(['600', '750', '0']);
  });

  it('shows fractional sizes with one decimal instead of rounding them away', () => {
    expect(fmtMm(450.5)).toBe('450.5');
    expect(fmtMm(850 / 3)).toBe('283.3');
  });
});
