import { describe, expect, it } from 'vitest';
import { TILT_MAX, tiltTarget, tiltToward } from '../../src/game/domain/tilt';

describe('tiltTarget (the dragged garment leans with its speed, like cloth)', () => {
  it('leans 0.8 degrees per px of horizontal speed, clamped to +-15', () => {
    expect(tiltTarget(0)).toBe(0);
    expect(tiltTarget(10)).toBeCloseTo(8);
    expect(tiltTarget(-10)).toBeCloseTo(-8);
    expect(tiltTarget(500)).toBe(TILT_MAX);
    expect(tiltTarget(-500)).toBe(-TILT_MAX);
    expect(TILT_MAX).toBe(15);
  });
});

describe('tiltToward (a lerp that does not depend on the frame rate)', () => {
  it('moves part of the way to the target, never past it', () => {
    const a = tiltToward(0, 10, 1000 / 60);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(8);
    expect(tiltToward(8, 10, 1000 / 60)).toBeLessThanOrEqual(8);
  });

  it('is the same after one 33 ms frame as after two 16.67 ms frames', () => {
    const slow = tiltToward(3, 12, 1000 / 30);
    const fast = tiltToward(tiltToward(3, 12, 1000 / 60), 12, 1000 / 60);
    expect(slow).toBeCloseTo(fast, 6);
  });

  it('returns to 0 when the garment stops', () => {
    let a = 12;
    for (let i = 0; i < 60; i++) a = tiltToward(a, 0, 1000 / 60);
    expect(Math.abs(a)).toBeLessThan(0.01);
  });

  it('does not move with no time, and reaches the target with a long frame', () => {
    expect(tiltToward(4, 10, 0)).toBe(4);
    expect(tiltToward(4, 10, 60_000)).toBeCloseTo(8, 3);
  });

  it('a speed multiplier of 0 (reduced motion) keeps it straight', () => {
    expect(tiltToward(0, 30, 1000 / 60, 0)).toBe(0);
    expect(tiltTarget(30, 0)).toBe(0);
  });
});
