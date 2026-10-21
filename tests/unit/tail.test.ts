import { describe, expect, it } from 'vitest';
import anchors from '../../src/game/data/anchors.json';
import { TAIL_FLICK, TAIL_FLICK_DROP, TAIL_FLICK_STEPS, TAIL_FLICK_WAG, TAIL_IDLE, flickSteps, tailPivot } from '../../src/game/domain/tail';

describe('tailPivot', () => {
  it('is the base of the tail, where it meets the body (silhouette tail-shape ends at 350,462 and 354,430)', () => {
    expect(anchors.details.tailBase).toEqual({ x: 352, y: 446 });
  });

  it('gives the canvas point and the origin as a fraction of the canvas', () => {
    expect(tailPivot(anchors)).toEqual({ point: { x: 352, y: 446 }, origin: { x: 352 / 512, y: 446 / 512 } });
  });

  it('falls back to the template geometry when the detail is missing', () => {
    const details: Record<string, { x: number; y: number }> = { ...anchors.details };
    delete details.tailBase;
    expect(tailPivot({ ...anchors, details }).point).toEqual({ x: 352, y: 446 });
  });
});

describe('tail motion', () => {
  it('sways gently in idle: ±4° with Sine.easeInOut, about 1.2 s', () => {
    expect(TAIL_IDLE).toEqual({ angle: 4, duration: 1200, ease: 'Sine.easeInOut' });
  });

  it('flicks harder when an item is dropped: ±8° settling with Back.easeOut', () => {
    expect(TAIL_FLICK.angle).toBe(8);
    expect(TAIL_FLICK.ease).toBe('Back.easeOut');
    expect(TAIL_FLICK.duration).toBeGreaterThan(0);
  });
});

describe('tail flick hand-off to the sway', () => {
  it('lands on the angle where the sway starts, so the tail does not jump when the flick ends', () => {
    const last = TAIL_FLICK_STEPS[TAIL_FLICK_STEPS.length - 1];
    expect(last.angle).toBe(-TAIL_IDLE.angle);
  });

  it('snaps to one side, then the other, then settles with the flick easing', () => {
    expect(TAIL_FLICK_STEPS.map((s) => Math.sign(s.angle))).toEqual([-1, 1, -1]);
    expect(Math.abs(TAIL_FLICK_STEPS[0].angle)).toBe(TAIL_FLICK.angle);
    expect(TAIL_FLICK_STEPS[2].ease).toBe(TAIL_FLICK.ease);
    expect(TAIL_FLICK_STEPS[2].duration).toBe(TAIL_FLICK.duration);
  });
});

describe('flickSteps (the drop whip is bigger, the spontaneous wag is softer, reduced motion is nearly still)', () => {
  it('the drop whip is 12 degrees and the spontaneous wag 6, against the 8 of the base flick', () => {
    expect(TAIL_FLICK_DROP).toBe(12);
    expect(TAIL_FLICK_WAG).toBe(6);
    expect(flickSteps(TAIL_FLICK_DROP).map((s) => s.angle)).toEqual([-12, 12, -TAIL_IDLE.angle]);
    expect(flickSteps(TAIL_FLICK_WAG).map((s) => s.angle)).toEqual([-6, 6, -TAIL_IDLE.angle]);
  });

  it('the base flick is the 8 degree one', () => {
    expect(flickSteps(TAIL_FLICK.angle)).toEqual([...TAIL_FLICK_STEPS]);
  });

  it('always ends where the sway starts, scaled by the swing of the motion profile, so the hand-over does not jump', () => {
    for (const swing of [1, 0.25]) {
      for (const angle of [6, 8, 12]) {
        const steps = flickSteps(angle, swing);
        expect(steps[2].angle).toBeCloseTo(-TAIL_IDLE.angle * swing);
        expect(steps[0].angle).toBeCloseTo(-angle * swing);
      }
    }
  });

  it('keeps the timing of the base flick', () => {
    expect(flickSteps(12).map((s) => [s.duration, s.ease])).toEqual(TAIL_FLICK_STEPS.map((s) => [s.duration, s.ease]));
  });
});
