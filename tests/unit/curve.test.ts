import { describe, expect, it } from 'vitest';
import { arcControl, quadBezier } from '../../src/game/domain/curve';

describe('quadBezier', () => {
  const a = { x: 0, y: 0 };
  const c = { x: 50, y: -100 };
  const b = { x: 100, y: 0 };
  it('starts at the first point and ends at the last', () => {
    expect(quadBezier(a, c, b, 0)).toEqual(a);
    expect(quadBezier(a, c, b, 1)).toEqual(b);
  });
  it('bends toward the control point', () => {
    expect(quadBezier(a, c, b, 0.5)).toEqual({ x: 50, y: -50 });
  });
});

describe('arcControl', () => {
  const from = { x: 100, y: 400 };
  const to = { x: 1000, y: 60 };
  it('lifts the arc above the straight line', () => {
    const c = arcControl(from, to, 0);
    expect(c.y).toBeLessThan(Math.min(from.y, to.y));
  });
  it('is the same for the same index and spreads different ones', () => {
    expect(arcControl(from, to, 3)).toEqual(arcControl(from, to, 3));
    expect(arcControl(from, to, 1).x).not.toBe(arcControl(from, to, 2).x);
  });
});
