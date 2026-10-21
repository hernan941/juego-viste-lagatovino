import { describe, expect, it } from 'vitest';
import anchors from '../../src/game/data/anchors.json';
import { TAIL_FLICK, TAIL_IDLE, tailPivot } from '../../src/game/domain/tail';

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
