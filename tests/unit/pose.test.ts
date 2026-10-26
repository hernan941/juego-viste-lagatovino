import { describe, expect, it } from 'vitest';
import { EXPRESSIONS } from '../../src/game/domain/expressions';
import { POSES, POSE_IDS, flourishFor, poseById, shouldPurr } from '../../src/game/domain/pose';

describe('POSES', () => {
  it('has the four photo poses in order', () => {
    expect(POSE_IDS).toEqual(['sentadito', 'coqueto', 'saltito', 'dormilon']);
    expect(POSES.map((p) => p.id)).toEqual([...POSE_IDS]);
  });

  it('only uses real expressions', () => {
    for (const p of POSES) expect(EXPRESSIONS).toContain(p.expression);
  });

  it('sentadito is the current pose: no transformation', () => {
    expect(poseById('sentadito')).toMatchObject({ expression: 'feliz', headTilt: 0, lift: 0, shadowScale: 1, squash: { x: 1, y: 1 } });
    expect(poseById('sentadito').sticker).toBeUndefined();
  });

  it('coqueto tilts the head 8 degrees and is in love', () => {
    expect(poseById('coqueto')).toMatchObject({ expression: 'amor', headTilt: 8, lift: 0 });
  });

  it('saltito floats 24 px up, with a smaller shadow and a happy face', () => {
    const p = poseById('saltito');
    expect(p).toMatchObject({ expression: 'feliz', lift: 24 });
    expect(p.shadowScale).toBeLessThan(1);
  });

  it('dormilon blinks, squashes a little and brings a zzz sticker', () => {
    const p = poseById('dormilon');
    expect(p.expression).toBe('parpadeo');
    expect(p.squash.y).toBeLessThan(1);
    expect(p.squash.x).toBeGreaterThan(1);
    expect(p.sticker).toBe('zzz');
  });

  it('poseById fails on an unknown id', () => {
    expect(() => poseById('nope')).toThrow();
  });
});

describe('showcase helpers (unchanged)', () => {
  it('purrs on the first two poses and then one time in four', () => {
    expect(shouldPurr(0, () => 0.9)).toBe(true);
    expect(shouldPurr(2, () => 0.2)).toBe(true);
    expect(shouldPurr(2, () => 0.3)).toBe(false);
  });

  it('flourish rotates', () => {
    expect([0, 1, 2, 3].map(flourishFor)).toEqual(['squash', 'wiggle', 'glance', 'squash']);
  });
});
