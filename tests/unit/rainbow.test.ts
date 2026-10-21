import { describe, expect, it } from 'vitest';
import { RAINBOW, rainbowPoints, rainbowSpan } from '../../src/game/domain/rainbow';

describe('rainbow of the combo (F9, review of task 16)', () => {
  it('is an ellipse taller than wide (an arch over the cat), not a half circle that hides behind the body', () => {
    expect(RAINBOW.ry).toBeGreaterThan(RAINBOW.rx * 2);
  });

  it('stays inside the glass of the mirror (cat x +/- 214) and under the name sign', () => {
    const { min, max } = rainbowSpan(700);
    expect(min).toBeGreaterThanOrEqual(700 - 214);
    expect(max).toBeLessThanOrEqual(700 + 214);
    const top = Math.min(...rainbowPoints(700, 1, 0).map((p) => p.y));
    expect(top).toBeGreaterThanOrEqual(130); // bottom of the sign
    expect(top).toBeLessThanOrEqual(150); // the ears of the cat: the arch goes over the head
  });

  it('draws from the left foot over the head: progress 0.5 is the top, 1 ends on the other side at the same height', () => {
    const half = rainbowPoints(700, 0.5, 0);
    const last = half[half.length - 1];
    expect(last.x).toBeCloseTo(700, 0);
    expect(last.y).toBeCloseTo(RAINBOW.cy - RAINBOW.ry + RAINBOW.band / 2, 0);
    const full = rainbowPoints(700, 1, 0);
    expect(full[0].y).toBeCloseTo(RAINBOW.cy, 0);
    expect(full[full.length - 1].y).toBeCloseTo(RAINBOW.cy, 0);
    expect(full[0].x).toBeLessThan(700);
    expect(full[full.length - 1].x).toBeGreaterThan(700);
  });

  it('every inner band is smaller than the one outside it', () => {
    const a = rainbowPoints(700, 1, 0);
    const b = rainbowPoints(700, 1, 1);
    expect(Math.min(...b.map((p) => p.y))).toBeGreaterThan(Math.min(...a.map((p) => p.y)));
    expect(Math.min(...b.map((p) => p.x))).toBeGreaterThan(Math.min(...a.map((p) => p.x)));
  });
});
