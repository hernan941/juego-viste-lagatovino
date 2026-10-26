import { describe, expect, it } from 'vitest';
import {
  arcControl, bezierPoint, COUNT_MAX_MS, countSteps, flightButtons, flightPlan, splitCredits,
} from '../../src/game/domain/wallet';

describe('countSteps (the wallet ticks)', () => {
  it('goes one unit at a time when it fits in the time limit', () => {
    const plan = countSteps(100, 105);
    expect(plan.values).toEqual([101, 102, 103, 104, 105]);
    expect(plan.values.length * plan.stepMs).toBeLessThanOrEqual(COUNT_MAX_MS);
  });

  it('counts down too', () => {
    expect(countSteps(10, 7).values).toEqual([9, 8, 7]);
  });

  it('never takes more than 1.2 s: big jumps skip numbers but end exactly on the target', () => {
    const plan = countSteps(0, 500);
    expect(plan.values.length * plan.stepMs).toBeLessThanOrEqual(COUNT_MAX_MS);
    expect(plan.values.at(-1)).toBe(500);
    expect(plan.values).toEqual([...plan.values].sort((a, b) => a - b));
    expect(new Set(plan.values).size).toBe(plan.values.length);
  });

  it('has nothing to do when the value does not change', () => {
    expect(countSteps(7, 7).values).toEqual([]);
  });

  it('is exact for a big drop', () => {
    const plan = countSteps(500, 3);
    expect(plan.values.at(-1)).toBe(3);
    expect(plan.values[0]).toBeLessThan(500);
  });
});

describe('flightButtons (how many buttons are drawn)', () => {
  it('flies one per five coins up to 12', () => {
    expect(flightButtons(0, false)).toBe(0);
    expect(flightButtons(7, false)).toBe(2);
    expect(flightButtons(500, false)).toBe(12);
  });

  it('are 3 at most with reduced motion', () => {
    expect(flightButtons(500, true)).toBe(3);
    expect(flightButtons(2, true)).toBe(1);
  });
});

describe('splitCredits', () => {
  it('adds up to the total, the last button takes the rest', () => {
    expect(splitCredits(23, 4)).toEqual([5, 5, 5, 8]);
    expect(splitCredits(23, 4).reduce((a, b) => a + b, 0)).toBe(23);
    expect(splitCredits(0, 0)).toEqual([]);
  });
});

describe('flightPlan', () => {
  it('staggers the buttons and gives each its credit', () => {
    const plan = flightPlan(40, false);
    expect(plan).toHaveLength(8);
    expect(plan[0].delay).toBe(0);
    expect(plan[1].delay).toBeGreaterThan(0);
    expect(plan.reduce((s, b) => s + b.credit, 0)).toBe(40);
    expect(plan.every((b) => b.ms > 0)).toBe(true);
  });

  it('reduced motion: 3 buttons that fade, no arc', () => {
    const plan = flightPlan(400, true);
    expect(plan).toHaveLength(3);
    expect(plan.every((b) => !b.arc)).toBe(true);
    expect(plan.reduce((s, b) => s + b.credit, 0)).toBe(400);
  });
});

describe('bezier', () => {
  it('starts at the origin and ends at the target', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 50 };
    const c = arcControl(from, to, 80);
    expect(bezierPoint(from, c, to, 0)).toEqual(from);
    expect(bezierPoint(from, c, to, 1)).toEqual(to);
  });

  it('the control point bows above the straight line', () => {
    const c = arcControl({ x: 0, y: 100 }, { x: 100, y: 100 }, 80);
    expect(c.y).toBeLessThan(100);
    expect(c.x).toBe(50);
  });
});
