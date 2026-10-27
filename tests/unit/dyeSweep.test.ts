import { describe, expect, it } from 'vitest';
import { sweepCrop, sweepPlan } from '../../src/game/domain/dyeSweep';

describe('sweepPlan (F16.4)', () => {
  it('sweeps from the bottom up with the full motion', () => {
    expect(sweepPlan(false)).toEqual({ mode: 'sweep', ms: 520 });
  });
  it('crossfades without a mask when motion is reduced', () => {
    expect(sweepPlan(true)).toEqual({ mode: 'crossfade', ms: 260 });
  });
});

describe('sweepCrop (F16.4)', () => {
  it('shows nothing at the start and everything at the end', () => {
    expect(sweepCrop(0, 200, 100)).toEqual({ x: 0, y: 200, width: 100, height: 0 });
    expect(sweepCrop(1, 200, 100)).toEqual({ x: 0, y: 0, width: 100, height: 200 });
  });
  it('reveals from the bottom edge upward', () => {
    expect(sweepCrop(0.25, 200, 100)).toEqual({ x: 0, y: 150, width: 100, height: 50 });
  });
  it('clamps the progress to 0..1', () => {
    expect(sweepCrop(-3, 200, 100).height).toBe(0);
    expect(sweepCrop(7, 200, 100).height).toBe(200);
  });
});
