import { describe, expect, it } from 'vitest';
import { blinkCount, lookOffset, nextBlinkDelay } from '../../src/game/domain/idle';
import { EXPRESSIONS, reactionFor } from '../../src/game/domain/expressions';

describe('nextBlinkDelay', () => {
  it('is between 3 and 5 seconds', () => {
    expect(nextBlinkDelay(0)).toBe(3000);
    expect(nextBlinkDelay(0.5)).toBe(4000);
    expect(nextBlinkDelay(0.999)).toBeLessThan(5000);
  });
});

describe('blinkCount', () => {
  it('sometimes blinks twice', () => {
    expect(blinkCount(0.1)).toBe(2);
    expect(blinkCount(0.9)).toBe(1);
  });
});

describe('lookOffset', () => {
  const from = { x: 640, y: 300 };
  it('moves the face toward the target', () => {
    const o = lookOffset(from, { x: 1000, y: 300 }, 5, 3, 300);
    expect(o.x).toBe(5);
    expect(o.y).toBe(0);
    const left = lookOffset(from, { x: 0, y: 500 }, 5, 3, 300);
    expect(left.x).toBe(-5);
    expect(left.y).toBeGreaterThan(0);
  });

  it('scales down for nearby targets and never exceeds the maximum', () => {
    expect(lookOffset(from, { x: 715, y: 300 }, 4, 4, 300).x).toBeCloseTo(1);
    expect(lookOffset(from, { x: 99999, y: -99999 }, 4, 4, 300)).toEqual({ x: 4, y: -4 });
  });

  it('is zero on top of the origin', () => {
    expect(lookOffset(from, from, 5, 5, 300)).toEqual({ x: 0, y: 0 });
  });
});

describe('reactionFor', () => {
  it('follows the expression table of game-design.md', () => {
    expect(reactionFor('grab', 0).expression).toBe('sorpresa');
    expect(reactionFor('drop', 0).expression).toBe('feliz');
    expect(reactionFor('combo', 0).expression).toBe('amor');
    expect(reactionFor('remove', 0).expression).toBe('parpadeo');
  });

  it('holds happy 600 to 900 ms', () => {
    expect(reactionFor('drop', 0).ms).toBe(600);
    expect(reactionFor('drop', 1).ms).toBe(900);
  });

  it('only uses known expressions', () => {
    for (const e of ['grab', 'drop', 'combo', 'remove'] as const) {
      expect(EXPRESSIONS).toContain(reactionFor(e, 0.5).expression);
    }
  });
});
