import { describe, expect, it } from 'vitest';
import { stableTilt } from '../../src/game/domain/stableTilt';

describe('stableTilt (art-direction §6: stable rotation per id)', () => {
  it('gives the same angle for the same seed', () => {
    expect(stableTilt('gato-01')).toBe(stableTilt('gato-01'));
  });

  it('stays within +-1..+-8 degrees for many seeds', () => {
    const angles = Array.from({ length: 500 }, (_, i) => stableTilt(`seed-${i}`));
    for (const a of angles) {
      expect(Math.abs(a)).toBeGreaterThanOrEqual(1);
      expect(Math.abs(a)).toBeLessThanOrEqual(8);
    }
    expect(angles.some((a) => a < 0)).toBe(true);
    expect(angles.some((a) => a > 0)).toBe(true);
  });

  it('varies between seeds', () => {
    expect(new Set(Array.from({ length: 50 }, (_, i) => stableTilt(`id${i}`))).size).toBeGreaterThan(10);
  });

  it('handles an empty seed', () => {
    expect(Math.abs(stableTilt(''))).toBeGreaterThanOrEqual(1);
  });
});
